'use strict';

/**
 * scanQuotaStore — the ONLY place scan-quota SQL lives. Isolated behind a small
 * interface so ScanQuotaService can be unit-tested with an in-memory fake while
 * production uses Postgres with a transactional advisory lock for atomicity.
 *
 * Atomicity (spec §3b "Persistent, atomic counter … atomic increment / row
 * lock so two concurrent uploads can't both slip through"): reservation happens
 * inside a transaction that first takes `pg_advisory_xact_lock` keyed by
 * (scope_type, scope_id, period_key). Concurrent reservers for the same scope
 * serialize on that lock, so the count-then-insert is race-free; the lock is
 * released automatically at COMMIT/ROLLBACK.
 */

const db = require('../utils/db');

const ACTIVE = ['reserved', 'consumed']; // statuses that consume a slot

// Count active reservations in the window. For calendar_month we match the
// bucketed period_key; for rolling_30d we count by recency, ignoring the key.
function countSql(window) {
  if (window === 'rolling_30d') {
    return {
      text: `SELECT COUNT(*)::int AS n FROM scan_quota_reservation
              WHERE scope_type=$1 AND scope_id=$2 AND status = ANY($3)
                AND created_at >= NOW() - INTERVAL '30 days'`,
      params: (s, id) => [s, id, ACTIVE],
    };
  }
  return {
    text: `SELECT COUNT(*)::int AS n FROM scan_quota_reservation
            WHERE scope_type=$1 AND scope_id=$2 AND period_key=$3 AND status = ANY($4)`,
    params: (s, id, pk) => [s, id, pk, ACTIVE],
  };
}

async function sumGrantsTx(client, scopeType, scopeId, periodKey, window) {
  const q = window === 'rolling_30d'
    ? { text: `SELECT COALESCE(SUM(extra),0)::int AS n FROM scan_quota_grant
                 WHERE scope_type=$1 AND scope_id=$2 AND created_at >= NOW() - INTERVAL '30 days'`,
        params: [scopeType, scopeId] }
    : { text: `SELECT COALESCE(SUM(extra),0)::int AS n FROM scan_quota_grant
                 WHERE scope_type=$1 AND scope_id=$2 AND period_key=$3`,
        params: [scopeType, scopeId, periodKey] };
  const { rows } = await client.query(q.text, q.params);
  return rows[0].n;
}

/**
 * Run `decide({ used, grants, oldestActiveAt })` under the reservation lock.
 * `decide` returns either { reject: true } or { row } to insert. Returns
 * whatever decide returns, augmented with the inserted row when applicable.
 */
async function runInReservationLock(scopeType, scopeId, periodKey, window, decide) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`scanq:${scopeType}:${scopeId}:${periodKey}`]);
    const c = countSql(window);
    const { rows: cr } = await client.query(c.text, c.params(scopeType, scopeId, periodKey));
    const used = cr[0].n;
    const grants = await sumGrantsTx(client, scopeType, scopeId, periodKey, window);
    // oldest active reservation start (for rolling reset-date math)
    const { rows: orows } = await client.query(
      `SELECT MIN(created_at) AS oldest FROM scan_quota_reservation
        WHERE scope_type=$1 AND scope_id=$2 AND status = ANY($3)
          AND ($4::text = 'calendar_month' AND period_key=$5 OR $4::text='rolling_30d' AND created_at >= NOW() - INTERVAL '30 days')`,
      [scopeType, scopeId, ACTIVE, window, periodKey]
    );
    const decision = decide({ used, grants, oldestActiveAt: orows[0].oldest || null });
    if (decision.row) {
      const r = decision.row;
      await client.query(
        `INSERT INTO scan_quota_reservation (id, scope_type, scope_id, period_key, status, scan_id, document_id)
         VALUES ($1,$2,$3,$4,'reserved',$5,$6)`,
        [r.id, scopeType, scopeId, periodKey, r.scan_id || null, r.document_id || null]
      );
    }
    await client.query('COMMIT');
    return decision;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

async function getReservation(id) {
  const rows = await db.query('SELECT * FROM scan_quota_reservation WHERE id=$1', [id]);
  return rows[0] || null;
}

async function updateReservationStatus(id, status, patch = {}) {
  const rows = await db.query(
    `UPDATE scan_quota_reservation
        SET status=$2, scan_id=COALESCE($3, scan_id), updated_at=NOW()
      WHERE id=$1 RETURNING *`,
    [id, status, patch.scanId || null]
  );
  return rows[0] || null;
}

async function refundActiveForPeriod(scopeType, scopeId, periodKey, window) {
  const where = window === 'rolling_30d'
    ? { text: `UPDATE scan_quota_reservation SET status='refunded', updated_at=NOW()
                WHERE scope_type=$1 AND scope_id=$2 AND status = ANY($3)
                  AND created_at >= NOW() - INTERVAL '30 days' RETURNING id`,
        params: [scopeType, scopeId, ACTIVE] }
    : { text: `UPDATE scan_quota_reservation SET status='refunded', updated_at=NOW()
                WHERE scope_type=$1 AND scope_id=$2 AND period_key=$4 AND status = ANY($3) RETURNING id`,
        params: [scopeType, scopeId, ACTIVE, periodKey] };
  const rows = await db.query(where.text, where.params);
  return rows.length;
}

async function insertGrant(g) {
  await db.query(
    `INSERT INTO scan_quota_grant (id, scope_type, scope_id, period_key, extra, actor, reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [g.id, g.scopeType, g.scopeId, g.periodKey, g.extra, g.actor || null, g.reason || null]
  );
}

async function usageRead(scopeType, scopeId, periodKey, window) {
  const c = countSql(window);
  const used = (await db.query(c.text, c.params(scopeType, scopeId, periodKey)))[0].n;
  const grantsQ = window === 'rolling_30d'
    ? { t: `SELECT COALESCE(SUM(extra),0)::int AS n FROM scan_quota_grant WHERE scope_type=$1 AND scope_id=$2 AND created_at >= NOW() - INTERVAL '30 days'`, p: [scopeType, scopeId] }
    : { t: `SELECT COALESCE(SUM(extra),0)::int AS n FROM scan_quota_grant WHERE scope_type=$1 AND scope_id=$2 AND period_key=$3`, p: [scopeType, scopeId, periodKey] };
  const grants = (await db.query(grantsQ.t, grantsQ.p))[0].n;
  const oldestQ = window === 'rolling_30d'
    ? { t: `SELECT MIN(created_at) AS oldest FROM scan_quota_reservation WHERE scope_type=$1 AND scope_id=$2 AND status = ANY($3) AND created_at >= NOW() - INTERVAL '30 days'`, p: [scopeType, scopeId, ACTIVE] }
    : { t: `SELECT MIN(created_at) AS oldest FROM scan_quota_reservation WHERE scope_type=$1 AND scope_id=$2 AND period_key=$4 AND status = ANY($3)`, p: [scopeType, scopeId, ACTIVE, periodKey] };
  const oldestActiveAt = (await db.query(oldestQ.t, oldestQ.p))[0].oldest || null;
  return { used, grants, oldestActiveAt };
}

async function insertAudit(a) {
  await db.query(
    `INSERT INTO scan_quota_audit (id, scope_type, scope_id, period_key, action, reservation_id, actor, reason, detail)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [a.id, a.scopeType || null, a.scopeId || null, a.periodKey || null, a.action,
      a.reservationId || null, a.actor || null, a.reason || null, JSON.stringify(a.detail || {})]
  );
}

module.exports = {
  ACTIVE,
  runInReservationLock,
  getReservation,
  updateReservationStatus,
  refundActiveForPeriod,
  insertGrant,
  usageRead,
  insertAudit,
};
