'use strict';

/**
 * VelocityFrictionService — CIO Sub-tab 3 (priority): Velocity-vs-Risk Friction Map.
 *
 * For each delivery initiative, surface WHERE security requirements create
 * friction and quantify the tradeoff honestly:
 *   - ship-on-time: how many days you save, and the expected-loss / residual-risk
 *     DELTA you take on by deferring the control,
 *   - secure-by-design: the alternative, its cost and added days, and the
 *     expected loss it avoids.
 *
 * The risk being traded is a SHARED event (linked via the project→risk linkage in
 * ProjectPortfolioService, which maps to the same risk register the CISO sees),
 * so the CIO's friction risk and the CISO's attack path are the same event.
 *
 * Selecting a tradeoff writes to the SHARED decision ledger (same table, same
 * route as every other decision) — the friction card id is decision-ledger-ready.
 */

const logger = require('../utils/logger');
const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };
const round = (n) => Math.round(n);
function hash(s) { let h = 0; const str = String(s); for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; } return Math.abs(h).toString(36); }

// Security-requirement friction by delivery domain — the gates that slow a ship.
const FRICTION_POINTS = {
  identity: { points: ['Phishing-resistant MFA integration', 'Access reviews / least-privilege wiring', 'SSO + lifecycle (JML) hooks'], weight: 1.0 },
  detection: { points: ['Logging/telemetry onboarding', 'Detection rules + alert routing', 'IR runbook + on-call wiring'], weight: 0.8 },
  cloud: { points: ['Cloud guardrails / CSPM gate', 'IaC security scanning in CI', 'Network policy + private endpoints'], weight: 0.9 },
  vuln: { points: ['SAST/DAST + dependency gates', 'Patch baseline before go-live', 'Hardening to CIS benchmark'], weight: 0.85 },
  data: { points: ['Data classification + DLP', 'Encryption + key management', 'Tokenization / minimization review'], weight: 1.0 },
  thirdparty: { points: ['Vendor security review', 'Contractual security/BAA terms', 'Egress controls on the connection'], weight: 0.9 },
  default: { points: ['Threat model + security design review', 'Secure-config baseline', 'Pre-launch pen test'], weight: 0.8 },
};
function frictionFor(p) {
  const d = String(p.domain || p.name || '').toLowerCase();
  for (const k of Object.keys(FRICTION_POINTS)) { if (k !== 'default' && d.includes(k)) return { key: k, ...FRICTION_POINTS[k] }; }
  return { key: 'default', ...FRICTION_POINTS.default };
}

async function getFrictionMap(orgId) {
  let pf = { projects: [] };
  try { pf = await require('./ProjectPortfolioService').portfolio(orgId); } catch (e) { logger.debug('friction portfolio failed', { error: e.message }); }

  // Decided state from the SHARED ledger so selections persist across the app.
  let ledger = [];
  try { ledger = await require('./DecisionEngineService').ledger(orgId); } catch (_) {}
  const decidedByCard = {};
  ledger.forEach((r) => { if (!decidedByCard[r.card_id]) decidedByCard[r.card_id] = { action: r.action, optionId: r.option_id, rationale: r.rationale, decidedBy: r.decided_by, at: r.created_at }; });

  const initiatives = (pf.projects || []).map((p) => {
    const a = p.analysis || {};
    const fr = frictionFor(p);
    const linked = (a.reducesRisks || []);
    // Exposure being traded = the linked shared-event exposure (fallback to the
    // initiative's own modeled exposure reduction).
    const linkedExposure = linked.reduce((s, r) => s + (Number(r.exposure) || 0), 0) || (a.exposureReduced || 0);
    const budget = p.budget || 0;

    // Secure-by-design: cost is the security uplift inside the initiative; added
    // days scale with the domain friction weight.
    const secureCost = Math.max(120000, round(budget * 0.15 * fr.weight));
    const addedDays = round(30 * fr.weight) + (p.percentComplete < 50 ? 10 : 0);
    // Ship-on-time defers the control: a slice of the linked exposure stays on the
    // table for the window, and residual risk rises.
    const expectedLossAdded = round(linkedExposure * 0.35 * fr.weight);
    const residualRiskAddedPct = round(15 * fr.weight) + 4;
    const netSecureValue = expectedLossAdded - secureCost; // loss avoided minus cost

    const id = `dec_${orgId}_friction_${hash(p.name)}`;
    const options = [
      { id: 'ship', label: 'Ship on time', cost: 0, costLabel: '$0', daysSaved: addedDays, expectedLossAdded, residualRiskAddedPct, friction: 'None', note: `Hit the date; defer the security gate. Adds ~${usd(expectedLossAdded)} expected loss and +${residualRiskAddedPct}% residual risk on the linked exposure until remediated.` },
      { id: 'phased', label: 'Ship with compensating control, harden next cycle', cost: round(secureCost * 0.4), costLabel: usd(round(secureCost * 0.4)), daysSaved: Math.max(0, addedDays - round(addedDays / 3)), expectedLossAvoided: round(expectedLossAdded * 0.6), residualRiskAddedPct: round(residualRiskAddedPct * 0.4), friction: 'Medium', note: 'Interim mitigation (monitoring/WAF/segmentation) now; durable fix scheduled. Most of the loss avoided, smaller delay.' },
      { id: 'secure', label: 'Secure-by-design', cost: secureCost, costLabel: usd(secureCost), addedDays, expectedLossAvoided: expectedLossAdded, residualRiskAddedPct: 0, friction: 'High', note: `Build the control in before launch. Costs ${usd(secureCost)} and ~${addedDays} days, avoids ~${usd(expectedLossAdded)} expected loss.` },
    ];
    // Recommend the economically rational path: secure when loss avoided clearly
    // beats the cost; otherwise phase it.
    const recommended = netSecureValue > secureCost ? 'secure' : netSecureValue > 0 ? 'phased' : 'ship';

    return {
      id, initiative: p.name, objective: p.objective || '', owner: p.owner || 'Delivery lead',
      status: p.status, percentComplete: p.percentComplete || 0, budget,
      frictionPoints: fr.points, frictionWeight: fr.weight,
      linkedRisks: linked.map((r) => ({ title: r.title, severity: r.severity, exposure: r.exposure })),
      linkedExposure,
      tradeoff: { daysSaved: addedDays, expectedLossAdded, residualRiskAddedPct, secureCost, netSecureValue },
      options, recommended, decision: decidedByCard[id] || null,
    };
  });

  const totalLossOnTable = initiatives.filter((i) => !i.decision || i.decision.optionId === 'ship').reduce((s, i) => s + i.tradeoff.expectedLossAdded, 0);
  const narration = `Velocity versus risk, CIO. ${initiatives.length} delivery initiative(s) carry a security tradeoff. ` +
    `Shipping every one on time as-is would leave about ${usd(totalLossOnTable)} of expected loss on the table. ` +
    `For each, you can ship on time and accept the risk delta, phase it with a compensating control, or build it secure-by-design. ` +
    `Every choice is the same shared risk the security team sees, and it's written to the decision ledger.`;

  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    counts: { initiatives: initiatives.length, decided: initiatives.filter((i) => i.decision).length },
    totalLossOnTable, initiatives, narration, sharedSpine: true,
  };
}

module.exports = { getFrictionMap };
