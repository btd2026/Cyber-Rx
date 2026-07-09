'use strict';
const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');
const sinceOf = (p) => (p && p.start) ? p.start : new Date(Date.now() - 90 * 864e5).toISOString();

// SentinelOne — pulls endpoint_denominator / active_sensor_count / stale_sensor_count /
// detection_events (DE.CM-09) from the v2.1 mgmt-console API. Header auth
// `Authorization: ApiToken <token>`. Documented S1 API contract; validate against a
// live console (Endpoints: View, Threats: View) before the results are trusted.
async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const base = String(c.baseUrl || c.base_url || '').replace(/\/+$/, '');
  const token = c.token || c.apiToken || c.api_token;
  if (!base || !token) return {};
  const headers = { Authorization: 'ApiToken ' + token, Accept: 'application/json' };
  const since = sinceOf(ctx.period);
  const out = {};
  // agents/count → { data: { total: N } }; the same endpoint, filtered, gives active.
  const count = async (query) => { const j = await jsonOrThrow(await H(base + '/web/api/v2.1/agents/count' + (query ? '?' + query : ''), { headers }), 'SentinelOne'); const n = j && j.data && j.data.total; return Number.isFinite(Number(n)) ? Number(n) : null; };
  try {
    const total = await count('');
    if (total != null) out.endpoint_denominator = total;
    // Agents active and reporting in since the review-period start = active; rest are stale.
    const active = await count('isActive=true&lastActiveDate__gte=' + encodeURIComponent(since));
    if (active != null) { out.active_sensor_count = active; if (total != null) out.stale_sensor_count = Math.max(0, total - active); }
  } catch (_) {}
  // Threats created in the period → detections. threats → { pagination: { totalItems } }.
  try {
    const j = await jsonOrThrow(await H(base + '/web/api/v2.1/threats?limit=1&createdAt__gte=' + encodeURIComponent(since), { headers }), 'SentinelOne');
    const n = j && j.pagination && j.pagination.totalItems; if (Number.isFinite(Number(n))) out.detection_events = Number(n);
  } catch (_) {}
  return out;
}
module.exports = { key: 'sentinelone', collect };
