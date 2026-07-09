'use strict';

/**
 * history — durable, point-in-time-over-time storage of control assessments so
 * the platform can evidence OPERATING effectiveness across a period, not just a
 * current snapshot. Best-effort against Postgres; degrades quietly with no DB.
 */

let db;
try { db = require('../utils/db'); } catch (_) { db = null; }

let _ready = null;
async function ensureTable() {
  if (!db) return;
  if (_ready) return _ready;
  _ready = db.query(`CREATE TABLE IF NOT EXISTS control_assessment_history (
    id BIGSERIAL PRIMARY KEY,
    org_id TEXT NOT NULL,
    assessment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    review_period_start TIMESTAMPTZ,
    review_period_end TIMESTAMPTZ,
    framework TEXT NOT NULL,
    framework_key TEXT NOT NULL,
    control_id TEXT NOT NULL,
    status TEXT NOT NULL,
    score NUMERIC,
    evidence_snapshot_id TEXT,
    exception_count INT,
    missing_evidence JSONB,
    connector_validation_status TEXT,
    audit_readiness TEXT
  )`).then(() => db.query(
    'CREATE INDEX IF NOT EXISTS cah_org_ctrl ON control_assessment_history(org_id, framework_key, control_id, assessment_date)'
  )).catch(() => {});
  return _ready;
}

// Persist a full assessment run (all frameworks) at a point in time.
async function record(orgId, assessAllResult, meta) {
  if (!db) return { persisted: 0, note: 'no database' };
  await ensureTable();
  meta = meta || {};
  let n = 0;
  for (const key of Object.keys(assessAllResult)) {
    const fw = assessAllResult[key];
    for (const r of fw.results) {
      try {
        await db.query(
          `INSERT INTO control_assessment_history
             (org_id, review_period_start, review_period_end, framework, framework_key, control_id, status, score,
              evidence_snapshot_id, exception_count, missing_evidence, connector_validation_status, audit_readiness)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [orgId, r.review_period_start, r.review_period_end, r.framework, key, r.control_id, r.assessment_status,
            r.control_effectiveness_score, meta.evidence_snapshot_id || null, r.exception_count,
            JSON.stringify(r.missing_required_evidence || []), r.live_tenant_validated ? 'live_validated' : 'not_validated', r.audit_readiness]
        );
        n++;
      } catch (_) { /* keep going */ }
    }
  }
  return { persisted: n };
}

// Trend for one control over time (operating-effectiveness view).
async function trend(orgId, frameworkKey, controlId, limit) {
  if (!db) return [];
  await ensureTable();
  try {
    return await db.query(
      `SELECT assessment_date, status, score, audit_readiness FROM control_assessment_history
       WHERE org_id=$1 AND framework_key=$2 AND control_id=$3 ORDER BY assessment_date DESC LIMIT $4`,
      [orgId, frameworkKey, controlId, limit || 12]
    );
  } catch (_) { return []; }
}

module.exports = { ensureTable, record, trend };
