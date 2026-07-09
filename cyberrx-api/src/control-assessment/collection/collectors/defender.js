'use strict';
const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');
const sinceOf = (p) => (p && p.start) ? p.start : new Date(Date.now() - 90 * 864e5).toISOString();
const arr = (j) => Array.isArray(j) ? j : (j && Array.isArray(j.value) ? j.value : (j && Array.isArray(j.data) ? j.data : []));

// Microsoft Defender for Endpoint — pulls endpoint_denominator / active_sensor_count /
// stale_sensor_count / detection_events (DE.CM-09) plus monitoring_scope_denominator +
// alert_forwarding (SI-4). OAuth2 client-credentials → securitycenter API. Documented
// WindowsDefenderATP contract; validate against a live tenant (Machine.Read.All,
// Alert.Read.All) before the results are trusted.
async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const tenant = c.tenantId || c.tenant_id;
  const clientId = c.clientId || c.client_id;
  const clientSecret = c.clientSecret || c.client_secret;
  if (!tenant || !clientId || !clientSecret) return {};
  const RES = 'https://api.securitycenter.microsoft.com';
  const since = sinceOf(ctx.period);
  const out = {};
  let tk;
  try {
    const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, scope: RES + '/.default', grant_type: 'client_credentials' });
    const j = await jsonOrThrow(await H('https://login.microsoftonline.com/' + encodeURIComponent(tenant) + '/oauth2/v2.0/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }), 'Defender');
    tk = j.access_token; if (!tk) return {};
  } catch (_) { return {}; }
  const headers = { Authorization: 'Bearer ' + tk, Accept: 'application/json' };
  const get = async (path) => jsonOrThrow(await H(RES + path, { headers }), 'Defender');

  // Managed-machine inventory: total vs. those seen within the review period.
  try {
    const machines = arr(await get('/api/machines'));
    if (machines.length) {
      out.endpoint_denominator = machines.length;
      out.monitoring_scope_denominator = machines.length;
      const sinceMs = Date.parse(since);
      const active = machines.filter((m) => { const ls = Date.parse(m.lastSeen || m.lastSeenTime || ''); return Number.isFinite(ls) && ls >= sinceMs; }).length;
      out.active_sensor_count = active;
      out.stale_sensor_count = Math.max(0, machines.length - active);
    }
  } catch (_) {}
  // Detections raised in the period, and whether alerts are forwardable (SI-4).
  try {
    const alerts = arr(await get('/api/alerts?$filter=' + encodeURIComponent("alertCreationTime ge " + since)));
    out.detection_events = alerts.length;
    out.alert_forwarding = true;
  } catch (_) {}
  return out;
}
module.exports = { key: 'defender', collect };
