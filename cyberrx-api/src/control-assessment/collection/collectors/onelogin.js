'use strict';

// OneLogin (IA-2 / PR.AA-03 / AC-7) — pulls the active-user denominator, MFA
// enforcement + password/lockout policy, application scope and sign-in / failed
// / lockout / unlock event counts from the read-only OneLogin API (OAuth2
// client-credentials, per services/connectors/onelogin.js). Event types are
// resolved by name from /api/1/events/types (no hard-coded IDs); counts are a
// bounded best-effort — validate against a live account before an Effective
// conclusion is trusted.

const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');
const sinceOf = (p) => (p && p.start) ? p.start : new Date(Date.now() - 90 * 864e5).toISOString();
const arr = (j) => Array.isArray(j) ? j : (j && Array.isArray(j.data) ? j.data : []);

async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const region = String(c.region || 'us').replace(/^\.+|\/+$/g, '');
  const clientId = c.clientId || c.client_id;
  const clientSecret = c.clientSecret || c.client_secret;
  if (!clientId || !clientSecret) return {};
  const base = `https://api.${region}.onelogin.com`;
  const since = sinceOf(ctx.period);
  const out = {};
  let tk;
  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const j = await jsonOrThrow(await H(`${base}/auth/oauth2/v2/token`, { method: 'POST', headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ grant_type: 'client_credentials' }) }), 'OneLogin');
    tk = j.access_token; if (!tk) return {};
  } catch (_) { return {}; }
  const Hdr = { Authorization: `Bearer ${tk}`, Accept: 'application/json' };
  const get = async (path) => jsonOrThrow(await H(base + path, { headers: Hdr }), 'OneLogin');

  // Active-user denominator (status 1 == ACTIVE; first page).
  try { const active = arr(await get('/api/2/users?limit=200')).filter((u) => u.status == null || Number(u.status) === 1); if (active.length) out.active_user_denominator = active.length; } catch (_) {}

  // User security policies → MFA enforcement + password + lockout policy.
  try {
    const pols = arr(await get('/api/2/policies'));
    if (pols.length) {
      out.mfa_enforcement_policy = pols.some((p) => p.mfa && (p.mfa.otp_enabled === true || p.mfa.require === true || Number(p.mfa.otp_required) === 1));
      out.policy_assignment_scope = 'OneLogin user policies: ' + pols.length;
      const p = pols.find((x) => x.password) || pols[0];
      const pw = p && p.password;
      if (pw) {
        out.password_policy = true;
        const min = pw.min_length != null ? pw.min_length : pw.minimum_password_length;
        if (min != null) out.min_length = Number(min);
        out.complexity_enforced = !!(pw.min_lower || pw.min_upper || pw.min_number || pw.min_special || pw.require_lowercase || pw.require_uppercase || pw.require_number);
        const reuse = pw.password_history != null ? pw.password_history : pw.min_password_history;
        if (reuse != null) out.reuse_prevention = Number(reuse);
      }
      const lk = p && p.lockout;
      if (lk) {
        const attempts = lk.max_invalid_login_attempts != null ? lk.max_invalid_login_attempts : lk.max_login_attempts;
        if (attempts != null) out.failed_login_threshold_policy = String(attempts) + ' attempts';
        const dur = lk.lock_time_in_minutes != null ? lk.lock_time_in_minutes : lk.time;
        if (dur != null) out.lockout_duration = String(dur) + 'm';
      }
    }
  } catch (_) {}

  // Applications → app / external-app scope.
  try { const apps = arr(await get('/api/2/apps?limit=200')); if (apps.length) { out.app_resource_scope = 'OneLogin apps: ' + apps.length; out.external_app_inventory = apps.length; out.external_apps_total = apps.length; } } catch (_) {}

  // Events → sign-in / failed / MFA / lockout / unlock evidence over the period.
  try {
    try { out.signin_logs = Array.isArray(arr(await get('/api/1/events?limit=1'))); } catch (_) {}
    const types = arr(await get('/api/1/events/types'));
    const idsFor = (re) => types.filter((t) => re.test(String(t.name || ''))).map((t) => t.id);
    const eventCount = async (ids) => { let n = 0; for (const id of ids.slice(0, 4)) { try { n += arr(await get(`/api/1/events?event_type_id=${id}&since=${encodeURIComponent(since)}&limit=1000`)).length; } catch (_) {} } return n; };
    const map = [
      ['failed_signin_events', /failed.*(authentic|login|log ?in)|(authentic|login).*failed|unauthorized/i],
      ['failed_mfa_events', /(otp|mfa|factor).*(failed|denied|error|invalid)/i],
      ['lockout_events', /\block(ed|out)/i],
      ['unlock_events', /unlock/i],
      ['bypassed_mfa_events', /bypass|(otp|mfa).*(removed|deactivat|reset)/i],
    ];
    for (const [field, re] of map) { const ids = idsFor(re); if (ids.length) out[field] = await eventCount(ids); }
  } catch (_) {}

  return out;
}

module.exports = { key: 'onelogin', collect };
