'use strict';
const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');

// Prisma Cloud (CC7.1 / CSPM) — pulls scan_coverage_denominator (resources
// evaluated in the compliance posture), open_critical_vulns (open Critical
// policy alerts), config_monitoring_enabled (CSPM continuously assesses config),
// vuln_scan_cadence ('continuous') and remediation_sla_met (true only when no
// critical alert is open). Documented /login → x-redlock-auth flow; validate
// against a live tenant with a read-only role before trusting.
async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const base = String(c.apiUrl || c.api_url || '').replace(/\/+$/, '');
  const akid = c.accessKeyId || c.access_key_id;
  const sk = c.secretKey || c.secret_key;
  if (!base || !akid || !sk) return {};
  let tk;
  try {
    const j = await jsonOrThrow(await H(base + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ username: akid, password: sk }) }), 'Prisma Cloud');
    tk = j.token; if (!tk) return {};
  } catch (_) { return {}; }
  const headers = { 'x-redlock-auth': tk, Accept: 'application/json' };
  const get = async (path) => jsonOrThrow(await H(base + path, { headers }), 'Prisma Cloud');
  const out = {};

  // Compliance posture → evaluated resources (denominator) + config monitoring on.
  try {
    const j = await get('/compliance/posture');
    const root = j.summary || j;
    const passed = Number(root.totalPassed != null ? root.totalPassed : root.passedResources);
    const failed = Number(root.totalFailed != null ? root.totalFailed : root.failedResources);
    const total = (Number.isFinite(passed) ? passed : 0) + (Number.isFinite(failed) ? failed : 0);
    if (total > 0) { out.scan_coverage_denominator = total; out.config_monitoring_enabled = true; out.vuln_scan_cadence = 'continuous'; }
  } catch (_) {}
  // Open Critical policy alerts → open_critical_vulns.
  try {
    const j = await get('/v2/alert?detailed=false&timeType=to_now&alert.status=open&policy.severity=critical&limit=1');
    const n = j && (j.totalRows != null ? Number(j.totalRows) : (Array.isArray(j.items) ? j.items.length : NaN));
    if (Number.isFinite(n)) out.open_critical_vulns = n;
  } catch (_) {}
  // No open critical ⇒ none past SLA (provable); otherwise omit → control stays partial.
  if (out.open_critical_vulns === 0) out.remediation_sla_met = true;
  return out;
}
module.exports = { key: 'prisma', collect };
