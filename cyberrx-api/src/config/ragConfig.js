'use strict';

/**
 * Retrieval/embedding config for the grounded assessment engine (§2, §3).
 * All values env-overridable; nothing about chunking, the embedding provider,
 * top-k or thresholds is hardcoded into the pipeline.
 *
 * Embeddings: Voyage AI (Checkpoint-1 decision). Vector store: pgvector.
 */

function posInt(name, def) { const v = parseInt(process.env[name], 10); return Number.isFinite(v) && v > 0 ? v : def; }
function num(name, def) { const v = parseFloat(process.env[name]); return Number.isFinite(v) ? v : def; }

module.exports = {
  // --- Embeddings ---
  get provider() { return (process.env.EMBEDDING_PROVIDER || 'voyage').trim(); },
  get voyageModel() { return (process.env.VOYAGE_MODEL || 'voyage-3').trim(); },
  get voyageApiKey() { return process.env.VOYAGE_API_KEY || ''; },
  get embedDim() { return posInt('EMBED_DIM', 1024); },          // voyage-3 = 1024
  get embedBatchSize() { return posInt('EMBED_BATCH_SIZE', 96); }, // Voyage batch cap
  get embedInputType() { return (process.env.EMBED_INPUT_TYPE || 'document').trim(); },

  // --- Chunking (section-aware) ---
  get chunkMaxChars() { return posInt('CHUNK_MAX_CHARS', 1800); }, // ~450 tokens/chunk target
  get chunkMinChars() { return posInt('CHUNK_MIN_CHARS', 120); },  // merge slivers below this

  // --- Retrieval (used from Stage 4) ---
  get topK() { return posInt('RETRIEVAL_TOP_K', 5); },
  get simThreshold() { return num('RETRIEVAL_SIM_THRESHOLD', 0.55); }, // cosine; below => Not addressed (no LLM)

  // Whether embeddings are available (key present). Chunking still works without it.
  get embeddingEnabled() { return !!(process.env.VOYAGE_API_KEY || '').trim(); },
};
