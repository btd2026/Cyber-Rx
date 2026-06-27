'use strict';

/**
 * CrownJewelEngine — orchestrates the deterministic crown-jewel analysis over an
 * org's REAL inventory (the existing assets / business_processes / risks tables),
 * producing the crown-jewel set, material exposure, and the GraphModel. Reuses
 * the Compliance Engine corpus/findings for control documentation status.
 *
 * Deterministic + explainable; the LLM-assisted entity-resolution / applicability
 * stages layer on top later. Degrades gracefully to an empty result when an org
 * has no inventory yet (callers fall back to sample data).
 */

const logger = require('../../utils/logger');
const Asset = require('../../models/Asset');
const BusinessProcess = require('../../models/BusinessProcess');
const Risk = require('../../models/Risk');
const Criticality = require('./CriticalityService');
const Graph = require('./GraphModelService');

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

async function run(orgId) {
  const [assets, processes, risks] = await Promise.all([
    Asset.findByOrganization(orgId).catch(() => []),
    BusinessProcess.findByOrganization(orgId).catch(() => []),
    Risk.findByOrganization(orgId).catch(() => []),
  ]);
  if (!assets.length) return empty(orgId);

  const procById = {}; processes.forEach((p) => { procById[p.id] = p; });

  // For SPOF: how many assets support each process.
  const supporters = {};
  assets.forEach((a) => (a.business_process_ids || []).forEach((pid) => { supporters[pid] = (supporters[pid] || 0) + 1; }));

  const scored = assets.map((a) => {
    const procs = (a.business_process_ids || []).map((pid) => procById[pid]).filter(Boolean);
    // single point of failure: this asset is the sole supporter of a critical process
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

// Material exposure = open risks (financial_exposure) tied to crown-jewel assets
// (the risk register is authoritative). Deterministic + auditable.
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

module.exports = { run, materialExposure };
