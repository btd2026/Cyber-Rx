'use strict';

/**
 * Orca Security connector (read-only, API token → Orca REST API).
 *
 * Fills cspm_pct — cloud-posture compliance: the share of compliance checks
 * (controls/tests) across the connected cloud estate that PASS. Orca exposes
 * this via the documented `Authorization: Token <token>` scheme against
 * api.orcasecurity.io; the compliance endpoint returns per-control pass/fail
 * status which we aggregate. Built to the documented Orca API contract; the
 * exact compliance field names vary by tenant, so validate against a real
 * tenant with a read-only API token before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.baseUrl || 'https://api.orcasecurity.io').replace(/\/+$/, '');
const authH = (creds) => ({ Authorization: `Token ${creds.apiToken}`, Accept: 'application/json' });

// Sum passing vs total controls across the compliance frameworks response.
function tally(payload) {
  const rows = (payload && (payload.data || payload.results || payload)) || [];
  let pass = 0;
  let total = 0;
  for (const r of Array.isArray(rows) ? rows : []) {
    const p = Number(r.passed_controls ?? r.passed ?? r.compliant ?? r.pass ?? 0);
    const f = Number(r.failed_controls ?? r.failed ?? r.non_compliant ?? r.fail ?? 0);
    const t = Number(r.total_controls ?? r.total ?? (p + f));
    if (Number.isFinite(t) && t > 0) { pass += Number.isFinite(p) ? p : 0; total += t; }
  }
  return { pass, total };
}

async function test(creds) {
  if (!creds.apiToken) throw new Error('Orca API token is required.');
  await jsonOrThrow(await http(`${base(creds)}/api/compliance`, { headers: authH(creds) }), 'Orca');
  return { ok: true, detail: 'Authenticated to the Orca Security API.' };
}

async function fetchSignals(creds) {
  const H = authH(creds);
  const signals = [];
  try {
    const j = await jsonOrThrow(await http(`${base(creds)}/api/compliance`, { headers: H }), 'Orca');
    const { pass, total } = tally(j);
    if (total > 0) {
      signals.push({ key: 'cspm_pct', value: Math.round((pass / total) * 100), asOf: nowIso(), raw: { pass, total } });
    }
  } catch (e) { if (/HTTP 4/.test(e.message)) throw e; /* else fall through to no-signal error */ }
  if (!signals.length) throw new Error('Authenticated, but no compliance controls were readable — confirm the token can read compliance data.');
  return { signals, meta: { vendor: 'Orca' } };
}

module.exports = {
  key: 'orca', label: 'Orca Security', vendor: 'Orca', category: 'Cloud security posture (CSPM)',
  signals: ['cspm_pct'],
  scopes: ['read:compliance'],
  fields: [
    { key: 'apiToken', label: 'Orca API token', secret: true },
    { key: 'baseUrl', label: 'API base URL (optional — defaults to https://api.orcasecurity.io)', optional: true },
  ],
  test, fetchSignals,
};
