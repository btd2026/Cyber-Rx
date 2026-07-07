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
const db = require('../../utils/db');
const Asset = require('../../models/Asset');
const BusinessProcess = require('../../models/BusinessProcess');
const Risk = require('../../models/Risk');
const Criticality = require('./CriticalityService');
const Economics = require('./EconomicsService');
const Jurisdiction = require('./JurisdictionService');
const Resilience = require('./ResilienceService');
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

// Load the org's setup_json (economics + resilience inputs) in one read.
async function loadOrgSetup(orgId) {
  try {
    const rows = await db.query('SELECT setup_json FROM orgs WHERE id=$1', [orgId]);
    const sj = rows[0] && rows[0].setup_json;
    const parsed = typeof sj === 'string' ? JSON.parse(sj) : (sj || {});
    return { economics: (parsed && parsed.economics) || {}, resilience: (parsed && parsed.resilience) || {}, governance: (parsed && parsed.governance) || {}, aiGovernance: (parsed && parsed.aiGovernance) || {}, growth: (parsed && parsed.growth) || {}, strategicInitiatives: (parsed && parsed.strategicInitiatives) || [], objectives: (parsed && parsed.objectives) || [], capabilities: (parsed && parsed.capabilities) || [], initiatives: (parsed && parsed.initiatives) || [], seatNames: (parsed && parsed.seatNames) || {} };
  } catch (_) { return { economics: {}, resilience: {}, governance: {}, aiGovernance: {}, growth: {}, strategicInitiatives: [], objectives: [], capabilities: [], initiatives: [], seatNames: {} }; }
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
  const [rawAssets, processes, rawRisks, setup] = await Promise.all([
    Asset.findByOrganization(orgId).catch(() => []),
    BusinessProcess.findByOrganization(orgId).catch(() => []),
    Risk.findByOrganization(orgId).catch(() => []),
    loadOrgSetup(orgId),
  ]);
  if (!rawAssets.length) return empty(orgId);
  const assets = rawAssets.map(normAsset);
  const risks = rawRisks.map(normRisk);
  const econIn = setup.economics || {};
  const resilIn = setup.resilience || {};

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

  // Financial translation for the business-language cockpit (materiality,
  // %-of-revenue, appetite, insurance gap, Monte-Carlo tail). Uses the org's
  // financials from setup_json + the risk register; graceful when absent.
  const economics = Economics.compose({
    ale: expo.total,
    financials: (econIn && econIn.financials) || {},
    appetite: econIn && econIn.appetite,
    insurance: (econIn && econIn.insurance) || {},
    risks,
  });
  // Annual security budget — used with the real posture trend to compute a
  // measured blended ROI (risk removed ÷ spend) once history has accrued.
  economics.budget = num(econIn && econIn.budget) || null;
  economics.currency = (econIn && econIn.currency) || 'USD';

  // Legal/regulatory obligations (CLO seat) — derived from operating regions +
  // the data classes actually held on assets + industry. No hardcoded per-org rules.
  const dataClasses = Array.from(new Set(scored.flatMap((a) => a.data_classification || [])));
  const legal = Jurisdiction.derive({
    regions: (econIn && econIn.regions) || [],
    dataClasses,
    industry: (econIn && econIn.industry) || '',
  });
  // Legal liability (CLO seat) — computed from the org's record count, not authored.
  // Class-action / notification cost uses the IBM Cost of a Data Breach per-record
  // figure; the regulatory ceiling comes from the binding jurisdiction penalty.
  const records = num(econIn && econIn.dataRecords) || 0;
  const COST_PER_RECORD = 165; // IBM Cost of a Data Breach — per-record average (configurable)
  legal.liability = records > 0 ? {
    records,
    cost_per_record: COST_PER_RECORD,
    class_action_exposure: records * COST_PER_RECORD,
    regulatory_ceiling: legal.binding ? legal.binding.penalty : null,
    basis: 'records × per-record cost (IBM Cost of a Data Breach) + regulatory penalty ceiling',
  } : null;

  // Operational resilience (CIO/CRO seats) — assembled from per-process revenue
  // and per-asset vendor/EOL/recovery attributes captured at onboarding
  // (setup_json.resilience). $/hr per asset = Σ its processes' revenue ÷ hours;
  // asset exposure = its linked open-risk exposure. Degrades to empty gracefully.
  const rp = (resilIn && resilIn.processes) || {};
  const ra = (resilIn && resilIn.assets) || {};
  const OP_HOURS = 8760;
  const procRevPerHr = {};
  const resilProcesses = processes.map((p) => {
    const info = rp[p.name] || {};
    const rev = Number(info.revenue) || 0;
    if (rev > 0) procRevPerHr[p.id] = rev / OP_HOURS;
    return { name: p.name, revenue: rev, rtoHours: info.rto };
  });
  const riskExpoByAsset = {};
  const topRiskByAsset = {};
  for (const r of risks) {
    if (r.status && String(r.status).toLowerCase() !== 'open') continue;
    if (!r.asset_id) continue;
    const exp = num(r.financial_exposure);
    riskExpoByAsset[r.asset_id] = (riskExpoByAsset[r.asset_id] || 0) + exp;
    const cur = topRiskByAsset[r.asset_id];
    if (!cur || exp > cur.exposure_usd) topRiskByAsset[r.asset_id] = { title: r.title, exposure_usd: exp, severity: r.severity || null };
  }
  const resilAssets = scored.map((a) => {
    const info = ra[a.name] || {};
    const perHr = (a.business_process_ids || []).reduce((s, pid) => s + (procRevPerHr[pid] || 0), 0);
    return { name: a.name, vendor: info.vendor || null, eol: info.eol != null ? info.eol : null,
      recoveryHours: info.recovery, perHr, exposure: riskExpoByAsset[a.id] || 0, crown_jewel: !!a.crown_jewel, tier: a.crown_jewel_tier || null };
  });
  const resilience = Resilience.compute({ processes: resilProcesses, assets: resilAssets });
  // Per-system detail for the CIO seat ("which systems carry the business" — the
  // crown jewels, ranked by $/hr of downtime). Crown jewels first, then by $/hr.
  resilience.systems = resilAssets
    .map((a) => ({ name: a.name, per_hr: a.perHr || 0, recovery_hours: a.recoveryHours != null ? a.recoveryHours : null, vendor: a.vendor, eol: a.eol === true, crown_jewel: a.crown_jewel, tier: a.tier, exposure_usd: a.exposure || 0 }))
    .sort((x, y) => (y.crown_jewel - x.crown_jewel) || (y.per_hr - x.per_hr) || (y.exposure_usd - x.exposure_usd))
    .slice(0, 10);

  // Per-process exposure — the dollars each business process carries (the CEO's
  // "which business processes carry the risk?"). Derived from the org's inventory.
  const process_exposure = processExposure(scored, risks, processes).slice(0, 10);

  // Per-crown-jewel operating economics for the CISO crown-jewel cards:
  //  • daily_value_usd  — value of transactions processed per day (process annual
  //    revenue ÷ 365, summed over the processes the system supports)
  //  • tx_per_day       — transactions/day (from onboarding or an observability feed)
  //  • tolerance_usd    — board-approved downtime tolerance for the most-binding
  //    supporting process ($ loss tolerated before it breaches board appetite)
  //  • impact_radius    — the other systems that share a business process with it
  //    (the blast radius if it fails; from the process→system graph)
  const cjEcon = crownEconomics(scored, processes, rp, ra);

  // Business → cyber value chain (Framework report): Function → Process → Technology
  // → Cyber risk, with $ at each layer. The cyber-risk layer models the partial /
  // complete process-stoppage cost (process $/hr × recovery hours × severity impact-
  // fraction). The control layer ($ saved when operating effectively) is joined in the
  // cockpit from live control coverage. All business $ are from the org's own inventory.
  const value_chain = valueChain(scored, processes, risks, rp, ra);

  // Named board stress scenario — a concrete "worst realistic day" derived from
  // the top crown jewel, its largest open risk, worst-case recovery, and the
  // binding regulatory clock. All from the org's own data (no invented figures).
  const topCj = crownAssets[0] || null;
  const topItem = expo.items[0] || null;
  const stress = topCj ? {
    target: topCj.name,
    scenario: (topItem && topItem.risk) || 'Ransomware on a crown-jewel system',
    worst_case_usd: num(economics.tail) || expo.total || null,
    expected_usd: topItem ? num(topItem.exposure_usd) : null,
    recovery_hours: resilience.worst_recovery_hours != null ? resilience.worst_recovery_hours : null,
    binding_clock: legal.binding ? legal.binding.clock : null,
    binding_jurisdiction: legal.binding ? legal.binding.jurisdiction : null,
    top_vendor: resilience.top_vendor_blast || null,
  } : null;

  const governance = setup.governance || {};
  const strategicInitiatives = Array.isArray(setup.strategicInitiatives) ? setup.strategicInitiatives : [];

  // Growth / revenue-enablement (CISO) — pipeline in security review, deal-review
  // cycle time, certifications held and trust reviews. Straight from onboarding;
  // null when not provided (the cockpit shows an illustrative, labeled fallback).
  const growth = setup.growth && Object.keys(setup.growth).length ? setup.growth : null;

  // AI risk (CEO/CISO) — the attack surface exposed to AI-accelerated attackers
  // (internet-facing assets that autonomous scanners like Mythos-class models can
  // reach) plus the org's AI-governance answers. Patch velocity / detection speed
  // are combined on the frontend from live tool signals.
  const isInternet = (a) => /internet/i.test(String(a.exposure || ''));
  const cjInternet = scored.filter((a) => a.crown_jewel && isInternet(a)).length;
  const cjCount = crownAssets.length;
  const aiRisk = {
    governance: setup.aiGovernance || {},
    internet_facing_assets: scored.filter(isInternet).length,
    crown_jewels_internet_facing: cjInternet,
    total_assets: scored.length,
    // Expected loss attributable to internet-facing crown jewels — the surface an
    // autonomous, AI-assisted attacker reaches. The AI "risk premium" (incremental
    // expected loss from the compressed exploit window) is applied on the frontend
    // using live patch coverage. Windows are modeled assumptions (see evidence).
    exposure_internet_facing: cjCount > 0 ? Math.round(expo.total * (cjInternet / cjCount)) : 0,
    window_base_days: 30, // historical median disclosure → weaponized exploit
    window_ai_days: 5, // frontier-AI-assisted exploitation (modeled)
  };

  // Enterprise risk portfolio (CRO) — cyber on one scale beside the org's other
  // principal risks, as entered from their ERM. Cyber is live; others are inputs.
  const pr = (econIn && econIn.principalRisks) || {};
  const portfolio = {
    cyber: num(economics.ale) || 0,
    creditMarket: num(pr.creditMarket) || null,
    operational: num(pr.operational) || null,
    thirdParty: num(pr.thirdParty) || null,
    compliance: num(pr.compliance) || null,
  };
  portfolio.has_data = !!(portfolio.creditMarket || portfolio.operational || portfolio.thirdParty || portfolio.compliance);

  // CFO earnings translation — cyber loss in the terms the CFO uniquely owns:
  // % of annual earnings, EPS impact, and revenue at risk per day of downtime.
  // Derived from the org's net income, shares outstanding, and downtime $/hr.
  const finIn = (econIn && econIn.financials) || {};
  const netIncome = num(finIn.netIncome);
  const shares = num(finIn.sharesOutstanding);
  const earnings = {
    expected_pct_of_earnings: netIncome > 0 ? economics.ale / netIncome : null,
    worst_case_pct_of_earnings: netIncome > 0 ? num(economics.tail) / netIncome : null,
    eps_impact_worst: shares > 0 ? num(economics.tail) / shares : null,
    eps_impact_expected: shares > 0 ? economics.ale / shares : null,
    revenue_at_risk_per_day: resilience.top_downtime_per_hr != null ? resilience.top_downtime_per_hr * 24 : null,
  };

  return {
    org_id: orgId,
    generated_at: new Date().toISOString(),
    summary: {
      material_exposure_usd: expo.total,
      material_exposure_basis: expo.basis,
      // true when Nerion's offline proposer supplied the risk register (no upload) —
      // the cockpit labels these risks "proposed · review & accept".
      risks_proposed: !!(econIn && econIn.risks_proposed),
      material_exposure_items: expo.items.slice(0, 10),
      process_exposure,
      counts: { assets: assets.length, processes: processes.length, risks: risks.length, crown_jewels: crownAssets.length },
      crown_jewels: crownAssets.slice(0, 12).map((a) => ({
        id: a.id, name: a.name, type: a.type, tier: a.crown_jewel_tier,
        score: Math.round(a.criticality_score * 100), breakdown: a.criticality_breakdown, rationale: a.rationale,
        // CISO-facing detail per crown jewel: today's $ exposure, its top open
        // risk, data sensitivity, exposure surface, recovery, and owner.
        exposure_usd: riskExpoByAsset[a.id] || 0,
        top_risk: topRiskByAsset[a.id] || null,
        data_classification: a.data_classification || [],
        internet_facing: isInternet(a),
        recovery_hours: (ra[a.name] && ra[a.name].recovery != null) ? Number(ra[a.name].recovery) : null,
        owner: a.owner || null,
        open_risk_count: risks.filter((r) => r.asset_id === a.id && (!r.status || String(r.status).toLowerCase() === 'open')).length,
        ...(cjEcon[a.id] || {}),
      })),
      economics,
      earnings,
      legal,
      resilience,
      governance,
      strategic_initiatives: strategicInitiatives,
      objectives: setup.objectives || [],
      capabilities: setup.capabilities || [],
      initiatives: setup.initiatives || [],
      seatNames: setup.seatNames || {},
      growth,
      stress,
      portfolio,
      aiRisk,
      aiSupplyChain: setup.aiSupplyChain || {},
      value_chain,
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

/**
 * Per-process exposure — attributes each open risk's dollar exposure to the
 * business processes its asset supports (falling back to the risk's own linked
 * processes). Ranked desc. Pure + deterministic so it is unit-tested.
 * @param {Array} scoredAssets  assets with business_process_ids + crown_jewel
 * @param {Array} risks         normalized risks (snake_case fields)
 * @param {Array} processes     business processes ({id,name,criticality,tier})
 */
function processExposure(scoredAssets, risks, processes) {
  const assetById = {}; (scoredAssets || []).forEach((a) => { assetById[a.id] = a; });
  const acc = {};
  (processes || []).forEach((p) => { acc[p.id] = { id: p.id, name: p.name, criticality: p.criticality || null, tier: p.tier || null, exposure_usd: 0, crown_jewel: false }; });
  (scoredAssets || []).forEach((a) => { if (a.crown_jewel) (a.business_process_ids || []).forEach((pid) => { if (acc[pid]) acc[pid].crown_jewel = true; }); });
  for (const r of (risks || [])) {
    if (r.status && String(r.status).toLowerCase() !== 'open') continue;
    const exp = num(r.financial_exposure); if (exp <= 0) continue;
    let pids = [];
    if (r.asset_id && assetById[r.asset_id]) pids = assetById[r.asset_id].business_process_ids || [];
    if ((!pids || !pids.length) && Array.isArray(r.business_process_ids)) pids = r.business_process_ids;
    Array.from(new Set(pids)).filter((pid) => acc[pid]).forEach((pid) => { acc[pid].exposure_usd += exp; });
  }
  return Object.values(acc).filter((p) => p.exposure_usd > 0).sort((a, b) => b.exposure_usd - a.exposure_usd);
}

/**
 * Per-crown-jewel operating economics for the CISO crown-jewel cards.
 * @param {Array} scoredAssets  assets with {id,name,business_process_ids}
 * @param {Array} processes     business processes ({id,name})
 * @param {Object} rp           resilience.processes keyed by process NAME
 *                              ({revenue, txPerDay, tolerance})
 * @returns {Object} map assetId → {daily_value_usd, tx_per_day, tolerance_usd,
 *                                  tolerance_process, impact_radius}
 */
function crownEconomics(scoredAssets, processes, rp, ra) {
  rp = rp || {}; ra = ra || {};
  const pidName = {}; (processes || []).forEach((p) => { pidName[p.id] = p.name; });
  const assetsByPid = {};
  (scoredAssets || []).forEach((a) => { (a.business_process_ids || []).forEach((pid) => { (assetsByPid[pid] = assetsByPid[pid] || []).push(a.name); }); });
  const out = {};
  (scoredAssets || []).forEach((a) => {
    const pids = a.business_process_ids || [];
    let daily = 0; let tx = 0; let tol = null; let tolProc = null;
    pids.forEach((pid) => {
      const info = rp[pidName[pid]] || {};
      const rev = Number(info.revenue) || 0;
      if (rev > 0) daily += rev / 365; // value of a day's transactions
      const t = Number(info.txPerDay) || 0; if (t > 0) tx += t;
      const tv = Number(info.tolerance) || 0;
      if (tv > 0 && (tol == null || tv < tol)) { tol = tv; tolProc = pidName[pid]; } // most-binding
    });
    // Per-system inventory values (if supplied) OVERRIDE the process-derived fallback,
    // so each crown jewel's transactions/day and value/day come from its own CMDB row.
    const inv = ra[a.name] || {};
    const invTx = Number(inv.txPerDay) || 0;
    const invVal = Number(inv.valuePerDay) || 0;
    // Annual transaction volume → value/day (÷365). A direct valuePerDay wins; else
    // the annual figure; else the process-revenue fallback.
    const invYear = Number(inv.valuePerYear) || 0;
    const invDailyFromYear = invYear > 0 ? invYear / 365 : 0;
    const finalTx = invTx > 0 ? invTx : tx;
    const finalDaily = invVal > 0 ? invVal : (invDailyFromYear > 0 ? invDailyFromYear : daily);
    const radius = Array.from(new Set([].concat(...pids.map((pid) => assetsByPid[pid] || [])))).filter((n) => n !== a.name);
    out[a.id] = {
      daily_value_usd: finalDaily > 0 ? Math.round(finalDaily) : null,
      value_per_hour_usd: finalDaily > 0 ? Math.round(finalDaily / 24) : null,
      annual_value_usd: invYear > 0 ? invYear : null,
      daily_value_source: invVal > 0 ? 'inventory' : (invDailyFromYear > 0 ? 'inventory_annual' : (daily > 0 ? 'process_revenue' : null)),
      tx_per_day: finalTx > 0 ? Math.round(finalTx) : null,
      tx_per_day_source: invTx > 0 ? 'inventory' : (tx > 0 ? 'process' : null),
      tolerance_usd: tol,
      tolerance_process: tolProc,
      impact_radius: radius.slice(0, 8),
    };
  });
  return out;
}

// Severity → share of the process a cyber event takes down (partial vs complete
// stoppage). Modeled defaults, applied when no measured per-risk figure exists.
const SEV_IMPACT = { critical: 1.0, high: 0.6, medium: 0.3, low: 0.15 };
function severityImpact(sev) {
  const k = String(sev || '').toLowerCase();
  return SEV_IMPACT[k] != null ? SEV_IMPACT[k] : 0.3;
}

/**
 * Business → cyber value chain: Function → Process → Technology → Cyber risk, with
 * the dollars carried at each layer. Function = grouping of processes (from the
 * optional onboarding "function" field; each process is its own function when
 * absent). Cyber-risk layer = the (partial/complete) process-stoppage cost:
 *   process_stop_usd = process $/hr × recovery hours × severity impact-fraction
 * Pure + deterministic (no DB) so it is unit-tested. The control layer ($ saved) is
 * joined in the cockpit from live control coverage.
 * @param {Array} scored     scored assets ({id,name,exposure,business_process_ids,crown_jewel,crown_jewel_tier})
 * @param {Array} processes  business processes ({id,name,criticality})
 * @param {Array} risks      normalized risks (snake_case: {title,severity,status,asset_id,financial_exposure})
 * @param {Object} rp        resilience.processes keyed by NAME ({revenue,rto,function})
 * @param {Object} ra        resilience.assets keyed by NAME ({recovery})
 */
function valueChain(scored, processes, risks, rp, ra) {
  rp = rp || {}; ra = ra || {};
  const OP_HOURS = 8760;
  const assetsByPid = {};
  (scored || []).forEach((a) => (a.business_process_ids || []).forEach((pid) => { (assetsByPid[pid] = assetsByPid[pid] || []).push(a); }));
  const risksByAsset = {};
  (risks || []).forEach((r) => {
    if (r.status && String(r.status).toLowerCase() !== 'open') return;
    if (!r.asset_id) return;
    (risksByAsset[r.asset_id] = risksByAsset[r.asset_id] || []).push(r);
  });

  const procNodes = (processes || []).map((p) => {
    const info = rp[p.name] || {};
    const annual = Number(info.revenue) || 0;
    const perHr = annual > 0 ? annual / OP_HOURS : 0;
    const daily = annual > 0 ? annual / 365 : 0;
    const assets = (assetsByPid[p.id] || []).map((a) => {
      const arec = (ra[a.name] && ra[a.name].recovery != null) ? Number(ra[a.name].recovery) : null;
      const rks = (risksByAsset[a.id] || []).map((r) => {
        const frac = severityImpact(r.severity);
        const stop = (perHr > 0 && arec != null) ? Math.round(perHr * arec * frac) : null;
        return { title: r.title, severity: r.severity || null, exposure_usd: num(r.financial_exposure),
          impact_fraction: frac, impact_hours: arec, process_stop_usd: stop };
      }).sort((x, y) => (y.process_stop_usd || 0) - (x.process_stop_usd || 0) || (y.exposure_usd || 0) - (x.exposure_usd || 0));
      return { id: a.id, name: a.name, internet_facing: /internet/i.test(String(a.exposure || '')),
        crown_jewel: !!a.crown_jewel, tier: a.crown_jewel_tier || null, recovery_hours: arec, risks: rks.slice(0, 5) };
    }).sort((x, y) => (y.crown_jewel - x.crown_jewel));
    return { id: p.id, name: p.name, criticality: p.criticality || null, function: info.function || null,
      annual_usd: annual || null, daily_usd: daily > 0 ? Math.round(daily) : null, per_hr: perHr > 0 ? Math.round(perHr) : null, assets };
  }).filter((p) => p.annual_usd || p.assets.length);

  const byFn = {};
  procNodes.forEach((p) => { const key = p.function || p.name; (byFn[key] = byFn[key] || []).push(p); });
  const functions = Object.keys(byFn).map((name) => {
    const procs = byFn[name];
    const annual = procs.reduce((s, p) => s + (p.annual_usd || 0), 0);
    const daily = procs.reduce((s, p) => s + (p.daily_usd || 0), 0);
    procs.forEach((p) => { p.fraction_of_function = (annual > 0 && p.annual_usd) ? p.annual_usd / annual : null; });
    return { name, annual_usd: annual || null, daily_usd: daily > 0 ? daily : null, process_count: procs.length,
      processes: procs.sort((a, b) => (b.annual_usd || 0) - (a.annual_usd || 0)).slice(0, 8) };
  }).sort((a, b) => (b.annual_usd || 0) - (a.annual_usd || 0)).slice(0, 12);

  return {
    method: {
      severity_impact: SEV_IMPACT, operating_hours_per_year: OP_HOURS,
      note: 'Cyber-risk layer = process $/hr × recovery hours × severity impact-fraction (partial → complete stoppage). Modeled; a measured per-risk figure overrides it when supplied.',
    },
    functions,
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

module.exports = { run, runPipeline, materialExposure, processExposure, crownEconomics, valueChain, severityImpact, normAsset, normRisk };
