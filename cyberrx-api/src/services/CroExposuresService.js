'use strict';

/**
 * CroExposuresService — CRO Sub-tab 2: Cyber Risk vs Appetite & Top Exposures.
 *
 * Cyber as KRIs measured against the centrally-authored appetite/tolerance, with
 * breaches flagged; top exposures are the SHARED decision-spine events normalized
 * to portfolio altitude (ranked by enterprise impact), each carrying the CFO lens
 * (financial translation) and the CISO lens (attack path) so a click drills
 * straight into the other leaders' views of the SAME event. Projections show each
 * exposure's trajectory vs appetite.
 */

const logger = require('../utils/logger');
const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };

async function getExposures(orgId) {
  const Engine = require('./DecisionEngineService');
  let listing = { cards: [], appetite: { riskThreshold: 'High' } };
  try { listing = await Engine.list(orgId, 'CRO'); } catch (e) { logger.debug('cro exposures list failed', { error: e.message }); }
  const appetite = listing.appetite || { riskThreshold: 'High', maxCriticalOpen: 0, maxHighOpen: 3 };
  const cards = listing.cards || [];

  const criticalOpen = cards.filter((c) => c.event.severity === 'Critical' && !c.decision).length;
  const highOpen = cards.filter((c) => c.event.severity === 'High' && !c.decision).length;
  const aboveAppetite = cards.filter((c) => c.aboveAppetite);
  const aboveUndecided = aboveAppetite.filter((c) => !c.decision).length;
  const aggLoss = cards.reduce((s, c) => s + ((c.event.loss && c.event.loss.expected) || 0), 0);
  const aggP90 = cards.reduce((s, c) => s + ((c.event.loss && c.event.loss.p90) || 0), 0);
  // Loss tolerance: a modeled board tolerance band (overridable later).
  const lossTolerance = appetite.lossToleranceUsd || 25000000;

  const kris = [
    kri('Critical exposures open', criticalOpen, appetite.maxCriticalOpen != null ? appetite.maxCriticalOpen : 0, 'count'),
    kri('High exposures open', highOpen, appetite.maxHighOpen != null ? appetite.maxHighOpen : 3, 'count'),
    kri('Exposures above appetite (undecided)', aboveUndecided, 0, 'count'),
    kri('Aggregate expected loss', aggLoss, lossTolerance, 'usd'),
  ];
  const breaches = kris.filter((k) => k.breached);

  // Top exposures normalized to portfolio altitude; each carries the CFO + CISO
  // lenses of the SAME shared event.
  const exposures = [...cards]
    .sort((a, b) => ((b.event.loss && b.event.loss.expected) || 0) - ((a.event.loss && a.event.loss.expected) || 0))
    .slice(0, 8)
    .map((card) => {
      const e = card.event;
      let cfoLens = null, cisoLens = null;
      try { cfoLens = Engine.lensFor('CFO', card); } catch (_) {}
      try { cisoLens = Engine.lensFor('CISO', card); } catch (_) {}
      return {
        id: card.id, type: card.type, title: e.title, severity: e.severity, scenarioType: e.scenarioType,
        crownJewel: e.crownJewel, exposure: e.exposure, loss: e.loss, timing: e.timing, provenance: e.provenance,
        aboveAppetite: card.aboveAppetite, decision: card.decision || null,
        businessProcesses: businessProcesses(e),
        attackPath: e.attackPath,
        financial: cfoLens ? { headline: cfoLens.headline, primary: cfoLens.primary, narrative: cfoLens.narrative } : null,
        attackPathLens: cisoLens ? { headline: cisoLens.headline, primary: cisoLens.primary, narrative: cisoLens.narrative } : null,
        croLens: card.lens || null,
        // Trajectory vs appetite: appetite likelihood line is decisionLikelihoodPct.
        projection: { p7: e.timing.p7, p30: e.timing.p30, p90: e.timing.p90, appetiteLine: appetite.decisionLikelihoodPct || 25, breachesAppetite: card.aboveAppetite },
      };
    });

  // Portfolio-level decision options (act on the set, not one card).
  const fundTop = Math.round(exposures.slice(0, 3).reduce((s, x) => s + (x.exposure || 0), 0) * 0.1);
  const portfolioOptions = [
    { id: 'fund_top', label: 'Fund remediation of the top 3 exposures', cost: fundTop, costLabel: usd(fundTop), residualRiskReductionPct: 60, note: 'Concentrates capital on the exposures driving most enterprise impact.' },
    { id: 'transfer_layer', label: 'Raise insurance / transfer the tail', cost: Math.round(aggP90 * 0.02), costLabel: `${usd(Math.round(aggP90 * 0.02))}/yr`, residualRiskReductionPct: 25, note: 'Caps the P90 tail without lowering likelihood; effective at renewal.' },
    { id: 'accept_within', label: 'Accept exposures within appetite, treat only breaches', cost: 0, costLabel: '$0', residualRiskReductionPct: 0, acceptsRationale: true, note: 'Documented portfolio acceptance for within-appetite items; treat only the breaches.' },
  ];

  const narration = `Cyber risk versus appetite, CRO. ${breaches.length} of ${kris.length} key risk indicators breach appetite. ` +
    `${aboveAppetite.length} exposure(s) sit above appetite, ${aboveUndecided} of them undecided. ` +
    `Aggregate modeled loss ${usd(aggLoss)} against a ${usd(lossTolerance)} tolerance. ` +
    `Top exposures are the same events the CFO and CISO see — click any one for the financial translation and the live attack path.`;

  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    appetite, kris, breaches: breaches.length, aboveAppetite: aboveAppetite.length,
    exposures, portfolioOptions, aggregate: { expectedLoss: aggLoss, p90: aggP90, lossTolerance },
    narration, sharedSpine: true,
  };
}

function kri(name, value, threshold, unit) {
  const breached = unit === 'usd' ? value > threshold : value > threshold;
  return { name, value, threshold, unit, breached, display: unit === 'usd' ? usd(value) : String(value), thresholdDisplay: unit === 'usd' ? usd(threshold) : String(threshold) };
}
function businessProcesses(e) {
  const out = [];
  if (e.affectedSystem) out.push(e.affectedSystem);
  if (e.crownJewel && e.crownJewel !== e.affectedSystem) out.push(e.crownJewel);
  return [...new Set(out)];
}

module.exports = { getExposures };
