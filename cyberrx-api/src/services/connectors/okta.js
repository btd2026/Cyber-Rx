'use strict';

/**
 * Okta connector (read-only, SSWS API token → Okta core API).
 *
 * Fills mfa_pct — multi-factor enrollment coverage across ACTIVE users, computed
 * by sampling factor enrollment (bounded to keep the call count low). Built to
 * the documented Okta API contract; validate against a real org with a read-only
 * API token (or OAuth scopes okta.users.read / okta.factors.read) before relying
 * on it. Mirrors the entra.js connector shape so the registry/scheduler treat it
 * identically.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.orgUrl || creds.domain || '').replace(/\/+$/, '');
// One-click OAuth → Bearer access token; classic API token → SSWS.
const bearer = (creds) => (creds.oauth && creds.oauth.access_token) || creds.access_token || null;
const authH = (creds) => ({ Authorization: bearer(creds) ? `Bearer ${bearer(creds)}` : `SSWS ${creds.apiToken}`, Accept: 'application/json' });

async function test(creds) {
  if (!base(creds) || !(creds.apiToken || bearer(creds))) throw new Error('Okta org URL and an API token (or OAuth connection) are required.');
  await jsonOrThrow(await http(`${base(creds)}/api/v1/users?limit=1`, { headers: authH(creds) }), 'Okta');
  return { ok: true, detail: 'Authenticated to the Okta API.' };
}

async function fetchSignals(creds) {
  const H = authH(creds);
  const b = base(creds);
  const signals = [];
  // MFA factor-enrollment coverage across active users (sampled to bound calls).
  try {
    const users = (await jsonOrThrow(await http(`${b}/api/v1/users?filter=${encodeURIComponent('status eq "ACTIVE"')}&limit=200`, { headers: H }), 'Okta')) || [];
    if (users.length) {
      const sample = users.slice(0, 50);
      let enrolled = 0;
      let checked = 0;
      for (const u of sample) {
        try {
          const factors = (await jsonOrThrow(await http(`${b}/api/v1/users/${u.id}/factors`, { headers: H }), 'Okta')) || [];
          checked += 1;
          if (factors.some((f) => f.status === 'ACTIVE')) enrolled += 1;
        } catch (_) { /* skip a user we can't read */ }
      }
      if (checked) signals.push({ key: 'mfa_pct', value: Math.round((enrolled / checked) * 100), asOf: nowIso(), raw: { activeUsers: users.length, sampled: checked, enrolled } });
    }
  } catch (_) { /* confirm token scopes — see scopes below */ }
  if (!signals.length) throw new Error('Authenticated, but no readable signals — confirm the token can read users and factors.');
  return { signals, meta: { vendor: 'Okta' } };
}

module.exports = {
  key: 'okta', label: 'Okta', vendor: 'Okta', category: 'Identity',
  signals: ['mfa_pct'],
  scopes: ['okta.users.read', 'okta.factors.read'],
  fields: [
    { key: 'orgUrl', label: 'Okta org URL (https://yourorg.okta.com)' },
    { key: 'apiToken', label: 'API token (SSWS)', secret: true },
  ],
  test, fetchSignals,
};
