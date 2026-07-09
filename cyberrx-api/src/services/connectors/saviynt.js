'use strict';

/**
 * Saviynt EIC connector (read-only, token login → EIC REST API). Fills
 * access_review_pct — certification-campaign completion (items completed ÷ total)
 * — and dormant_accounts — count of inactive/disabled user records. Built to the
 * documented Saviynt EIC REST contract (POST /ECM/api/login for a bearer token,
 * then /ECM/api/v5/getCertificationList and /ECM/api/v5/getUser); validate against
 * a real instance with a read-only service account before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.baseUrl || '').replace(/\/+$/, '');

async function token(creds) {
  const r = await http(`${base(creds)}/ECM/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ username: creds.username, password: creds.password }),
  });
  const j = await jsonOrThrow(r, 'Saviynt');
  const tk = j.access_token || j.accessToken || j.token;
  if (!tk) throw new Error('Saviynt: no access token returned.');
  return tk;
}

async function test(creds) {
  if (!base(creds) || !creds.username || !creds.password) {
    throw new Error('Saviynt base URL, username and password are required.');
  }
  await token(creds);
  return { ok: true, detail: 'Authenticated to the Saviynt EIC REST API.' };
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  const H = { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json', Accept: 'application/json' };
  const b = base(creds);
  const signals = [];
  // Access-review completion across certification campaigns.
  const cr = await http(`${b}/ECM/api/v5/getCertificationList`, { method: 'POST', headers: H, body: JSON.stringify({ max: 250 }) });
  const cj = await jsonOrThrow(cr, 'Saviynt');
  const certs = cj.certifications || cj.results || cj.certificationlist || [];
  let completed = 0;
  let total = 0;
  for (const c of certs) {
    const done = Number(c.completedItems != null ? c.completedItems : c.completedCount);
    const all = Number(c.totalItems != null ? c.totalItems : c.totalCount);
    if (Number.isFinite(done)) completed += done;
    if (Number.isFinite(all)) total += all;
  }
  if (total > 0) {
    signals.push({ key: 'access_review_pct', value: Math.round((completed / total) * 100), asOf: nowIso(), raw: { campaigns: certs.length, completed, total } });
  }
  // Dormant / inactive accounts — users flagged inactive (statuskey 0). Optional.
  try {
    const ur = await http(`${b}/ECM/api/v5/getUser`, { method: 'POST', headers: H, body: JSON.stringify({ statuskey: '0', max: 500 }) });
    const uj = await jsonOrThrow(ur, 'Saviynt');
    const users = uj.userlist || uj.users || uj.results || [];
    const dormant = users.filter((u) => String(u.statuskey != null ? u.statuskey : u.status) === '0' || String(u.statusValue || '').toLowerCase() === 'inactive').length;
    signals.push({ key: 'dormant_accounts', value: dormant, asOf: nowIso(), raw: { returned: users.length, dormant } });
  } catch (_) { /* confirm the service account can read getUser */ }
  if (!signals.length) throw new Error('Authenticated, but no readable signals — confirm certification campaigns exist and the account can read them.');
  return { signals, meta: { vendor: 'Saviynt' } };
}

module.exports = {
  key: 'saviynt', label: 'Saviynt', vendor: 'Saviynt', category: 'Access governance / IGA',
  signals: ['access_review_pct', 'dormant_accounts'],
  scopes: ['ROLE_ADMIN (read-only service account)'],
  fields: [
    { key: 'baseUrl', label: 'Saviynt base URL (https://yourtenant.saviyntcloud.com)' },
    { key: 'username', label: 'Service-account username' },
    { key: 'password', label: 'Service-account password', secret: true },
  ],
  test, fetchSignals,
};
