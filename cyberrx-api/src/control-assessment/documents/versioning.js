'use strict';

/**
 * versioning — content-hash version tracking for governance documents.
 *
 * Every uploaded document is fingerprinted (SHA-256 of its extracted text). A
 * new hash for the same (org, control, document_type) creates a new VERSION and
 * supersedes the prior one; an identical hash is a no-op (same content
 * re-uploaded). The active version is always the newest non-superseded one.
 *
 * Storage is best-effort Postgres — if no DB is wired the functions degrade to
 * returning computed metadata without persisting, so the engine still works in
 * stateless mode. The hash + version metadata are what drive reassessment.
 */

const crypto = require('crypto');

function hashText(text) {
  return crypto.createHash('sha256').update(String(text || ''), 'utf8').digest('hex');
}

const DDL = `
CREATE TABLE IF NOT EXISTS document_version (
  id              BIGSERIAL PRIMARY KEY,
  org_id          TEXT NOT NULL,
  framework_key   TEXT,
  control_id      TEXT,
  document_type   TEXT NOT NULL,
  document_name   TEXT,
  content_hash    TEXT NOT NULL,
  version         INTEGER NOT NULL,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  superseded_by   BIGINT,
  replaced_document_id BIGINT,
  owner           TEXT,
  approval_date   TIMESTAMPTZ,
  effective_date  TIMESTAMPTZ,
  last_review_date TIMESTAMPTZ,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_document_version_scope ON document_version (org_id, document_type, control_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_document_version_hash ON document_version (org_id, document_type, content_hash);
`;

async function ensureSchema(db) {
  if (!db || typeof db.query !== 'function') return false;
  try { await db.query(DDL); return true; } catch (_) { return false; }
}

/**
 * recordVersion — register (or recognize) a document version by content hash.
 * Returns { hash, version, active, is_new, superseded_version_id, unchanged }.
 * With no DB it still returns the hash + version:1 so callers can proceed.
 */
async function recordVersion(db, doc) {
  const hash = hashText(doc.text);
  const meta = {
    org_id: doc.org_id, framework_key: doc.framework_key || null, control_id: doc.control_id || null,
    document_type: doc.document_type, document_name: doc.document_name || null,
    owner: doc.owner || null, approval_date: doc.approval_date || null,
    effective_date: doc.effective_date || null, last_review_date: doc.last_review_date || null,
  };
  const ok = await ensureSchema(db);
  if (!ok) return { hash, version: 1, active: true, is_new: true, superseded_version_id: null, unchanged: false, persisted: false };

  try {
    // identical content already recorded? → no-op
    const same = await db.query(
      'SELECT id, version FROM document_version WHERE org_id=$1 AND document_type=$2 AND content_hash=$3 LIMIT 1',
      [meta.org_id, meta.document_type, hash]
    );
    if (same.rows && same.rows.length) {
      return { hash, version: same.rows[0].version, active: true, is_new: false, superseded_version_id: null, unchanged: true, persisted: true, id: same.rows[0].id };
    }
    // find current active version for this scope
    const cur = await db.query(
      'SELECT id, version FROM document_version WHERE org_id=$1 AND document_type=$2 AND coalesce(control_id,\'\')=coalesce($3,\'\') AND active=TRUE ORDER BY version DESC LIMIT 1',
      [meta.org_id, meta.document_type, meta.control_id]
    );
    const prev = cur.rows && cur.rows[0];
    const nextVersion = prev ? prev.version + 1 : 1;
    const ins = await db.query(
      `INSERT INTO document_version
        (org_id, framework_key, control_id, document_type, document_name, content_hash, version, active, replaced_document_id, owner, approval_date, effective_date, last_review_date, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [meta.org_id, meta.framework_key, meta.control_id, meta.document_type, meta.document_name, hash, nextVersion,
       prev ? prev.id : null, meta.owner, meta.approval_date, meta.effective_date, meta.last_review_date, JSON.stringify(meta)]
    );
    const newId = ins.rows[0].id;
    if (prev) {
      await db.query('UPDATE document_version SET active=FALSE, superseded_by=$1 WHERE id=$2', [newId, prev.id]);
    }
    return { hash, version: nextVersion, active: true, is_new: true, superseded_version_id: prev ? prev.id : null, unchanged: false, persisted: true, id: newId };
  } catch (_) {
    return { hash, version: 1, active: true, is_new: true, superseded_version_id: null, unchanged: false, persisted: false };
  }
}

async function activeVersion(db, orgId, documentType, controlId) {
  if (!(await ensureSchema(db))) return null;
  try {
    const r = await db.query(
      'SELECT * FROM document_version WHERE org_id=$1 AND document_type=$2 AND coalesce(control_id,\'\')=coalesce($3,\'\') AND active=TRUE ORDER BY version DESC LIMIT 1',
      [orgId, documentType, controlId || null]
    );
    return (r.rows && r.rows[0]) || null;
  } catch (_) { return null; }
}

async function versionHistory(db, orgId, documentType, controlId) {
  if (!(await ensureSchema(db))) return [];
  try {
    const r = await db.query(
      'SELECT * FROM document_version WHERE org_id=$1 AND document_type=$2 AND coalesce(control_id,\'\')=coalesce($3,\'\') ORDER BY version DESC',
      [orgId, documentType, controlId || null]
    );
    return r.rows || [];
  } catch (_) { return []; }
}

module.exports = { hashText, ensureSchema, recordVersion, activeVersion, versionHistory, DDL };
