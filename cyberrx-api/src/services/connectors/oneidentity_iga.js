'use strict';

/**
 * One Identity Manager connector (read-only, session/bearer auth → API Server
 * REST). Fills access_review_pct — attestation-run completion (completed cases ÷
 * total) — and dormant_accounts — count of inactive/disabled identities. Built to
 * the documented One Identity Manager API Server contract (POST {baseUrl}/imx/login
 * for a session token, then the imx entity endpoints for AttestationCase and
 * Person). Distinct from the PAM connector `oneidentity`; validate against a real
 * API Server with a read-only account before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.baseUrl || '').replace(/\/+$/, '');

async function login(creds) {
  const r = await http(`${base(creds)}/imx/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ Module: 'RoleBasedManager', User: creds.username, Password: creds.password }),
  });
  const j = await jsonOrThrow(r, 'One Identity');
  const tk = j.access_token || j.SessionToken || j.token;
  if (!tk) throw new Error('One Identity: no session token returned.');
  return tk;
}

async function test(creds) {
  if (!base(creds) || !creds.username || !creds.password) {
    throw new Error('One Identity Manager base URL, username and password are required.');
  }
  await login(creds);
  return { ok: true, detail: 'Authenticated to the One Identity Manager API Server.' };
}

async function fetchSignals(creds) {
  const tk = await login(creds);
  const H = { Authorization: `Bearer ${tk}`, Accept: 'application/json' };
  const b = base(creds);
  const signals = [];
  // Attestation (access-review) completion across attestation cases.
  const aj = await jsonOrThrow(await http(`${b}/imx/entity/AttestationCase?PageSize=1000`, { headers: H }), 'One Identity');
  const cases = aj.Entities || aj.entities || aj.value || [];
  let completed = 0;
  const total = cases.length;
  for (const c of cases) {
    const v = c.Columns || c.columns || c;
    const closed = (v.IsClosed && (v.IsClosed.Value != null ? v.IsClosed.Value : v.IsClosed)) === true;
    const decided = v.AttestationState && String((v.AttestationState.Value != null ? v.AttestationState.Value : v.AttestationState)).toLowerCase() !== 'pending';
    if (closed || decided) completed += 1;
  }
  if (total > 0) {
    signals.push({ key: 'access_review_pct', value: Math.round((completed / total) * 100), asOf: nowIso(), raw: { cases: total, completed } });
  }
  // Dormant identities — Person entries flagged inactive/disabled. Optional.
  try {
    const pj = await jsonOrThrow(await http(`${b}/imx/entity/Person?where=${encodeURIComponent("IsInActive = 1")}&PageSize=1000`, { headers: H }), 'One Identity');
    const people = pj.Entities || pj.entities || pj.value || [];
    const dormant = people.filter((p) => {
      const v = p.Columns || p.columns || p;
      const inactive = v.IsInActive && (v.IsInActive.Value != null ? v.IsInActive.Value : v.IsInActive);
      return inactive === true || inactive === 1 || inactive === '1';
    }).length;
    signals.push({ key: 'dormant_accounts', value: dormant, asOf: nowIso(), raw: { returned: people.length, dormant } });
  } catch (_) { /* confirm the account can read Person entities */ }
  if (!signals.length) throw new Error('Authenticated, but no readable signals — confirm attestation cases exist and the account can read them.');
  return { signals, meta: { vendor: 'One Identity' } };
}

module.exports = {
  key: 'oneidentity_iga', label: 'One Identity Manager', vendor: 'One Identity', category: 'Access governance / IGA',
  signals: ['access_review_pct', 'dormant_accounts'],
  scopes: ['read-only API Server account (RoleBasedManager)'],
  fields: [
    { key: 'baseUrl', label: 'API Server base URL (https://apihost/AppServer)' },
    { key: 'username', label: 'Service-account username' },
    { key: 'password', label: 'Service-account password', secret: true },
  ],
  test, fetchSignals,
};
