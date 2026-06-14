'use strict';

/**
 * CfoQuantService — business-weighted cyber exposure for the CFO view. Allocates
 * the organization's net financial exposure across its crown-jewel applications
 * by their business-criticality score, and pairs it with the unified assessment
 * score so security spend can be tied to exposure bought down.
 *
 * `allocate` is pure and unit-tested; the rest reads the financial + risk model.
 */

const db = require('../utils/db');
const RiskOutputs = require('./RiskOutputsService');
const AssessmentEngine = require('./AssessmentEngine');

// Distribute `total` across items proportional to each item's `score`.
function allocate(total, items) {
  const sum = items.reduce((s, i) => s + (Number(i.score) || 0), 0);
  if (!sum) return items.map((i) => ({ ...i, weightedExposure: 0 }));
  return items.map((i) => ({ ...i, weightedExposure: Math.round((total * (Number(i.score) || 0)) / sum) }));
}

async function totals(orgId) {
  const r = (await db.query(
    `SELECT COALESCE(SUM(net_exposure),0) AS net, COALESCE(SUM(total_gross),0) AS gross, COALESCE(SUM(insurance_coverage),0) AS ins
       FROM financial_impacts WHERE organization_id=$1`, [orgId]))[0];
  return { netExposure: Number(r.net), grossExposure: Number(r.gross), insuranceCoverage: Number(r.ins) };
}

async function roiSummary(orgId) {
  const t = await totals(orgId);
  const crown = await RiskOutputs.crownJewels(orgId);
  const byApp = allocate(t.netExposure, crown.map((a) => ({ id: a.id, name: a.name, tier: a.tier, score: a.score })))
    .sort((a, b) => b.weightedExposure - a.weightedExposure);
  const roll = await AssessmentEngine.rollup(orgId);
  const assessmentScore = roll.length ? Math.round(roll.reduce((s, f) => s + Number(f.avg_score || 0), 0) / roll.length) : null;
  return {
    ...t,
    tier1Apps: crown.filter((a) => a.tier === 1).length,
    assessmentScore,
    byApp: byApp.slice(0, 12),
  };
}

module.exports = { allocate, totals, roiSummary };
