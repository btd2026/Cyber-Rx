'use strict';

/**
 * VectorStore — pgvector-backed storage + cosine search for document chunks.
 *
 * The pgvector dependency is isolated here (NOT in the big db.init() block) so a
 * missing `vector` extension degrades only retrieval, never the rest of schema
 * creation. ensureTables() is idempotent and best-effort; callers check the
 * returned availability flag. Chunks are stored even when embeddings are absent
 * (embedding column nullable), so ingestion never hard-depends on the embedder.
 */

const db = require('../../utils/db');
const logger = require('../../utils/logger');
const cfg = require('../../config/ragConfig');

let _available = null; // cache: is pgvector usable?

const vecLiteral = (v) => (Array.isArray(v) && v.length ? `[${v.join(',')}]` : null);

async function ensureTables() {
  if (_available !== null) return _available;
  try {
    await db.query('CREATE EXTENSION IF NOT EXISTS vector');
    await db.query(`
      CREATE TABLE IF NOT EXISTS document_chunk (
        id                 TEXT PRIMARY KEY,
        org_id             TEXT NOT NULL,
        document_upload_id TEXT NOT NULL,
        ordinal            INT  NOT NULL,
        section_ref        TEXT,
        heading            TEXT,
        text               TEXT NOT NULL,
        char_count         INT,
        embedding          vector(${cfg.embedDim}),
        embed_model        TEXT,
        created_at         TIMESTAMPTZ DEFAULT NOW()
      )`);
    await db.query('CREATE INDEX IF NOT EXISTS document_chunk_doc ON document_chunk(document_upload_id)');
    await db.query('CREATE INDEX IF NOT EXISTS document_chunk_org ON document_chunk(org_id)');
    // ANN index for cosine search (safe to skip if it fails on older pgvector).
    try { await db.query('CREATE INDEX IF NOT EXISTS document_chunk_embed ON document_chunk USING hnsw (embedding vector_cosine_ops)'); }
    catch (e) { logger.debug('hnsw index skipped', { error: e.message }); }
    _available = true;
  } catch (e) {
    logger.warn(`pgvector unavailable — chunk vector store disabled: ${e.message}`);
    _available = false;
  }
  return _available;
}

/** Replace all chunks for an upload. embeddings[] aligns with chunks[] (may be null). */
async function upsertChunks(orgId, uploadId, chunks, embeddings = []) {
  if (!(await ensureTables())) return { stored: 0, embedded: 0, available: false };
  await db.query('DELETE FROM document_chunk WHERE org_id=$1 AND document_upload_id=$2', [orgId, uploadId]);
  let stored = 0; let embedded = 0;
  for (let i = 0; i < chunks.length; i += 1) {
    const c = chunks[i];
    const vec = vecLiteral(embeddings[i]);
    if (vec) embedded += 1;
    await db.query(
      `INSERT INTO document_chunk (id, org_id, document_upload_id, ordinal, section_ref, heading, text, char_count, embedding, embed_model)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::vector,$10)`,
      [`ch_${uploadId}_${c.ordinal}`, orgId, uploadId, c.ordinal, c.section_ref, c.heading || null,
        c.text, c.char_count || c.text.length, vec, vec ? cfg.voyageModel : null]);
    stored += 1;
  }
  return { stored, embedded, available: true };
}

async function listChunks(orgId, uploadId) {
  if (!(await ensureTables())) return [];
  return db.query(
    'SELECT id, ordinal, section_ref, heading, text, char_count, (embedding IS NOT NULL) AS has_embedding FROM document_chunk WHERE org_id=$1 AND document_upload_id=$2 ORDER BY ordinal',
    [orgId, uploadId]);
}

/**
 * Cosine-nearest chunks to a query vector. Returns rows with `similarity`
 * (1 - cosine distance) so callers can apply RETRIEVAL_SIM_THRESHOLD.
 */
async function search(orgId, queryVec, k = cfg.topK, { uploadId } = {}) {
  if (!(await ensureTables())) return [];
  const vec = vecLiteral(queryVec);
  if (!vec) return [];
  const params = [orgId, vec, k];
  let where = 'org_id=$1 AND embedding IS NOT NULL';
  if (uploadId) { params.splice(1, 0, uploadId); where = 'org_id=$1 AND document_upload_id=$2 AND embedding IS NOT NULL'; }
  const vecIdx = params.indexOf(vec) + 1; const kIdx = params.indexOf(k) + 1;
  return db.query(
    `SELECT id, ordinal, section_ref, heading, text, 1 - (embedding <=> $${vecIdx}::vector) AS similarity
       FROM document_chunk WHERE ${where}
      ORDER BY embedding <=> $${vecIdx}::vector LIMIT $${kIdx}`,
    params);
}

// test seam
function _reset() { _available = null; }

module.exports = { ensureTables, upsertChunks, listChunks, search, vecLiteral, _reset };
