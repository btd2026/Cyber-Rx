'use strict';

/**
 * CroAggregationService — CRO Sub-tab 3 (priority): Aggregation & Correlation.
 *
 * Three views of how risk concentrates and correlates:
 *   1. Concentration risk — single vendor / cloud / region dependency.
 *   2. Correlated multi-risk failures — the SHARED compound events from the
 *      decision spine (two sub-threshold risks that chain into a critical
 *      outcome). These are the same compounds the CISO/Board see, read as
 *      aggregation risk.
 *   3. Cyber's correlation with the other enterprise risk categories — a
 *      principled correlation matrix (modeled, labeled) showing how a cyber
 *      event amplifies operational/financial/compliance/strategic risk.
 */

const logger = require('../utils/logger');
const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };

// How strongly a cyber event drives each other enterprise category, with the
// mechanism. Modeled and labeled; replace with measured correlation as the
// enterprise risk register comes online.
const CATEGORY_CORRELATION = [
  { category: 'Compliance / Legal', coefficient: 0.8, mechanism: 'A breach of regulated data starts statutory notification clocks and penalty exposure — cyber and compliance move together.' },
  { category: 'Financial', coefficient: 0.75, mechanism: 'Loss, remediation cost and (for some) revenue interruption hit the P&L directly when a cyber event is realized.' },
  { category: 'Operational', coefficient: 0.7, mechanism: 'Ransomware / availability events are operational outages — the same incident is both a cyber and an operational risk.' },
  { category: 'Third-party', coefficient: 0.65, mechanism: 'Vendor compromise is both a supplier-risk and a cyber event; a shared dependency correlates the two.' },
  { category: 'Strategic', coefficient: 0.45, mechanism: 'A material breach can impair brand, M&A and market position — a slower but real correlation.' },
];

async function getAggregation(orgId) {
  const Engine = require('./DecisionEngineService');
  let listing = { cards: [] };
  try { listing = await Engine.list(orgId, 'CRO'); } catch (e) { logger.debug('cro aggregation list failed', { error: e.message }); }
  const cards = listing.cards || [];

  // Correlated multi-risk failures = the shared compound events.
  const correlatedFailures = cards.filter((c) => c.type === 'compound').map((c) => {
    const e = c.event, cb = e.combination || {};
    return {
      id: c.id, title: e.title, severity: e.severity,
      members: (e.members || []).map((m) => ({ title: m.title, p30: m.p30 })),
      jointPct: cb.jointPct, amplification: cb.amplification, individual: cb.individual,
      outcome: cb.outcome, breaks: cb.breaks, breakLink: cb.breakLink,
      loss: e.loss, blastRadius: e.blastRadius, crownJewel: e.crownJewel,
      decision: c.decision || null, aboveAppetite: c.aboveAppetite,
      options: c.options, recommended: c.recommended,
    };
  });

  // LIVE concentration from the asset inventory (shared with the CIO lens) +
  // vendor concentration from the substrate.
  const concentration = await detectConcentration(orgId);

  // Correlation matrix anchored to this org's aggregate cyber exposure.
  const aggLoss = cards.reduce((s, c) => s + ((c.event.loss && c.event.loss.expected) || 0), 0);
  const correlationMatrix = CATEGORY_CORRELATION.map((r) => ({
    ...r,
    band: r.coefficient >= 0.7 ? 'Strong' : r.coefficient >= 0.5 ? 'Moderate' : 'Weak',
    transmittedLoss: Math.round(aggLoss * r.coefficient),
  }));

  const narration = `Aggregation and correlation, CRO. ${correlatedFailures.length} correlated multi-risk failure(s) detected — these are the shared compound scenarios where sub-threshold risks chain into a critical outcome` +
    `${correlatedFailures[0] ? `, led by ${correlatedFailures[0].title} at ${correlatedFailures[0].jointPct}% joint likelihood` : ''}. ` +
    `${concentration.length} concentration risk(s)${concentration[0] ? `, starting with ${concentration[0].label}` : ''}. ` +
    `Cyber correlates most strongly with ${correlationMatrix[0].category.toLowerCase()} — a single realized event transmits across categories, so these are not independent bets.`;

  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    counts: { correlatedFailures: correlatedFailures.length, concentration: concentration.length },
    correlatedFailures, concentration, correlationMatrix, aggregateLoss: aggLoss,
    narration, sharedSpine: true,
  };
}

// Vendor concentration from the substrate + LIVE cloud/region/identity
// concentration from the asset inventory (shared ConcentrationService).
async function detectConcentration(orgId) {
  const out = [];
  try {
    const c = await require('./ExecDashboardService').loadCtx(orgId);
    const vendors = (c.vendors && (c.vendors.list || c.vendors.top)) || [];
    const critical = vendors.filter((v) => /critical|tier ?1|high/i.test(String(v.criticality || v.tier || '')) || (v.exposure || 0) > 0);
    if (critical.length) {
      out.push({ kind: 'vendor', label: `Vendor concentration: ${critical[0].name || 'a single critical vendor'}`, detail: `${critical.length} critical service(s) concentrate on a small vendor set.`, severity: critical.length >= 3 ? 'High' : 'Medium', recommendation: 'Qualify a secondary supplier for the most-depended-on service; require resilience SLAs.' });
    }
  } catch (_) {}
  try { const live = await require('./ConcentrationService').detectConcentration(orgId); out.push(...live); } catch (_) {}
  return out;
}

module.exports = { getAggregation };
