'use strict';
const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');
const sinceOf = (p) => (p && p.start) ? p.start : new Date(Date.now() - 90 * 864e5).toISOString();

// Splunk — SI-4 monitoring evidence via the read-only REST search API (base URL
// + bearer token). Reporting hosts via `| tstats dc(host)`, notable detections
// raised in the period, and whether saved-search alert actions are configured.
// Best-effort; validate against a live Splunk instance before trusting counts.
async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const base = String(c.baseUrl || c.base_url || '').replace(/\/+$/, '');
  const token = c.token || c.apiToken || c.api_token;
  if (!base || !token) return {};
  const headers = { Authorization: 'Bearer ' + token, Accept: 'application/json' };
  const since = sinceOf(ctx.period);
  const earliest = Math.floor(Date.parse(since) / 1000) || '-90d';
  const out = {};
  const oneshot = async (search) => {
    const h = Object.assign({}, headers, { 'Content-Type': 'application/x-www-form-urlencoded' });
    const body = new URLSearchParams({ search, output_mode: 'json', exec_mode: 'oneshot' });
    const j = await jsonOrThrow(await H(base + '/services/search/jobs', { method: 'POST', headers: h, body }), 'Splunk');
    return (j.results && j.results[0]) || {};
  };
  // Distinct reporting hosts over the review period = monitoring denominator.
  let reporting = null;
  try {
    const r = await oneshot('| tstats dc(host) as sources where index=* earliest=' + earliest);
    const n = Number(r.sources);
    if (Number.isFinite(n) && n >= 0) { reporting = Math.round(n); out.monitoring_scope_denominator = reporting; }
  } catch (_) {}
  // Notable/detection events raised in the period.
  try {
    const r = await oneshot('search `notable` earliest=' + earliest + ' | stats count as events');
    const n = Number(r.events);
    if (Number.isFinite(n) && n >= 0) out.detection_events = Math.round(n);
  } catch (_) {}
  // Alert forwarding: any saved search with an alert action configured.
  try {
    const j = await jsonOrThrow(await H(base + '/services/saved/searches?output_mode=json&count=0', { headers }), 'Splunk');
    const entries = Array.isArray(j.entry) ? j.entry : [];
    if (entries.length) {
      out.alert_forwarding = entries.some((e) => {
        const ct = (e && e.content) || {};
        return (ct.actions && String(ct.actions).trim().length > 0) || ct['alert.track'] === true || ct['alert.track'] === '1';
      });
    }
  } catch (_) {}
  // Coverage vs an expected critical-source count, only when one is configured.
  const expected = Number(c.expectedLogSources || c.expected_log_sources || c.criticalLogSources || c.critical_log_sources);
  if (reporting != null && Number.isFinite(expected) && expected > 0) {
    out.critical_log_source_coverage_pct = Math.max(0, Math.min(100, Math.round((reporting / expected) * 100)));
    out.missing_critical_log_sources = Math.max(0, expected - reporting);
  }
  return out;
}
module.exports = { key: 'splunk', collect };
