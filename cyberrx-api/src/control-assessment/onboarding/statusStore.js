'use strict';

/**
 * statusStore — persists the latest three-status connector readiness and a history
 * row on every check, so connector readiness can be trended over time. Best-effort
 * Postgres: with no DB it degrades to a no-op and the API still computes live status.
 */

let db; try { db = require('../../utils/db'); } catch (_) { db = null; }

let _ready = null;
async function ensureTables() {
  if (!db) return false;
  if (_ready) return _ready;
  _ready = (async () => {
    await db.query(`CREATE TABLE IF NOT EXISTS connector_status (
      org_id TEXT NOT NULL, connector_id TEXT NOT NULL,
      connection_status TEXT, telemetry_status TEXT, control_assessment_status TEXT, overall_status TEXT,
      last_connection_check_at TIMESTAMPTZ, last_telemetry_check_at TIMESTAMPTZ, last_control_readiness_check_at TIMESTAMPTZ,
      missing_permissions JSONB, missing_telemetry JSONB, missing_denominators JSONB, missing_scope JSONB, missing_review_period JSONB,
      ready_controls JSONB, partially_ready_controls JSONB, not_ready_controls JSONB,
      detail JSONB, updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (org_id, connector_id))`).catch(() => {});
    await db.query(`CREATE TABLE IF NOT EXISTS connector_status_history (
      id BIGSERIAL PRIMARY KEY, org_id TEXT NOT NULL, connector_id TEXT NOT NULL,
      connection_status TEXT, telemetry_status TEXT, control_assessment_status TEXT, overall_status TEXT,
      ready_count INT, partial_count INT, not_ready_count INT, checked_at TIMESTAMPTZ DEFAULT NOW())`).catch(() => {});
    await db.query('CREATE INDEX IF NOT EXISTS idx_conn_status_hist ON connector_status_history (org_id, connector_id, checked_at DESC)').catch(() => {});
    return true;
  })();
  return _ready;
}

async function save(orgId, status) {
  if (!db || !status) return { ok: false, note: 'no database' };
  await ensureTables();
  const J = (v) => JSON.stringify(v || []);
  try {
    await db.query(
      `INSERT INTO connector_status (org_id, connector_id, connection_status, telemetry_status, control_assessment_status, overall_status,
         last_connection_check_at, last_telemetry_check_at, last_control_readiness_check_at,
         missing_permissions, missing_telemetry, missing_denominators, missing_scope, missing_review_period,
         ready_controls, partially_ready_controls, not_ready_controls, detail, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW())
       ON CONFLICT (org_id, connector_id) DO UPDATE SET
         connection_status=EXCLUDED.connection_status, telemetry_status=EXCLUDED.telemetry_status,
         control_assessment_status=EXCLUDED.control_assessment_status, overall_status=EXCLUDED.overall_status,
         last_connection_check_at=EXCLUDED.last_connection_check_at, last_telemetry_check_at=EXCLUDED.last_telemetry_check_at,
         last_control_readiness_check_at=EXCLUDED.last_control_readiness_check_at,
         missing_permissions=EXCLUDED.missing_permissions, missing_telemetry=EXCLUDED.missing_telemetry,
         missing_denominators=EXCLUDED.missing_denominators, missing_scope=EXCLUDED.missing_scope, missing_review_period=EXCLUDED.missing_review_period,
         ready_controls=EXCLUDED.ready_controls, partially_ready_controls=EXCLUDED.partially_ready_controls, not_ready_controls=EXCLUDED.not_ready_controls,
         detail=EXCLUDED.detail, updated_at=NOW()`,
      [orgId, status.connector_id, status.connection_status, status.telemetry_status, status.control_assessment_status, status.overall_status,
       status.last_connection_check_at, status.last_telemetry_check_at, status.last_control_readiness_check_at,
       J(status.missing_permissions), J(status.missing_telemetry), J(status.missing_denominators), J(status.missing_scope), J(status.missing_review_period),
       J(status.ready_controls), J(status.partially_ready_controls), J(status.not_ready_controls), JSON.stringify(status.next_steps || [])]);
    await db.query(
      `INSERT INTO connector_status_history (org_id, connector_id, connection_status, telemetry_status, control_assessment_status, overall_status, ready_count, partial_count, not_ready_count, checked_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,
      [orgId, status.connector_id, status.connection_status, status.telemetry_status, status.control_assessment_status, status.overall_status,
       (status.ready_controls || []).length, (status.partially_ready_controls || []).length, (status.not_ready_controls || []).length]).catch(() => {});
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}

async function history(orgId, connectorId, limit) {
  if (!db) return [];
  await ensureTables();
  try {
    return (await db.query(
      'SELECT connection_status, telemetry_status, control_assessment_status, overall_status, ready_count, partial_count, not_ready_count, checked_at FROM connector_status_history WHERE org_id=$1 AND connector_id=$2 ORDER BY checked_at DESC LIMIT $3',
      [orgId, connectorId, limit || 50])) || [];
  } catch (_) { return []; }
}

module.exports = { ensureTables, save, history };
