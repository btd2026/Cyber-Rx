'use strict';
const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');
const sinceOf = (p) => (p && p.start) ? p.start : new Date(Date.now() - 90 * 864e5).toISOString();
const arr = (j) => Array.isArray(j) ? j : (j && Array.isArray(j.value) ? j.value : (j && Array.isArray(j.data) ? j.data : []));

// Veeam Backup & Replication (VBR REST API v1) — pulls CP-9/CP-10/PR.DS-11/
// RC.RP-03 backup + restore evidence. OAuth2 password grant, then sessions,
// backupObjects, repositories and jobs. Documented VBR contract; validate
// against a live server with a read-only role before the results are trusted.
const API_V = '1.1-rev1';
const isImmutable = (r) => !!(r.immutabilityEnabled || (r.repository && r.repository.immutabilityEnabled) || Number(r.makeRecentBackupsImmutableDays) > 0 || (r.immutability && r.immutability.isEnabled));
const resultOf = (s) => String((s.result && s.result.result) || s.result || '').toLowerCase();
function schedRpo(sch) {
  if (!sch) return null;
  const p = sch.periodically;
  if (p && p.isEnabled) {
    const k = String(p.periodicallyKind || '').toLowerCase(); const f = Number(p.frequency) || 1;
    if (k.startsWith('hour')) return f * 60;
    if (k.startsWith('minute')) return f;
  }
  if (sch.daily && sch.daily.isEnabled) return 1440;
  return null;
}

async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const base = String(c.baseUrl || c.base_url || '').replace(/\/+$/, '');
  if (!base || !c.username || !c.password) return {};
  const since = sinceOf(ctx.period);
  const out = {};
  let tk;
  try {
    const body = new URLSearchParams({ grant_type: 'password', username: c.username, password: c.password });
    const j = await jsonOrThrow(await H(base + '/api/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-api-version': API_V, Accept: 'application/json' }, body }), 'Veeam');
    tk = j.access_token; if (!tk) return {};
  } catch (_) { return {}; }
  const headers = { Authorization: 'Bearer ' + tk, 'x-api-version': API_V, Accept: 'application/json' };
  const get = async (path) => jsonOrThrow(await H(base + path, { headers }), 'Veeam');

  // Protected systems = distinct backed-up objects.
  try { const objs = arr(await get('/api/v1/backupObjects')); if (objs.length) out.protected_systems = objs.length; } catch (_) {}
  // Backup sessions → last success + failure count over the period.
  try {
    const sess = arr(await get('/api/v1/sessions?typeFilter=Backup&limit=500'));
    const inPeriod = sess.filter((s) => Date.parse(s.creationTime || s.endTime || 0) >= Date.parse(since));
    out.backup_failure_count = inPeriod.filter((s) => resultOf(s) === 'failed').length;
    const ok = sess.filter((s) => resultOf(s) === 'success').map((s) => s.endTime || s.creationTime).filter(Boolean).sort();
    if (ok.length) { out.last_successful_backup = ok[ok.length - 1]; const age = Math.round((Date.now() - Date.parse(out.last_successful_backup)) / 60000); if (Number.isFinite(age)) out.rpo_actual = Math.max(0, age); }
  } catch (_) {}
  // Immutable coverage across repositories.
  try { const repos = arr(await get('/api/v1/backupInfrastructure/repositories')); if (repos.length) out.immutable_backup_coverage = Math.round((repos.filter(isImmutable).length / repos.length) * 100); } catch (_) {}
  // Restore/recovery sessions → last test + result + integrity (SureBackup).
  try {
    const rs = arr(await get('/api/v1/sessions?typeFilter=Restore&limit=200')).concat(arr(await get('/api/v1/sessions?typeFilter=SureBackup&limit=200')));
    rs.sort((a, b) => Date.parse(b.endTime || b.creationTime || 0) - Date.parse(a.endTime || a.creationTime || 0));
    const ev = rs[0];
    if (ev) {
      out.last_restore_test = ev.endTime || ev.creationTime || null;
      const r = resultOf(ev); if (r) out.restore_test_result = /success/.test(r) ? 'pass' : 'fail';
      const verified = String(ev.sessionType || '').toLowerCase().includes('surebackup') || /verif|integrity|validation/i.test((ev.result && ev.result.message) || ev.name || '');
      if (out.restore_test_result != null) out.restore_integrity_verification = !!verified;
    }
  } catch (_) {}
  // RPO target = tightest job schedule (minutes).
  try {
    const jobs = arr(await get('/api/v1/jobs'));
    let rpo = null; for (const j of jobs) { const m = schedRpo(j.schedule); if (m != null) rpo = rpo == null ? m : Math.min(rpo, m); }
    if (rpo != null) out.rpo_target = rpo; else if (c.rpo_target != null) out.rpo_target = Number(c.rpo_target);
  } catch (_) {}
  return out;
}
module.exports = { key: 'veeam', collect };
