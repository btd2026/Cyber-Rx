'use strict';

/**
 * AllocationService — capital allocation for security spend.
 *
 * Boards don't want a risk list; they want "where does the next dollar go?".
 * GRC tracks spend; an operating system ALLOCATES it. Each decision option
 * already carries a cost and a residual-risk reduction, so we can rank the whole
 * queue by risk-dollars-removed per dollar-spent and build the efficient
 * frontier — then, under a budget, select the funded set and name what's left
 * unfunded (and the residual exposure that buys).
 */

const logger = require('../utils/logger');

const lossOf = (c) => (c.event && c.event.loss && c.event.loss.expected) || c.event.exposure || 0;
const recommendedOption = (c) => (c.options || []).find((o) => o.id === c.recommended) || (c.options || [])[0];

// Build the fundable candidates: the recommended non-accept option per card,
// with the risk-dollars it removes and its efficiency (reduced $ per $ spent).
function candidates(cards) {
  return cards.map((c) => {
    const opt = recommendedOption(c);
    if (!opt || opt.id === 'accept' || opt.acceptsRationale || !opt.cost) return null;
    const riskReduced = Math.round(lossOf(c) * (opt.residualRiskReductionPct || 0) / 100);
    return {
      cardId: c.id, title: c.event.title, type: c.type, severity: c.event.severity,
      option: opt.id, optionLabel: opt.label, cost: opt.cost,
      riskReduced, efficiency: opt.cost ? Math.round((riskReduced / opt.cost) * 100) / 100 : 0,
    };
  }).filter(Boolean).sort((a, b) => b.efficiency - a.efficiency);
}

// ---- pure allocation (exported for tests) ----------------------------------
// ROI-greedy knapsack: take the highest risk-reduction-per-dollar items until
// the budget can't fit the next one. (Greedy on efficiency = the efficient
// frontier; standard for "biggest risk cut per dollar".)
function allocate(items, budget) {
  const selected = []; let spend = 0, reduced = 0;
  const unfunded = [];
  for (const it of items) {
    if (budget != null && spend + it.cost > budget) { unfunded.push(it); continue; }
    selected.push(it); spend += it.cost; reduced += it.riskReduced;
  }
  return { selected, unfunded, spend, reduced };
}

// Cumulative spend vs. risk-reduced along the ROI-ranked order.
function frontier(items) {
  let spend = 0, reduced = 0;
  return items.map((it) => { spend += it.cost; reduced += it.riskReduced; return { cardId: it.cardId, spend, riskReduced: reduced, efficiency: it.efficiency }; });
}

async function optimize(orgId, { budget } = {}) {
  const g = await require('./DecisionEngineService').generate(orgId);
  const items = candidates(g.cards);
  const b = budget != null ? Number(budget) : null;
  const { selected, unfunded, spend, reduced } = allocate(items, b);
  const totalReducible = items.reduce((s, it) => s + it.riskReduced, 0);
  const unfundedRisk = unfunded.reduce((s, it) => s + it.riskReduced, 0);
  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    budget: b,
    funded: selected.length, totalSpend: spend, totalRiskReduced: reduced,
    fundedItems: selected,
    unfundedItems: unfunded, unfundedRiskRetained: Math.round(unfundedRisk),
    coverage: totalReducible ? Math.round((reduced / totalReducible) * 100) : null,
    frontier: frontier(items),
    narrative: b == null
      ? `${items.length} fundable actions ranked by ROI; fully funding them costs ${usd(spend)} and removes ${usd(reduced)} of expected loss.`
      : `With ${usd(b)}, fund ${selected.length} of ${items.length} actions: spend ${usd(spend)}, remove ${usd(reduced)} of expected loss (${totalReducible ? Math.round((reduced / totalReducible) * 100) : 0}% of the reducible total). ${usd(unfundedRisk)} of reducible risk stays on the books unfunded.`,
  };
}

function usd(v) { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; }

module.exports = { optimize, candidates, allocate, frontier };
