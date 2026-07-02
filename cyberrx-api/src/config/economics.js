'use strict';

/**
 * Cockpit economics config (spec: Data & Formulas, Part B). Every ratio, the
 * materiality basis, and the Monte-Carlo settings are env-overridable — no
 * hardcoded thresholds. Industry-agnostic; the org's own financials drive the
 * numbers.
 */

const num = (name, def) => { const v = parseFloat(process.env[name]); return Number.isFinite(v) ? v : def; };
const int = (name, def) => { const v = parseInt(process.env[name], 10); return Number.isFinite(v) ? v : def; };

module.exports = {
  // Materiality threshold basis. Common practice anchors on net income; fall back
  // to a share of revenue when net income is unavailable.
  get materialityPctOfNetIncome() { return num('ECON_MATERIALITY_NI_PCT', 0.05); }, // 5% of net income
  get materialityPctOfRevenue() { return num('ECON_MATERIALITY_REV_PCT', 0.005); }, // 0.5% of revenue (fallback)

  // Value-at-Risk (tail) settings for the Monte-Carlo loss simulation.
  get varPercentile() { return num('ECON_VAR_PCTILE', 0.95); },
  get varPercentileExtreme() { return num('ECON_VAR_PCTILE_HI', 0.99); },
  get monteCarloIterations() { return int('ECON_MC_ITERS', 20000); },
  // When a risk gives only a point estimate (no min/mode/max), spread it into a
  // range using these multipliers so the tail is still modeled (clearly labeled).
  get pointLowMult() { return num('ECON_POINT_LOW', 0.4); },
  get pointHighMult() { return num('ECON_POINT_HIGH', 3.0); },

  // Operating days per year for "days of operating income" translation.
  get operatingDaysPerYear() { return int('ECON_OP_DAYS', 365); },
};
