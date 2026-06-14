'use strict';

/**
 * RiskOutputsService — business-impact-weighted risk outputs built on the
 * linkage chain (App → Process → Function, with Tier + RTO):
 *   - blastRadius(app)      : processes/functions affected, Tier-1 count, tightest RTO
 *   - crownJewels()         : applications ranked by business criticality they carry
 *   - processCriticality()  : RTO bridge — processes by tier/RTO + app coverage
 *   - controlGaps()         : assessment_result gaps ranked (lowest score first)
 *   - attackCoverage()      : ATT&CK technique coverage by tactic
 *
 * Pure scoring helpers are unit-tested; aggregations run against the DB.
 */

const db = require('../utils/db');
const { rtoHours, tightestRto, highestTier } = require('../crosswalk/PropagationService');

// Composite 0–100 "crown jewel" score from inherited criticality.
function crownScore({ tier, tier1Count = 0, rtoHrs = null }) {
  const tierC = tier === 1 ? 100 : tier === 2 ? 66 : tier === 3 ? 33 : 0;
  const procC = Math.min(100, tier1Count * 25);
  const rtoC = rtoHrs == null || !isFinite(rtoHrs) ? 0 : rtoHrs <= 4 ? 100 : rtoHrs <= 24 ? 75 : rtoHrs <= 72 ? 50 : rtoHrs <= 168 ? 25 : 0;
  return Math.round(0.5 * tierC + 0.3 * procC + 0.2 * rtoC);
}

async function blastRadius(orgId, appId) {
  const procs = await db.query(
    `SELECT bp.id, bp.name, bp.business_function_id, cp.tier, cp.rto
       FROM app_process_map m
       JOIN business_processes bp ON bp.id = m.process_id
       LEFT JOIN criticality_profile cp ON cp.id = bp.criticality_profile_id
      WHERE m.organization_id = $1 AND m.application_id = $2`, [orgId, appId]);
  const fnIds = [...new Set(procs.map((p) => p.business_function_id).filter(Boolean))];
  let functions = [];
  if (fnIds.length) functions = await db.query('SELECT id, name FROM business_functions WHERE organization_id=$1 AND id = ANY($2)', [orgId, fnIds]);
  return {
    applicationId: appId,
    processCount: procs.length,
    tier1Count: procs.filter((p) => Number(p.tier) === 1).length,
    tightestRto: tightestRto(procs.map((p) => p.rto)),
    functions,
    processes: procs.map((p) => ({ id: p.id, name: p.name, tier: p.tier, rto: p.rto })),
  };
}

async function crownJewels(orgId) {
  const rows = await db.query(
    `SELECT a.id AS app_id, a.name, a.tier AS app_tier, a.rto AS app_rto, cp.tier AS proc_tier, cp.rto AS proc_rto
       FROM applications a
       LEFT JOIN app_process_map m ON m.application_id = a.id AND m.organization_id = a.organization_id
       LEFT JOIN business_processes bp ON bp.id = m.process_id
       LEFT JOIN criticality_profile cp ON cp.id = bp.criticality_profile_id
      WHERE a.organization_id = $1`, [orgId]);
  const byApp = {};
  for (const r of rows) {
    const a = byApp[r.app_id] || (byApp[r.app_id] = { id: r.app_id, name: r.name, appTier: r.app_tier, appRto: r.app_rto, procTiers: [], procRtos: [] });
    if (r.proc_tier != null) a.procTiers.push(Number(r.proc_tier));
    if (r.proc_rto) a.procRtos.push(r.proc_rto);
  }
  return Object.values(byApp).map((a) => {
    const tier = a.appTier != null ? Number(a.appTier) : highestTier(a.procTiers);
    const rto = a.appRto || tightestRto(a.procRtos);
    const tier1Count = a.procTiers.filter((t) => t === 1).length;
    return { id: a.id, name: a.name, tier, rto, processCount: a.procTiers.length, tier1Count, score: crownScore({ tier, tier1Count, rtoHrs: rtoHours(rto) }) };
  }).sort((x, y) => y.score - x.score);
}

async function processCriticality(orgId) {
  return db.query(
    `SELECT bp.id, bp.name, cp.tier, cp.rto,
            (SELECT COUNT(*)::int FROM app_process_map m WHERE m.organization_id=$1 AND m.process_id=bp.id) AS app_count
       FROM business_processes bp
       LEFT JOIN criticality_profile cp ON cp.id = bp.criticality_profile_id
      WHERE bp.organization_id = $1
      ORDER BY cp.tier ASC NULLS LAST, bp.name`, [orgId]);
}

async function controlGaps(orgId) {
  return db.query(
    `SELECT framework_id, requirement_id, status, score, confidence, gap, recommendation
       FROM assessment_result
      WHERE organization_id = $1 AND status <> 'met'
      ORDER BY score ASC NULLS FIRST, framework_id, requirement_id
      LIMIT 200`, [orgId]);
}

async function attackCoverage(orgId) {
  const rows = await db.query(
    `SELECT at.tactics AS tactics, tc.status AS status
       FROM technique_coverage tc
       JOIN attack_techniques at ON at.id = tc.technique_id
      WHERE tc.org_id = $1`, [orgId]);
  const byTactic = {};
  let total = 0, covered = 0;
  for (const r of rows) {
    const isCovered = r.status === 'prevent' || r.status === 'detect';
    total++; if (isCovered) covered++;
    (r.tactics || ['unknown']).forEach((t) => {
      const b = byTactic[t] || (byTactic[t] = { tactic: t, total: 0, covered: 0 });
      b.total++; if (isCovered) b.covered++;
    });
  }
  const tactics = Object.values(byTactic).map((b) => ({ ...b, coveragePct: b.total ? Math.round((b.covered / b.total) * 100) : 0 }))
    .sort((a, b) => a.coveragePct - b.coveragePct);
  return { total, covered, coveragePct: total ? Math.round((covered / total) * 100) : 0, tactics };
}

module.exports = { crownScore, blastRadius, crownJewels, processCriticality, controlGaps, attackCoverage };
