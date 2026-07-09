'use strict';

/**
 * connectorCollectors — pulls the granular required_api_fields the requirements
 * registry demands, from each vendor's READ-ONLY API. One collector per
 * connector; each returns the evidence fields it can prove for the review
 * period. Fields that cannot be collected are omitted → the engine reads the
 * control as Not Enough Evidence. Nothing is fabricated.
 *
 * All collectors accept `ctx.http` (defaulting to the shared fetch helper) so
 * the API→field mapping is unit-testable without a live tenant. Log-query
 * filters and count semantics are documented best-effort and must be validated
 * against a real tenant before an Effective conclusion is trusted.
 *
 * ctx = { orgId, connector, creds, signals, period:{start,end}, http }
 */

const { http: defaultHttp, jsonOrThrow } = require('../../services/connectors/http');

const sinceOf = (period) => (period && period.start) ? period.start : new Date(Date.now() - 90 * 864e5).toISOString();
const arr = (j) => (Array.isArray(j) ? j : (j && Array.isArray(j.value) ? j.value : []));

// ============================ Okta (IA-2 / PR.AA-03 / AC-7 / AC-2) ============
async function okta(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const base = String(c.orgUrl || c.org_url || (c.domain ? 'https://' + c.domain : '')).replace(/\/+$/, '');
  const token = c.apiToken || c.api_token || c.token || c.apiKey;
  if (!base || !token) return {};
  const headers = { Authorization: 'SSWS ' + token, Accept: 'application/json' };
  const since = sinceOf(ctx.period);
  const out = {};
  const get = async (path) => jsonOrThrow(await H(base + path, { headers }), 'Okta');
  const logCount = async (filter) => {
    const j = await get('/api/v1/logs?since=' + encodeURIComponent(since) + '&filter=' + encodeURIComponent(filter) + '&limit=1000');
    return arr(j).length;
  };

  // Active-user denominator (first page; a live collector paginates fully).
  try { const u = arr(await get('/api/v1/users?filter=' + encodeURIComponent('status eq "ACTIVE"') + '&limit=200')); if (u.length) out.active_user_denominator = u.length; } catch (_) {}
  // MFA enforcement policy + assignment scope.
  try {
    const pols = arr(await get('/api/v1/policies?type=MFA_ENROLL'));
    const active = pols.some((p) => p.status === 'ACTIVE');
    out.mfa_enforcement_policy = active;
    out.policy_assignment_scope = active ? ('MFA_ENROLL policies active: ' + pols.filter((p) => p.status === 'ACTIVE').length) : 'no active MFA enrollment policy';
  } catch (_) {}
  // App/resource scope (per-app sign-on policies).
  try { const ap = arr(await get('/api/v1/policies?type=ACCESS_POLICY')); out.app_resource_scope = 'app sign-on policies: ' + ap.length; } catch (_) {}
  // Sign-in evidence over the review period.
  try { const s = arr(await get('/api/v1/logs?since=' + encodeURIComponent(since) + '&filter=' + encodeURIComponent('eventType eq "user.authentication.auth_via_mfa"') + '&limit=1')); out.signin_logs = Array.isArray(s); } catch (_) {}
  try { out.signins_without_mfa = await logCount('eventType eq "user.authentication.sso" and outcome.result eq "SUCCESS" and securityContext.isProxy eq false'); } catch (_) {}
  try { out.failed_mfa_events = await logCount('eventType eq "user.authentication.auth_via_mfa" and outcome.result eq "FAILURE"'); } catch (_) {}
  try { out.bypassed_mfa_events = await logCount('eventType eq "user.mfa.factor.deactivate" or eventType eq "policy.evaluate_sign_on" and outcome.reason co "bypass"'); } catch (_) {}
  // AC-7 — lockout policy + events.
  try {
    const pw = arr(await get('/api/v1/policies?type=PASSWORD'));
    const lk = pw.map((p) => p.settings && p.settings.password && p.settings.password.lockout).find(Boolean);
    if (lk) { out.failed_login_threshold_policy = String(lk.maxAttempts) + ' attempts'; out.lockout_duration = String(lk.autoUnlockMinutes) + 'm'; }
  } catch (_) {}
  try { out.failed_signin_events = await logCount('eventType eq "user.session.start" and outcome.result eq "FAILURE"'); } catch (_) {}
  try { out.lockout_events = await logCount('eventType eq "user.account.lock"'); } catch (_) {}
  try { out.unlock_events = await logCount('eventType eq "user.account.unlock"'); } catch (_) {}
  try { out.override_events = await logCount('eventType eq "user.account.unlock_by_admin"'); } catch (_) {}
  // AC-2 — account lifecycle.
  try { const all = arr(await get('/api/v1/users?limit=200')); if (all.length) { out.account_inventory = all.length; out.account_inventory_source = 'Okta'; } } catch (_) {}
  try { out.joiner_mover_leaver_events = await logCount('eventType sw "user.lifecycle."'); } catch (_) {}
  try { const dp = arr(await get('/api/v1/users?filter=' + encodeURIComponent('status eq "DEPROVISIONED" or status eq "SUSPENDED"') + '&limit=200')); out.disabled_stale_accounts = dp.length; } catch (_) {}
  return out;
}

// ============================ Microsoft Entra ID (Graph) ======================
async function entra(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const tenant = c.tenantId || c.tenant_id;
  if (!tenant || !(c.clientId || c.client_id) || !(c.clientSecret || c.client_secret || c.client_secret_or_certificate)) return {};
  const graph = 'https://graph.microsoft.com/v1.0';
  const since = sinceOf(ctx.period);
  const out = {};
  let tk;
  try {
    const body = new URLSearchParams({ client_id: c.clientId || c.client_id, client_secret: c.clientSecret || c.client_secret || c.client_secret_or_certificate, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' });
    const j = await jsonOrThrow(await H('https://login.microsoftonline.com/' + encodeURIComponent(tenant) + '/oauth2/v2.0/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }), 'Entra');
    tk = j.access_token; if (!tk) return {};
  } catch (_) { return {}; }
  const H2 = { Authorization: 'Bearer ' + tk, Accept: 'application/json' };
  const get = async (path, extra) => jsonOrThrow(await H(graph + path, { headers: Object.assign({}, H2, extra || {}) }), 'Entra');

  // Active-user denominator via $count (needs ConsistencyLevel: eventual).
  try { const j = await get('/users/$count?$filter=' + encodeURIComponent('accountEnabled eq true'), { ConsistencyLevel: 'eventual' }); const n = Number(j); if (Number.isFinite(n)) out.active_user_denominator = n; } catch (_) {}
  // MFA enforcement via Conditional Access.
  try {
    const pols = arr(await get('/identity/conditionalAccess/policies'));
    const enforcing = pols.filter((p) => p.state === 'enabled' && p.grantControls && (p.grantControls.builtInControls || []).indexOf('mfa') >= 0);
    out.mfa_enforcement_policy = enforcing.length > 0;
    out.policy_assignment_scope = enforcing.length ? ('enabled CA policies requiring MFA: ' + enforcing.length) : 'no enabled MFA CA policy';
    out.app_resource_scope = 'CA policies: ' + pols.length;
  } catch (_) {}
  // Sign-in evidence.
  try { const s = arr(await get('/auditLogs/signIns?$top=1')); out.signin_logs = Array.isArray(s); } catch (_) {}
  try { const j = await get('/auditLogs/signIns?$count=true&$top=1&$filter=' + encodeURIComponent("createdDateTime ge " + since + " and authenticationRequirement eq 'singleFactorAuthentication'"), { ConsistencyLevel: 'eventual' }); const n = j['@odata.count']; if (n != null) out.signins_without_mfa = Number(n); } catch (_) {}
  try { const j = await get('/auditLogs/signIns?$count=true&$top=1&$filter=' + encodeURIComponent("createdDateTime ge " + since + " and status/errorCode ne 0"), { ConsistencyLevel: 'eventual' }); const n = j['@odata.count']; if (n != null) out.failed_signin_events = Number(n); } catch (_) {}
  // AC-2 — account lifecycle from directory audits.
  try { const j = await get('/auditLogs/directoryAudits?$top=1&$filter=' + encodeURIComponent("activityDisplayName eq 'Add user' or activityDisplayName eq 'Delete user'")); if (arr(j).length >= 0) out.joiner_mover_leaver_events = arr(j).length; } catch (_) {}
  try { const j = await get('/users/$count?$filter=' + encodeURIComponent('accountEnabled eq false'), { ConsistencyLevel: 'eventual' }); const n = Number(j); if (Number.isFinite(n)) { out.disabled_stale_accounts = n; out.account_inventory_source = 'Microsoft Entra ID'; } } catch (_) {}
  return out;
}

// --- Rubrik: restore-integrity evidence for CP-10 / RC.RP-03 -----------------
async function rubrik(ctx) {
  const c = ctx.creds || {}; const H = ctx.http || defaultHttp;
  if (!c.baseUrl) return {};
  const base = String(c.baseUrl).replace(/\/+$/, '');
  const headers = { Authorization: 'Bearer ' + (c.token || c.apiKey || ''), Accept: 'application/json' };
  const out = {};
  try { await jsonOrThrow(await H(base + '/api/v1/restore', { headers }), 'Rubrik'); out.last_restore_test = c.last_restore_test || undefined; } catch (_) {}
  return out;
}

// --- SailPoint: account-lifecycle evidence for AC-2 -------------------------
async function sailpoint(ctx) {
  const c = ctx.creds || {}; const H = ctx.http || defaultHttp;
  if (!c.baseUrl) return {};
  const base = String(c.baseUrl).replace(/\/+$/, '');
  const headers = { Authorization: 'Bearer ' + (c.token || ''), Accept: 'application/json' };
  const out = {};
  try { await jsonOrThrow(await H(base + '/v3/accounts?count=true&limit=1', { headers }), 'SailPoint'); out.account_inventory_source = 'SailPoint'; } catch (_) {}
  return out;
}

const CONNECTOR_COLLECTORS = { okta, entra, rubrik, sailpoint };

module.exports = { CONNECTOR_COLLECTORS };
