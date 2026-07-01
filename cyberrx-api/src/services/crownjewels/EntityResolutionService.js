'use strict';

/**
 * EntityResolutionService — Stage 3 of the Crown Jewel Analysis Engine (§3).
 * Deduplicates and canonicalizes assets and processes that appear across sources
 * using a three-tier pipeline: deterministic matching → embedding similarity →
 * LLM adjudication. Never silently merges on a weak match; low-confidence pairs
 * are sent to a human review queue.
 *
 * Pure functions where possible; LLM calls use the cheap model via injectable
 * Anthropic client. All functions exported for testability.
 */

const logger = require('../../utils/logger');
const models = require('../../config/assessmentModels');
const Embeddings = require('../rag/EmbeddingService');

// ---------------------------------------------------------------------------
// Config — env-driven thresholds, no hardcoded model IDs
// ---------------------------------------------------------------------------

const num = (name, def) => { const v = parseFloat(process.env[name]); return Number.isFinite(v) ? v : def; };

const EMBED_THRESHOLD  = () => num('ER_EMBED_THRESHOLD', 0.75);
const AUTO_ACCEPT      = () => num('ER_AUTO_ACCEPT', 0.90);
const LLM_CONFIDENCE   = 0.7; // below this → review queue

// Suffixes stripped during name normalization.
const STRIP_SUFFIXES = /\b(inc|llc|ltd|corp|server|prod|production|dev|staging|test)\b|\(production\)|\(prod\)/gi;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize a name for deterministic comparison. */
function normalizeName(raw) {
  if (!raw) return '';
  return String(raw)
    .toLowerCase()
    .replace(STRIP_SUFFIXES, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Cosine similarity between two equal-length float vectors. */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/** Build a deterministic key from an item's identity fields. */
function identityKey(item) {
  if (item.id) return `id:${String(item.id).trim().toLowerCase()}`;
  if (item.hostname) return `host:${String(item.hostname).trim().toLowerCase()}`;
  const n = normalizeName(item.name);
  return n ? `name:${n}` : null;
}

/** Extract a text blob suitable for embedding from an item. */
function itemText(item) {
  const parts = [item.name || ''];
  if (item.description) parts.push(item.description);
  if (item.hostname) parts.push(item.hostname);
  if (item.type) parts.push(item.type);
  return parts.join(' — ');
}

/** Extract text content from an Anthropic response. */
function textOf(resp) {
  return ((resp && resp.content) || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

/** Parse JSON from model output, tolerating surrounding prose. */
function parseJSON(text) {
  const s = String(text || '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b < 0) throw new Error('no JSON in LLM output');
  return JSON.parse(s.slice(a, b + 1));
}

// ---------------------------------------------------------------------------
// Stage 1 — Deterministic matching
// ---------------------------------------------------------------------------

/**
 * Group items by exact ID, hostname, or normalized name.
 * Pure function — no network, no LLM.
 *
 * @param {object[]} items
 * @returns {{ groups: object[][], unmatched: object[] }}
 */
function findDeterministicMatches(items) {
  if (!Array.isArray(items) || items.length === 0) return { groups: [], unmatched: [] };

  const buckets = new Map();
  const unmatched = [];

  for (const item of items) {
    const key = identityKey(item);
    if (!key) { unmatched.push(item); continue; }
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(item);
  }

  const groups = [];
  for (const [, bucket] of buckets) {
    if (bucket.length > 1) {
      groups.push(bucket);
    } else {
      unmatched.push(bucket[0]);
    }
  }

  return { groups, unmatched };
}

// ---------------------------------------------------------------------------
// Stage 2 — Embedding-based candidate generation
// ---------------------------------------------------------------------------

/**
 * Embed item names/descriptions and find pairs with cosine similarity above
 * the configured threshold. Candidate generation only — does NOT merge.
 *
 * @param {object[]} unmatched
 * @param {object}   [opts]
 * @param {number}   [opts.threshold] Override ER_EMBED_THRESHOLD
 * @returns {Promise<{a: object, b: object, similarity: number}[]>}
 */
async function findEmbeddingCandidates(unmatched, opts = {}) {
  if (!Array.isArray(unmatched) || unmatched.length < 2) return [];

  const threshold = opts.threshold != null ? opts.threshold : EMBED_THRESHOLD();
  const texts = unmatched.map(itemText);
  const vectors = await Embeddings.embed(texts);

  const candidates = [];
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      const sim = cosineSimilarity(vectors[i], vectors[j]);
      if (sim >= threshold) {
        candidates.push({ a: unmatched[i], b: unmatched[j], similarity: Math.round(sim * 10000) / 10000 });
      }
    }
  }

  // Sort by similarity descending — strongest matches first.
  candidates.sort((x, y) => y.similarity - x.similarity);
  return candidates;
}

// ---------------------------------------------------------------------------
// Stage 3 — LLM adjudication for ambiguous pairs
// ---------------------------------------------------------------------------

const ER_SYSTEM =
  'You are an entity resolution expert for IT asset management. ' +
  'Determine if two items refer to the same entity.';

/**
 * For candidate pairs between the embedding threshold and the auto-accept
 * threshold, ask the cheap LLM to adjudicate.
 *
 * @param {{ a: object, b: object, similarity: number }[]} candidates
 * @param {CostMeter} meter
 * @param {object}    [opts]
 * @param {object}    [opts.anthropic]  Anthropic SDK client
 * @returns {Promise<{ merged: object[], review: object[] }>}
 */
async function resolveAmbiguous(candidates, meter, opts = {}) {
  const autoAccept = AUTO_ACCEPT();
  const merged = [];
  const review = [];

  if (!Array.isArray(candidates) || candidates.length === 0) return { merged, review };

  const anthropic = opts.anthropic;

  for (const pair of candidates) {
    // Auto-accept high-confidence embedding matches.
    if (pair.similarity >= autoAccept) {
      merged.push({ items: [pair.a, pair.b], similarity: pair.similarity, method: 'embedding_auto' });
      continue;
    }

    // No anthropic client → send to review instead of silently dropping.
    if (!anthropic) {
      review.push({ items: [pair.a, pair.b], similarity: pair.similarity, reason: 'no LLM client available' });
      continue;
    }

    try {
      const model = models.triageModel; // cheap model (haiku)
      const resp = await anthropic.messages.create({
        model,
        max_tokens: 300,
        system: [{ type: 'text', text: ER_SYSTEM }],
        messages: [{
          role: 'user',
          content: JSON.stringify({
            item_a: { name: pair.a.name, id: pair.a.id, hostname: pair.a.hostname, type: pair.a.type, description: pair.a.description },
            item_b: { name: pair.b.name, id: pair.b.id, hostname: pair.b.hostname, type: pair.b.type, description: pair.b.description },
            embedding_similarity: pair.similarity,
          }),
        }],
      });

      if (meter && resp.usage) {
        meter.record('entity_resolution', model, resp.usage);
      }

      const verdict = parseJSON(textOf(resp));
      const confidence = Number(verdict.confidence) || 0;

      if (verdict.same_entity && confidence >= LLM_CONFIDENCE) {
        merged.push({
          items: [pair.a, pair.b],
          similarity: pair.similarity,
          confidence,
          rationale: verdict.rationale || null,
          method: 'llm_adjudicated',
        });
      } else {
        review.push({
          items: [pair.a, pair.b],
          similarity: pair.similarity,
          confidence,
          rationale: verdict.rationale || null,
          reason: !verdict.same_entity ? 'llm_rejected' : 'low_confidence',
        });
      }
    } catch (e) {
      logger.warn(`entity resolution LLM call failed: ${e.message}`);
      review.push({ items: [pair.a, pair.b], similarity: pair.similarity, reason: `llm_error: ${e.message}` });
    }
  }

  return { merged, review };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Run the full entity resolution pipeline for an organization's assets and
 * processes. Deterministic → embedding → LLM adjudication.
 *
 * @param {string}   orgId
 * @param {object[]} assets
 * @param {object[]} processes
 * @param {object}   [opts]
 * @param {object}   [opts.anthropic]       Anthropic SDK client
 * @param {number}   [opts.embedThreshold]  Override ER_EMBED_THRESHOLD
 * @param {number}   [opts.autoAccept]      Override ER_AUTO_ACCEPT
 * @param {CostMeter} [opts.meter]          CostMeter instance for token tracking
 * @returns {Promise<{ assets: {merged, review}, processes: {merged, review}, stats }>}
 */
async function resolve(orgId, assets, processes, opts = {}) {
  const meter = opts.meter || null;
  const anthropic = opts.anthropic || null;

  const stats = {
    deterministic_matches: 0,
    embedding_candidates: 0,
    llm_adjudicated: 0,
    sent_to_review: 0,
  };

  async function pipeline(items, label) {
    if (!Array.isArray(items) || items.length === 0) return { merged: [], review: [] };

    // Stage 1: deterministic
    const det = findDeterministicMatches(items);
    stats.deterministic_matches += det.groups.length;
    logger.info(`[EntityResolution] ${label} deterministic matches: ${det.groups.length}, unmatched: ${det.unmatched.length}`);

    // Stage 2: embedding candidates from unmatched
    let candidates = [];
    try {
      candidates = await findEmbeddingCandidates(det.unmatched, { threshold: opts.embedThreshold });
    } catch (e) {
      logger.warn(`[EntityResolution] ${label} embedding step failed: ${e.message}`);
    }
    stats.embedding_candidates += candidates.length;

    // Stage 3: LLM adjudication
    const { merged: llmMerged, review } = await resolveAmbiguous(candidates, meter, { anthropic });
    stats.llm_adjudicated += llmMerged.filter((m) => m.method === 'llm_adjudicated').length;
    stats.sent_to_review += review.length;

    // Combine deterministic groups with embedding/LLM merged pairs.
    const allMerged = [
      ...det.groups.map((group) => ({ items: group, method: 'deterministic' })),
      ...llmMerged,
    ];

    return { merged: allMerged, review };
  }

  const [assetResult, processResult] = await Promise.all([
    pipeline(assets, `org=${orgId} assets`),
    pipeline(processes, `org=${orgId} processes`),
  ]);

  return {
    assets: assetResult,
    processes: processResult,
    stats,
  };
}

module.exports = {
  resolve,
  findDeterministicMatches,
  findEmbeddingCandidates,
  resolveAmbiguous,
  // Exported for testability.
  normalizeName,
  cosineSimilarity,
  identityKey,
  itemText,
};
