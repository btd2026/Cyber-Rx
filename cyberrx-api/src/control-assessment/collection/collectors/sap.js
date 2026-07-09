'use strict';
const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');
const sinceOf = (p) => (p && p.start) ? p.start : new Date(Date.now() - 90 * 864e5).toISOString();

// SAP — pulls change_records / change_approvals / change_testing_evidence /
// unauthorized_changes (SOC 2 CC8.1) from CTS transport / change requests over a
// read-only GRC OData service. HTTP Basic (display user), same auth as
// services/connectors/sap.js. Service + entity names vary by release/activation,
// so both are overridable; validate against a live SAP gateway before trusted.
async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const baseRaw = c.baseUrl || c.base_url;
  if (!baseRaw || !c.username || !c.password) return {};
  const base = String(baseRaw).replace(/\/+$/, '');
  const headers = { Authorization: 'Basic ' + Buffer.from(c.username + ':' + c.password).toString('base64'), Accept: 'application/json' };
  const since = sinceOf(ctx.period);
  const rows = (j) => (j && j.d && (j.d.results || (Array.isArray(j.d) ? j.d : [j.d]))) || (j && j.value) || [];
  const svc = c.transportService || 'CTS_ORGANIZER_SRV';
  const set = c.transportEntity || 'TransportRequestSet';
  const out = {};
  try {
    const url = base + '/sap/opu/odata/sap/' + svc + '/' + set
      + "?$format=json&$filter=" + encodeURIComponent("ChangedOn ge datetime'" + since.slice(0, 19) + "'");
    const trs = rows(await jsonOrThrow(await H(url, { headers }), 'SAP'));
    out.change_records = trs.length;
    // Approved = released to production / approved status; the rest are unauthorized.
    const isApproved = (t) => /approved|released|prod|success/i.test(String(t.ApprovalStatus || t.Approval || t.Status || ''));
    const approved = trs.filter(isApproved).length;
    out.change_approvals = approved;
    out.unauthorized_changes = Math.max(0, trs.length - approved);
    // Test evidence: transports imported into a QA/test target system.
    out.change_testing_evidence = trs.filter((t) => /qas|qa|test/i.test(String(t.TargetSystem || t.TestStatus || t.System || ''))).length;
  } catch (_) {}
  return out;
}
module.exports = { key: 'sap', collect };
