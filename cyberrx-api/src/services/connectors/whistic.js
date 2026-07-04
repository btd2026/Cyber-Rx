'use strict';

/**
 * Whistic connector (read-only, Whistic API) — a security-review / Trust-Center
 * automation platform.
 *
 * Fills the Business-Growth throughput signals so they stop being hand-entered:
 *   reviews_cleared_qtr — customer/vendor security reviews (questionnaires,
 *                         assessments) completed this quarter — "deals kept, not
 *                         lost to security concerns"
 *   review_cycle_wks    — the average review turnaround (created → completed),
 *                         in weeks — the cycle time that gates a deal
 *
 * Auth is the documented API bearer token. Built to the documented Whistic
 * assessments contract; SafeBase / Conveyor expose the same shape and can be
 * pointed at via `apiUrl`. Validate against your tenant before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.apiUrl || 'https://api.whistic.com').replace(/\/+$/, '');
const authH = (creds) => ({ Authorization: `Bearer ${creds.apiToken}`, Accept: 'application/json' });
const quarterStart = () => { const d = new Date(nowIso()); return new Date(Date.UTC(d.getUTCFullYear(), Math.floor(d.getUTCMonth() / 3) * 3, 1)).getTime(); };

async function fetchAssessments(creds) {
  const j = await jsonOrThrow(await http(`${base(creds)}/v1/assessments?status=completed&limit=500`, { headers: authH(creds) }), 'Whistic');
  return (j && (j.assessments || j.data || j.results)) || [];
}

async function test(creds) {
  if (!creds.apiToken) throw new Error('Whistic API token is required.');
  await jsonOrThrow(await http(`${base(creds)}/v1/assessments?limit=1`, { headers: authH(creds) }), 'Whistic');
  return { ok: true, detail: 'Authenticated to the Whistic API.' };
}

async function fetchSignals(creds) {
  const rows = await fetchAssessments(creds);
  const qStart = quarterStart();
  const signals = [];
  const completedThisQ = rows.filter((r) => { const c = Date.parse(r.completedAt || r.completed_at || r.dateCompleted || ''); return Number.isFinite(c) && c >= qStart; });
  signals.push({ key: 'reviews_cleared_qtr', value: completedThisQ.length, asOf: nowIso(), raw: { totalCompleted: rows.length, thisQuarter: completedThisQ.length } });
  // Average turnaround in weeks over completed reviews with both timestamps.
  const spans = rows.map((r) => {
    const s = Date.parse(r.createdAt || r.created_at || r.dateCreated || '');
    const c = Date.parse(r.completedAt || r.completed_at || r.dateCompleted || '');
    return (Number.isFinite(s) && Number.isFinite(c) && c >= s) ? (c - s) : null;
  }).filter((x) => x != null);
  if (spans.length) {
    const avgWeeks = Math.round((spans.reduce((a, b) => a + b, 0) / spans.length) / (7 * 864e5) * 10) / 10;
    signals.push({ key: 'review_cycle_wks', value: avgWeeks, asOf: nowIso(), raw: { measured: spans.length } });
  }
  if (!rows.length && !signals.some((s) => s.value)) throw new Error('Authenticated, but no completed assessments were readable — confirm the token can read assessments.');
  return { signals, meta: { vendor: 'Whistic' } };
}

module.exports = {
  key: 'whistic', label: 'Whistic (Trust Center)', vendor: 'Whistic', category: 'Security Review / Trust Center', tier: 'paid',
  signals: ['reviews_cleared_qtr', 'review_cycle_wks'],
  scopes: ['Assessments — read'],
  fields: [
    { key: 'apiToken', label: 'API token', secret: true },
    { key: 'apiUrl', label: 'API URL (optional — SafeBase / Conveyor expose the same shape)', optional: true },
  ],
  test, fetchSignals,
};
