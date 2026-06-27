'use strict';

/**
 * AnalysisRunService — the cost ceiling in front of every Crown-Jewels analysis
 * (spec §3b). Wraps the analysis entrypoint and runs BEFORE any embedding / LLM
 * / batch work, so cost cannot run away.
 *
 *   FULL rebuild : reserve a slot under the cap (atomic) -> run -> mark completed
 *                  (consume) -> refund on infrastructure failure.
 *   DELTA sync   : uncapped by default (config) -> still recorded as a run with
 *                  cost telemetry.
 *
 * Every run records per-stage token usage / est cost (CostMeter). Storage +
 * atomicity live in analysisRunStore (injectable for tests).
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');
const config = require('../../config/analysisQuota');
const { CostMeter } = require('../assessment/CostMeter');

let store = require('./analysisRunStore');
function setStore(s) { store = s; }

class AnalysisCapError extends Error {
  constructor({ used, limit, resetDate, scopeType, scopeId }) {
    const reset = resetDate ? new Date(resetDate).toISOString().slice(0, 10) : 'the next period';
    super(`Full-rebuild cap reached: ${used} of ${limit} rebuilds used this period. Cap resets on ${reset}.`);
    this.name = 'AnalysisCapError'; this.code = 'ANALYSIS_CAP_REACHED'; this.status = 429;
    this.used = used; this.limit = limit; this.resetDate = resetDate; this.scopeType = scopeType; this.scopeId = scopeId;
  }
}

function periodKey(window = config.window, now = new Date()) {
  if (window === 'rolling_30d') return 'rolling';
  const d = new Date(now);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
function resetDate(window = config.window, now = new Date()) {
  if (window === 'rolling_30d') return new Date(new Date(now).getTime() + 30 * 864e5);
  const d = new Date(now);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}
function resolveScope(ids = {}, scope = config.scope) {
  const { orgId, userId, accountId } = ids;
  if (scope === 'user') return userId ? { scopeType: 'user', scopeId: String(userId) } : { scopeType: 'org', scopeId: String(orgId || '') };
  if (scope === 'account') return { scopeType: 'account', scopeId: String(accountId || orgId || '') };
  return { scopeType: 'org', scopeId: String(orgId || '') };
}
const audit = (a) => store.insertAudit({ id: uuidv4(), ...a }).catch((e) => logger.warn('analysis audit failed', { error: e.message }));

async function usage(ids, opts = {}) {
  const window = opts.window || config.window;
  const { scopeType, scopeId } = opts.scopeType ? opts : resolveScope(ids, opts.scope);
  const pk = periodKey(window);
  const { used, grants } = await store.usageRead(scopeType, scopeId, pk, window);
  const limit = config.cap + (grants || 0);
  return { scopeType, scopeId, periodKey: pk, window, used, limit, remaining: Math.max(0, limit - used), resetDate: resetDate(window) };
}

/** Reserve a FULL-rebuild slot (atomic). Throws AnalysisCapError when at limit. */
async function reserveFull(ids, opts = {}) {
  const window = opts.window || config.window;
  const { scopeType, scopeId } = resolveScope(ids, opts.scope);
  if (!scopeId) throw new Error('analysis quota: no scope id available to gate the run');
  const pk = periodKey(window);
  const decision = await store.runInCapLock(scopeType, scopeId, pk, window, ({ used, grants }) => {
    const limit = config.cap + (grants || 0);
    if (used >= limit) return { reject: true, used, limit };
    return { row: { id: uuidv4(), documentScope: opts.documentScope }, used, limit };
  });
  if (decision.reject) {
    await audit({ scopeType, scopeId, periodKey: pk, action: 'reject', reason: 'cap_reached', detail: { used: decision.used, limit: decision.limit } });
    throw new AnalysisCapError({ used: decision.used, limit: decision.limit, resetDate: resetDate(window), scopeType, scopeId });
  }
  await audit({ scopeType, scopeId, periodKey: pk, action: 'reserve', runId: decision.row.id });
  return { runId: decision.row.id, scopeType, scopeId, periodKey: pk, used: decision.used + 1, limit: decision.limit, remaining: Math.max(0, decision.limit - (decision.used + 1)) };
}

/**
 * Gate + run an analysis. mode 'full' consumes a cap slot; 'delta' is uncapped
 * (unless ANALYSIS_DELTA_CAPPED). `work({ runId, meter })` does the real work and
 * may use the CostMeter; its return value is passed through. On error the run is
 * refunded (full) / marked failed (delta) — never silently consumed.
 */
async function runGuardedAnalysis(ids, opts, work) {
  const mode = opts.mode === 'delta' ? 'delta' : 'full';
  const meter = new CostMeter();
  if (!config.enabled) { logger.warn('ANALYSIS_ENABLED=false — gate OFF (test/dev only)'); return work({ runId: null, meter }); }

  const capped = mode === 'full' || config.deltaCapped;
  let runId; let reservation = null;
  if (capped) { reservation = await reserveFull(ids, opts); runId = reservation.runId; await store.setStatus(runId, 'running'); }
  else {
    const { scopeType, scopeId } = resolveScope(ids, opts.scope);
    runId = uuidv4();
    await store.insertRun({ id: runId, scopeType, scopeId, mode: 'delta', periodKey: periodKey(), documentScope: opts.documentScope });
  }

  try {
    const out = await work({ runId, meter });
    await store.setStatus(runId, 'completed', { usage: meter.toScanUsage(), complete: true });
    const r = await store.getRun(runId).catch(() => null);
    if (r) await audit({ scopeType: r.scope_type, scopeId: r.scope_id, periodKey: r.period_key, action: 'consume', runId });
    return { runId, mode, reservation, usage: meter.toScanUsage(), result: out };
  } catch (e) {
    if (capped) { await store.setStatus(runId, 'refunded', { usage: meter.toScanUsage() }); await audit({ scopeType: reservation.scopeType, scopeId: reservation.scopeId, periodKey: reservation.periodKey, action: 'refund', runId, reason: e && e.code ? `error:${e.code}` : 'infra_failure' }); }
    else { await store.setStatus(runId, 'failed', { usage: meter.toScanUsage() }); }
    throw e;
  }
}

async function adminGrant(ids, { extra, actor, reason, window, scope } = {}) {
  if (!Number.isInteger(extra) || extra <= 0) throw new Error('adminGrant requires a positive integer "extra"');
  if (!actor) throw new Error('adminGrant requires an actor');
  const w = window || config.window; const { scopeType, scopeId } = resolveScope(ids, scope); const pk = periodKey(w);
  await store.insertGrant({ id: uuidv4(), scopeType, scopeId, periodKey: pk, extra, actor, reason });
  await audit({ scopeType, scopeId, periodKey: pk, action: 'admin_grant', actor, reason, detail: { extra } });
  return usage(ids, { scopeType, scopeId, window: w });
}

async function adminReset(ids, { actor, reason, window, scope } = {}) {
  if (!actor) throw new Error('adminReset requires an actor');
  const w = window || config.window; const { scopeType, scopeId } = resolveScope(ids, scope); const pk = periodKey(w);
  const refunded = await store.refundActiveForPeriod(scopeType, scopeId, pk, w);
  await audit({ scopeType, scopeId, periodKey: pk, action: 'admin_reset', actor, reason, detail: { refunded } });
  return usage(ids, { scopeType, scopeId, window: w });
}

module.exports = { AnalysisCapError, periodKey, resetDate, resolveScope, usage, reserveFull, runGuardedAnalysis, adminGrant, adminReset, setStore, config };
