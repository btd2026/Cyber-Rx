'use strict';

/**
 * IntakeLedgerService — the intake evidence ledger. Logs every user validation
 * action (accept / edit / delete / add) during intake, with who / when / what,
 * so inferred data carries provenance and the validation trail is auditable.
 * Mirrors the decision_ledger pattern but is intake-specific (no DecisionCard
 * semantics). Table: intake_validation_ledger.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');

function id() { return `ivl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

// Record one validation action. entry: { step, objectType, objectId, action, changes, decidedBy, rationale }
async function record(orgId, entry = {}) {
  const e = entry || {};
  try {
    const rid = id();
    await db.query(
      `INSERT INTO intake_validation_ledger (id, organization_id, step, object_type, object_id, action, changes, decided_by, rationale)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [rid, orgId, e.step || null, e.objectType || null, e.objectId || null, e.action || null, JSON.stringify(e.changes || {}), e.decidedBy || null, e.rationale || null]);
    return { id: rid, recorded: true };
  } catch (err) { logger.warn('intake ledger record failed', { error: err.message }); return { recorded: false, error: err.message }; }
}

// Record a batch of actions (e.g., a whole tree validation submit).
async function recordMany(orgId, entries = []) {
  const out = [];
  for (const e of entries) out.push(await record(orgId, e));
  return { recorded: out.filter((x) => x.recorded).length, total: entries.length };
}

async function list(orgId, { step, limit = 500 } = {}) {
  try {
    const rows = step
      ? await db.query('SELECT * FROM intake_validation_ledger WHERE organization_id=$1 AND step=$2 ORDER BY created_at DESC LIMIT $3', [orgId, step, limit])
      : await db.query('SELECT * FROM intake_validation_ledger WHERE organization_id=$1 ORDER BY created_at DESC LIMIT $2', [orgId, limit]);
    return rows;
  } catch (err) { logger.debug('intake ledger list degraded', { error: err.message }); return []; }
}

module.exports = { record, recordMany, list };
