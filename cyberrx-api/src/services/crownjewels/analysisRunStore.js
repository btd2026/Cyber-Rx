'use strict';

/**
 * analysisRunStore — the only place analysis-run SQL lives. Isolated behind a
 * small interface so AnalysisRunService is unit-testable with an in-memory fake
 * while production uses Postgres with a transactional advisory lock for the
 * full-rebuild cap (so two concurrent rebuilds can't both slip through).
 *
 * A FULL rebuild reserves a slot under the lock; DELTA runs insert a run row
 * directly (uncapped) for telemetry. Cap-active = a 'full' run not refunded.
 */

const db = require('../../utils/db');

const ACTIVE = ['reserved', 'running', 'completed']; // a full run that counts against the cap

function countFullSql(window) {
  if (window === 'rolling_30d') {
    return { text: `SELECT COUNT(*)::int AS n FROM analysis_run WHERE scope_type=$1 AND scope_id=$2 AND mode='full' AND status = ANY($3) AND created_at >= NOW() - INTERVAL '30 days'`, params: (s, id) => [s, id, ACTIVE] };
  }
  return { text: `SELECT COUNT(*)::int AS n FROM analysis_run WHERE scope_type=$1 AND scope_id=$2 AND mode='full' AND status = ANY($3) AND period_key=$4`, params: (s, id, pk) => [s, id, ACTIVE, pk] };
}

async function sumGrantsTx(client, scopeType, scopeId, periodKey, window) {
  const q = window === 'rolling_30d'
    ? { t: `SELECT COALESCE(SUM(extra),0)::int AS n FROM analysis_run_grant WHERE scope_type=$1 AND scope_id=$2 AND created_at >= NOW() - INTERVAL '30 days'`, p: [scopeType, scopeId] }
    : { t: `SELECT COALESCE(SUM(extra),0)::int AS n FROM analysis_run_grant WHERE scope_type=$1 AND scope_id=$2 AND period_key=$3`, p: [scopeType, scopeId, periodKey] };
  return (await client.query(q.t, q.p)).rows[0].n;
}

/** Reserve a FULL-rebuild slot under the cap lock. decide({used,grants}) -> {reject}|{row}. */
async function runInCapLock(scopeType, scopeId, periodKey, window, decide) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`analysisq:${scopeType}:${scopeId}:${periodKey}`]);
    const c = countFullSql(window);
    const used = (await client.query(c.text, c.params(scopeType, scopeId, periodKey))).rows[0].n;
    const grants = await sumGrantsTx(client, scopeType, scopeId, periodKey, window);
    const decision = decide({ used, grants });
    if (decision.row) {
      const r = decision.row;
      await client.query(
        `INSERT INTO analysis_run (id, scope_type, scope_id, mode, period_key, status, document_scope, started_at)
         VALUES ($1,$2,$3,'full',$4,'reserved',$5,NOW())`,
        [r.id, scopeType, scopeId, periodKey, r.documentScope || null]);
    }
    await client.query('COMMIT');
    return decision;
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
}

/** Insert an uncapped (delta) run row directly, status 'running'. */
async function insertRun(row) {
  await db.query(
    `INSERT INTO analysis_run (id, scope_type, scope_id, mode, period_key, status, document_scope, started_at)
     VALUES ($1,$2,$3,$4,$5,'running',$6,NOW())`,
    [row.id, row.scopeType, row.scopeId, row.mode, row.periodKey, row.documentScope || null]);
  return row.id;
}

async function setStatus(id, status, patch = {}) {
  const rows = await db.query(
    `UPDATE analysis_run SET status=$2, token_usage=COALESCE($3, token_usage),
        completed_at=CASE WHEN $4 THEN NOW() ELSE completed_at END
      WHERE id=$1 RETURNING *`,
    [id, status, patch.usage ? JSON.stringify(patch.usage) : null, !!patch.complete]);
  return rows[0] || null;
}

async function getRun(id) { return (await db.query('SELECT * FROM analysis_run WHERE id=$1', [id]))[0] || null; }

async function usageRead(scopeType, scopeId, periodKey, window) {
  const c = countFullSql(window);
  const used = (await db.query(c.text, c.params(scopeType, scopeId, periodKey)))[0].n;
  const gq = window === 'rolling_30d'
    ? { t: `SELECT COALESCE(SUM(extra),0)::int AS n FROM analysis_run_grant WHERE scope_type=$1 AND scope_id=$2 AND created_at >= NOW() - INTERVAL '30 days'`, p: [scopeType, scopeId] }
    : { t: `SELECT COALESCE(SUM(extra),0)::int AS n FROM analysis_run_grant WHERE scope_type=$1 AND scope_id=$2 AND period_key=$3`, p: [scopeType, scopeId, periodKey] };
  const grants = (await db.query(gq.t, gq.p))[0].n;
  return { used, grants };
}

async function insertGrant(g) {
  await db.query(`INSERT INTO analysis_run_grant (id, scope_type, scope_id, period_key, extra, actor, reason) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [g.id, g.scopeType, g.scopeId, g.periodKey, g.extra, g.actor || null, g.reason || null]);
}

async function refundActiveForPeriod(scopeType, scopeId, periodKey, window) {
  const w = window === 'rolling_30d'
    ? { t: `UPDATE analysis_run SET status='refunded' WHERE scope_type=$1 AND scope_id=$2 AND mode='full' AND status = ANY($3) AND created_at >= NOW() - INTERVAL '30 days' RETURNING id`, p: [scopeType, scopeId, ACTIVE] }
    : { t: `UPDATE analysis_run SET status='refunded' WHERE scope_type=$1 AND scope_id=$2 AND mode='full' AND status = ANY($3) AND period_key=$4 RETURNING id`, p: [scopeType, scopeId, ACTIVE, periodKey] };
  return (await db.query(w.t, w.p)).length;
}

async function insertAudit(a) {
  await db.query(`INSERT INTO analysis_run_audit (id, scope_type, scope_id, period_key, action, run_id, actor, reason, detail) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [a.id, a.scopeType || null, a.scopeId || null, a.periodKey || null, a.action, a.runId || null, a.actor || null, a.reason || null, JSON.stringify(a.detail || {})]);
}

module.exports = { ACTIVE, runInCapLock, insertRun, setStatus, getRun, usageRead, insertGrant, refundActiveForPeriod, insertAudit };
