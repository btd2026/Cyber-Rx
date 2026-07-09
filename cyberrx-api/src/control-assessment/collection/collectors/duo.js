'use strict';

// Cisco Duo (IA-2 / PR.AA-03 / AC-7) — pulls MFA enrollment, sign-in/factor
// evidence and lockout events from the read-only Duo Admin API (HMAC-SHA1
// signed, per services/connectors/duo.js). Log-count filters and factor→"no
// MFA" mapping are documented best-effort; validate against a live tenant
// before an Effective conclusion is trusted. Duo does not manage passwords, so
// the password-policy fields are intentionally omitted.

const crypto = require('crypto');
const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');
const sinceOf = (p) => (p && p.start) ? p.start : new Date(Date.now() - 90 * 864e5).toISOString();

// Duo canonical params: keys sorted, RFC-3986 percent-encoded, joined by '&'.
function canon(params) {
  const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  return Object.keys(params).sort().map((k) => `${enc(k)}=${enc(params[k])}`).join('&');
}

async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const host = String(c.apiHost || c.api_host || '').replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();
  const ikey = c.ikey || c.integrationKey; const skey = c.skey || c.secretKey;
  if (!host || !ikey || !skey) return {};
  const since = sinceOf(ctx.period);
  const mintime = String(Math.floor(Date.parse(since) / 1000));
  const out = {};
  // Signed GET per Duo's documented Admin API scheme (Date header must match).
  const get = async (path, params = {}) => {
    const date = new Date().toUTCString();
    const cp = canon(params);
    const sig = crypto.createHmac('sha1', String(skey)).update([date, 'GET', host, path, cp].join('\n')).digest('hex');
    const auth = 'Basic ' + Buffer.from(`${ikey}:${sig}`).toString('base64');
    const url = `https://${host}${path}${cp ? `?${cp}` : ''}`;
    const j = await jsonOrThrow(await H(url, { headers: { Date: date, Authorization: auth, Accept: 'application/json' } }), 'Cisco Duo');
    if (j && j.stat && j.stat !== 'OK') throw new Error('Cisco Duo: ' + (j.message || 'API error'));
    return j || {};
  };
  const rows = (j) => (j && Array.isArray(j.response)) ? j.response : [];

  // Active-user denominator + MFA enrollment (noncompliant = active, no factor).
  try {
    let offset = 0; let active = 0; let noncompliant = 0;
    for (let page = 0; page < 10; page += 1) {
      const j = await get('/admin/v1/users', { limit: '100', offset: String(offset) });
      const users = rows(j);
      if (!users.length) break;
      for (const u of users) {
        const isActive = !u.status || String(u.status).toLowerCase() === 'active';
        const factor = ['phones', 'tokens', 'u2ftokens', 'webauthncredentials', 'desktoptokens'].some((k) => Array.isArray(u[k]) && u[k].length);
        if (isActive) { active += 1; if (!factor) noncompliant += 1; }
      }
      const nx = j.metadata && j.metadata.next_offset;
      if (nx == null) break; offset = Number(nx);
    }
    if (active > 0) { out.active_user_denominator = active; out.accounts_noncompliant = noncompliant; }
  } catch (_) {}

  // MFA enforcement policy (Duo Policy API — Premier/Advantage editions only).
  try {
    const j = await get('/admin/v1/policies', { limit: '100', offset: '0' });
    const list = Array.isArray(j.response) ? j.response : (j.response && j.response.policies) || [];
    if (Array.isArray(list)) { out.mfa_enforcement_policy = list.length > 0; out.policy_assignment_scope = 'Duo policies: ' + list.length; }
  } catch (_) {}

  // Protected applications (integrations) → app + external-app scope. Every
  // Duo-protected integration enforces Duo (MFA), so with-MFA == total.
  try {
    const ints = rows(await get('/admin/v1/integrations', { limit: '100', offset: '0' }));
    if (ints.length || Array.isArray(ints)) {
      out.app_resource_scope = 'Duo protected applications: ' + ints.length;
      out.external_app_inventory = ints.length; out.external_apps_total = ints.length; out.external_apps_with_mfa = ints.length;
    }
  } catch (_) {}

  // Authentication log → sign-in / factor evidence over the review period.
  try {
    const logs = rows(await get('/admin/v1/logs/authentication', { mintime }));
    out.signin_logs = Array.isArray(logs);
    if (Array.isArray(logs)) {
      const res = (l) => String(l.result || '').toLowerCase();
      const fac = (l) => String(l.factor || '').toLowerCase();
      const rsn = (l) => String(l.reason || '').toLowerCase();
      const bypass = (l) => /bypass|trusted[_ ]network|remembered/.test(fac(l)) || /bypass/.test(rsn(l));
      const realFactor = (l) => /push|passcode|phone|call|token|u2f|webauthn|sms|otp|mobile/.test(fac(l));
      const failed = (l) => ['failure', 'fraud', 'denied'].indexOf(res(l)) >= 0;
      out.signins_without_mfa = logs.filter((l) => res(l) === 'success' && bypass(l)).length;
      out.bypassed_mfa_events = logs.filter((l) => bypass(l)).length;
      out.failed_signin_events = logs.filter(failed).length;
      out.failed_mfa_events = logs.filter((l) => failed(l) && realFactor(l)).length;
      out.lockout_events = logs.filter((l) => /locked[_ ]out/.test(rsn(l))).length;
    }
  } catch (_) {}

  // Administrator log → admin unlock / bypass-override events over the period.
  try {
    const logs = rows(await get('/admin/v1/logs/administrator', { mintime }));
    if (Array.isArray(logs)) {
      out.unlock_events = logs.filter((l) => /unlock/.test(JSON.stringify(l).toLowerCase())).length;
      out.override_events = logs.filter((l) => /bypass/.test(JSON.stringify(l).toLowerCase())).length;
    }
  } catch (_) {}

  return out;
}

module.exports = { key: 'duo', collect };
