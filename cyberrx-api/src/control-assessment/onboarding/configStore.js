'use strict';

/**
 * configStore — persists a client's connector onboarding configuration (scope,
 * denominator sources, review period). SECRETS ARE NOT STORED HERE — credentials
 * go through the encrypted vault (utils/vault). This table holds only the non-
 * secret scope/denominator/review config used to compute readiness.
 */

let db; try { db = require('../../utils/db'); } catch (_) { db = null; }

let _ready = null;
async function ensureTable() {
  if (!db) return;
  if (_ready) return _ready;
  _ready = db.query(`CREATE TABLE IF NOT EXISTS connector_onboarding_config (
    org_id TEXT NOT NULL, connector_id TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (org_id, connector_id))`).catch(() => {});
  return _ready;
}

async function getConfig(orgId, connectorId) {
  if (!db) return {};
  await ensureTable();
  try {
    const rows = await db.query('SELECT config FROM connector_onboarding_config WHERE org_id=$1 AND connector_id=$2', [orgId, connectorId]);
    return (rows && rows[0] && rows[0].config) || {};
  } catch (_) { return {}; }
}

async function setConfig(orgId, connectorId, config) {
  if (!db) return { ok: false, note: 'no database' };
  await ensureTable();
  try {
    await db.query(
      `INSERT INTO connector_onboarding_config (org_id, connector_id, config, updated_at) VALUES ($1,$2,$3,NOW())
       ON CONFLICT (org_id, connector_id) DO UPDATE SET config=EXCLUDED.config, updated_at=NOW()`,
      [orgId, connectorId, JSON.stringify(config || {})]);
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}

module.exports = { ensureTable, getConfig, setConfig };
