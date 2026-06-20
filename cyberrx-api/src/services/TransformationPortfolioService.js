'use strict';

/**
 * TransformationPortfolioService — CIO Sub-tab 4: Transformation Portfolio & ROI.
 *
 * The same initiative portfolio the security side scores for ROI, re-scored for
 * the CIO's question: does each initiative INTRODUCE risk (new attack surface,
 * new dependencies) or REDUCE it, and what does it do to resilience? Predicted vs
 * realized comes straight from ProjectPortfolioService (shared engine + the same
 * calibration), so the CIO and CISO read one set of numbers. Each initiative gets
 * a sequence / secure / defer recommendation.
 */

const logger = require('../utils/logger');
const round = (n) => Math.round(n);

// Net risk posture by delivery domain: positive = reduces risk, negative =
// introduces new attack surface / dependency that must be governed.
const DOMAIN_RISK = {
  identity: 8, detection: 7, vuln: 7, data: 5, thirdparty: 4, recovery: 6, backup: 6, network: 5,
  cloud: 2,        // cloud migration reduces some risk but adds new surface
  ai: -4, genai: -4, automation: -2, integration: -3, platform: -2, migration: -1, modernization: 1,
};
function riskScores(p) {
  const d = String(p.domain || p.name || '').toLowerCase();
  let net = 1;
  for (const k of Object.keys(DOMAIN_RISK)) { if (d.includes(k)) { net = DOMAIN_RISK[k]; break; } }
  const a = p.analysis || {};
  const reduced = a.postureLift || Math.max(0, net);
  // New surface introduced scales with size for surface-adding initiatives.
  const introduced = net < 0 ? Math.abs(net) + Math.min(6, round((p.budget || 0) / 500000)) : Math.max(0, 3 - net);
  return { net, riskReduced: reduced, riskIntroduced: introduced };
}
// Resilience impact: does it improve recoverability/availability?
function resilienceImpact(p) {
  const d = String(p.domain || p.name || '').toLowerCase();
  if (/recovery|backup|resilien|continuity|\bdr\b|failover|availability/.test(d)) return { score: 9, label: 'Strongly improves resilience' };
  if (/cloud|network|platform|infrastructure/.test(d)) return { score: 5, label: 'Improves resilience (with new dependencies)' };
  if (/identity|detection|vuln|data/.test(d)) return { score: 4, label: 'Indirectly supports resilience' };
  if (/ai|genai|automation|integration/.test(d)) return { score: 1, label: 'Neutral / adds dependency' };
  return { score: 3, label: 'Modest resilience benefit' };
}
function recommendation(p, rs, res) {
  const a = p.analysis || {};
  const roi = a.roi || 0;
  const stalled = /hold|delay|behind|block/i.test(p.status || '') || (p.percentComplete || 0) < 25;
  if (rs.riskIntroduced > rs.riskReduced && (p.percentComplete || 0) < 60) return { action: 'secure', why: 'Introduces more attack surface than it reduces — gate it with secure-by-design before it advances.' };
  if (roi >= 2 && res.score >= 5) return { action: 'sequence', why: 'High loss-avoided-per-dollar and a real resilience gain — sequence it earlier.' };
  if (stalled && roi < 1) return { action: 'defer', why: 'Stalled with weak risk/resilience return — defer and redeploy the capacity.' };
  if (roi >= 1.5) return { action: 'sequence', why: 'Positive return on risk reduction — keep it moving / pull forward.' };
  return { action: 'secure', why: 'Proceed, but attach the security controls so it does not add un-owned risk.' };
}

async function getPortfolio(orgId) {
  let pf = { projects: [], counts: {} };
  try { pf = await require('./ProjectPortfolioService').portfolio(orgId); } catch (e) { logger.debug('transformation portfolio failed', { error: e.message }); }

  const initiatives = (pf.projects || []).map((p) => {
    const a = p.analysis || {};
    const rs = riskScores(p);
    const res = resilienceImpact(p);
    const rec = recommendation(p, rs, res);
    return {
      id: p.id || p.name, name: p.name, objective: p.objective || '', owner: p.owner,
      status: p.status, percentComplete: p.percentComplete || 0, budget: p.budget || 0,
      riskReduced: rs.riskReduced, riskIntroduced: rs.riskIntroduced, netRisk: rs.riskReduced - rs.riskIntroduced,
      resilience: res,
      predicted: { postureLift: a.postureLift, exposureReduced: a.exposureReduced, roi: a.roi },
      realized: { postureLift: a.realizedLift, exposureReduced: a.realizedExposureReduced, roi: a.realizedRoi },
      reducesRisks: a.reducesRisks || [],
      recommendation: rec,
    };
  });

  const buckets = { sequence: [], secure: [], defer: [] };
  initiatives.forEach((i) => buckets[i.recommendation.action].push(i.name));
  const netRiskReduced = initiatives.reduce((s, i) => s + i.netRisk, 0);
  const surfaceAdders = initiatives.filter((i) => i.riskIntroduced > i.riskReduced);

  const narration = `This is mostly good news, with one thing to watch. Across ${initiatives.length} initiative${initiatives.length === 1 ? '' : 's'}, the portfolio is ${netRiskReduced >= 0 ? `buying down risk on balance — net ${netRiskReduced} posture points reduced` : `adding risk on balance — net ${Math.abs(netRiskReduced)} posture points introduced`}, and these are the same calibrated numbers the security ROI view uses, so they're measured, not assumed. ` +
    `The caution is delivery velocity outrunning security: ${surfaceAdders.length === 0 ? 'none' : surfaceAdders.length} initiative${surfaceAdders.length === 1 ? '' : 's'} introduce${surfaceAdders.length === 1 ? 's' : ''} more attack surface than ${surfaceAdders.length === 1 ? 'it reduces' : 'they reduce'} — new dependencies and surface that become tomorrow's tech debt if they ship ungated. ` +
    `My recommendation tracks the economics: sequence the ${buckets.sequence.length} that pay off earlier, gate the ${buckets.secure.length} with secure-by-design before ${buckets.secure.length === 1 ? 'it advances' : 'they advance'}, and defer the ${buckets.defer.length} that aren't earning ${buckets.defer.length === 1 ? 'its' : 'their'} risk.`;

  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    rollup: {
      total: initiatives.length, netRiskReduced,
      totalExposureReduced: pf.totalExposureReduced, realizedExposureReduced: pf.realizedExposureReduced,
      blendedRoi: pf.blendedRoi, realizedRoi: pf.realizedRoi, calibration: pf.calibration,
      sequence: buckets.sequence.length, secure: buckets.secure.length, defer: buckets.defer.length,
    },
    buckets, initiatives, narration,
  };
}

module.exports = { getPortfolio };
