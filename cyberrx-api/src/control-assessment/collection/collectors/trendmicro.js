'use strict';
const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');
const sinceOf = (p) => (p && p.start) ? p.start : new Date(Date.now() - 90 * 864e5).toISOString();
const items = (j) => (j && Array.isArray(j.items)) ? j.items : (Array.isArray(j) ? j : []);

// Trend Micro Vision One — pulls endpoint_denominator / active_sensor_count /
// stale_sensor_count / detection_events (DE.CM-09) from the v3.0 Vision One API.
// Bearer-token auth. Documented Vision One contract; validate against a live tenant
// (Endpoint Inventory: View, Alerts: View) before the results are trusted.
async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const base = String(c.baseUrl || c.base_url || 'https://api.xdr.trendmicro.com').replace(/\/+$/, '');
  const token = c.token || c.apiKey || c.api_token;
  if (!token) return {};
  const headers = { Authorization: 'Bearer ' + token, Accept: 'application/json' };
  const since = sinceOf(ctx.period);
  const sinceMs = Date.parse(since);
  const out = {};
  // Endpoint inventory: total vs. those reporting activity within the review period.
  try {
    const j = await jsonOrThrow(await H(base + '/v3.0/endpointSecurity/endpoints?top=1000', { headers }), 'Trend Micro');
    const eps = items(j);
    if (eps.length) {
      out.endpoint_denominator = eps.length;
      const active = eps.filter((e) => { const t = Date.parse(e.lastUsedIp && e.lastUsedIp.time || e.agentLastConnectedDateTime || e.lastActivity || e.eppAgent && e.eppAgent.lastConnectedDateTime || ''); return Number.isFinite(t) && t >= sinceMs; }).length;
      out.active_sensor_count = active;
      out.stale_sensor_count = Math.max(0, eps.length - active);
    }
  } catch (_) {}
  // Detections (alerts / workbench) created in the period → detection_events (best-effort).
  try {
    const j = await jsonOrThrow(await H(base + '/v3.0/workbench/alerts?startDateTime=' + encodeURIComponent(since), { headers }), 'Trend Micro');
    const alerts = items(j);
    out.detection_events = alerts.length;
  } catch (_) {}
  return out;
}
module.exports = { key: 'trendmicro', collect };
