'use strict';

/**
 * CroTreatmentService — CRO Sub-tab 4: Risk Treatment Portfolio & ROI.
 *
 * The mitigate / transfer / accept decisions across the whole shared-event
 * portfolio, with predicted vs realized risk movement and capital efficiency
 * (expected loss avoided per dollar of capital deployed). Treatments are read
 * from the SHARED decision ledger (what's actually been decided) falling back to
 * the recommended option where a decision is still open — so this is the same
 * decision set every other lens writes to. Realized movement comes from the
 * shared calibrated project engine.
 */

const logger = require('../utils/logger');
const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };

// Decision-option id → treatment class.
function treatmentOf(optionId) {
  const id = String(optionId || '');
  if (/transfer/.test(id)) return 'transfer';
  if (/accept/.test(id)) return 'accept';
  if (/remediate|mitigate|break|both|fund|secure|phased/.test(id)) return 'mitigate';
  return 'mitigate';
}

async function getTreatment(orgId) {
  const Engine = require('./DecisionEngineService');
  let listing = { cards: [] };
  try { listing = await Engine.list(orgId, 'CRO'); } catch (e) { logger.debug('cro treatment list failed', { error: e.message }); }
  const cards = listing.cards || [];

  const rows = cards.map((card) => {
    const e = card.event;
    const chosenId = card.decision ? card.decision.optionId : card.recommended;
    const opt = (card.options || []).find((o) => o.id === chosenId) || (card.options || [])[0] || {};
    const treatment = treatmentOf(chosenId);
    const decided = !!card.decision;
    const capital = treatment === 'accept' ? 0 : (opt.cost || 0);
    const lossAvoided = Math.round(((e.loss && e.loss.expected) || 0) * ((opt.residualRiskReductionPct || 0) / 100));
    return {
      id: card.id, title: e.title, severity: e.severity, scenarioType: e.scenarioType,
      treatment, decided, optionLabel: opt.label, capital, lossAvoided,
      capitalEfficiency: capital > 0 ? Math.round((lossAvoided / capital) * 100) / 100 : null,
      expectedLoss: (e.loss && e.loss.expected) || 0, aboveAppetite: card.aboveAppetite,
      rationale: card.decision ? card.decision.rationale : null,
    };
  });

  const bucketOf = (t) => {
    const items = rows.filter((r) => r.treatment === t);
    const capital = items.reduce((s, r) => s + r.capital, 0);
    const lossAvoided = items.reduce((s, r) => s + r.lossAvoided, 0);
    return { treatment: t, count: items.length, decided: items.filter((r) => r.decided).length, capital, lossAvoided, capitalEfficiency: capital > 0 ? Math.round((lossAvoided / capital) * 100) / 100 : null };
  };
  const buckets = ['mitigate', 'transfer', 'accept'].map(bucketOf);

  const totalCapital = buckets.reduce((s, b) => s + b.capital, 0);
  const totalLossAvoided = buckets.reduce((s, b) => s + b.lossAvoided, 0);

  // Portfolio predicted vs realized risk movement from the shared calibrated engine.
  let predictedVsRealized = null;
  try {
    const pf = await require('./ProjectPortfolioService').portfolio(orgId);
    predictedVsRealized = {
      predictedExposureReduced: pf.totalExposureReduced, realizedExposureReduced: pf.realizedExposureReduced,
      predictedRoi: pf.blendedRoi, realizedRoi: pf.realizedRoi, calibration: pf.calibration,
    };
  } catch (_) {}

  const narration = `Honestly, the question here is simple: is the capital working? ${totalCapital > 0 ? `It is — ${usd(totalCapital)} deployed is buying down a modeled ${usd(totalLossAvoided)} of expected loss, roughly ${Math.round((totalLossAvoided / totalCapital) * 100) / 100} dollars avoided for every dollar spent` : `right now no capital has been deployed, so across ${rows.length} exposures we are exposed without buying anything down`}. ` +
    `The treatment mix tells the story: ${buckets[0].count} mitigate, ${buckets[1].count} transfer, ${buckets[2].count} accept — ${buckets[2].count > buckets[0].count + buckets[1].count ? 'we are leaning heavily on acceptance, which is fine only if those are deliberate, documented choices' : 'a reasonable balance of fixing, insuring, and consciously accepting risk'}. ` +
    (predictedVsRealized && predictedVsRealized.calibration != null ? `And the engine is honest with us — realized movement is tracking at ${predictedVsRealized.calibration}% of what we projected, so ${predictedVsRealized.calibration >= 85 ? 'these numbers are credible' : 'I would discount the projections until calibration improves'}. ` : '') +
    `What I would do: ${totalCapital > 0 ? 'concentrate the next dollar where capital efficiency is highest and transfer the tail you cannot cost-effectively mitigate.' : 'pick the highest-efficiency mitigations first and decide the rest explicitly rather than letting them sit open.'}`;

  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    rollup: { total: rows.length, decided: rows.filter((r) => r.decided).length, totalCapital, totalLossAvoided, capitalEfficiency: totalCapital > 0 ? Math.round((totalLossAvoided / totalCapital) * 100) / 100 : null },
    buckets, rows, predictedVsRealized,
    narration, sharedSpine: true,
  };
}

module.exports = { getTreatment };
