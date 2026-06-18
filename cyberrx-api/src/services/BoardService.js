'use strict';

/**
 * BoardService — the Board lens (enterprise oversight altitude over the shared
 * spine). The board oversees, it does not manage: every view here is an
 * aggregation / oversight re-presentation of the SAME shared decision-spine
 * events and the SAME ledger every executive uses. Appetite is the centrally-
 * authored model (CRO lens → tenant config), read here so the board sees risk
 * against the appetite it approved.
 *
 *   oversight(orgId)       Sub-tab 1: Enterprise Oversight (current state)
 *   decisions(orgId)       Sub-tab 2: Top Decisions for the Board
 *   accountability(orgId)  Sub-tab 3 (priority): Oversight & Accountability
 *   investment(orgId)      Sub-tab 4: Investment & ROI (capital oversight)
 */

const logger = require('../utils/logger');
const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

function boardCard(c) {
  return c.type === 'compound' || c.event.severity === 'Critical' || c.aboveAppetite;
}

async function listing(orgId) {
  try { return await require('./DecisionEngineService').list(orgId, 'Board'); }
  catch (e) { logger.debug('board listing failed', { error: e.message }); return { cards: [], appetite: { riskThreshold: 'High' } }; }
}

// ---- Sub-tab 1: Enterprise Oversight ---------------------------------------
async function oversight(orgId) {
  const l = await listing(orgId);
  const cards = l.cards || [];
  const appetite = l.appetite || { riskThreshold: 'High' };
  const aggLoss = cards.reduce((s, c) => s + ((c.event.loss && c.event.loss.expected) || 0), 0);
  const aggP90 = cards.reduce((s, c) => s + ((c.event.loss && c.event.loss.p90) || 0), 0);
  const criticals = cards.filter((c) => c.event.severity === 'Critical');
  const aboveAppetite = cards.filter((c) => c.aboveAppetite);
  const attention = cards.filter((c) => boardCard(c) && !c.decision);
  const decided = cards.filter((c) => c.decision);

  // Board posture: starts at 100, penalized for undecided board-altitude risk,
  // above-appetite exposure, and concentration (compounds).
  const compounds = cards.filter((c) => c.type === 'compound');
  const posture = clamp(92 - attention.length * 7 - aboveAppetite.length * 3 - compounds.filter((c) => !c.decision).length * 4, 25, 96);
  const band = posture >= 80 ? 'Strong' : posture >= 60 ? 'Adequate' : posture >= 40 ? 'Weak' : 'Critical';

  const whatChanged = [];
  if (attention.length) whatChanged.push({ dir: 'down', text: `${attention.length} board-level risk decision(s) are open and unowned at the board's altitude.` });
  if (aboveAppetite.length) whatChanged.push({ dir: 'down', text: `${aboveAppetite.length} exposure(s) sit above the board-approved appetite (${appetite.riskThreshold}+).` });
  if (decided.length) whatChanged.push({ dir: 'up', text: `${decided.length} risk decision(s) are on the record — evidence of active oversight.` });
  if (!whatChanged.length) whatChanged.push({ dir: 'flat', text: 'No material change in the enterprise cyber-risk position since last meeting.' });

  let visibility = null;
  try { visibility = await require('./VisibilityService').assess(orgId); } catch (_) {}

  const brief = `Enterprise cyber-risk oversight. The board-level position scores ${posture}/100 (${band.toLowerCase()}). ` +
    `Modeled aggregate exposure is ${usd(aggLoss)} expected, ${usd(aggP90)} in a bad year. ` +
    `${criticals.length} critical scenario(s); ${aboveAppetite.length} above the appetite you approved; ${compounds.length} correlated multi-risk scenario(s). ` +
    `${attention.length} decision(s) need ownership at the board's altitude, and ${decided.length} are already documented. ` +
    `This is the same risk every executive manages — aggregated to the oversight question: is it owned, within appetite, and adequately resourced?`;
  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    posture, band, appetite,
    aggregate: { expectedLoss: aggLoss, p90: aggP90 },
    counts: { total: cards.length, critical: criticals.length, aboveAppetite: aboveAppetite.length, compounds: compounds.length, attention: attention.length, decided: decided.length },
    attentionItems: attention.slice(0, 5).map((c) => ({ title: c.event.title, severity: c.event.severity, owner: c.event.owner || 'Unassigned', question: (c.lens && c.lens.questionToAsk) || null })),
    whatChanged, visibility,
    brief, narration: 'Enterprise oversight, for the board. ' + brief,
  };
}

// ---- Sub-tab 2: Top Decisions for the Board --------------------------------
async function decisions(orgId) {
  const l = await listing(orgId);
  const items = (l.cards || []).filter(boardCard)
    .sort((a, b) => ((b.event.loss && b.event.loss.expected) || 0) - ((a.event.loss && a.event.loss.expected) || 0))
    .slice(0, 8)
    .map((c) => ({
      id: c.id, type: c.type, title: c.event.title, severity: c.event.severity, scenarioType: c.event.scenarioType,
      owner: c.event.owner || 'Unassigned', aboveAppetite: c.aboveAppetite, decision: c.decision || null,
      loss: c.event.loss, lens: c.lens || null,
    }));
  const narration = `Top decisions for the board. ${items.length} risk(s) have risen to the board's altitude — critical, above appetite, or correlated. ` +
    `For each, management's recommendation and the cost of doing nothing are shown, with the question to put to management. ${items.filter((i) => !i.decision).length} are still open.`;
  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    counts: { total: items.length, open: items.filter((i) => !i.decision).length },
    appetite: l.appetite, items, narration, sharedSpine: true,
  };
}

// ---- Sub-tab 3 (priority): Oversight & Accountability ----------------------
async function accountability(orgId) {
  const Engine = require('./DecisionEngineService');
  const [l, ledger] = await Promise.all([listing(orgId), Engine.ledger(orgId).catch(() => [])]);
  const cards = l.cards || [];
  const criticals = cards.filter((c) => c.event.severity === 'Critical');
  const criticalDecided = criticals.filter((c) => c.decision);
  const unowned = cards.filter((c) => boardCard(c) && (!c.event.owner));
  const accepts = ledger.filter((r) => r.action === 'accept');
  const selects = ledger.filter((r) => r.action === 'select');
  const thinAccepts = accepts.filter((r) => !(r.rationale && String(r.rationale).trim().length >= 40));
  // Management posture: remediating vs quietly accepting.
  const treating = selects.length, accepting = accepts.length;
  const acceptRatio = (treating + accepting) ? Math.round((accepting / (treating + accepting)) * 100) : 0;

  const oversight = [
    { item: 'Critical risks owned & decided', status: criticals.length === 0 ? 'N/A' : criticalDecided.length === criticals.length ? 'Yes' : `${criticalDecided.length}/${criticals.length}`, note: 'Caremark: a reporting/monitoring system must exist and be used.' },
    { item: 'Management remediating (not quietly accepting)', status: acceptRatio >= 50 ? `Review — ${acceptRatio}% accepted` : `Yes — ${acceptRatio}% accepted`, note: 'A high acceptance ratio can signal risk pushed into the future without a plan.' },
    { item: 'Decisions documented with rationale', status: accepts.length === 0 ? 'No acceptances' : `${accepts.length - thinAccepts.length}/${accepts.length} substantive`, note: 'Documented decisions evidence good-faith oversight.' },
    { item: 'Every board-level risk has an owner', status: unowned.length === 0 ? 'Yes' : `${unowned.length} unowned`, note: 'Accountability requires a named owner per risk.' },
    { item: 'Recurring cyber report to the board', status: 'Configure', note: 'Evidence a standing agenda item / committee cadence.' },
    { item: 'SEC governance disclosure readiness', status: criticals.length ? 'Review' : 'Monitor', note: 'Reg S-K Item 106: board oversight & management role for cyber.' },
  ];
  const score = ledger.length === 0 ? 45 : clamp(55 + (criticals.length ? (criticalDecided.length / criticals.length) * 25 : 25) + ((accepts.length ? (accepts.length - thinAccepts.length) / accepts.length : 1) * 20), 25, 98);
  const narration = `Oversight and accountability, for the board. ${criticalDecided.length} of ${criticals.length} critical risks are owned and decided. ` +
    `Management has accepted ${accepting} and is actively treating ${treating} — a ${acceptRatio}% acceptance ratio. ` +
    `${thinAccepts.length} acceptance(s) carry thin rationale. The decision ledger is your contemporaneous evidence of oversight and is exportable.`;
  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    score: Math.round(score),
    summary: { criticalDecided: criticalDecided.length, criticalTotal: criticals.length, accepting, treating, acceptRatio, thinAccepts: thinAccepts.length, unowned: unowned.length, decisions: ledger.length },
    oversight, exportUrl: `/api/decisions/ledger.csv?org_id=${encodeURIComponent(orgId)}`,
    narration,
  };
}

// ---- Sub-tab 4: Investment & ROI (capital oversight) -----------------------
async function investment(orgId) {
  const [l, pf] = await Promise.all([
    listing(orgId),
    require('./ProjectPortfolioService').portfolio(orgId).catch(() => ({ projects: [] })),
  ]);
  const cards = l.cards || [];
  const projects = pf.projects || [];
  // Are the biggest exposures funded? Map top exposures to projects via the
  // shared project→risk linkage (reducesRisks titles).
  const fundedTitles = new Set();
  projects.forEach((p) => (p.analysis && p.analysis.reducesRisks || []).forEach((r) => fundedTitles.add(String(r.title).toLowerCase())));
  const topExposures = [...cards].sort((a, b) => ((b.event.loss && b.event.loss.expected) || 0) - ((a.event.loss && a.event.loss.expected) || 0)).slice(0, 6)
    .map((c) => {
      const funded = fundedTitles.has(String(c.event.title).toLowerCase()) ||
        projects.some((p) => (p.analysis && p.analysis.reducesRisks || []).some((r) => String(c.event.title).toLowerCase().includes(String(r.title).toLowerCase()) || String(r.title).toLowerCase().includes(String(c.event.title).toLowerCase())));
      return { title: c.event.title, severity: c.event.severity, expectedLoss: (c.event.loss && c.event.loss.expected) || 0, funded };
    });
  const fundedCount = topExposures.filter((e) => e.funded).length;
  const alignment = topExposures.length ? Math.round((fundedCount / topExposures.length) * 100) : 0;

  const narration = `Investment and capital oversight, for the board. The portfolio is predicted to avoid ${usd(pf.totalExposureReduced || 0)} of loss, ${usd(pf.realizedExposureReduced || 0)} realized to date` +
    `${pf.calibration != null ? ` (${pf.calibration}% of projection)` : ''}. ` +
    `Investment alignment is ${alignment}% — ${fundedCount} of the top ${topExposures.length} exposures have a funded initiative against them. ` +
    `The oversight question: are we spending where the expected loss actually is?`;
  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    rollup: {
      totalBudget: pf.totalBudget, predictedExposureReduced: pf.totalExposureReduced, realizedExposureReduced: pf.realizedExposureReduced,
      blendedRoi: pf.blendedRoi, realizedRoi: pf.realizedRoi, calibration: pf.calibration,
      alignment, fundedTopExposures: fundedCount, topExposureCount: topExposures.length,
    },
    topExposures, projects: projects.map((p) => ({ name: p.name, status: p.status, budget: p.budget, percentComplete: p.percentComplete, predicted: (p.analysis || {}).exposureReduced, realized: (p.analysis || {}).realizedExposureReduced, roi: (p.analysis || {}).roi })),
    narration,
  };
}

module.exports = { oversight, decisions, accountability, investment };
