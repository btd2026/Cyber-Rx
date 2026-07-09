'use strict';
const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');
const sinceOf = (p) => (p && p.start) ? p.start : new Date(Date.now() - 90 * 864e5).toISOString();

// Elastic Security — SI-4 monitoring evidence via Kibana ApiKey auth. Reporting
// hosts from an Elasticsearch host.name cardinality agg (falls back to the
// _cat/indices count), open detection-engine signals in the period =
// detections, and detection rules carrying actions = alert forwarding.
// Best-effort; validate against a live deployment before trusting counts.
async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const kbn = String(c.kibanaUrl || c.kibana_url || '').replace(/\/+$/, '');
  const esUrl = String(c.esUrl || c.es_url || '').replace(/\/+$/, '');
  const apiKey = c.apiKey || c.api_key;
  if (!kbn || !apiKey) return {};
  const auth = { Authorization: 'ApiKey ' + apiKey, Accept: 'application/json' };
  const kbnH = Object.assign({}, auth, { 'Content-Type': 'application/json', 'kbn-xsrf': 'nerion' });
  const since = sinceOf(ctx.period);
  const out = {};
  // Reporting hosts: distinct host.name over the period (needs an ES URL); fall
  // back to the count of reporting indices when the agg is unavailable.
  let reporting = null;
  if (esUrl) {
    try {
      const body = JSON.stringify({ size: 0, query: { range: { '@timestamp': { gte: since } } }, aggs: { hosts: { cardinality: { field: 'host.name' } } } });
      const j = await jsonOrThrow(await H(esUrl + '/_all/_search', { method: 'POST', headers: Object.assign({}, auth, { 'Content-Type': 'application/json' }), body }), 'Elastic');
      const n = j && j.aggregations && j.aggregations.hosts && j.aggregations.hosts.value;
      if (Number.isFinite(Number(n))) { reporting = Math.round(Number(n)); out.monitoring_scope_denominator = reporting; }
    } catch (_) {}
    if (reporting == null) {
      try {
        const rows = await jsonOrThrow(await H(esUrl + '/_cat/indices?format=json&h=index', { headers: auth }), 'Elastic');
        if (Array.isArray(rows)) { reporting = rows.length; out.monitoring_scope_denominator = reporting; }
      } catch (_) {}
    }
  }
  // Detections: open detection-engine signals raised in the period.
  try {
    const body = JSON.stringify({ size: 0, track_total_hits: true, query: { bool: { filter: [{ term: { 'signal.status': 'open' } }, { range: { '@timestamp': { gte: since } } }] } } });
    const j = await jsonOrThrow(await H(kbn + '/api/detection_engine/signals/search', { method: 'POST', headers: kbnH, body }), 'Elastic');
    const total = j && j.hits && j.hits.total;
    const n = total && typeof total === 'object' ? total.value : total;
    if (Number.isFinite(Number(n))) out.detection_events = Math.round(Number(n));
  } catch (_) {}
  // Alert forwarding: any detection rule with actions configured.
  try {
    const j = await jsonOrThrow(await H(kbn + '/api/detection_engine/rules/_find?per_page=100', { headers: Object.assign({}, auth, { 'kbn-xsrf': 'nerion' }) }), 'Elastic');
    const rules = Array.isArray(j.data) ? j.data : [];
    if (rules.length) out.alert_forwarding = rules.some((r) => Array.isArray(r.actions) && r.actions.length > 0);
  } catch (_) {}
  const expected = Number(c.expectedLogSources || c.expected_log_sources || c.criticalLogSources || c.critical_log_sources);
  if (reporting != null && Number.isFinite(expected) && expected > 0) {
    out.critical_log_source_coverage_pct = Math.max(0, Math.min(100, Math.round((reporting / expected) * 100)));
    out.missing_critical_log_sources = Math.max(0, expected - reporting);
  }
  return out;
}
module.exports = { key: 'elastic', collect };
