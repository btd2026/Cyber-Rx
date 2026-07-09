'use strict';

/**
 * routes/oauth — OAuth 2.0 "one-click connect" for the connector setup.
 *
 *   GET /api/oauth/providers                 which providers exist + are configured
 *   GET /api/oauth/:provider/status          is this provider wired (env set)?
 *   GET /api/oauth/:provider/start           → { authorize_url } (frontend opens it)
 *   GET /api/oauth/:provider/callback        provider redirect → store tokens → sync
 *
 * The customer clicks "Connect with <provider>", grants read-only consent, and
 * Nerion stores the tokens in the vault (under the connector's integration key) and
 * kicks a signal sync — no tenant / client / secret typed. If a provider isn't
 * configured (Nerion not yet registered as an app there), /status reports it and
 * the UI keeps the manual credential form.
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const providers = require('../services/oauth/providers');
const oauthState = require('../services/oauth/state');
const vault = require('../utils/vault');
const Integrations = require('../services/IntegrationService');

const orgOf = (req) => req.headers['x-org-id'] || req.query.org_id || req.query.orgId || 'demo';

router.get('/providers', (req, res) => {
  try { res.json({ providers: providers.list() }); }
  catch (e) { res.status(500).json({ error: 'providers failed' }); }
});

router.get('/:provider/status', (req, res) => {
  const p = providers.get(req.params.provider);
  if (!p) return res.status(404).json({ error: 'unknown provider' });
  res.json({ provider: req.params.provider, label: p.label, needsDomain: !!p.needsDomain, configured: providers.configured(req.params.provider) });
});

// Build the provider authorize URL. The org + connector ride inside the signed
// state so the callback (which has no auth header) can trust them.
router.get('/:provider/start', (req, res) => {
  const provider = req.params.provider;
  const p = providers.get(provider);
  if (!p) return res.status(404).json({ error: 'unknown provider' });
  if (!providers.configured(provider)) return res.status(400).json({ error: 'oauth_not_configured', message: p.label + ' one-click connect is not configured on this Nerion instance yet — use the credential form.' });
  const connector = String(req.query.connector || p.connector_hint || provider);
  const domain = req.query.domain ? String(req.query.domain) : '';
  const tenant = req.query.tenant ? String(req.query.tenant) : '';
  if (p.needsDomain && !domain) return res.status(400).json({ error: 'domain_required', message: p.label + ' needs your org domain (e.g. acme.okta.com).' });
  try {
    const state = oauthState.sign({ org_id: orgOf(req), connector, provider, domain, tenant });
    const url = providers.authorizeUrl(provider, state, { domain, tenant });
    res.json({ authorize_url: url });
  } catch (e) {
    if (logger && logger.warn) logger.warn('oauth start failed', { error: e.message });
    res.status(500).json({ error: 'start failed' });
  }
});

// A tiny HTML page that reports the result to the opener window and closes.
function closePage(ok, connector, message) {
  const payload = JSON.stringify({ nerion_oauth: ok ? 'ok' : 'error', connector: connector || null, message: message || null });
  return '<!doctype html><meta charset="utf-8"><title>Nerion · connecting…</title>' +
    '<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f6f8fc;color:#151a24;display:grid;place-items:center;height:100vh;margin:0">' +
    '<div style="text-align:center"><div style="font-size:34px">' + (ok ? '✅' : '⚠️') + '</div>' +
    '<p style="max-width:32ch">' + (ok ? 'Connected. You can close this window.' : ('Could not connect. ' + (message || ''))) + '</p></div>' +
    '<script>try{if(window.opener)window.opener.postMessage(' + payload + ',"*");}catch(e){}setTimeout(function(){window.close();},' + (ok ? '900' : '2500') + ');</script>';
}

router.get('/:provider/callback', async (req, res) => {
  const provider = req.params.provider;
  res.set('Content-Type', 'text/html; charset=utf-8');
  try {
    if (req.query.error) return res.status(200).send(closePage(false, null, String(req.query.error_description || req.query.error)));
    const st = oauthState.verify(req.query.state);
    if (!st || st.provider !== provider) return res.status(400).send(closePage(false, null, 'The consent request expired or was tampered with. Please try again.'));
    const tokens = await providers.exchangeCode(provider, String(req.query.code || ''), { domain: st.domain, tenant: st.tenant });

    // Store the tokens in the vault under the connector's integration key, merged
    // with any existing creds. Connectors that support bearer auth read oauth.access_token.
    let existing = {}; try { existing = (await vault.get(st.org_id, 'integration:' + st.connector)) || {}; } catch (_) {}
    const creds = Object.assign({}, existing, {
      auth_method: 'oauth', oauth: tokens,
      access_token: tokens.access_token, token: tokens.access_token,
      tenant: st.tenant || existing.tenant || null, domain: st.domain || existing.domain || null,
    });
    try { await vault.set(st.org_id, 'integration:' + st.connector, creds); } catch (_) {}

    // Kick a signal sync so the tool immediately lights up its controls (best-effort).
    Promise.resolve().then(() => Integrations.sync(st.org_id, st.connector)).catch(() => {});
    res.status(200).send(closePage(true, st.connector));
  } catch (e) {
    if (logger && logger.warn) logger.warn('oauth callback failed', { provider, error: e.message });
    res.status(200).send(closePage(false, null, e.message || 'token exchange failed'));
  }
});

module.exports = router;
