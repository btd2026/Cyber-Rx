'use strict';
const { http: defaultHttp } = require('../../../services/connectors/http');
const sinceOf = (p) => (p && p.start) ? p.start : new Date(Date.now() - 90 * 864e5).toISOString();

// IBM QRadar — SI-4 monitoring evidence via SEC-token auth. Configured log
// sources = monitoring denominator, open offenses whose start_time falls in the
// period = detections, and readable enabled analytics/offense rules = alert
// forwarding (best-effort). Totals read from the paged Content-Range header.
// Validate against a live appliance before trusting counts.
async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const base = String(c.baseUrl || c.base_url || '').replace(/\/+$/, '');
  const token = c.token || c.secToken || c.sec_token;
  if (!base || !token) return {};
  const headers = { SEC: token, Accept: 'application/json' };
  const since = sinceOf(ctx.period);
  const out = {};
  // Request a single item and read the total from the Content-Range response
  // header ("items 0-0/<total>"); fall back to array length.
  const totalOf = async (path) => {
    const r = await H(base + path, { headers: Object.assign({}, headers, { Range: 'items=0-0' }) });
    if (!r || !r.ok) throw new Error('QRadar HTTP ' + (r ? r.status : '?'));
    const cr = r.headers.get('Content-Range') || r.headers.get('content-range');
    if (cr && cr.includes('/')) { const n = Number(cr.split('/').pop()); if (Number.isFinite(n)) return n; }
    try { const a = await r.json(); if (Array.isArray(a)) return a.length; } catch (_) {}
    return null;
  };
  // Monitoring denominator: configured log sources.
  let reporting = null;
  try {
    const n = await totalOf('/api/config/event_sources/log_source_management/log_sources?fields=id');
    if (n != null) { reporting = Math.round(n); out.monitoring_scope_denominator = reporting; }
  } catch (_) {}
  // Detections: open offenses whose start_time is within the period.
  try {
    const startMs = Date.parse(since);
    const filter = Number.isFinite(startMs) ? ('status=OPEN and start_time>' + startMs) : 'status=OPEN';
    const n = await totalOf('/api/siem/offenses?filter=' + encodeURIComponent(filter) + '&fields=id');
    if (n != null) out.detection_events = Math.round(n);
  } catch (_) {}
  // Alert forwarding: readable enabled analytics/offense rules (best-effort).
  try {
    const n = await totalOf('/api/analytics/rules?filter=' + encodeURIComponent('enabled=true') + '&fields=id');
    if (n != null) out.alert_forwarding = n > 0;
  } catch (_) {}
  const expected = Number(c.expectedLogSources || c.expected_log_sources || c.criticalLogSources || c.critical_log_sources);
  if (reporting != null && Number.isFinite(expected) && expected > 0) {
    out.critical_log_source_coverage_pct = Math.max(0, Math.min(100, Math.round((reporting / expected) * 100)));
    out.missing_critical_log_sources = Math.max(0, expected - reporting);
  }
  return out;
}
module.exports = { key: 'qradar', collect };
