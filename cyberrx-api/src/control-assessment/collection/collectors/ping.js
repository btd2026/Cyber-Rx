'use strict';

// PingOne (IA-2 / PR.AA-03 / AC-7) — pulls the active-user denominator, MFA
// enforcement (sign-on policy actions), application scope, sign-in/audit
// activity and the password/lockout policy from the read-only PingOne
// Management API (OAuth2 worker client-credentials, per services/connectors/
// ping.js). Activity filters are documented best-effort; validate against a
// live environment before an Effective conclusion is trusted.

const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');
const sinceOf = (p) => (p && p.start) ? p.start : new Date(Date.now() - 90 * 864e5).toISOString();
const emb = (j, k) => (j && j._embedded && Array.isArray(j._embedded[k])) ? j._embedded[k] : [];

async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const region = String(c.region || 'com').replace(/^\.+|\/+$/g, '');
  const envId = c.envId || c.env_id || c.environmentId;
  const clientId = c.clientId || c.client_id;
  const clientSecret = c.clientSecret || c.client_secret;
  if (!envId || !clientId || !clientSecret) return {};
  const apiBase = `https://api.pingone.${region}/v1/environments/${envId}`;
  const since = sinceOf(ctx.period);
  const out = {};
  let tk;
  try {
    const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret });
    const j = await jsonOrThrow(await H(`https://auth.pingone.${region}/${envId}/as/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body }), 'Ping Identity');
    tk = j.access_token; if (!tk) return {};
  } catch (_) { return {}; }
  const Hdr = { Authorization: `Bearer ${tk}`, Accept: 'application/json' };
  const get = async (path) => jsonOrThrow(await H(apiBase + path, { headers: Hdr }), 'Ping Identity');
  const countOf = (j, k) => (j && j.count != null) ? Number(j.count) : (j && j.size != null ? Number(j.size) : emb(j, k).length);

  // Active-user denominator (SCIM filter; count returned in the collection).
  try { const j = await get('/users?filter=' + encodeURIComponent('enabled eq true') + '&limit=1'); const n = countOf(j, 'users'); if (Number.isFinite(n)) out.active_user_denominator = n; } catch (_) {}

  // MFA enforcement — a sign-on policy with a MULTI_FACTOR_AUTHENTICATION action.
  try {
    const pols = emb(await get('/signOnPolicies'), 'signOnPolicies');
    out.policy_assignment_scope = 'PingOne sign-on policies: ' + pols.length;
    let mfa = false;
    for (const p of pols.slice(0, 10)) {
      try { const acts = emb(await get(`/signOnPolicies/${p.id}/actions`), 'actions'); if (acts.some((a) => String(a.type).toUpperCase() === 'MULTI_FACTOR_AUTHENTICATION')) { mfa = true; break; } } catch (_) {}
    }
    out.mfa_enforcement_policy = mfa;
  } catch (_) {}

  // Applications → app / external-app scope.
  try { const apps = emb(await get('/applications'), 'applications'); out.app_resource_scope = 'PingOne applications: ' + apps.length; out.external_app_inventory = apps.length; out.external_apps_total = apps.length; } catch (_) {}

  // Sign-in / audit activity evidence over the review period.
  try { out.signin_logs = Array.isArray(emb(await get('/activities?limit=1'), 'activities')); } catch (_) {}
  const actCount = async (filter) => { const j = await get('/activities?filter=' + encodeURIComponent(filter) + '&limit=1'); return countOf(j, 'activities'); };
  try { const n = await actCount(`(recordedAt ge "${since}") and (result.status eq "FAILED")`); if (Number.isFinite(n)) out.failed_signin_events = n; } catch (_) {}
  try { const n = await actCount(`(recordedAt ge "${since}") and (action.type sw "MFA") and (result.status eq "FAILED")`); if (Number.isFinite(n)) out.failed_mfa_events = n; } catch (_) {}

  // Password policy → min length, complexity, reuse prevention + AC-7 lockout.
  try {
    const pols = emb(await get('/passwordPolicies'), 'passwordPolicies');
    const p = pols.find((x) => x.default) || pols[0];
    if (p) {
      out.password_policy = true;
      const min = (p.length && p.length.min != null) ? p.length.min : p.minLength;
      if (min != null) out.min_length = Number(min);
      out.complexity_enforced = !!(p.minCharacters && Object.keys(p.minCharacters).length);
      const reuse = p.history && p.history.count;
      if (reuse != null) out.reuse_prevention = Number(reuse);
      if (p.lockout) {
        if (p.lockout.failureCount != null) out.failed_login_threshold_policy = String(p.lockout.failureCount) + ' attempts';
        if (p.lockout.durationSeconds != null) out.lockout_duration = String(p.lockout.durationSeconds) + 's';
      }
    }
  } catch (_) {}

  return out;
}

module.exports = { key: 'ping', collect };
