'use strict';

/**
 * SailPoint Identity Security Cloud connector (read-only, OAuth2 client
 * credentials → IdentityNow v3 API). Fills access_review_pct — access /
 * entitlement certification completion across active review campaigns, the
 * evidence behind periodic access reviews (NIST CSF PR.AA-05). Built to the
 * documented IdentityNow contract; validate against a real tenant with a
 * read-only PAT (client id/secret) before relying on it. Mirrors the entra.js
 * OAuth shape so the registry/scheduler treat it identically.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.baseUrl || (creds.tenant ? `https://${creds.tenant}.api.identitynow.com` : '')).replace(/\/+$/, '');

async function token(creds) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials', client_id: creds.clientId, client_secret: creds.clientSecret,
  });
  const r = await http(`${base(creds)}/oauth/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await jsonOrThrow(r, 'SailPoint');
  if (!j.access_token) throw new Error('SailPoint: no access token returned.');
  return j.access_token;
}

async function test(creds) {
  if (!base(creds) || !creds.clientId || !creds.clientSecret) {
    throw new Error('SailPoint tenant (or base URL), client ID and client secret are required.');
  }
  const tk = await token(creds);
  await jsonOrThrow(await http(`${base(creds)}/v3/certification-campaigns?limit=1`, { headers: { Authorization: `Bearer ${tk}`, Accept: 'application/json' } }), 'SailPoint');
  return { ok: true, detail: 'Authenticated to the IdentityNow API.' };
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  const H = { Authorization: `Bearer ${tk}`, Accept: 'application/json' };
  const signals = [];
  // Access-review completion across active certification campaigns.
  try {
    const campaigns = (await jsonOrThrow(await http(`${base(creds)}/v3/certification-campaigns?filters=${encodeURIComponent('status eq "ACTIVE"')}&limit=250`, { headers: H }), 'SailPoint')) || [];
    let completed = 0;
    let total = 0;
    for (const c of campaigns) {
      const done = Number(c.completedCertifications);
      const all = Number(c.totalCertifications);
      if (Number.isFinite(done)) completed += done;
      if (Number.isFinite(all)) total += all;
    }
    if (total > 0) {
      signals.push({ key: 'access_review_pct', value: Math.round((completed / total) * 100), asOf: nowIso(), raw: { campaigns: campaigns.length, completed, total } });
    }
  } catch (_) { /* confirm the token can read certification-campaigns */ }
  if (!signals.length) throw new Error('Authenticated, but no readable signals — confirm there are active certification campaigns and the token can read them.');
  return { signals, meta: { vendor: 'SailPoint' } };
}

module.exports = {
  key: 'sailpoint', label: 'SailPoint Identity Security Cloud', vendor: 'SailPoint', category: 'Identity Governance',
  signals: ['access_review_pct'],
  scopes: ['idn:certification-campaigns:read'],
  fields: [
    { key: 'tenant', label: 'Tenant (yourorg in https://yourorg.api.identitynow.com)' },
    { key: 'baseUrl', label: 'Base URL (optional — overrides tenant)', optional: true },
    { key: 'clientId', label: 'Client ID (PAT)' },
    { key: 'clientSecret', label: 'Client secret (PAT)', secret: true },
  ],
  test, fetchSignals,
};
