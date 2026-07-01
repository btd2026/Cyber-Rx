'use strict';

/**
 * DependencyMappingService — Stage 4: build the process<->asset dependency graph
 * from explicit relationships + embedding-based inference for unlinked items.
 *
 * Explicit relationships from authoritative sources (Asset.business_process_ids,
 * BusinessProcess.supported_by_systems) ALWAYS beat inferred ones. If an explicit
 * edge exists for a process<->asset pair, an inferred one is never created.
 *
 * All functions are exported for testability.
 */

const { v4: uuidv4 } = require('uuid');
const { query } = require('../../utils/db');
const Embedding = require('../rag/EmbeddingService');
const logger = require('../../utils/logger');

const DEP_AUTO_ACCEPT = Number(process.env.DEP_AUTO_ACCEPT) || 0.85;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Cosine similarity between two equal-length float vectors. */
function cosineSim(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/** Dedupe key for a process+asset pair. */
function pairKey(processId, assetId) { return `${processId}::${assetId}`; }

// ---------------------------------------------------------------------------
// 1. extractExplicit  (pure — no IO)
// ---------------------------------------------------------------------------

/**
 * Extract explicit dependency edges from the two authoritative sources:
 *   - Asset.businessProcessIds  -> the asset declares which processes it supports
 *   - BusinessProcess.supportedBySystems -> the process declares which assets support it
 *
 * Deduplicates on (process_id, asset_id). Returns an array of DependencyEdge objects.
 *
 * @param {Object[]} assets    — Asset model objects (camelCase)
 * @param {Object[]} processes — BusinessProcess model objects (camelCase)
 * @returns {Object[]} DependencyEdge[]
 */
function extractExplicit(assets, processes) {
  const seen = new Set();
  const edges = [];

  // Source 1: Asset.businessProcessIds
  for (const asset of assets) {
    const bpIds = Array.isArray(asset.businessProcessIds) ? asset.businessProcessIds : [];
    for (const processId of bpIds) {
      const key = pairKey(processId, asset.id);
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({
        id: uuidv4(),
        process_id: processId,
        asset_id: asset.id,
        relation: 'depends_on',
        origin: 'explicit',
        confidence: 1.0,
        rationale: `Source: asset.businessProcessIds`,
        review_status: 'auto',
      });
    }
  }

  // Source 2: BusinessProcess.supportedBySystems
  for (const proc of processes) {
    const sysIds = Array.isArray(proc.supportedBySystems) ? proc.supportedBySystems : [];
    for (const assetId of sysIds) {
      const key = pairKey(proc.id, assetId);
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({
        id: uuidv4(),
        process_id: proc.id,
        asset_id: assetId,
        relation: 'depends_on',
        origin: 'explicit',
        confidence: 1.0,
        rationale: `Source: process.supportedBySystems`,
        review_status: 'auto',
      });
    }
  }

  return edges;
}

// ---------------------------------------------------------------------------
// 2. inferMissing  (embedding-based)
// ---------------------------------------------------------------------------

/**
 * Build a text representation for embedding.
 * Combines name + description (when available) for richer semantic signal.
 */
function toEmbedText(entity) {
  const parts = [entity.name || ''];
  if (entity.description) parts.push(entity.description);
  return parts.join(' — ');
}

/**
 * For assets and processes NOT in any explicit edge, use name/description
 * similarity (via EmbeddingService) to infer potential links.
 *
 * @param {Object[]} assets         — all assets
 * @param {Object[]} processes      — all processes
 * @param {Object[]} explicitEdges  — edges from extractExplicit
 * @param {Object}   [opts]         — { meter?: CostMeter }
 * @returns {Promise<Object[]>}  inferred DependencyEdge[]
 */
async function inferMissing(assets, processes, explicitEdges, opts = {}) {
  // Build sets of asset/process IDs that already have at least one explicit edge.
  const linkedAssets = new Set();
  const linkedProcesses = new Set();
  for (const e of explicitEdges) {
    linkedAssets.add(e.asset_id);
    linkedProcesses.add(e.process_id);
  }

  // Keep only the key for explicit pairs so we never duplicate them.
  const explicitPairs = new Set(explicitEdges.map((e) => pairKey(e.process_id, e.asset_id)));

  // Candidates: items with NO explicit edge at all.
  const unlinkedAssets = assets.filter((a) => !linkedAssets.has(a.id));
  const unlinkedProcesses = processes.filter((p) => !linkedProcesses.has(p.id));

  // Nothing to infer when there are no orphans on either side.
  if (unlinkedAssets.length === 0 && unlinkedProcesses.length === 0) return [];
  // Need at least one item on each side to form edges.
  if (assets.length === 0 || processes.length === 0) return [];

  // Determine which items need embeddings. We embed ALL processes/assets that
  // could participate in a candidate pair: unlinked assets against ALL processes,
  // unlinked processes against ALL assets.
  const processTexts = processes.map(toEmbedText);
  const assetTexts = assets.map(toEmbedText);

  let processVecs, assetVecs;
  try {
    [processVecs, assetVecs] = await Promise.all([
      Embedding.embed(processTexts, { inputType: 'document' }),
      Embedding.embed(assetTexts, { inputType: 'document' }),
    ]);
  } catch (err) {
    logger.warn('DependencyMapping: embedding failed, skipping inference', { error: err.message });
    return [];
  }

  if (!processVecs.length || !assetVecs.length) return [];

  const threshold = DEP_AUTO_ACCEPT;
  const edges = [];

  // For each unlinked asset, find best-matching processes.
  for (let ai = 0; ai < assets.length; ai++) {
    const asset = assets[ai];
    if (linkedAssets.has(asset.id) && linkedProcesses.size === processes.length) continue;

    for (let pi = 0; pi < processes.length; pi++) {
      const proc = processes[pi];
      // Skip if BOTH sides are already linked (we only infer when at least one is unlinked).
      if (linkedAssets.has(asset.id) && linkedProcesses.has(proc.id)) continue;
      // Skip if this pair already has an explicit edge.
      const key = pairKey(proc.id, asset.id);
      if (explicitPairs.has(key)) continue;

      const sim = cosineSim(assetVecs[ai], processVecs[pi]);
      // Only consider meaningful similarity.
      if (sim < 0.3) continue;

      const confidence = Math.round(sim * 1000) / 1000;
      edges.push({
        id: uuidv4(),
        process_id: proc.id,
        asset_id: asset.id,
        relation: 'depends_on',
        origin: 'inferred',
        confidence,
        rationale: `Asset '${asset.name}' name-matches process '${proc.name}' (similarity: ${confidence})`,
        review_status: confidence >= threshold ? 'auto' : 'pending',
      });
    }
  }

  return edges;
}

// ---------------------------------------------------------------------------
// 3. persist  (upsert to dependency_edge)
// ---------------------------------------------------------------------------

/**
 * Write edges to the dependency_edge table using upsert.
 * ON CONFLICT on (organization_id, process_id, asset_id) -> update the edge
 * but NEVER downgrade an explicit edge to an inferred one.
 *
 * @param {string}   orgId  — organization ID
 * @param {Object[]} edges  — DependencyEdge[]
 * @param {string}   runId  — analysis run ID
 */
async function persist(orgId, edges, runId) {
  if (!edges.length) return;

  for (const edge of edges) {
    await query(
      `INSERT INTO dependency_edge (
        id, organization_id, process_id, asset_id, relation, origin,
        confidence, rationale, review_status, run_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (organization_id, process_id, asset_id) DO UPDATE SET
        relation        = CASE WHEN dependency_edge.origin = 'explicit' THEN dependency_edge.relation        ELSE EXCLUDED.relation        END,
        origin          = CASE WHEN dependency_edge.origin = 'explicit' THEN dependency_edge.origin          ELSE EXCLUDED.origin          END,
        confidence      = CASE WHEN dependency_edge.origin = 'explicit' THEN dependency_edge.confidence      ELSE EXCLUDED.confidence      END,
        rationale       = CASE WHEN dependency_edge.origin = 'explicit' THEN dependency_edge.rationale       ELSE EXCLUDED.rationale       END,
        review_status   = CASE WHEN dependency_edge.origin = 'explicit' THEN dependency_edge.review_status   ELSE EXCLUDED.review_status   END,
        run_id          = EXCLUDED.run_id`,
      [edge.id, orgId, edge.process_id, edge.asset_id, edge.relation, edge.origin,
       edge.confidence, edge.rationale, edge.review_status, runId],
    );
  }
}

// ---------------------------------------------------------------------------
// 4. build  (main entry point)
// ---------------------------------------------------------------------------

/**
 * Main entry. Builds the full dependency graph for an organization:
 *   1. Extract explicit edges from authoritative sources
 *   2. Infer missing edges for unlinked assets/processes via embeddings
 *   3. Persist all edges to the DB
 *
 * @param {string}   orgId      — organization ID
 * @param {Object[]} assets     — Asset model objects
 * @param {Object[]} processes  — BusinessProcess model objects
 * @param {Object}   [opts]     — { meter?: CostMeter, runId?: string }
 * @returns {Promise<Object>} { edges, review, stats }
 */
async function build(orgId, assets, processes, opts = {}) {
  const runId = opts.runId || uuidv4();

  // Step 1: explicit edges (pure, synchronous)
  const explicit = extractExplicit(assets, processes);

  // Step 2: inferred edges for orphans
  let inferred = [];
  try {
    inferred = await inferMissing(assets, processes, explicit, opts);
  } catch (err) {
    logger.warn('DependencyMapping: inference step failed, continuing with explicit only', { error: err.message });
  }

  // Partition inferred into auto-accepted and pending-review
  const inferredAccepted = inferred.filter((e) => e.review_status === 'auto');
  const inferredPending = inferred.filter((e) => e.review_status === 'pending');

  // All edges to persist: explicit + all inferred (both accepted and pending)
  const allEdges = [...explicit, ...inferred];

  // Step 3: persist
  try {
    await persist(orgId, allEdges, runId);
  } catch (err) {
    logger.warn('DependencyMapping: persist failed', { error: err.message });
  }

  // Accepted edges = explicit + auto-accepted inferred
  const acceptedEdges = [...explicit, ...inferredAccepted];

  return {
    edges: acceptedEdges,
    review: inferredPending,
    stats: {
      explicit: explicit.length,
      inferred_accepted: inferredAccepted.length,
      inferred_pending: inferredPending.length,
      total: allEdges.length,
    },
  };
}

module.exports = { extractExplicit, inferMissing, persist, build, cosineSim, pairKey };
