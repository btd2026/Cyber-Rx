'use strict';

/**
 * SimulationService — counterfactual "what-if" over the decision graph.
 *
 * GRC has no causal model, only a register, so it cannot answer "what happens if
 * we do X?". The decision spine already models compound chains (an event that
 * only exists because two others coincide). This lets a leader hypothetically
 * FIX or ACCEPT a set of cards and see the portfolio effect: total expected loss
 * before/after, how many risks fall below appetite, and — the useful part —
 * which compound chains COLLAPSE because a shared link was broken.
 *
 * Pure over the generated cards (no persistence), so it's a safe sandbox.
 */

const logger = require('../utils/logger');

const lossOf = (c) => (c.event && c.event.loss && c.event.loss.expected) || 0;
const recommendedOption = (c) => (c.options || []).find((o) => o.id === c.recommended) || (c.options || [])[0];

// ---- pure aggregation + scenario application (exported for tests) ----------
function aggregate(cards) {
  return {
    count: cards.length,
    expectedLoss: Math.round(cards.reduce((s, c) => s + lossOf(c), 0)),
    compounds: cards.filter((c) => c.type === 'compound').length,
    critical: cards.filter((c) => c.event.severity === 'Critical').length,
    aboveAppetite: cards.filter((c) => c.aboveAppetite).length,
  };
}

// Apply a hypothetical: fixed single cards have their loss reduced by the
// recommended option's residual-risk reduction; a compound COLLAPSES (is removed)
// as soon as any of its member events is fixed — breaking one link kills the chain.
function applyScenario(cards, fixSet, acceptSet) {
  const fixedEventIds = new Set();
  cards.forEach((c) => { if (fixSet.has(c.id) && c.event) fixedEventIds.add(c.event.id); });
  const collapsed = [];
  const out = [];
  for (const c of cards) {
    if (c.type === 'compound') {
      const members = (c.event.members || []).map((m) => m.id);
      if (members.some((id) => fixedEventIds.has(id))) {
        collapsed.push({ id: c.id, title: c.event.title, loss: Math.round(lossOf(c)), brokenBy: members.filter((id) => fixedEventIds.has(id)) });
        continue; // chain collapses — removed from the portfolio
      }
      out.push(c); continue;
    }
    if (fixSet.has(c.id)) {
      const opt = recommendedOption(c); const red = (opt && opt.residualRiskReductionPct) || 0;
      const before = lossOf(c);
      out.push({ ...c, event: { ...c.event, loss: { ...c.event.loss, expected: Math.round(before * (1 - red / 100)) } }, _hypo: { fixed: true, reductionPct: red } });
      continue;
    }
    if (acceptSet.has(c.id)) { out.push({ ...c, _hypo: { accepted: true } }); continue; }
    out.push(c);
  }
  return { cards: out, collapsed };
}

async function whatIf(orgId, { fix = [], accept = [] } = {}) {
  const g = await require('./DecisionEngineService').list(orgId, null); // list adds aboveAppetite per card
  const fixSet = new Set(fix), acceptSet = new Set(accept);
  const before = aggregate(g.cards);
  const { cards: after, collapsed } = applyScenario(g.cards, fixSet, acceptSet);
  const afterAgg = aggregate(after);
  const spend = g.cards.filter((c) => fixSet.has(c.id)).reduce((s, c) => { const o = recommendedOption(c); return s + ((o && o.cost) || 0); }, 0);
  const lossReduced = before.expectedLoss - afterAgg.expectedLoss;
  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    scenario: { fix, accept },
    before, after: afterAgg,
    collapsedChains: collapsed,
    spend: Math.round(spend), lossReduced: Math.round(lossReduced),
    roi: spend ? Math.round((lossReduced / spend) * 100) / 100 : null,
    narrative: `Fixing ${fix.length} risk(s) for ${usd(spend)} removes ${usd(lossReduced)} of expected loss${collapsed.length ? ` and collapses ${collapsed.length} compound chain(s)` : ''}. Risks above appetite: ${before.aboveAppetite} → ${afterAgg.aboveAppetite}.`,
  };
}

// For a single card: which compounds collapse if we fix it, and the net effect.
async function collapseAnalysis(orgId, cardId) {
  const g = await require('./DecisionEngineService').list(orgId, null); // list adds aboveAppetite per card
  const target = g.cards.find((c) => c.id === cardId);
  if (!target) { const e = new Error('Decision card not found.'); e.code = 'CARD_NOT_FOUND'; throw e; }
  const { collapsed } = applyScenario(g.cards, new Set([cardId]), new Set());
  const opt = recommendedOption(target);
  const selfReduction = Math.round(lossOf(target) * ((opt && opt.residualRiskReductionPct) || 0) / 100);
  const chainReduction = collapsed.reduce((s, c) => s + c.loss, 0);
  return {
    organizationId: orgId, cardId, title: target.event.title,
    fixCost: (opt && opt.cost) || 0,
    directLossReduced: selfReduction,
    collapsedChains: collapsed,
    chainLossReduced: chainReduction,
    totalLossReduced: selfReduction + chainReduction,
    leverage: collapsed.length ? `Fixing this one link collapses ${collapsed.length} compound chain(s) — ${usd(chainReduction)} beyond the direct fix.` : 'No compound chains depend on this link.',
  };
}

function usd(v) { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; }

module.exports = { whatIf, collapseAnalysis, aggregate, applyScenario };
