'use strict';
const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');
const sinceOf = (p) => (p && p.start) ? p.start : new Date(Date.now() - 90 * 864e5).toISOString();

// Palo Alto Cortex XDR — pulls endpoint_denominator / active_sensor_count /
// stale_sensor_count / detection_events (DE.CM-09) from the XDR public API. Standard
// auth: raw API key in Authorization + key id in x-xdr-auth-id. Documented Cortex XDR
// contract; validate against a live tenant (Viewer key) before the results are trusted.
async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const fqdn = String(c.fqdn || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const keyId = c.keyId || c.key_id;
  const apiKey = c.apiKey || c.api_key;
  if (!fqdn || !keyId || !apiKey) return {};
  const base = 'https://' + fqdn;
  const headers = { 'x-xdr-auth-id': String(keyId), Authorization: apiKey, 'Content-Type': 'application/json', Accept: 'application/json' };
  const since = sinceOf(ctx.period);
  const sinceMs = Date.parse(since);
  const out = {};
  const post = async (path, body) => jsonOrThrow(await H(base + path, { method: 'POST', headers, body: JSON.stringify(body || {}) }), 'Cortex XDR');
  // get_endpoints → { reply: [ { last_seen, ... } ] } (last_seen is epoch ms).
  try {
    const j = await post('/public_api/v1/endpoints/get_endpoints/', {});
    const eps = (j && Array.isArray(j.reply)) ? j.reply : [];
    if (eps.length) {
      out.endpoint_denominator = eps.length;
      const active = eps.filter((e) => { const ls = Number(e.last_seen); return Number.isFinite(ls) && ls >= sinceMs; }).length;
      out.active_sensor_count = active;
      out.stale_sensor_count = Math.max(0, eps.length - active);
    }
  } catch (_) {}
  // get_incidents filtered on creation_time ≥ since → detections. { reply: { total_count } }.
  try {
    const j = await post('/public_api/v1/incidents/get_incidents/', { request_data: { filters: [{ field: 'creation_time', operator: 'gte', value: sinceMs }] } });
    const total = j && j.reply && (j.reply.total_count != null ? j.reply.total_count : (Array.isArray(j.reply.incidents) ? j.reply.incidents.length : null));
    if (Number.isFinite(Number(total))) out.detection_events = Number(total);
  } catch (_) {}
  return out;
}
module.exports = { key: 'cortexxdr', collect };
