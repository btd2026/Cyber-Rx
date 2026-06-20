'use strict';

/**
 * Splunk connector (read-only, token auth via the REST API). Runs a oneshot
 * search for notable events over 30 days and reads MTTD/MTTR when the search
 * exposes them. Detection content varies per deployment, so the search is
 * overridable; validate against a real instance before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

function base(creds) { return (creds.baseUrl || '').replace(/\/$/, ''); }
function authHeaders(creds) { return { Authorization: `Bearer ${creds.token}`, Accept: 'application/json' }; }

async function test(creds) {
  if (!creds.baseUrl || !creds.token) throw new Error('Splunk base URL and a REST token are required.');
  await jsonOrThrow(await http(`${base(creds)}/services/server/info?output_mode=json`, { headers: authHeaders(creds) }), 'Splunk');
  return { ok: true, detail: 'Authenticated to Splunk REST API.' };
}

// Default search: count notable events and average detect/resolve latency (hours)
// from Enterprise Security's notable index, if present. Overridable via creds.search.
const DEFAULT_SEARCH =
  'search `notable` earliest=-30d | stats count as events, ' +
  'avg(eval((info_min_time-_time)/3600)) as mttd_hrs, ' +
  'avg(eval((now()-_time)/3600)) as mttr_hrs';

async function fetchSignals(creds) {
  const H = { ...authHeaders(creds), 'Content-Type': 'application/x-www-form-urlencoded' };
  const body = new URLSearchParams({ search: creds.search || DEFAULT_SEARCH, output_mode: 'json', exec_mode: 'oneshot' });
  const j = await jsonOrThrow(await http(`${base(creds)}/services/search/jobs`, { method: 'POST', headers: H, body }), 'Splunk');
  const row = (j.results && j.results[0]) || {};
  const signals = [];
  const num = (v) => { const x = Number(v); return Number.isFinite(x) ? Math.round(x * 10) / 10 : null; };
  if (row.events != null) signals.push({ key: 'notable_events_30d', value: num(row.events), asOf: nowIso(), raw: {} });
  if (num(row.mttd_hrs) != null) signals.push({ key: 'mttd_hrs', value: num(row.mttd_hrs), asOf: nowIso(), raw: {} });
  if (num(row.mttr_hrs) != null) signals.push({ key: 'mttr_hrs', value: num(row.mttr_hrs), asOf: nowIso(), raw: {} });
  if (!signals.length) throw new Error('Search returned no rows — adjust the search to your detection content.');
  return { signals, meta: { vendor: 'Splunk' } };
}

module.exports = {
  key: 'splunk', label: 'Splunk', vendor: 'Splunk', category: 'SIEM / Detection',
  signals: ['mttd_hrs', 'mttr_hrs', 'notable_events_30d'],
  scopes: ['REST search (read-only role)'],
  fields: [
    { key: 'baseUrl', label: 'Management URL (e.g. https://splunk.example.com:8089)' },
    { key: 'token', label: 'REST API token', secret: true },
    { key: 'search', label: 'Override search (optional)', optional: true },
  ],
  test, fetchSignals,
};
