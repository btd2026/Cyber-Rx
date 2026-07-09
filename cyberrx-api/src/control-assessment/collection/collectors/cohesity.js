'use strict';
const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');
const sinceOf = (p) => (p && p.start) ? p.start : new Date(Date.now() - 90 * 864e5).toISOString();

// Cohesity DataProtect (v2 REST) — pulls CP-9/CP-10/PR.DS-11/RC.RP-03 backup +
// restore evidence. API-key header (or username/password → access token), then
// objects, runs, policies (DataLock) and recoveries. Documented Cohesity
// contract; validate against a live cluster with a viewer role before trusting.
const usecToIso = (u) => (Number(u) > 0 ? new Date(Math.round(Number(u) / 1000)).toISOString() : null);
const hasDataLock = (p) => {
  const ro = p.retentionOptions || {};
  if (ro.datalockConfig || ro.dataLockConfig || ro.lockConfig) return true;
  const b = (p.backupPolicy && p.backupPolicy.regular) || {};
  return !!(b.retention && (b.retention.dataLockConfig || b.retention.datalockConfig));
};
function policyRpo(p) {
  const s = ((p.backupPolicy && p.backupPolicy.regular && p.backupPolicy.regular.incremental) || {}).schedule;
  if (!s) return null;
  const u = String(s.unit || '').toLowerCase();
  if (u.startsWith('minute')) return Number((s.minuteSchedule || {}).frequency) || 1;
  if (u.startsWith('hour')) return (Number((s.hourSchedule || {}).frequency) || 1) * 60;
  if (u.startsWith('day')) return 1440;
  if (u.startsWith('week')) return 10080;
  return null;
}

async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const base = String(c.baseUrl || c.base_url || '').replace(/\/+$/, '');
  if (!base || (!c.apiKey && !(c.username && c.password))) return {};
  const since = sinceOf(ctx.period); const sinceMs = Date.parse(since);
  const out = {};
  let headers;
  try {
    if (c.apiKey) headers = { apiKey: c.apiKey, Accept: 'application/json' };
    else {
      const j = await jsonOrThrow(await H(base + '/irisservices/api/v1/public/accessTokens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: c.username, password: c.password, domain: c.domain || 'LOCAL' }) }), 'Cohesity');
      if (!j.accessToken) return {}; headers = { Authorization: 'Bearer ' + j.accessToken, Accept: 'application/json' };
    }
  } catch (_) { return {}; }
  const get = async (path) => jsonOrThrow(await H(base + path, { headers }), 'Cohesity');

  // Protected systems = distinct protected objects.
  try { const objs = (await get('/v2/data-protect/objects')).objects || []; if (objs.length) out.protected_systems = objs.length; } catch (_) {}
  // Protection runs → last success + failure count over the period.
  try {
    const runs = (await get('/v2/data-protect/runs?numRuns=500')).runs || [];
    const st = (r) => String(((r.localBackupInfo || r.backupInfo || {}).status) || r.status || '').toLowerCase();
    const end = (r) => (r.localBackupInfo || r.backupInfo || {}).endTimeUsecs || r.endTimeUsecs;
    const inPeriod = runs.filter((r) => Math.round((Number(end(r)) || 0) / 1000) >= sinceMs);
    out.backup_failure_count = inPeriod.filter((r) => /fail/.test(st(r))).length;
    const ok = runs.filter((r) => /succe/.test(st(r))).map(end).filter(Boolean).map(Number).sort((a, b) => a - b);
    if (ok.length) { out.last_successful_backup = usecToIso(ok[ok.length - 1]); const age = Math.round((Date.now() - ok[ok.length - 1] / 1000) / 60000); if (Number.isFinite(age)) out.rpo_actual = Math.max(0, age); }
  } catch (_) {}
  // DataLock (immutable) coverage across policies + RPO target.
  try {
    const pols = (await get('/v2/data-protect/policies')).policies || [];
    if (pols.length) out.immutable_backup_coverage = Math.round((pols.filter(hasDataLock).length / pols.length) * 100);
    let rpo = null; for (const p of pols) { const m = policyRpo(p); if (m != null) rpo = rpo == null ? m : Math.min(rpo, m); }
    if (rpo != null) out.rpo_target = rpo; else if (c.rpo_target != null) out.rpo_target = Number(c.rpo_target);
  } catch (_) {}
  // Recovery tasks → last test + result + integrity.
  try {
    const recs = (await get('/v2/data-protect/recoveries')).recoveries || [];
    recs.sort((a, b) => (Number(b.startTimeUsecs) || 0) - (Number(a.startTimeUsecs) || 0));
    const ev = recs[0];
    if (ev) {
      out.last_restore_test = usecToIso(ev.endTimeUsecs || ev.startTimeUsecs);
      const s = String(ev.status || '').toLowerCase(); if (s) out.restore_test_result = /succe/.test(s) ? 'pass' : 'fail';
      const verified = ev.isMultiStageRestore === true || /verif|integrity|validation/i.test(ev.messages ? JSON.stringify(ev.messages) : (ev.name || ''));
      if (out.restore_test_result != null) out.restore_integrity_verification = !!verified;
    }
  } catch (_) {}
  return out;
}
module.exports = { key: 'cohesity', collect };
