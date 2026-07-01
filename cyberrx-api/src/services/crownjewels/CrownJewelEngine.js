'use strict';

/**
 * CrownJewelEngine — orchestrates the full 10-stage crown-jewel analysis pipeline.
 *
 * Lightweight run():   deterministic scoring from existing inventory (no quota).
 * Full runPipeline():  quota-gated, runs Stages 2-8:
 *   Entity Resolution → Dependency Mapping → Criticality Scoring →
 *   Risk Mapping → Control Mapping → Graph Assembly.
 *
 * Deterministic-first; LLM only for entity resolution ambiguity (cheap model).
 * Degrades gracefully to an empty result when an org has no inventory.
 */

const logger = require('../../utils/logger');
const Asset = require('../../models/Asset');
const BusinessProcess = require('../../models/BusinessProcess');
const Risk = require('../../models/Risk');
const Criticality = require('./CriticalityService');
const Graph = require('./GraphModelService');
const EntityResolution = require('./EntityResolutionService');
const DependencyMapping = require('./DependencyMappingService');
const RiskMapping = require('./RiskMappingService');
const ControlMapping = require('./ControlMappingService');
const AnalystQueue = require('../assessment/AnalystQueueService');

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

// Models return camelCase (businessProcessIds/dataClassification/cloudProvider),
// but the scorer + graph read snake_case. Alias both so DB-loaded assets score
// correctly (unit fixtures use snake_case directly, so this only bites live data).
function normAsset(a) {
  return {
    ...a,
    business_process_ids: a.business_process_ids || a.businessProcessIds || [],
    data_classification: a.data_classification || a.dataClassification || [],
    cloud_provider: a.cloud_provider || a.cloudProvider || null,
  };
}

// materialExposure() reads snake_case, but Risk._transformFromDb returns camelCase.
function normRisk(r) {
  return {
    ...r,
    asset_id: r.asset_id || r.assetId || null,
    business_process_ids: r.business_process_ids || r.businessProcessIds || [],
    financial_exposure: r.financial_exposure != null ? r.financial_exposure : r.financialExposure,
  };
}

async function run(orgId) {
  const [rawAssets, processes, rawRisks] = await Promise.all([
    Asset.findByOrganization(orgId).catch(() => []),
    BusinessProcess.findByOrganization(orgId).catch(() => []),
    Risk.findByOrganization(orgId).catch(() => []),
  ]);
  if (!rawAssets.length) return empty(orgId);
  const assets = rawAssets.map(normAsset);
  const risks = rawRisks.map(normRisk);

  const procById = {}; processes.forEach((p) => { procById[p.id] = p; });

  const supporters = {};
  assets.forEach((a) => (a.business_process_ids || []).forEach((pid) => { supporters[pid] = (supporters[pid] || 0) + 1; }));

  const scored = assets.map((a) => {
    const procs = (a.business_process_ids || []).map((pid) => procById[pid]).filter(Boolean);
    const isSpof = procs.some((p) => ['critical', 'high'].includes(String(p.criticality || '').toLowerCase()) && supporters[p.id] === 1);
    const s = Criticality.scoreAsset(a, { processes: procs, isSpof });
    return { ...a, criticality_score: s.score, criticality_breakdown: s.breakdown, crown_jewel: s.crown_jewel, crown_jewel_tier: s.crown_jewel_tier, rationale: s.rationale };
  });

  const crownAssets = scored.filter((a) => a.crown_jewel).sort((x, y) => y.criticality_score - x.criticality_score);
  const expo = materialExposure(crownAssets, risks);
  const graph = Graph.build({ processes, assets: scored, risks, controls: [] });

  return {
    org_id: orgId,
    generated_at: new Date().toISOString(),
    summary: {
      material_exposure_usd: expo.total,
      material_exposure_basis: expo.basis,
      material_exposure_items: expo.items.slice(0, 10),
      counts: { assets: assets.length, processes: processes.length, risks: risks.length, crown_jewels: crownAssets.length },
      crown_jewels: crownAssets.slice(0, 12).map((a) => ({
        id: a.id, name: a.name, type: a.type, tier: a.crown_jewel_tier,
        score: Math.round(a.criticality_score * 100), breakdown: a.criticality_breakdown, rationale: a.rationale,
      })),
    },
    graph,
    assets: scored,
  };
}

/**
 * Full pipeline — called from the quota-gated POST /analyze route.
 * Runs stages 3-8 with CostMeter tracking. Returns the complete analysis result.
 */
async function runPipeline(orgId, { runId, meter, anthropic } = {}) {
  const [rawAssets, processes, rawRisks] = await Promise.all([
    Asset.findByOrganization(orgId).catch(() => []),
    BusinessProcess.findByOrganization(orgId).catch(() => []),
    Risk.findByOrganization(orgId).catch(() => []),
  ]);
  if (!rawAssets.length) return empty(orgId);
  const assets = rawAssets.map(normAsset);
  const risks = rawRisks.map(normRisk);

  // Stage 3: Entity Resolution
  let resolvedAssets = assets;
  let resolvedProcesses = processes;
  let erStats = null;
  try {
    const er = await EntityResolution.resolve(orgId, assets, processes, { anthropic, meter });
    erStats = er.stats;
    logger.info(`[CrownJewelEngine] Entity resolution: ${JSON.stringify(er.stats)}`);
  } catch (e) {
    logger.warn(`[CrownJewelEngine] Entity resolution skipped: ${e.message}`);
  }

  // Stage 4: Dependency Mapping
  let depResult = { edges: [], review: [], stats: {} };
  try {
    depResult = await DependencyMapping.build(orgId, resolvedAssets, resolvedProcesses, { runId, meter });
    logger.info(`[CrownJewelEngine] Dependencies: ${depResult.stats.explicit} explicit, ${depResult.stats.inferred_accepted} inferred`);
  } catch (e) {
    logger.warn(`[CrownJewelEngine] Dependency mapping skipped: ${e.message}`);
  }

  // Stage 5: Criticality Scoring (uses dependency edges for SPOF detection)
  const procById = {}; resolvedProcesses.forEach((p) => { procById[p.id] = p; });
  const supporters = {};
  for (const edge of depResult.edges) {
    supporters[edge.process_id] = (supporters[edge.process_id] || 0) + 1;
  }
  // Fallback to business_process_ids if no dependency edges
  if (depResult.edges.length === 0) {
    resolvedAssets.forEach((a) => (a.business_process_ids || []).forEach((pid) => { supporters[pid] = (supporters[pid] || 0) + 1; }));
  }

  const scored = resolvedAssets.map((a) => {
    const linkedProcessIds = depResult.edges.length > 0
      ? depResult.edges.filter((e) => e.asset_id === a.id).map((e) => e.process_id)
      : (a.business_process_ids || []);
    const procs = linkedProcessIds.map((pid) => procById[pid]).filter(Boolean);
    const isSpof = procs.some((p) => ['critical', 'high'].includes(String(p.criticality || '').toLowerCase()) && supporters[p.id] === 1);
    const s = Criticality.scoreAsset(a, { processes: procs, isSpof });
    return { ...a, criticality_score: s.score, criticality_breakdown: s.breakdown, crown_jewel: s.crown_jewel, crown_jewel_tier: s.crown_jewel_tier, rationale: s.rationale, business_process_ids: linkedProcessIds };
  });

  const crownAssets = scored.filter((a) => a.crown_jewel).sort((x, y) => y.criticality_score - x.criticality_score);

  // Stage 6: Risk Mapping
  let riskResult = { mappings: [], risks: [], review: [], stats: {} };
  try {
    riskResult = await RiskMapping.mapRisks(orgId, scored, resolvedProcesses, { existingRisks: risks });
    logger.info(`[CrownJewelEngine] Risks: ${riskResult.stats.from_register} register, ${riskResult.stats.from_rules} rules`);
  } catch (e) {
    logger.warn(`[CrownJewelEngine] Risk mapping skipped: ${e.message}`);
  }

  // Stage 7: Control Mapping (requires corpus from ControlCorpusService)
  let controlResult = { applications: [], gaps: [], stats: {} };
  try {
    let corpus = [];
    try {
      const ControlCorpus = require('../ControlCorpusService');
      corpus = await ControlCorpus.listSpine();
    } catch (_) {
      logger.warn('[CrownJewelEngine] Control corpus unavailable, control mapping will use empty corpus');
    }
    controlResult = await ControlMapping.mapControls(orgId, scored, riskResult.mappings, { corpus, runId });
    logger.info(`[CrownJewelEngine] Controls: ${controlResult.stats.total} applications, ${controlResult.stats.gaps_on_crown_jewels} gaps`);
  } catch (e) {
    logger.warn(`[CrownJewelEngine] Control mapping skipped: ${e.message}`);
  }

  // Stage 8: Graph Assembly
  const allRisks = [...risks, ...riskResult.risks];
  const graph = Graph.build({
    processes: resolvedProcesses,
    assets: scored,
    risks: allRisks,
    controls: controlResult.applications,
    dependencyEdges: depResult.edges,
    riskMappings: riskResult.mappings,
  });

  const expo = materialExposure(crownAssets, allRisks);

  // Stage 10: Review Queue — enqueue low-confidence items for human review
  try {
    const reviewItems = [];
    for (const dep of depResult.review || []) {
      reviewItems.push({
        type: 'dependency_inferred',
        control_id: null,
        reason: `Inferred dependency (confidence ${dep.confidence}) between process ${dep.process_id} and asset ${dep.asset_id}`,
        ...dep,
      });
    }
    for (const rm of riskResult.review || []) {
      reviewItems.push({
        type: 'risk_mapping_low_confidence',
        control_id: null,
        reason: rm.rationale || `Low-confidence risk mapping (${rm.confidence})`,
        ...rm,
      });
    }
    for (const gap of controlResult.gaps || []) {
      reviewItems.push({
        type: 'control_gap',
        framework: gap.framework,
        control_id: gap.control_id,
        reason: `Control ${gap.control_id} is not documented on crown-jewel asset ${gap.asset_id}`,
        ...gap,
      });
    }
    if (reviewItems.length > 0) {
      await AnalystQueue.enqueue(orgId, runId, reviewItems);
      logger.info(`[CrownJewelEngine] Enqueued ${reviewItems.length} items for analyst review`);
    }
  } catch (e) {
    logger.warn(`[CrownJewelEngine] Review queue enqueue failed: ${e.message}`);
  }

  return {
    org_id: orgId,
    generated_at: new Date().toISOString(),
    run_id: runId,
    summary: {
      material_exposure_usd: expo.total,
      material_exposure_basis: expo.basis,
      material_exposure_items: expo.items.slice(0, 10),
      counts: {
        assets: resolvedAssets.length, processes: resolvedProcesses.length,
        risks: allRisks.length, crown_jewels: crownAssets.length,
        dependency_edges: depResult.edges.length,
        control_applications: controlResult.applications.length,
        control_gaps: controlResult.gaps.length,
      },
      crown_jewels: crownAssets.slice(0, 12).map((a) => ({
        id: a.id, name: a.name, type: a.type, tier: a.crown_jewel_tier,
        score: Math.round(a.criticality_score * 100), breakdown: a.criticality_breakdown, rationale: a.rationale,
      })),
    },
    graph,
    assets: scored,
    stages: {
      entity_resolution: erStats,
      dependencies: depResult.stats,
      risks: riskResult.stats,
      controls: controlResult.stats,
    },
    review: {
      dependencies: depResult.review,
      risks: riskResult.review,
      control_gaps: controlResult.gaps,
    },
  };
}

function materialExposure(crownAssets, risks) {
  const cj = new Set(crownAssets.map((a) => a.id));
  let total = 0; const items = [];
  for (const r of risks) {
    if (r.status && String(r.status).toLowerCase() !== 'open') continue;
    const linked = (r.asset_id && cj.has(r.asset_id))
      || (Array.isArray(r.business_process_ids) && crownAssets.some((a) => (a.business_process_ids || []).some((pid) => r.business_process_ids.includes(pid))));
    const exp = num(r.financial_exposure);
    if (linked && exp > 0) { total += exp; items.push({ risk: r.title, asset_id: r.asset_id || null, exposure_usd: exp, severity: r.severity }); }
  }
  items.sort((a, b) => b.exposure_usd - a.exposure_usd);
  return { total, items, basis: items.length ? 'Open risks on crown-jewel assets (risk register)' : 'No quantified risks on crown-jewel assets yet' };
}

function empty(orgId) {
  return { org_id: orgId, generated_at: new Date().toISOString(), empty: true,
    summary: { material_exposure_usd: 0, material_exposure_basis: 'No inventory ingested yet', material_exposure_items: [], counts: { assets: 0, processes: 0, risks: 0, crown_jewels: 0 }, crown_jewels: [] },
    graph: { nodes: [], edges: [] }, assets: [] };
}

module.exports = { run, runPipeline, materialExposure };
