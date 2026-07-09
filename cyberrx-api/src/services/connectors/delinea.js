'use strict';

/**
 * Delinea Secret Server connector (read-only, OAuth2 password grant).
 *
 * Fills pam_pct — vaulted privileged secrets as a share of all known privileged
 * accounts (vaulted + discovered-but-unmanaged). Auth is Secret Server's
 * documented resource-owner-password grant against /oauth2/token; the vaulted
 * count comes from /api/v1/secrets and the unmanaged count from Discovery. A
 * true ratio needs both numbers, so pam_pct is emitted only when the Discovery
 * unmanaged count is readable — otherwise the no-signal error is thrown rather
 * than fabricating a 100%. Built to the documented Secret Server REST API;
 * validate against a real instance with a read-only account (View Secret + View
 * Discovery) and confirm the Discovery endpoint/field on your version.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.baseUrl || '').replace(/\/+$/, '');

async function token(creds) {
  const body = new URLSearchParams({ grant_type: 'password', username: creds.username, password: creds.password });
  const r = await http(`${base(creds)}/oauth2/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await jsonOrThrow(r, 'Delinea');
  if (!j.access_token) throw new Error('Delinea: no access token returned.');
  return j.access_token;
}

async function test(creds) {
  if (!creds.baseUrl || !creds.username || !creds.password) throw new Error('Delinea base URL, username and password are required.');
  const tk = await token(creds);
  await jsonOrThrow(await http(`${base(creds)}/api/v1/secrets?take=1`, { headers: { Authorization: `Bearer ${tk}`, Accept: 'application/json' } }), 'Delinea');
  return { ok: true, detail: 'Authenticated to the Delinea Secret Server API.' };
}

// Discovered privileged accounts not yet imported into a Secret. Wrapped by the
// caller so a version without this endpoint doesn't kill the primary auth path.
async function discoveredUnmanaged(b, H) {
  const j = await jsonOrThrow(await http(`${b}/api/v1/discovery/status`, { headers: H }), 'Delinea');
  for (const k of ['unmanagedAccountCount', 'unmanagedCount', 'accountsFound', 'total']) {
    if (j && Number.isFinite(Number(j[k]))) return Number(j[k]);
  }
  return null;
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  const b = base(creds);
  const H = { Authorization: `Bearer ${tk}`, Accept: 'application/json' };
  const signals = [];
  // Vaulted privileged secrets ÷ total known privileged accounts.
  const secrets = await jsonOrThrow(await http(`${b}/api/v1/secrets?take=1`, { headers: H }), 'Delinea');
  const vaulted = Number(secrets && secrets.total);
  let unmanaged = null;
  try { unmanaged = await discoveredUnmanaged(b, H); } catch (_) { /* Discovery not readable */ }
  if (Number.isFinite(vaulted) && Number.isFinite(unmanaged) && (vaulted + unmanaged) > 0) {
    signals.push({ key: 'pam_pct', value: Math.round((vaulted / (vaulted + unmanaged)) * 100), asOf: nowIso(), raw: { vaulted, unmanaged } });
  }
  if (!signals.length) throw new Error('Authenticated, but no true PAM ratio — confirm the account can read secret totals and Discovery unmanaged-account counts.');
  return { signals, meta: { vendor: 'Delinea' } };
}

module.exports = {
  key: 'delinea', label: 'Delinea Secret Server', vendor: 'Delinea', category: 'Privileged access (PAM)',
  signals: ['pam_pct'],
  scopes: ['View Secret (read-only)', 'View Discovery'],
  fields: [
    { key: 'baseUrl', label: 'Secret Server base URL (https://host/SecretServer)' },
    { key: 'username', label: 'API username' },
    { key: 'password', label: 'API password', secret: true },
  ],
  test, fetchSignals,
};
