'use strict';
const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');
const sinceOf = (p) => (p && p.start) ? p.start : new Date(Date.now() - 90 * 864e5).toISOString();

// Dell PowerProtect Data Manager (PPDM REST API v2) — pulls CP-9/CP-10/
// PR.DS-11/RC.RP-03 backup + restore evidence. /api/v2/login → bearer, then
// assets, copies (retention-lock = immutable), activities (PROTECT + RESTORE)
// and protection-policy objectives. Documented PPDM contract; the retention-lock
// field varies by version, so validate against a live appliance before trusting.
async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const base = String(c.baseUrl || c.base_url || '').replace(/\/+$/, '');
  if (!base || !c.username || !c.password) return {};
  const since = sinceOf(ctx.period);
  const out = {};
  let tk;
  try {
    const j = await jsonOrThrow(await H(base + '/api/v2/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ username: c.username, password: c.password }) }), 'PowerProtect');
    tk = j.access_token || j.token; if (!tk) return {};
  } catch (_) { return {}; }
  const headers = { Authorization: 'Bearer ' + tk, Accept: 'application/json' };
  const get = async (path) => jsonOrThrow(await H(base + path, { headers }), 'PowerProtect');
  const totalOf = (j) => { const n = j && j.page && j.page.totalElements; return Number.isFinite(Number(n)) ? Number(n) : null; };
  const count = async (path) => totalOf(await get(path));

  // Critical-system universe = discovered assets; protected = assets with a copy.
  try { const all = await count('/api/v2/assets?pageSize=1'); if (all != null) out.critical_system_denominator = all; } catch (_) {}
  try { const prot = await count('/api/v2/assets?pageSize=1&filter=' + encodeURIComponent('lastAvailableCopyTime ne null')); if (prot != null) out.protected_systems = prot; } catch (_) {}
  // Immutable coverage across copies (retention-lock).
  try {
    const total = await count('/api/v2/copies?pageSize=1');
    let imm = null;
    try { imm = await count('/api/v2/copies?pageSize=1&filter=' + encodeURIComponent('retentionLock.mode ne "NONE"')); }
    catch (_) { try { imm = await count('/api/v2/copies?pageSize=1&filter=' + encodeURIComponent('retentionLock eq true')); } catch (_) {} }
    if (total != null && total > 0 && imm != null) out.immutable_backup_coverage = Math.round((imm / total) * 100);
  } catch (_) {}
  // Latest PROTECT copy → last successful backup + rpo_actual.
  try {
    const j = await get('/api/v2/copies?pageSize=1&orderby=' + encodeURIComponent('createTime DESC'));
    const cp = (j.content || [])[0];
    const t = cp && (cp.createTime || cp.creationTime);
    if (t) { out.last_successful_backup = t; const age = Math.round((Date.now() - Date.parse(t)) / 60000); if (Number.isFinite(age)) out.rpo_actual = Math.max(0, age); }
  } catch (_) {}
  // Backup failure count over the period (PROTECT activities that failed).
  try {
    const f = 'category eq "PROTECT" and result.status eq "FAILED" and startTime ge "' + since + '"';
    const n = await count('/api/v2/activities?pageSize=1&filter=' + encodeURIComponent(f));
    if (n != null) out.backup_failure_count = n;
  } catch (_) {}
  // Latest RESTORE/RECOVER activity → last test + result + integrity.
  try {
    const j = await get('/api/v2/activities?pageSize=1&orderby=' + encodeURIComponent('startTime DESC') + '&filter=' + encodeURIComponent('category eq "RESTORE"'));
    const ev = (j.content || [])[0];
    if (ev) {
      out.last_restore_test = ev.endTime || ev.startTime || null;
      const s = String((ev.result && ev.result.status) || ev.state || '').toLowerCase();
      if (s) out.restore_test_result = /ok|succe|complet/.test(s) ? 'pass' : 'fail';
      const verified = /verif|integrity|validation/i.test(String(ev.subcategory || '') + ' ' + ((ev.result && ev.result.detailedDescription) || ''));
      if (out.restore_test_result != null) out.restore_integrity_verification = !!verified;
    }
  } catch (_) {}
  // RPO target from protection-policy backup objective (minutes).
  try {
    const pols = (await get('/api/v2/protection-policies?pageSize=200')).content || [];
    let rpo = null;
    for (const p of pols) for (const o of (p.objectives || [])) {
      if (String(o.type || '').toUpperCase() !== 'BACKUP') continue;
      for (const op of (o.operations || [])) {
        const sch = op.schedule || {}; const iv = Number(sch.interval) || 1; const fr = String(sch.frequency || '').toLowerCase();
        let m = null;
        if (fr.startsWith('minute')) m = iv; else if (fr.startsWith('hour')) m = iv * 60; else if (fr.startsWith('day')) m = iv * 1440; else if (fr.startsWith('week')) m = iv * 10080;
        if (m != null) rpo = rpo == null ? m : Math.min(rpo, m);
      }
    }
    if (rpo != null) out.rpo_target = rpo; else if (c.rpo_target != null) out.rpo_target = Number(c.rpo_target);
  } catch (_) { if (c.rpo_target != null) out.rpo_target = Number(c.rpo_target); }
  return out;
}
module.exports = { key: 'dell_powerprotect', collect };
