'use strict';

/**
 * Okta Identity Governance connector (read-only, SSWS API token → Okta Governance
 * + core API). Fills access_review_pct — access-certification campaign completion
 * (completed reviews ÷ total) via /governance/api/v1/campaigns — and
 * dormant_accounts — suspended users plus users with no login in ~90d via
 * /api/v1/users. Built to the documented Okta IGA contract; validate against a
 * real org with a read-only API token before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.orgUrl || '').replace(/\/+$/, '');
const authH = (creds) => ({ Authorization: `SSWS ${creds.apiToken}`, Accept: 'application/json' });

async function test(creds) {
  if (!base(creds) || !creds.apiToken) throw new Error('Okta org URL and API token are required.');
  await jsonOrThrow(await http(`${base(creds)}/governance/api/v1/campaigns?limit=1`, { headers: authH(creds) }), 'Okta IGA');
  return { ok: true, detail: 'Authenticated to the Okta Identity Governance API.' };
}

async function fetchSignals(creds) {
  const H = authH(creds);
  const b = base(creds);
  const signals = [];
  // Access-certification completion across governance campaigns.
  const cj = await jsonOrThrow(await http(`${b}/governance/api/v1/campaigns?limit=200`, { headers: H }), 'Okta IGA');
  const campaigns = cj.data || cj.campaigns || (Array.isArray(cj) ? cj : []);
  let completed = 0;
  let total = 0;
  for (const c of campaigns) {
    const s = c.statistics || c.reviewStatistics || c;
    const done = Number(s.completedReviewCount != null ? s.completedReviewCount : s.completedCount);
    const all = Number(s.totalReviewCount != null ? s.totalReviewCount : s.totalCount);
    if (Number.isFinite(done)) completed += done;
    if (Number.isFinite(all)) total += all;
  }
  if (total > 0) {
    signals.push({ key: 'access_review_pct', value: Math.round((completed / total) * 100), asOf: nowIso(), raw: { campaigns: campaigns.length, completed, total } });
  }
  // Dormant accounts — suspended users plus active users with no login in ~90d. Optional.
  try {
    const cutoff = Date.now() - 90 * 864e5;
    const suspended = (await jsonOrThrow(await http(`${b}/api/v1/users?filter=${encodeURIComponent('status eq "SUSPENDED"')}&limit=200`, { headers: H }), 'Okta IGA')) || [];
    const active = (await jsonOrThrow(await http(`${b}/api/v1/users?filter=${encodeURIComponent('status eq "ACTIVE"')}&limit=200`, { headers: H }), 'Okta IGA')) || [];
    const stale = active.filter((u) => {
      const t = u.lastLogin ? Date.parse(u.lastLogin) : NaN;
      return !u.lastLogin || (Number.isFinite(t) && t < cutoff);
    }).length;
    const dormant = suspended.length + stale;
    signals.push({ key: 'dormant_accounts', value: dormant, asOf: nowIso(), raw: { suspended: suspended.length, staleActive: stale } });
  } catch (_) { /* confirm the token can read users */ }
  if (!signals.length) throw new Error('Authenticated, but no readable signals — confirm governance campaigns exist and the token can read them.');
  return { signals, meta: { vendor: 'Okta' } };
}

module.exports = {
  key: 'okta_iga', label: 'Okta Identity Governance', vendor: 'Okta', category: 'Access governance / IGA',
  signals: ['access_review_pct', 'dormant_accounts'],
  scopes: ['okta.governance.accessCertifications.read', 'okta.users.read'],
  fields: [
    { key: 'orgUrl', label: 'Okta org URL (https://yourorg.okta.com)' },
    { key: 'apiToken', label: 'API token (SSWS)', secret: true },
  ],
  test, fetchSignals,
};
