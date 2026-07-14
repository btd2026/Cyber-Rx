'use strict';

/**
 * EvidenceStore — append-only, immutable evidence.
 * ------------------------------------------------
 * Never overwrite; always append. Every record carries source, method, collected_at, the raw
 * payload, and a content hash. This is the defensible audit trail ("show me why this control
 * was green on March 3rd") and it is what lets scores be RECOMPUTED retroactively when a rule
 * changes — you read the evidence as-of a date and replay it under the rule version in effect.
 *
 * The store exposes only append + read. There is deliberately NO update or delete — mutating
 * evidence would destroy the audit trail and the trend line.
 */
const crypto = require('crypto');
const db = require('../utils/db');

function hashPayload(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload == null ? null : payload)).digest('hex');
}

/** Append one immutable evidence record. Returns the stored hash. */
async function append(orgId, controlId, record) {
  if (!orgId) throw new Error('orgId is required');
  if (!controlId) throw new Error('controlId is required');
  const r = record || {};
  const method = ['live', 'hybrid', 'attestation'].includes(r.method) ? r.method : 'attestation';
  const source = String(r.source || 'unknown').slice(0, 200);
  const collectedAt = r.collectedAt || r.collected_at || null; // ISO string; caller stamps time (tests inject it)
  const payload = r.payload != null ? r.payload : {};
  const hash = hashPayload(payload);
  await db.query(
    `INSERT INTO control_evidence (org_id, control_id, source, method, collected_at, payload, hash)
     VALUES ($1,$2,$3,$4,COALESCE($5::timestamptz, NOW()),$6::jsonb,$7)`,
    [orgId, controlId, source, method, collectedAt, JSON.stringify(payload), hash],
  );
  return { hash, method, source, collectedAt };
}

/** All evidence for a control up to `asOf` (for recomputability), newest first. */
async function forControl(orgId, controlId, asOf) {
  if (!orgId || !controlId) throw new Error('orgId and controlId are required');
  const r = await db.query(
    `SELECT control_id, source, method, collected_at, payload, hash
       FROM control_evidence
      WHERE org_id = $1 AND control_id = $2 AND ($3::timestamptz IS NULL OR collected_at <= $3::timestamptz)
      ORDER BY collected_at DESC`,
    [orgId, controlId, asOf || null],
  );
  // db.query returns the rows array directly; tolerate a {rows} wrapper too.
  return Array.isArray(r) ? r : ((r && r.rows) || []);
}

/** The most recent evidence record for a control as-of a date (or null). */
async function latest(orgId, controlId, asOf) {
  const rows = await forControl(orgId, controlId, asOf);
  return rows[0] || null;
}

module.exports = { append, forControl, latest, hashPayload };
