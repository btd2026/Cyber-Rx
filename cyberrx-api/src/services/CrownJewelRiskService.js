'use strict';

/**
 * CrownJewelRiskService — CISO "Crown jewels at greatest risk" widget (Sheet 1).
 *
 *   PULL Crown Jewel Register (asset_id, criticality)
 *   JOIN CMDB → dependent ci_ids   (M1: identity join on asset_id; dependency
 *                                    expansion slots in when a live CMDB is wired)
 *   PULL Vuln Mgmt: findings cvss≥7 per asset (count, max_cvss, epss)
 *   PULL EDR: active detections, exposure per asset
 *   COMPUTE risk = norm(criticality) × exploitability × exposure   (×100)
 *   OUTPUT top 10 [asset, criticality, high_crit_vuln_count, active_threat, risk] desc
 *
 * All weights/thresholds come from config/scoring.js — nothing hardcoded here.
 * `computeFrom(datasets)` is pure (unit-testable); `compute(orgId)` pulls via the
 * source-agnostic DataAdapter so file↔API↔mock never changes this logic.
 */

const S = require('../config/scoring');
const Adapter = require('./sources/DataAdapter');

/**
 * Pure compute from already-resolved datasets.
 * @param {{register:{rows}, vuln:{rows,source}, edr:{rows,source}}} d
 * @returns {{items:[], mocked:boolean, sources:object}}
 */
function computeFrom(d) {
  const register = (d.register && d.register.rows) || [];
  const vulnRows = (d.vuln && d.vuln.rows) || [];
  const edrRows = (d.edr && d.edr.rows) || [];
  const vulnBy = {}; vulnRows.forEach((v) => { vulnBy[v.asset_id] = v; });
  const edrBy = {}; edrRows.forEach((e) => { edrBy[e.asset_id] = e; });

  // Criticality weights across the set → normalize so the ranking is relative.
  const critWeights = register.map((a) => S.criticalityWeight(a.criticality));

  const items = register.map((a) => {
    const v = vulnBy[a.asset_id] || {};
    const e = edrBy[a.asset_id] || {};
    const critNorm = S.normAgainst(S.criticalityWeight(a.criticality), critWeights);
    const exploit = S.exploitability({ epss: v.epss, maxCvss: v.max_cvss });
    const expose = S.exposure({ edrNorm: e.exposure_score, activeThreat: !!e.active_threat });
    const risk = S.compositeRisk({ criticalityNorm: critNorm, exploit, expose });
    const highCrit = Number(v.high_crit_count) || 0;
    return {
      asset_id: a.asset_id, asset: a.name, criticality: a.criticality,
      high_crit_vuln_count: highCrit, active_threat: !!e.active_threat, risk,
      escalate: S.escalates(risk),
    };
  }).sort((x, y) => y.risk - x.risk).slice(0, 10);

  const mocked = (d.vuln && d.vuln.source === 'mock') || (d.edr && d.edr.source === 'mock');
  return { items, mocked, sources: { register: d.register && d.register.source, vuln: d.vuln && d.vuln.source, edr: d.edr && d.edr.source } };
}

/** Resolve datasets via the adapter and compute. Degrades to an empty, non-mocked result. */
async function compute(orgId) {
  const register = await Adapter.crownJewelRegister(orgId);
  const connectors = await Adapter.connectedSet(orgId);
  const vuln = await Adapter.vulnForAssets(orgId, register.rows, connectors);
  const edr = await Adapter.edrForAssets(orgId, register.rows, connectors);
  return computeFrom({ register, vuln, edr });
}

module.exports = { compute, computeFrom };
