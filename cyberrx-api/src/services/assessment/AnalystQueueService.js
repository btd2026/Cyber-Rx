'use strict';

/**
 * AnalystQueueService — human-in-the-loop review queue (§2 step 9, Stage 7/8).
 * Low-confidence and reconciliation-conflict findings are enqueued; an analyst
 * confirms / overrides / dismisses them, and every decision is written to an
 * append-only audit trail.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../../utils/db');

const audit = (entry) => db.query(
  `INSERT INTO analyst_queue_audit (id, queue_id, org_id, action, actor, reason, detail)
   VALUES ($1,$2,$3,$4,$5,$6,$7)`,
  [uuidv4(), entry.queueId, entry.orgId || null, entry.action, entry.actor || null, entry.reason || null, JSON.stringify(entry.detail || {})]
).catch(() => {});

/** Enqueue reconciliation conflicts / low-confidence items for a scan. Idempotent-ish per (scan, type, control). */
async function enqueue(orgId, scanId, items = []) {
  let n = 0;
  for (const it of items) {
    const id = uuidv4();
    await db.query(
      `INSERT INTO analyst_queue (id, org_id, scan_id, item_type, framework, control_id, status, payload, reason)
       VALUES ($1,$2,$3,$4,$5,$6,'open',$7,$8)`,
      [id, orgId, scanId || null, it.type, it.framework || null, it.control_id || null, JSON.stringify(it), it.reason || null]);
    await audit({ queueId: id, orgId, action: 'enqueue', detail: { type: it.type, control_id: it.control_id } });
    n += 1;
  }
  return { enqueued: n };
}

async function list(orgId, { status = 'open', scanId } = {}) {
  const params = [orgId]; let sql = 'SELECT * FROM analyst_queue WHERE org_id=$1';
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  if (scanId) { params.push(scanId); sql += ` AND scan_id=$${params.length}`; }
  sql += ' ORDER BY created_at';
  return db.query(sql, params);
}

/**
 * Resolve a queue item. action: 'confirm' | 'override' | 'dismiss'. For an
 * override, `resolution` carries the corrected verdict the analyst sets.
 */
async function resolve(id, { action, actor, reason, resolution } = {}) {
  if (!['confirm', 'override', 'dismiss'].includes(action)) throw new Error('action must be confirm|override|dismiss');
  if (!actor) throw new Error('resolve requires an actor');
  const statusByAction = { confirm: 'confirmed', override: 'overridden', dismiss: 'dismissed' };
  const rows = await db.query(
    `UPDATE analyst_queue SET status=$2, resolver=$3, reason=COALESCE($4, reason), resolution=$5, resolved_at=NOW()
       WHERE id=$1 AND status='open' RETURNING *`,
    [id, statusByAction[action], actor, reason || null, JSON.stringify(resolution || {})]);
  if (!rows[0]) throw new Error('queue item not found or already resolved');
  await audit({ queueId: id, orgId: rows[0].org_id, action, actor, reason, detail: { resolution: resolution || null } });
  return rows[0];
}

async function auditTrail(queueId) {
  return db.query('SELECT * FROM analyst_queue_audit WHERE queue_id=$1 ORDER BY created_at', [queueId]);
}

module.exports = { enqueue, list, resolve, auditTrail };
