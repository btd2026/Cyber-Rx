'use strict';
const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');
const sinceOf = (p) => (p && p.start) ? p.start : new Date(Date.now() - 90 * 864e5).toISOString();

// Saviynt EIC — logs in for a bearer token, then pulls access_review_records /
// least_privilege_review_records (certification campaigns via getCertificationList),
// account_inventory + account_inventory_source ('Saviynt') and disabled_stale_accounts
// (getUser), new_user_events (users created in the period), best-effort
// sod_conflict_findings / excessive_privilege_findings (SoD analytics) and
// provisioning_approval_records / unapproved_provisioning_count (request/approval
// records, CC6.2). Documented EIC REST contract; validate against a live instance
// with a read-only service account before the results are trusted.
async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const b = String(c.baseUrl || c.base_url || '').replace(/\/+$/, '');
  if (!b || !c.username || !c.password) return {};
  const sinceMs = Date.parse(sinceOf(ctx.period));
  const out = {};
  let tk;
  try {
    const j = await jsonOrThrow(await H(b + '/ECM/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ username: c.username, password: c.password }) }), 'Saviynt');
    tk = j.access_token || j.accessToken || j.token; if (!tk) return {};
  } catch (_) { return {}; }
  const H2 = { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json', Accept: 'application/json' };
  const post = async (path, body) => jsonOrThrow(await H(b + path, { method: 'POST', headers: H2, body: JSON.stringify(body || {}) }), 'Saviynt');

  // Access-review certification campaigns.
  try {
    const cj = await post('/ECM/api/v5/getCertificationList', { max: 250 });
    const certs = cj.certifications || cj.results || cj.certificationlist || [];
    if (certs.length) {
      out.access_review_records = certs.length;
      out.least_privilege_review_records = certs.filter((x) => {
        const s = String(x.status || x.certificationStatus || '').toLowerCase();
        const done = Number(x.completedItems != null ? x.completedItems : x.completedCount);
        const all = Number(x.totalItems != null ? x.totalItems : x.totalCount);
        return /complet|closed/.test(s) || (Number.isFinite(done) && Number.isFinite(all) && all > 0 && done >= all);
      }).length;
    }
  } catch (_) {}
  // User inventory, freshly-created accounts, and inactive/disabled accounts.
  try {
    const uj = await post('/ECM/api/v5/getUser', { max: 1000 });
    const users = uj.userlist || uj.users || uj.results || [];
    if (users.length) {
      out.account_inventory = users.length;
      out.account_inventory_source = 'Saviynt';
      out.disabled_stale_accounts = users.filter((u) => String(u.statuskey != null ? u.statuskey : u.status) === '0' || String(u.statusValue || '').toLowerCase() === 'inactive').length;
      out.new_user_events = users.filter((u) => { const t = Date.parse(String(u.createdate || u.createDate || '').replace(' ', 'T')); return Number.isFinite(t) && t >= sinceMs; }).length;
    }
  } catch (_) {}
  // Best-effort SoD / excessive-privilege findings from analytics (emit only when readable).
  try {
    const sj = await post('/ECM/api/v5/getSODViolations', { max: 500 });
    const v = sj.sodViolations || sj.violations || sj.results || [];
    if (Array.isArray(v)) {
      out.sod_conflict_findings = v.length;
      out.excessive_privilege_findings = v.filter((x) => /excess|overprovision|toxic/i.test(String(x.type || x.violationType || ''))).length;
    }
  } catch (_) {}
  // Provisioning-approval records + unapproved (bypassed) provisioning for CC6.2.
  try {
    const rj = await post('/ECM/api/v5/getRequests', { max: 500 });
    const reqs = rj.requestlist || rj.requests || rj.results || [];
    if (reqs.length) {
      const provisioned = reqs.filter((r) => /provision|complet|fulfil/i.test(String(r.requestStatus || r.status || '')));
      const approved = (r) => /approv/i.test(String(r.approvalStatus || r.approvalstatus || '')) || Number(r.approvedCount) > 0;
      out.provisioning_approval_records = provisioned.filter(approved).length;
      out.unapproved_provisioning_count = provisioned.filter((r) => !approved(r)).length;
    }
  } catch (_) {}
  return out;
}
module.exports = { key: 'saviynt', collect };
