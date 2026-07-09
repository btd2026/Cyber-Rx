'use strict';

/**
 * Microsoft Sentinel connector (read-only, OAuth2 client credentials → Log
 * Analytics query API). Fills mttd_hrs / mttr_hrs / open_incidents from the
 * SecurityIncident table over a 30-day window via KQL. Built to the documented
 * Log Analytics + Sentinel contract; validate against a real workspace with
 * Log Analytics Reader / Microsoft Sentinel Reader before relying on it.
 * Mirrors the entra.js OAuth shape so the registry/scheduler treat it
 * identically.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const LA_RESOURCE = 'https://api.loganalytics.io';

async function token(creds) {
  const body = new URLSearchParams({
    client_id: creds.clientId, client_secret: creds.clientSecret,
    scope: `${LA_RESOURCE}/.default`, grant_type: 'client_credentials',
  });
  const r = await http(`https://login.microsoftonline.com/${encodeURIComponent(creds.tenantId)}/oauth2/v2.0/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await jsonOrThrow(r, 'Sentinel');
  if (!j.access_token) throw new Error('Sentinel: no access token returned.');
  return j.access_token;
}

async function query(creds, tk, kql) {
  const r = await http(`${LA_RESOURCE}/v1/workspaces/${encodeURIComponent(creds.workspaceId)}/query`,
    { method: 'POST', headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: kql }) });
  return jsonOrThrow(r, 'Sentinel');
}

// Map the first result table's single row to an object keyed by column name.
function firstRow(j) {
  const table = (j.tables || []).find((t) => t.name === 'PrimaryResult') || (j.tables || [])[0];
  if (!table || !table.rows || !table.rows.length) return null;
  const cols = (table.columns || []).map((c) => c.name);
  const row = table.rows[0];
  return cols.reduce((o, name, i) => { o[name] = row[i]; return o; }, {});
}

// Latest record per incident over 30d, then detect latency (created - first
// activity), resolve latency (closed - created) for closed incidents, and the
// count of still-open incidents. Overridable via creds.query.
const DEFAULT_KQL =
  'SecurityIncident | where TimeGenerated > ago(30d) ' +
  '| summarize arg_max(TimeGenerated, *) by IncidentNumber ' +
  '| summarize open_incidents = countif(Status != "Closed"), ' +
  "mttd_hrs = avg(datetime_diff('minute', CreatedTime, FirstActivityTime)) / 60.0, " +
  "mttr_hrs = avgif(datetime_diff('minute', ClosedTime, CreatedTime), Status == \"Closed\") / 60.0";

// Distinct hosts reporting heartbeat in the last 24h = live log-source count.
const DEFAULT_COVERAGE_KQL =
  'Heartbeat | where TimeGenerated > ago(24h) | summarize sources = dcount(Computer)';

async function test(creds) {
  if (!creds.tenantId || !creds.clientId || !creds.clientSecret || !creds.workspaceId) {
    throw new Error('Tenant ID, client ID, client secret and Log Analytics workspace ID are required.');
  }
  const tk = await token(creds);
  await query(creds, tk, 'print ok = 1'); // validates token scope + workspace access
  return { ok: true, detail: 'Authenticated to the Log Analytics query API.' };
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  const signals = [];
  const num = (v) => { const x = Number(v); return Number.isFinite(x) ? Math.round(x * 10) / 10 : null; };
  try {
    const row = firstRow(await query(creds, tk, creds.query || DEFAULT_KQL)) || {};
    if (row.open_incidents != null) signals.push({ key: 'open_incidents', value: num(row.open_incidents), asOf: nowIso(), raw: {} });
    if (num(row.mttd_hrs) != null) signals.push({ key: 'mttd_hrs', value: num(row.mttd_hrs), asOf: nowIso(), raw: {} });
    if (num(row.mttr_hrs) != null) signals.push({ key: 'mttr_hrs', value: num(row.mttr_hrs), asOf: nowIso(), raw: {} });
  } catch (_) { /* confirm the workspace has the SecurityIncident table (Sentinel enabled) */ }
  // Best-effort log-source coverage: distinct hosts sending heartbeat in the
  // last 24h — the real reporting-host count the app turns into SIEM coverage.
  try {
    const hb = firstRow(await query(creds, tk, creds.coverageQuery || DEFAULT_COVERAGE_KQL)) || {};
    if (hb.sources != null && Number.isFinite(Number(hb.sources))) {
      signals.push({ key: 'siem_log_sources', value: Math.round(Number(hb.sources)), asOf: nowIso(), raw: {} });
    }
  } catch (_) { /* Heartbeat table optional in this workspace */ }
  if (!signals.length) throw new Error('Authenticated, but no readable signals — confirm Sentinel is enabled and the SecurityIncident table has data.');
  return { signals, meta: { vendor: 'Microsoft Sentinel' } };
}

module.exports = {
  key: 'sentinel', label: 'Microsoft Sentinel', vendor: 'Microsoft', category: 'SIEM / Detection',
  signals: ['mttd_hrs', 'mttr_hrs', 'open_incidents', 'siem_log_sources'],
  scopes: ['Log Analytics Reader', 'Microsoft Sentinel Reader'],
  fields: [
    { key: 'tenantId', label: 'Directory (tenant) ID' },
    { key: 'clientId', label: 'Application (client) ID' },
    { key: 'clientSecret', label: 'Client secret', secret: true },
    { key: 'workspaceId', label: 'Log Analytics workspace ID' },
    { key: 'query', label: 'Override KQL (optional)', optional: true },
  ],
  test, fetchSignals,
};
