'use strict';

/**
 * Crown-jewel criticality scoring config (spec §2.4 / §4). Industry-agnostic and
 * fully explainable — weights, threshold and tier cutoffs are all env-overridable.
 * No hardcoded crown-jewel names (the legacy tieringEngine hardcoded healthcare
 * process names; this does not).
 */

const num = (name, def) => { const v = parseFloat(process.env[name]); return Number.isFinite(v) ? v : def; };

module.exports = {
  // Factor weights (sum ~1.0). Each factor is normalized 0..1; score = Σ w·factor.
  get weights() {
    return {
      max_process_crit: num('CRIT_W_PROC', 0.35),       // mission criticality of supported processes
      process_concentration: num('CRIT_W_CONC', 0.15),  // how many critical processes depend on it
      data_sensitivity: num('CRIT_W_DATA', 0.25),       // sensitivity of data it holds
      exposure: num('CRIT_W_EXPO', 0.15),               // internet-facing etc.
      spof: num('CRIT_W_SPOF', 0.10),                   // single point of failure (no redundancy)
    };
  },
  get crownJewelThreshold() { return num('CRIT_CJ_THRESHOLD', 0.70); }, // score (0..1) at/above => crown jewel
  get tier1() { return num('CRIT_TIER1', 0.85); },
  get tier2() { return num('CRIT_TIER2', 0.70); },
  get tier3() { return num('CRIT_TIER3', 0.50); },
  get concentrationCap() { return num('CRIT_CONC_CAP', 4); }, // # critical processes that saturates concentration
};
