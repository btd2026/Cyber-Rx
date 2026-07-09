'use strict';

/**
 * One Identity Safeguard connector (read-only, RSTS → Safeguard token).
 *
 * Fills pam_pct — asset accounts under Safeguard management (a password is
 * vaulted/managed) as a share of all discovered privileged asset accounts.
 * Auth is Safeguard's documented two-step flow: an RSTS OAuth2 password grant
 * (POST /RSTS/oauth2/token with scope rsts:sts:primaryproviderid:<provider>),
 * then exchange of that STS token for a Safeguard user token via
 * POST /service/core/v4/Token/LoginResponse. The AssetAccounts inventory is
 * counted with the API's `count=true` / `filter` query params. Built to the
 * documented Safeguard core v4 API; validate against a real appliance with a
 * read-only Auditor account before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.appliance || '').replace(/\/+$/, '');

async function token(creds) {
  const provider = creds.provider || 'local';
  const r1 = await http(`${base(creds)}/RSTS/oauth2/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ grant_type: 'password', username: creds.username, password: creds.secret, scope: `rsts:sts:primaryproviderid:${provider}` }),
  });
  const j1 = await jsonOrThrow(r1, 'One Identity');
  if (!j1.access_token) throw new Error('One Identity: no RSTS token returned.');
  const r2 = await http(`${base(creds)}/service/core/v4/Token/LoginResponse`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ StsAccessToken: j1.access_token }),
  });
  const j2 = await jsonOrThrow(r2, 'One Identity');
  if (!j2.UserToken) throw new Error('One Identity: no Safeguard user token returned.');
  return j2.UserToken;
}

// AssetAccounts count: `count=true` returns the integer total; a full list falls
// back to its length. Filters use Safeguard's OData-style query grammar.
async function count(b, H, query) {
  const j = await jsonOrThrow(await http(`${b}/service/core/v4/AssetAccounts${query}`, { headers: H }), 'One Identity');
  return Array.isArray(j) ? j.length : Number(j);
}

async function test(creds) {
  if (!creds.appliance || !creds.username || !creds.secret) throw new Error('Safeguard appliance URL, client/username and secret are required.');
  const tk = await token(creds);
  await jsonOrThrow(await http(`${base(creds)}/service/core/v4/AssetAccounts?count=true`, { headers: { Authorization: `Bearer ${tk}`, Accept: 'application/json' } }), 'One Identity');
  return { ok: true, detail: 'Authenticated to the One Identity Safeguard API.' };
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  const b = base(creds);
  const H = { Authorization: `Bearer ${tk}`, Accept: 'application/json' };
  const signals = [];
  // Asset accounts under management (a password is vaulted) ÷ all discovered accounts.
  try {
    const total = await count(b, H, '?count=true');
    const managed = await count(b, H, `?count=true&filter=${encodeURIComponent('HasPassword eq true')}`);
    if (Number.isFinite(total) && total > 0 && Number.isFinite(managed)) {
      signals.push({ key: 'pam_pct', value: Math.round((managed / total) * 100), asOf: nowIso(), raw: { total, managed } });
    }
  } catch (_) { /* confirm the account can read AssetAccounts */ }
  if (!signals.length) throw new Error('Authenticated, but no readable signals — confirm the account can read AssetAccounts.');
  return { signals, meta: { vendor: 'One Identity' } };
}

module.exports = {
  key: 'oneidentity', label: 'One Identity Safeguard', vendor: 'One Identity', category: 'Privileged access (PAM)',
  signals: ['pam_pct'],
  scopes: ['Auditor (read-only) — read AssetAccounts'],
  fields: [
    { key: 'appliance', label: 'Appliance URL (https://safeguard.example.com)' },
    { key: 'username', label: 'Client ID / username' },
    { key: 'secret', label: 'Password / client secret', secret: true },
    { key: 'provider', label: 'Login provider id (optional — defaults to local)', optional: true },
  ],
  test, fetchSignals,
};
