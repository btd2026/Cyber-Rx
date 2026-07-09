'use strict';
const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');
const sinceOf = (p) => (p && p.start) ? p.start : new Date(Date.now() - 90 * 864e5).toISOString();

// Commvault (REST API) — pulls CP-9/CP-10/PR.DS-11/RC.RP-03 backup + restore
// evidence. /Login → Authtoken, then Job (backup + restore), Client, WORM
// storage pools and schedule policies. Documented Commvault contract; validate
// against a live CommServe with a read-only role before the results are trusted.
const isWorm = (p) => !!(p.wormStoragePoolFlag || p.isWormStoragePool || (p.wormStoragePool && p.wormStoragePool !== 0) || (p.storagePoolFlags && /worm/i.test(JSON.stringify(p.storagePoolFlags))));
const epochIso = (s) => (Number(s) > 0 ? new Date(Number(s) * 1000).toISOString() : null);
const isBackup = (js) => /backup/i.test(String(js.jobType || js.localizedOperationName || ''));
const isRestore = (js) => /restore|recover/i.test(String(js.jobType || js.localizedOperationName || ''));
const failed = (js) => /fail|killed|error/i.test(String(js.status || ''));
const done = (js) => /completed/i.test(String(js.status || '')) && !/error/i.test(String(js.status || ''));

async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const base = String(c.baseUrl || c.base_url || '').replace(/\/+$/, '');
  if (!base || !c.username || !c.password) return {};
  const since = sinceOf(ctx.period); const sinceMs = Date.parse(since);
  const out = {};
  let tk;
  try {
    const j = await jsonOrThrow(await H(base + '/SearchSvc/CVWebService.svc/Login', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ username: c.username, password: Buffer.from(String(c.password)).toString('base64') }) }), 'Commvault');
    tk = j.token; if (!tk) return {};
  } catch (_) { return {}; }
  const headers = { Authtoken: tk, Accept: 'application/json' };
  const get = async (path) => jsonOrThrow(await H(base + path, { headers }), 'Commvault');

  // Protected systems = registered clients.
  try { const cl = (await get('/Client')).clientProperties || []; if (cl.length) out.protected_systems = cl.length; } catch (_) {}
  // Jobs → backup last-success + failure count, restore last-test + result.
  try {
    const jobs = ((await get('/Job')).jobs || []).map((j) => j.jobSummary || j).filter(Boolean);
    const bk = jobs.filter(isBackup);
    const inPeriod = bk.filter((j) => (Number(j.jobEndTime) || 0) * 1000 >= sinceMs);
    out.backup_failure_count = inPeriod.filter(failed).length;
    const ok = bk.filter(done).map((j) => Number(j.jobEndTime)).filter(Boolean).sort((a, b) => a - b);
    if (ok.length) { out.last_successful_backup = epochIso(ok[ok.length - 1]); const age = Math.round((Date.now() - ok[ok.length - 1] * 1000) / 60000); if (Number.isFinite(age)) out.rpo_actual = Math.max(0, age); }
    const rs = jobs.filter(isRestore).sort((a, b) => (Number(b.jobEndTime) || 0) - (Number(a.jobEndTime) || 0));
    const ev = rs[0];
    if (ev) {
      out.last_restore_test = epochIso(ev.jobEndTime || ev.jobStartTime);
      out.restore_test_result = failed(ev) ? 'fail' : (done(ev) ? 'pass' : null);
      if (out.restore_test_result == null) delete out.restore_test_result;
      const verified = jobs.some((j) => /verif|data verification|synth/i.test(String(j.jobType || j.localizedOperationName || '')) && done(j));
      if (out.restore_test_result != null) out.restore_integrity_verification = !!verified;
    }
  } catch (_) {}
  // WORM (immutable) coverage across storage pools.
  try {
    const j = await get('/v4/storage/pool'); const pools = j.storagePoolList || j.storagePools || j.pools || [];
    if (pools.length) out.immutable_backup_coverage = Math.round((pools.filter(isWorm).length / pools.length) * 100);
  } catch (_) {}
  // RPO target from schedule policies (minutes).
  try {
    const sp = (await get('/SchedulePolicy')).taskInfo || (await get('/SchedulePolicy')).policies || [];
    let rpo = null;
    for (const t of (Array.isArray(sp) ? sp : [])) {
      const subs = (t.subTasks || []); for (const s of subs) {
        const pat = (s.pattern || {}); const f = Number(pat.freq_interval) || 0; const type = Number(pat.freq_type);
        if (type === 4 && pat.freq_subday_interval) rpo = rpo == null ? Number(pat.freq_subday_interval) : Math.min(rpo, Number(pat.freq_subday_interval));
        else if (f > 0) rpo = rpo == null ? 1440 : Math.min(rpo, 1440);
      }
    }
    if (rpo != null) out.rpo_target = rpo; else if (c.rpo_target != null) out.rpo_target = Number(c.rpo_target);
  } catch (_) { if (c.rpo_target != null) out.rpo_target = Number(c.rpo_target); }
  return out;
}
module.exports = { key: 'commvault', collect };
