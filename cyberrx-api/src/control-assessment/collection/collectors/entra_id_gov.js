'use strict';
const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');
const arr = (j) => Array.isArray(j) ? j : (j && Array.isArray(j.value) ? j.value : (j && Array.isArray(j.data) ? j.data : []));

// Microsoft Entra ID Governance (Graph, OAuth2 client-credentials) — pulls
// access_review_records / least_privilege_review_records (access-review definitions →
// instances → decisions), excessive_privilege_findings (Deny decisions) and
// privilege_remediation_events (removals successfully applied) for AC-6 / PR.AA-05,
// plus privileged_account_inventory (PIM eligible + active role assignments).
// Documented Graph contract (AccessReview.Read.All, RoleManagement.Read.Directory);
// validate against a live tenant with a read-only app registration before it is trusted.
async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const tenant = c.tenantId || c.tenant_id;
  const clientId = c.clientId || c.client_id;
  const clientSecret = c.clientSecret || c.client_secret;
  if (!tenant || !clientId || !clientSecret) return {};
  const GRAPH = 'https://graph.microsoft.com/v1.0';
  const out = {};
  let tk;
  try {
    const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' });
    const j = await jsonOrThrow(await H('https://login.microsoftonline.com/' + encodeURIComponent(tenant) + '/oauth2/v2.0/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }), 'Entra');
    tk = j.access_token; if (!tk) return {};
  } catch (_) { return {}; }
  const headers = { Authorization: 'Bearer ' + tk, Accept: 'application/json' };
  const get = async (path) => jsonOrThrow(await H(GRAPH + path, { headers }), 'Entra');

  // Access reviews — aggregate decisions across current instances.
  try {
    const defs = arr(await get('/identityGovernance/accessReviews/definitions?$top=50'));
    let completed = 0, denied = 0, remediated = 0;
    for (const d of defs) {
      try {
        const insts = arr(await get('/identityGovernance/accessReviews/definitions/' + d.id + '/instances?$top=20'));
        for (const inst of insts) {
          const decs = arr(await get('/identityGovernance/accessReviews/definitions/' + d.id + '/instances/' + inst.id + '/decisions?$top=200'));
          for (const x of decs) {
            const decision = String(x.decision || '').toLowerCase();
            if (decision && decision !== 'notreviewed') completed += 1;
            if (decision === 'deny') denied += 1;
            if (decision === 'deny' && String(x.applyResult || '').toLowerCase() === 'appliedsuccessfully') remediated += 1;
          }
        }
      } catch (_) {}
    }
    if (defs.length) {
      out.access_review_records = defs.length;
      out.least_privilege_review_records = completed;
      out.excessive_privilege_findings = denied;
      out.privilege_remediation_events = remediated;
    }
  } catch (_) {}
  // Privileged-account inventory — PIM eligible + active directory-role assignments.
  try {
    let n = 0;
    const elig = arr(await get('/roleManagement/directory/roleEligibilityScheduleInstances?$top=999'));
    const active = arr(await get('/roleManagement/directory/roleAssignmentScheduleInstances?$top=999'));
    n = elig.length + active.length;
    if (n > 0) out.privileged_account_inventory = n;
  } catch (_) {}
  return out;
}
module.exports = { key: 'entra_id_gov', collect };
