'use strict';
const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');
const arr = (j) => (Array.isArray(j) ? j : (j && Array.isArray(j.value) ? j.value : []));

// Microsoft Defender Vulnerability Management (CC7.1) — pulls
// scan_coverage_denominator (onboarded machines), open_critical_vulns (org CVEs
// at Critical severity), config_monitoring_enabled (Secure Score / config
// assessment endpoint reachable), vuln_scan_cadence ('continuous' — Defender VM
// assesses in real time) and remediation_sla_met (true only when no critical is
// open). OAuth2 client-credentials → api.securitycenter.microsoft.com.
// Documented Defender for Endpoint API; validate against a live tenant.
async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const tenant = c.tenantId || c.tenant_id;
  const cid = c.clientId || c.client_id;
  const sec = c.clientSecret || c.client_secret;
  if (!tenant || !cid || !sec) return {};
  const API = 'https://api.securitycenter.microsoft.com';
  let tk;
  try {
    const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: cid, client_secret: sec, scope: API + '/.default' });
    const j = await jsonOrThrow(await H('https://login.microsoftonline.com/' + encodeURIComponent(tenant) + '/oauth2/v2.0/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }), 'Microsoft');
    tk = j.access_token; if (!tk) return {};
  } catch (_) { return {}; }
  const headers = { Authorization: 'Bearer ' + tk, Accept: 'application/json' };
  const get = async (path) => jsonOrThrow(await H(API + path, { headers }), 'Microsoft');
  const out = {};

  // Onboarded machines → denominator (continuous assessment ⇒ cadence).
  try { const m = arr(await get('/api/machines?$top=10000')); out.scan_coverage_denominator = m.length; out.vuln_scan_cadence = 'continuous'; } catch (_) {}
  // Critical CVEs affecting the org (open) → open_critical_vulns.
  try { const v = arr(await get("/api/vulnerabilities?$filter=" + encodeURIComponent("severity eq 'Critical'") + '&$top=10000')); out.open_critical_vulns = v.length; } catch (_) {}
  // Secure Score for devices / configuration assessment available → config monitoring on.
  try { await get('/api/configurationScore'); out.config_monitoring_enabled = true; }
  catch (_) { try { await get('/api/exposureScore'); out.config_monitoring_enabled = true; } catch (_2) {} }
  // No open critical ⇒ none past SLA (provable); otherwise omit → control stays partial.
  if (out.open_critical_vulns === 0) out.remediation_sla_met = true;
  return out;
}
module.exports = { key: 'defender_vm', collect };
