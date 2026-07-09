'use strict';

/**
 * oauth/providers — the OAuth 2.0 "one-click connect" provider registry.
 *
 * Each entry knows how to build a provider's authorize URL, exchange an
 * authorization code for tokens, and refresh them — so a customer connects a tool
 * by clicking "Connect with <provider>" and granting read-only consent, instead of
 * pasting tenant / client / secret into a form.
 *
 * Nerion's own client_id / client_secret / redirect_uri for each provider come
 * from ENVIRONMENT variables (Nerion is registered once as an app with each
 * provider). Until those are set, configured(provider) is false and the UI falls
 * back to the manual credential form — nothing breaks, the button just hides.
 *
 * Scopes are deliberately READ-ONLY. No write permission is ever requested.
 */

const redirectBase = () => String(process.env.OAUTH_REDIRECT_BASE || process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');

function envCfg(provider) {
  const up = provider.toUpperCase();
  const base = redirectBase();
  return {
    client_id: process.env['OAUTH_' + up + '_CLIENT_ID'] || '',
    client_secret: process.env['OAUTH_' + up + '_CLIENT_SECRET'] || '',
    redirect_uri: process.env['OAUTH_' + up + '_REDIRECT_URI'] || (base ? base + '/api/oauth/' + provider + '/callback' : ''),
  };
}

// {tenant} / {domain} are substituted per-connection (Entra tenant, Okta org).
const PROVIDERS = {
  microsoft: {
    label: 'Microsoft', connector_hint: 'entra',
    authorize: 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize',
    token: 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token',
    scopes: ['offline_access', 'https://graph.microsoft.com/User.Read.All', 'https://graph.microsoft.com/Directory.Read.All', 'https://graph.microsoft.com/AuditLog.Read.All'],
    defaultTenant: 'organizations', // multi-tenant admin-consent
    extraAuth: { prompt: 'consent' },
  },
  okta: {
    label: 'Okta', connector_hint: 'okta',
    authorize: 'https://{domain}/oauth2/v1/authorize',
    token: 'https://{domain}/oauth2/v1/token',
    scopes: ['offline_access', 'okta.users.read', 'okta.logs.read'],
    needsDomain: true,
  },
  google: {
    label: 'Google Workspace', connector_hint: 'google_workspace',
    authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/admin.directory.user.readonly', 'https://www.googleapis.com/auth/admin.reports.audit.readonly'],
    extraAuth: { access_type: 'offline', prompt: 'consent' },
  },
  github: {
    label: 'GitHub', connector_hint: 'github',
    authorize: 'https://github.com/login/oauth/authorize',
    token: 'https://github.com/login/oauth/access_token',
    scopes: ['read:org', 'repo'],
  },
};

function get(provider) { return PROVIDERS[provider] || null; }
function list() { return Object.keys(PROVIDERS).map((k) => ({ provider: k, label: PROVIDERS[k].label, connector_hint: PROVIDERS[k].connector_hint, configured: configured(k), needsDomain: !!PROVIDERS[k].needsDomain })); }
function configured(provider) { const p = get(provider); if (!p) return false; const c = envCfg(provider); return !!(c.client_id && c.client_secret && c.redirect_uri); }

function subst(url, opts) {
  return url
    .replace('{tenant}', (opts && opts.tenant) || (get(opts.provider) || {}).defaultTenant || 'common')
    .replace('{domain}', (opts && opts.domain) || '');
}

function authorizeUrl(provider, state, opts) {
  const p = get(provider); if (!p) throw new Error('unknown provider ' + provider);
  const c = envCfg(provider);
  const params = new URLSearchParams(Object.assign({
    client_id: c.client_id, redirect_uri: c.redirect_uri, response_type: 'code',
    scope: p.scopes.join(' '), state,
  }, p.extraAuth || {}));
  return subst(p.authorize, Object.assign({ provider }, opts)) + '?' + params.toString();
}

async function postForm(url, form) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(form).toString(),
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch (_) { json = Object.fromEntries(new URLSearchParams(text)); }
  if (!res.ok) throw new Error((json && (json.error_description || json.error)) || ('token exchange failed (' + res.status + ')'));
  return json;
}

function tokenResult(json, provider) {
  const now = Date.now();
  return {
    provider,
    access_token: json.access_token || null,
    refresh_token: json.refresh_token || null,
    token_type: json.token_type || 'Bearer',
    scope: json.scope || null,
    expires_at: json.expires_in ? new Date(now + Number(json.expires_in) * 1000).toISOString() : null,
    obtained_at: new Date(now).toISOString(),
  };
}

async function exchangeCode(provider, code, opts) {
  const p = get(provider); if (!p) throw new Error('unknown provider ' + provider);
  const c = envCfg(provider);
  const json = await postForm(subst(p.token, Object.assign({ provider }, opts)), {
    grant_type: 'authorization_code', code, redirect_uri: c.redirect_uri,
    client_id: c.client_id, client_secret: c.client_secret,
  });
  return tokenResult(json, provider);
}

async function refresh(provider, refreshToken, opts) {
  const p = get(provider); if (!p) throw new Error('unknown provider ' + provider);
  const c = envCfg(provider);
  const json = await postForm(subst(p.token, Object.assign({ provider }, opts)), {
    grant_type: 'refresh_token', refresh_token: refreshToken,
    client_id: c.client_id, client_secret: c.client_secret,
  });
  const t = tokenResult(json, provider);
  if (!t.refresh_token) t.refresh_token = refreshToken; // some providers omit it on refresh
  return t;
}

module.exports = { PROVIDERS, get, list, configured, envCfg, authorizeUrl, exchangeCode, refresh };
