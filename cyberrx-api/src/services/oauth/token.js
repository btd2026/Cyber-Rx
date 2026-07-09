'use strict';

/**
 * oauth/token — helpers for connectors to consume OAuth access tokens.
 *
 * When a tool was connected via one-click OAuth, its vaulted creds carry an
 * `oauth` block ({ access_token, refresh_token, expires_at, provider }). Connectors
 * use `accessToken()` to read the bearer token, and `ensureFresh()` (called by the
 * sync path before fetchSignals) refreshes an expired token and re-vaults it, so
 * pulls keep working without the user touching anything.
 */

const providers = require('./providers');
const vault = require('../../utils/vault');

function accessToken(creds) {
  return (creds && creds.oauth && creds.oauth.access_token) || (creds && creds.access_token) || null;
}

// Expired (or within a 60s safety window) and refreshable?
function isExpired(creds) {
  const e = creds && creds.oauth && creds.oauth.expires_at;
  if (!e) return false;
  const t = new Date(e).getTime();
  return isFinite(t) && Date.now() > (t - 60 * 1000);
}

async function ensureFresh(orgId, connector, creds) {
  try {
    const o = creds && creds.oauth;
    if (!o || !o.refresh_token || !o.provider || !isExpired(creds)) return creds;
    const t = await providers.refresh(o.provider, o.refresh_token, { domain: creds.domain || '', tenant: creds.tenant || '' });
    const next = Object.assign({}, creds, { oauth: t, access_token: t.access_token, token: t.access_token });
    try { await vault.set(orgId, 'integration:' + connector, next); } catch (_) {}
    return next;
  } catch (_) { return creds; }
}

module.exports = { accessToken, isExpired, ensureFresh };
