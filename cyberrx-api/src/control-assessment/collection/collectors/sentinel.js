'use strict';
const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');
const sinceOf = (p) => (p && p.start) ? p.start : new Date(Date.now() - 90 * 864e5).toISOString();

// Microsoft Sentinel — SI-4 monitoring evidence via OAuth2 client-credentials →
// Log Analytics query API. Heartbeat dcount(Computer) = reporting hosts,
// SecurityAlert count = detections raised in the period, and enabled Sentinel
// automation rules (ARM, best-effort) = alert forwarding. Mirrors sentinel.js
// auth; validate against a live workspace before trusting counts.
async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const tenant = c.tenantId || c.tenant_id;
  const clientId = c.clientId || c.client_id;
  const clientSecret = c.clientSecret || c.client_secret;
  const workspace = c.workspaceId || c.workspace_id;
  if (!tenant || !clientId || !clientSecret || !workspace) return {};
  const since = sinceOf(ctx.period);
  const out = {};
  const tokenFor = async (resource) => {
    const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, scope: resource + '/.default', grant_type: 'client_credentials' });
    const j = await jsonOrThrow(await H('https://login.microsoftonline.com/' + encodeURIComponent(tenant) + '/oauth2/v2.0/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }), 'Sentinel');
    return j.access_token;
  };
  const firstRow = (j) => {
    const t = (j.tables || []).find((x) => x.name === 'PrimaryResult') || (j.tables || [])[0];
    if (!t || !t.rows || !t.rows.length) return null;
    const cols = (t.columns || []).map((x) => x.name);
    return cols.reduce((o, name, i) => { o[name] = t.rows[0][i]; return o; }, {});
  };
  let tk;
  try { tk = await tokenFor('https://api.loganalytics.io'); if (!tk) return {}; } catch (_) { return {}; }
  const kql = async (q) => {
    const r = await H('https://api.loganalytics.io/v1/workspaces/' + encodeURIComponent(workspace) + '/query', { method: 'POST', headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) });
    return firstRow(await jsonOrThrow(r, 'Sentinel'));
  };
  // Reporting hosts: distinct machines sending heartbeat in the period.
  let reporting = null;
  try {
    const row = await kql('Heartbeat | where TimeGenerated > datetime(' + since + ') | summarize sources = dcount(Computer)');
    if (row && row.sources != null && Number.isFinite(Number(row.sources))) { reporting = Math.round(Number(row.sources)); out.monitoring_scope_denominator = reporting; }
  } catch (_) {}
  // Detections raised in the period (SecurityAlert).
  try {
    const row = await kql('SecurityAlert | where TimeGenerated > datetime(' + since + ') | summarize c = count()');
    if (row && row.c != null && Number.isFinite(Number(row.c))) out.detection_events = Math.round(Number(row.c));
  } catch (_) {}
  // Alert forwarding: enabled Sentinel automation rules (ARM), best-effort and
  // only when the subscription / resource group / workspace name are provided.
  const sub = c.subscriptionId || c.subscription_id;
  const rg = c.resourceGroup || c.resource_group;
  const wsName = c.workspaceName || c.workspace_name;
  if (sub && rg && wsName) {
    try {
      const mtk = await tokenFor('https://management.azure.com');
      const url = 'https://management.azure.com/subscriptions/' + encodeURIComponent(sub) + '/resourceGroups/' + encodeURIComponent(rg) + '/providers/Microsoft.OperationalInsights/workspaces/' + encodeURIComponent(wsName) + '/providers/Microsoft.SecurityInsights/automationRules?api-version=2023-02-01';
      const j = await jsonOrThrow(await H(url, { headers: { Authorization: 'Bearer ' + mtk, Accept: 'application/json' } }), 'Sentinel');
      const rules = Array.isArray(j.value) ? j.value : [];
      out.alert_forwarding = rules.some((r) => r.properties && r.properties.triggeringLogic && r.properties.triggeringLogic.isEnabled !== false);
    } catch (_) {}
  }
  const expected = Number(c.expectedLogSources || c.expected_log_sources || c.criticalLogSources || c.critical_log_sources);
  if (reporting != null && Number.isFinite(expected) && expected > 0) {
    out.critical_log_source_coverage_pct = Math.max(0, Math.min(100, Math.round((reporting / expected) * 100)));
    out.missing_critical_log_sources = Math.max(0, expected - reporting);
  }
  return out;
}
module.exports = { key: 'sentinel', collect };
