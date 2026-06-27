'use strict';

/**
 * RagIngestService — section-aware chunk + embed + store for an uploaded doc.
 * Runs inside the quota-gated scan, before/alongside the per-control assessment.
 * Embedding is best-effort: if Voyage isn't configured or pgvector is absent,
 * chunks are still stored (without vectors) and ingestion never breaks the
 * existing upload/review behavior.
 */

const db = require('../../utils/db');
const logger = require('../../utils/logger');
const cfg = require('../../config/ragConfig');
const { chunkDocument } = require('./DocumentChunker');
const Embeddings = require('./EmbeddingService');
const VectorStore = require('./VectorStore');

/**
 * @param {string} orgId
 * @param {string} uploadId
 * @param {string} [text] normalized document text; loaded from document_upload if omitted
 */
async function ingestUpload(orgId, uploadId, text) {
  let body = text;
  if (body == null) {
    const rows = await db.query('SELECT normalized_text FROM document_upload WHERE id=$1 AND org_id=$2', [uploadId, orgId]);
    body = rows[0] && rows[0].normalized_text;
  }
  if (!body) return { chunks: 0, embedded: 0, stored: 0, available: false, reason: 'no_text' };

  const chunks = chunkDocument(body);

  let embeddings = [];
  if (cfg.embeddingEnabled && chunks.length) {
    try { embeddings = await Embeddings.embed(chunks.map((c) => c.text), { inputType: 'document' }); }
    catch (e) { logger.warn(`embedding skipped for ${uploadId}: ${e.message}`); embeddings = []; }
  }

  const res = await VectorStore.upsertChunks(orgId, uploadId, chunks, embeddings);
  logger.info('rag ingest', { uploadId, chunks: chunks.length, embedded: res.embedded, vectorStore: res.available });
  return { chunks: chunks.length, embedded: res.embedded, stored: res.stored, available: res.available };
}

module.exports = { ingestUpload };
