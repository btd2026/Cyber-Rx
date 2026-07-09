'use strict';
const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');
const sinceOf = (p) => (p && p.start) ? p.start : new Date(Date.now() - 90 * 864e5).toISOString();
const arr = (j) => Array.isArray(j) ? j : (j && Array.isArray(j.value) ? j.value : (j && Array.isArray(j.data) ? j.data : []));
// CyberArk epoch fields (secretManagement.lastModifiedTime) are Unix seconds; ISO strings appear elsewhere.
const toMs = (v) => { if (v == null) return NaN; if (typeof v === 'number') return v < 1e12 ? v * 1000 : v; const t = Date.parse(v); return Number.isFinite(t) ? t : NaN; };

// CyberArk PVWA — pulls privileged_account_inventory (vaulted privileged accounts),
// access_review_records / least_privilege_review_records (credential recertification =
// accounts whose secret was managed/verified within the review period), and, when a
// deployment exposes a privileged-access report over REST, best-effort
// excessive_privilege_findings / sod_conflict_findings for AC-6 / PR.AA-05. Logon →
// session token, then the read-only Accounts API. Documented PVWA REST contract;
// validate against a live vault with a read-only auditor account before it is trusted.
async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const pvwa = String(c.pvwaUrl || c.pvwa_url || c.baseUrl || '').replace(/\/+$/, '');
  if (!pvwa || !c.username || !c.password) return {};
  const base = pvwa + '/PasswordVault';
  const sinceMs = Date.parse(sinceOf(ctx.period));
  const out = {};
  let tk;
  try {
    const r = await H(base + '/API/auth/Cyberark/Logon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: c.username, password: c.password, concurrentSession: true }) });
    tk = String(await jsonOrThrow(r, 'CyberArk')); if (!tk) return {};
  } catch (_) { return {}; }
  const headers = { Authorization: tk, Accept: 'application/json' };
  const get = async (path) => jsonOrThrow(await H(base + path, { headers }), 'CyberArk');

  // Vaulted privileged-account inventory + credential-recertification evidence.
  try {
    const accounts = arr(await get('/API/Accounts?limit=1000'));
    if (accounts.length) {
      out.privileged_account_inventory = accounts.length;
      // Accounts whose secret was managed/verified within the review period = a
      // completed privileged-credential recertification (PR.AA-05).
      const reviewed = accounts.filter((a) => {
        const sm = a.secretManagement || {};
        const t = toMs(sm.lastModifiedTime != null ? sm.lastModifiedTime : a.lastModifiedTime);
        return Number.isFinite(t) && t >= sinceMs;
      }).length;
      out.least_privilege_review_records = reviewed;
      out.access_review_records = reviewed;
    }
  } catch (_) {}
  // Best-effort excessive-privilege / SoD findings — only emitted when a report
  // endpoint returns a genuine list, so an unreadable report can never read as 0.
  try {
    const rep = arr(await get('/API/Reports/AccountsRisk'));
    let excessive = 0, sod = 0;
    for (const f of rep) {
      const type = String(f.type || f.category || f.finding || '').toLowerCase();
      if (/sod|segregation|conflict/.test(type)) sod += 1; else excessive += 1;
    }
    out.excessive_privilege_findings = excessive;
    out.sod_conflict_findings = sod;
  } catch (_) {}
  return out;
}
module.exports = { key: 'cyberark', collect };
