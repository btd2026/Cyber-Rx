'use strict';

/**
 * CroPortfolioService — CRO Sub-tab 1: Enterprise Risk Position (Current State).
 *
 * Normalizes CYBER into the enterprise risk portfolio beside the other risk
 * categories, plotted on a likelihood × impact heatmap against the centrally-
 * authored appetite bands (TenantConfigService). Cyber's position is computed
 * from the SHARED decision-spine events (not a separate dataset); the other
 * categories are derived from the same substrate where possible (compliance from
 * legal obligations, third-party from vendor signals, financial from the exposure
 * model) and modeled+labeled otherwise.
 */

const logger = require('../utils/logger');
const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };
const clampLI = (n) => Math.max(1, Math.min(5, Math.round(n)));
// Appetite threshold severity → max tolerable likelihood×impact on the heatmap.
const TOLERANCE = { Low: 6, Medium: 9, High: 12, Critical: 16 };

async function getPosition(orgId) {
  const Engine = require('./DecisionEngineService');
  const Exec = require('./ExecDashboardService');
  let listing = { cards: [], appetite: { riskThreshold: 'High' } };
  let c = {};
  try { listing = await Engine.list(orgId, 'CRO'); } catch (e) { logger.debug('cro position list failed', { error: e.message }); }
  try { c = await Exec.loadCtx(orgId); } catch (_) {}
  const appetite = listing.appetite || { riskThreshold: 'High' };
  const tolerance = TOLERANCE[appetite.riskThreshold] || 12;

  // Cyber position from the shared events.
  const cards = listing.cards || [];
  const maxP30 = cards.reduce((m, c2) => Math.max(m, (c2.event.timing && c2.event.timing.p30) || 0), 0);
  const aggLoss = cards.reduce((s, c2) => s + ((c2.event.loss && c2.event.loss.expected) || 0), 0);
  const cyberLikelihood = clampLI(maxP30 / 20);          // 100% → 5
  const cyberImpact = clampLI(aggLoss / 12000000);        // ~$60M agg → 5
  const fin = c.financial || {}, legal = c.legal || {}, vend = c.vendors || {};

  // Other enterprise categories — derived where the substrate allows.
  const categories = [
    cat('Cyber', cyberLikelihood, cyberImpact, tolerance, `Aggregate of ${cards.length} shared cyber event(s); ${usd(aggLoss)} modeled expected loss, peak 30-day likelihood ${maxP30}%.`, false),
    cat('Compliance / Legal', clampLI(1 + (legal.triggered ? legal.triggered.length : 0)), clampLI(2 + (legal.triggered ? legal.triggered.length : 0)), tolerance, `${(legal.triggered || []).length} triggered obligation(s) tracked.`, false),
    cat('Third-party', clampLI(2 + (vend.activeSignals || 0) / 2), clampLI(3), tolerance, `${vend.activeSignals || 0} active vendor risk signal(s).`, false),
    cat('Financial', clampLI(2 + (fin.netExposure > fin.surplus ? 1 : 0)), clampLI((fin.netExposure || 0) / 12000000 + 2), tolerance, `Net cyber exposure ${usd(fin.netExposure || 0)} against ${usd(fin.surplus || 0)} surplus.`, false),
    cat('Operational', 3, 3, tolerance, 'Availability/continuity risk across the estate.', true),
    cat('Strategic', 2, 3, tolerance, 'Transformation & market-driven risk.', true),
  ];
  const breaches = categories.filter((x) => x.aboveAppetite);

  // What changed (directional).
  const whatChanged = [];
  const cyber = categories[0];
  if (cyber.aboveAppetite) whatChanged.push({ dir: 'down', text: `Cyber is ABOVE appetite (score ${cyber.score} vs tolerance ${tolerance}) — it now ranks with the top enterprise risks.` });
  else whatChanged.push({ dir: 'flat', text: `Cyber sits within appetite (score ${cyber.score} of ${tolerance} tolerance).` });
  if (breaches.length > 1) whatChanged.push({ dir: 'down', text: `${breaches.length} risk categories are above appetite: ${breaches.map((b) => b.name).join(', ')}.` });
  const undecided = cards.filter((c2) => !c2.decision).length;
  if (undecided) whatChanged.push({ dir: 'down', text: `${undecided} cyber exposure(s) remain without a recorded risk decision.` });

  let visibility = null;
  try { visibility = await require('./VisibilityService').assess(orgId); } catch (_) {}

  const brief = `Cyber is now normalized into the enterprise risk portfolio. It scores ${cyber.score} on a likelihood × impact basis ` +
    `(${cyber.likelihood}×${cyber.impact}) against an appetite tolerance of ${tolerance} — ${cyber.aboveAppetite ? 'ABOVE appetite' : 'within appetite'}. ` +
    `${breaches.length} of ${categories.length} categories breach appetite${breaches.length ? ` (${breaches.map((b) => b.name).join(', ')})` : ''}. ` +
    `The cyber position is the aggregate of the same ${cards.length} shared events every other leader works from — ${usd(aggLoss)} modeled expected loss. ` +
    `Appetite is set centrally here and propagates to every lens.`;
  const narration = `${cyber.aboveAppetite ? 'This one concerns me, and here is why.' : 'This is mostly good news, with one caution.'} ` +
    `Normalized beside every other enterprise risk, cyber now scores ${cyber.score} on likelihood times impact against a tolerance of ${tolerance} — ${cyber.aboveAppetite ? 'above the line, so it belongs in the same conversation as your top enterprise risks' : 'inside appetite, where it should be'}. ` +
    `${breaches.length > 1 ? `It is not alone: ${breaches.length} categories breach appetite — ${breaches.map((b) => b.name).join(', ')} — which is exactly the kind of correlated stack that hurts all at once.` : 'The rest of the portfolio is holding inside appetite.'} ` +
    `${undecided ? `And ${undecided} cyber exposure(s) still have no recorded decision, so we are carrying risk no one formally chose to accept.` : ''} ` +
    `What I would do: ${cyber.aboveAppetite || undecided ? 'either fund the breaches down or document a deliberate acceptance — and confirm the central appetite here still reflects what the board actually wants to tolerate.' : 'keep the appetite current and watch for the correlated categories before they move together.'}`;

  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    appetite, tolerance, categories, breaches: breaches.length,
    whatChanged, visibility, brief, narration,
    note: 'Cyber, compliance, third-party and financial positions are derived from the shared substrate; operational and strategic are modeled placeholders (labeled) pending an enterprise risk register feed.',
  };
}

function cat(name, likelihood, impact, tolerance, basis, modeled) {
  const L = clampLI(likelihood), I = clampLI(impact), score = L * I;
  return { name, likelihood: L, impact: I, score, aboveAppetite: score > tolerance, band: score > tolerance ? 'Above appetite' : score >= tolerance * 0.6 ? 'At appetite' : 'Within appetite', basis, modeled: !!modeled };
}

module.exports = { getPosition };
