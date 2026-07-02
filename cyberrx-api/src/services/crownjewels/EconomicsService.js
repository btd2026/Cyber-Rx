'use strict';

/**
 * EconomicsService — translates cyber loss into the C-suite's financial language
 * (spec: Data & Formulas, Part B). Pure + deterministic; no DB, no LLM.
 *
 * Covers: %-of-revenue / days-of-operating-income, materiality threshold,
 * appetite comparison, insurance gap / transfer efficiency, and a Monte-Carlo
 * Value-at-Risk (tail) from a risk register. Every output is explainable and
 * traceable to the inputs it consumed.
 */

const cfg = require('../../config/economics');

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const pos = (v) => { const n = num(v); return n > 0 ? n : 0; };

// ---- financial ratios ------------------------------------------------------
function ratios(ale, fin = {}) {
  const revenue = pos(fin.revenue);
  const operatingIncome = pos(fin.operatingIncome);
  const enterpriseValue = pos(fin.enterpriseValue);
  const a = pos(ale);
  return {
    pct_of_revenue: revenue ? a / revenue : null,
    days_of_operating_income: operatingIncome ? a / (operatingIncome / cfg.operatingDaysPerYear) : null,
    pct_of_enterprise_value: enterpriseValue ? a / enterpriseValue : null,
  };
}

// ---- materiality threshold -------------------------------------------------
// Anchored on net income (common auditor practice); falls back to revenue.
function materialityThreshold(fin = {}) {
  const netIncome = pos(fin.netIncome);
  const revenue = pos(fin.revenue);
  if (netIncome) return { value: netIncome * cfg.materialityPctOfNetIncome, basis: `${Math.round(cfg.materialityPctOfNetIncome * 100)}% of net income` };
  if (revenue) return { value: revenue * cfg.materialityPctOfRevenue, basis: `${(cfg.materialityPctOfRevenue * 100).toFixed(1)}% of revenue` };
  return { value: null, basis: 'net income or revenue required' };
}

// ---- appetite comparison ---------------------------------------------------
function appetiteStatus(ale, tail, appetite) {
  const ap = pos(appetite);
  if (!ap) return { appetite: null, within: null, tail_within: null, headroom: null };
  return {
    appetite: ap,
    within: num(ale) <= ap,
    tail_within: num(tail) <= ap,
    headroom: ap - num(ale),
  };
}

// ---- insurance -------------------------------------------------------------
function insurance(tail, ale, policy = {}) {
  const limit = pos(policy.limit);
  const t = pos(tail);
  if (!limit) return { limit: null, gap: null, transfer_efficiency: null, premium: policy.premium || null, renewal: policy.renewal || null };
  const gap = Math.max(0, t - limit);
  const insuredTail = Math.min(limit, t);
  return {
    limit,
    gap,
    covered: insuredTail,
    transfer_efficiency: t ? insuredTail / t : null,
    premium: policy.premium != null ? num(policy.premium) : null,
    retention: policy.retention != null ? num(policy.retention) : null,
    renewal: policy.renewal || null,
  };
}

// ---- Monte-Carlo Value-at-Risk (tail) --------------------------------------
// Deterministic (seeded) so results are reproducible and testable. Each risk
// contributes freq × magnitude per iteration; both sampled Beta-PERT. A risk
// with only a point `financial_exposure` is spread into a range via config.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pertSample(min, mode, max, u) {
  if (!(max > min)) return min;
  const c = (mode - min) / (max - min);
  return u < c
    ? min + Math.sqrt(u * (max - min) * (mode - min))
    : max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}
function riskRange(r) {
  // magnitude range
  let mMin = num(r.magMin), mMode = num(r.magMode), mMax = num(r.magMax);
  if (!(mMax > 0)) {
    const point = pos(r.financial_exposure != null ? r.financial_exposure : r.financialExposure);
    mMin = point * cfg.pointLowMult; mMode = point; mMax = point * cfg.pointHighMult;
  }
  // frequency range (events/yr) — default to 1 expected event when unspecified
  let fMin = num(r.freqMin), fMode = num(r.freqMode), fMax = num(r.freqMax);
  if (!(fMax > 0)) { fMin = fMode = fMax = 1; }
  return { mMin, mMode, mMax, fMin, fMode, fMax };
}
function simulateVaR(risks = [], opts = {}) {
  const ranges = (risks || [])
    .filter((r) => pos(r.financial_exposure != null ? r.financial_exposure : r.financialExposure) > 0 || num(r.magMax) > 0)
    .map(riskRange);
  if (!ranges.length) return { expected: 0, var: 0, var_extreme: 0, iterations: 0, basis: 'no quantified risks' };
  const iters = opts.iterations || cfg.monteCarloIterations;
  const rng = mulberry32(opts.seed || 1337);
  const losses = new Array(iters);
  for (let i = 0; i < iters; i++) {
    let annual = 0;
    for (const g of ranges) {
      const freq = pertSample(g.fMin, g.fMode, g.fMax, rng());
      const mag = pertSample(g.mMin, g.mMode, g.mMax, rng());
      annual += freq * mag;
    }
    losses[i] = annual;
  }
  losses.sort((a, b) => a - b);
  const q = (p) => losses[Math.min(iters - 1, Math.floor(p * iters))];
  const expected = losses.reduce((s, x) => s + x, 0) / iters;
  return {
    expected,
    var: q(opts.percentile || cfg.varPercentile),
    var_extreme: q(cfg.varPercentileExtreme),
    iterations: iters,
    basis: `Monte-Carlo (${iters} iterations, Beta-PERT) over ${ranges.length} quantified risk(s)`,
  };
}

/**
 * Compose the full economics block the cockpit consumes.
 * @param {object} input { ale, tail, financials, appetite, insurance:{limit,premium,retention,renewal}, risks }
 */
function compose({ ale = 0, tail = null, financials = {}, appetite = null, insurance: policy = {}, risks = [] } = {}) {
  // If a tail isn't supplied, derive it from the risk register via Monte-Carlo.
  let sim = null;
  let tailVal = tail;
  if (tailVal == null) { sim = simulateVaR(risks); tailVal = sim.var; if (!ale && sim.expected) ale = sim.expected; }
  return {
    ale: num(ale),
    tail: num(tailVal),
    ratios: ratios(ale, financials),
    materiality: materialityThreshold(financials),
    appetite: appetiteStatus(ale, tailVal, appetite),
    insurance: insurance(tailVal, ale, policy),
    var: sim,
  };
}

module.exports = { ratios, materialityThreshold, appetiteStatus, insurance, simulateVaR, compose };
