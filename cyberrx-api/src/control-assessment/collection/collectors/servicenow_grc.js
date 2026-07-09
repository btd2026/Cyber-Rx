'use strict';
const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');
const sinceOf = (p) => (p && p.start) ? p.start : new Date(Date.now() - 90 * 864e5).toISOString();

// ServiceNow — pulls change_records / change_approvals / change_testing_evidence /
// unauthorized_changes (SOC 2 CC8.1) from the change_request table via the
// Aggregate API (sysparm_count, no row transfer). HTTP Basic (read-only ITIL/GRC
// user), same auth as services/connectors/servicenow_grc.js. The UAT/test field
// varies by instance so its query is overridable; validate against a live
// instance before the results are trusted.
async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const inst = c.instance || c.base_url || c.baseUrl;
  if (!inst || !c.username || !c.password) return {};
  const base = String(inst).replace(/\/+$/, '');
  const headers = { Authorization: 'Basic ' + Buffer.from(c.username + ':' + c.password).toString('base64'), Accept: 'application/json' };
  const table = String(c.table || 'change_request').replace(/[^a-z0-9_]/gi, '');
  const since = sinceOf(ctx.period);
  const day = since.slice(0, 10) + ' ' + (since.slice(11, 19) || '00:00:00');
  const periodQ = 'sys_created_on>=' + day;
  const out = {};
  const count = async (q) => {
    const j = await jsonOrThrow(await H(base + '/api/now/stats/' + table + '?sysparm_count=true&sysparm_query=' + encodeURIComponent(q), { headers }), 'ServiceNow');
    const n = j && j.result && j.result.stats && Number(j.result.stats.count);
    return Number.isFinite(n) ? n : null;
  };
  // Change requests raised in the period.
  try { const n = await count(periodQ); if (n != null) out.change_records = n; } catch (_) {}
  // Approved changes (CAB / approval workflow).
  try { const n = await count(periodQ + '^approval=approved'); if (n != null) out.change_approvals = n; } catch (_) {}
  // Unauthorized: changes in the period that never reached approved (emergency /
  // unapproved) — 0 drives CC8.1 Effective.
  try { const n = await count(periodQ + '^approval!=approved'); if (n != null) out.unauthorized_changes = n; } catch (_) {}
  // Test/UAT evidence: changes carrying a test plan (overridable per instance).
  try { const n = await count(c.testQuery || (periodQ + '^test_planISNOTEMPTY')); if (n != null) out.change_testing_evidence = n; } catch (_) {}
  return out;
}
module.exports = { key: 'servicenow_grc', collect };
