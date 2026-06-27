'use strict';

/**
 * ScanQuotaService — the hard cost ceiling in front of every scan (spec §3b).
 *
 * A "scan" = initiating a new assessment run (a fresh upload-assessment OR an
 * incremental re-assessment). Free actions (viewing, re-exporting a completed
 * report) never call this. The gate runs BEFORE any embedding / LLM / batch
 * work, so cost cannot run away even in development.
 *
 * Lifecycle (auditable reservation → consume/refund):
 *   reserve()  -> creates a 'reserved' row (a slot is taken)        [gate passes]
 *   consume()  -> 'reserved' -> 'consumed' once the run starts ok   [slot kept]
 *   refund()   -> 'reserved'/'consumed' -> 'refunded' on infra fail [slot returned]
 * A completed assessment consumes a slot regardless of how many gaps it found.
 * Every transition is written to scan_quota_audit.
 *
 * Storage/atomicity live in scanQuotaStore (Postgres advisory lock). The store
 * is injectable (setStore) so this logic is unit-tested without a database.
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const config = require('../config/scanQuota');

let store = require('./scanQuotaStore');
/** Test seam: swap in an in-memory store. */
function setStore(s) { store = s; }

// ---- Errors ---------------------------------------------------------------
class QuotaExceededError extends Error {
  constructor({ used, limit, resetDate, scopeType, scopeId }) {
    const reset = resetDate ? new Date(resetDate).toISOString().slice(0, 10) : 'the next period';
    super(`Scan limit reached: ${used} of ${limit} scans used this period. Your quota resets on ${reset}.`);
    this.name = 'QuotaExceededError';
    this.code = 'SCAN_QUOTA_EXCEEDED';
    this.status = 429;
    this.used = used; this.limit = limit; this.resetDate = resetDate;
    this.scopeType = scopeType; this.scopeId = scopeId;
  }
}

// ---- Pure helpers (unit-tested directly) ----------------------------------

/** Bucket key for the active window. calendar_month -> 'YYYY-MM'; rolling -> 'rolling'. */
function periodKey(window = config.window, now = new Date()) {
  if (window === 'rolling_30d') return 'rolling';
  const d = new Date(now);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** When the quota frees up. calendar_month -> 00:00 UTC on the 1st of next month;
 *  rolling_30d -> oldest active reservation + 30d (or now if none active). */
function resetDate(window = config.window, now = new Date(), oldestActiveAt = null) {
  if (window === 'rolling_30d') {
    if (!oldestActiveAt) return new Date(now);
    return new Date(new Date(oldestActiveAt).getTime() + 30 * 864e5);
  }
  const d = new Date(now);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

/** Resolve the configured scope to a concrete (scopeType, scopeId). org is the
 *  reliable default here; user/account fall back to org with a warning if their
 *  id is absent so a misconfig can never silently disable the gate. */
function resolveScope(ids = {}, scope = config.scope) {
  const { orgId, userId, accountId } = ids;
  if (scope === 'user') {
    if (userId) return { scopeType: 'user', scopeId: String(userId) };
    logger.warn('SCAN_QUOTA_SCOPE=user but no userId on request; falling back to org scope');
    return { scopeType: 'org', scopeId: String(orgId || '') };
  }
  if (scope === 'account') {
    return { scopeType: 'account', scopeId: String(accountId || orgId || '') };
  }
  return { scopeType: 'org', scopeId: String(orgId || '') };
}

const audit = (a) => store.insertAudit({ id: uuidv4(), ...a }).catch((e) => logger.warn('scan_quota audit failed', { error: e.message }));

// ---- Core API -------------------------------------------------------------

/** Read-only usage snapshot for surfacing remaining quota (free; consumes nothing). */
async function usage(ids, opts = {}) {
  const window = opts.window || config.window;
  const { scopeType, scopeId } = opts.scopeType ? opts : resolveScope(ids, opts.scope);
  const pk = periodKey(window);
  const { used, grants, oldestActiveAt } = await store.usageRead(scopeType, scopeId, pk, window);
  const limit = config.limit + (grants || 0);
  return {
    scopeType, scopeId, periodKey: pk, window,
    used, limit, remaining: Math.max(0, limit - used),
    resetDate: resetDate(window, new Date(), oldestActiveAt),
  };
}

/** Reserve a slot atomically. Throws QuotaExceededError when at/over limit. */
async function reserve(ids, opts = {}) {
  const window = opts.window || config.window;
  const { scopeType, scopeId } = opts.scopeType ? opts : resolveScope(ids, opts.scope);
  if (!scopeId) throw new Error('scan quota: no scope id (orgId/userId) available to gate the scan');
  const pk = periodKey(window);

  const decision = await store.runInReservationLock(scopeType, scopeId, pk, window, ({ used, grants, oldestActiveAt }) => {
    const limit = config.limit + (grants || 0);
    if (used >= limit) {
      return { reject: true, used, limit, resetDate: resetDate(window, new Date(), oldestActiveAt) };
    }
    return { row: { id: uuidv4(), scan_id: opts.scanId, document_id: opts.documentId }, used, limit };
  });

  if (decision.reject) {
    await audit({ scopeType, scopeId, periodKey: pk, action: 'reject', actor: opts.actor, reason: 'limit_reached', detail: { used: decision.used, limit: decision.limit } });
    throw new QuotaExceededError({ used: decision.used, limit: decision.limit, resetDate: decision.resetDate, scopeType, scopeId });
  }
  const reservationId = decision.row.id;
  await audit({ scopeType, scopeId, periodKey: pk, action: 'reserve', reservationId, actor: opts.actor });
  const remaining = Math.max(0, decision.limit - (decision.used + 1));
  return { reservationId, scopeType, scopeId, periodKey: pk, used: decision.used + 1, limit: decision.limit, remaining, resetDate: resetDate(window, new Date()) };
}

/** Mark a reserved slot consumed (the run started successfully). */
async function consume(reservationId, opts = {}) {
  const r = await store.updateReservationStatus(reservationId, 'consumed', { scanId: opts.scanId });
  if (r) await audit({ scopeType: r.scope_type, scopeId: r.scope_id, periodKey: r.period_key, action: 'consume', reservationId, actor: opts.actor });
  return r;
}

/** Return a slot (infrastructure/pipeline failure). */
async function refund(reservationId, reason = 'infra_failure', opts = {}) {
  const r = await store.updateReservationStatus(reservationId, 'refunded', {});
  if (r) await audit({ scopeType: r.scope_type, scopeId: r.scope_id, periodKey: r.period_key, action: 'refund', reservationId, actor: opts.actor, reason });
  return r;
}

/**
 * The single gate that wraps the scan entrypoint. Reserves before any work,
 * runs `work(ctx)` (ctx carries the reservationId + remaining quota), consumes
 * on success, and refunds on infra failure. A thrown QuotaExceededError short-
 * circuits before `work` ever runs. `work` receives { reservationId, quota }.
 */
async function runGuardedScan(ids, opts, work) {
  if (!config.enabled) {
    logger.warn('SCAN_QUOTA_ENABLED=false — scan quota gate is OFF (test/dev only)');
    return work({ reservationId: null, quota: null });
  }
  const res = await reserve(ids, opts); // throws QuotaExceededError if over limit
  try {
    const out = await work({ reservationId: res.reservationId, quota: res });
    await consume(res.reservationId, { scanId: opts.scanId, actor: opts.actor });
    return out;
  } catch (e) {
    await refund(res.reservationId, e && e.code ? `pipeline_error:${e.code}` : 'pipeline_error', { actor: opts.actor });
    throw e;
  }
}

// ---- Admin override (logged with actor + reason) --------------------------

/** Grant extra scans for the current (or given) period. Raises the effective limit. */
async function adminGrant(ids, { extra, actor, reason, window, scope } = {}) {
  if (!Number.isInteger(extra) || extra <= 0) throw new Error('adminGrant requires a positive integer "extra"');
  if (!actor) throw new Error('adminGrant requires an actor');
  const w = window || config.window;
  const { scopeType, scopeId } = resolveScope(ids, scope);
  const pk = periodKey(w);
  const id = uuidv4();
  await store.insertGrant({ id, scopeType, scopeId, periodKey: pk, extra, actor, reason });
  await audit({ scopeType, scopeId, periodKey: pk, action: 'admin_grant', actor, reason, detail: { extra } });
  return usage(ids, { scopeType, scopeId, window: w });
}

/** Reset the period: refund all active reservations for the scope+period. */
async function adminReset(ids, { actor, reason, window, scope } = {}) {
  if (!actor) throw new Error('adminReset requires an actor');
  const w = window || config.window;
  const { scopeType, scopeId } = resolveScope(ids, scope);
  const pk = periodKey(w);
  const refunded = await store.refundActiveForPeriod(scopeType, scopeId, pk, w);
  await audit({ scopeType, scopeId, periodKey: pk, action: 'admin_reset', actor, reason, detail: { refunded } });
  return usage(ids, { scopeType, scopeId, window: w });
}

module.exports = {
  QuotaExceededError,
  periodKey, resetDate, resolveScope,
  usage, reserve, consume, refund, runGuardedScan,
  adminGrant, adminReset,
  setStore, config,
};
