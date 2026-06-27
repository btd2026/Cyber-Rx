'use strict';

/**
 * EmbeddingService — Voyage AI embeddings (Checkpoint-1 decision), config-driven
 * and provider-swappable. Batches inputs to the provider's cap and returns one
 * vector per input, in order. Network goes through global fetch so it is easily
 * mocked in tests. No key -> a clear error (callers treat embeddings as
 * best-effort during ingestion).
 */

const cfg = require('../../config/ragConfig');

const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings';

async function embedVoyage(texts, inputType) {
  if (!cfg.voyageApiKey) throw new Error('VOYAGE_API_KEY is not set — cannot embed.');
  const out = [];
  for (let i = 0; i < texts.length; i += cfg.embedBatchSize) {
    const batch = texts.slice(i, i + cfg.embedBatchSize);
    const r = await fetch(VOYAGE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.voyageApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: batch, model: cfg.voyageModel, input_type: inputType || cfg.embedInputType }),
    });
    if (!r || !r.ok) {
      let detail = ''; try { detail = (await r.text()).slice(0, 200); } catch (_) {}
      throw new Error(`Voyage embeddings HTTP ${r ? r.status : '?'}${detail ? ` (${detail})` : ''}`);
    }
    const j = await r.json();
    // Sort by index to guarantee alignment with the input order.
    (j.data || []).slice().sort((a, b) => a.index - b.index).forEach((d) => out.push(d.embedding));
  }
  if (out.length !== texts.length) throw new Error(`Voyage returned ${out.length} vectors for ${texts.length} inputs`);
  return out;
}

/**
 * Embed an array of texts -> array of float vectors (aligned by index).
 * @param {string[]} texts
 * @param {{inputType?:'document'|'query'}} [opts]
 */
async function embed(texts, opts = {}) {
  if (!Array.isArray(texts) || texts.length === 0) return [];
  if (cfg.provider === 'voyage') return embedVoyage(texts, opts.inputType);
  throw new Error(`Unsupported embedding provider: ${cfg.provider}`);
}

/** Convenience: embed a single query string for retrieval. */
async function embedQuery(text) { return (await embed([text], { inputType: 'query' }))[0]; }

module.exports = { embed, embedQuery, VOYAGE_URL };
