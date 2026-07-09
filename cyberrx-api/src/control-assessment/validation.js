'use strict';

/**
 * validation — per-connector live-tenant validation status. A connector is only
 * `live_tenant_validated` after a human confirms its collectors return correct
 * data against a real tenant. The engine refuses to conclude Effective for any
 * control whose connector is not validated here — so nothing is over-claimed on
 * documented-but-unproven connector logic. Default: everything unvalidated.
 */

let db;
try { db = require('../utils/db'); } catch (_) { db = null; }

let _ready = null;
async function ensureTable() {
  if (!db) return;
  if (_ready) return _ready;
  _ready = db.query(`CREATE TABLE IF NOT EXISTS integration_validation (
    org_id TEXT NOT NULL, connector TEXT NOT NULL,
    live_tenant_validated BOOLEAN NOT NULL DEFAULT FALSE,
    validated_at TIMESTAMPTZ, validated_by TEXT,
    PRIMARY KEY (org_id, connector))`).catch(() => {});
  return _ready;
}

// { connector: { live_tenant_validated: bool, validated_at, validated_by } }
async function getValidation(orgId) {
  if (!db) return {};
  await ensureTable();
  const out = {};
  try {
    (await db.query('SELECT connector, live_tenant_validated, validated_at, validated_by FROM integration_validation WHERE org_id=$1', [orgId]))
      .forEach((r) => { out[r.connector] = { live_tenant_validated: r.live_tenant_validated === true, validated_at: r.validated_at, validated_by: r.validated_by }; });
  } catch (_) {}
  return out;
}

async function setValidation(orgId, connector, validated, by) {
  if (!db) return { ok: false, note: 'no database' };
  await ensureTable();
  try {
    await db.query(
      `INSERT INTO integration_validation (org_id, connector, live_tenant_validated, validated_at, validated_by)
       VALUES ($1,$2,$3,NOW(),$4)
       ON CONFLICT (org_id, connector) DO UPDATE SET live_tenant_validated=EXCLUDED.live_tenant_validated, validated_at=NOW(), validated_by=EXCLUDED.validated_by`,
      [orgId, connector, !!validated, by || null]
    );
    return { ok: true, connector, live_tenant_validated: !!validated };
  } catch (e) { return { ok: false, error: e.message }; }
}

module.exports = { ensureTable, getValidation, setValidation };
