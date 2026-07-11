'use strict';

/**
 * residual.js — the SINGLE, TUNABLE place for the per-crown-jewel residual-risk formula
 * (spec §4 / docs/CROWNJEWEL_PIPELINE_REVENUE_GATE.md §3, Phase C).
 *
 * Residual is driven by three axes, each 0..1:
 *   impact      — how much is at stake (crown-jewel criticality / normalized loss)
 *   prevention  — fraction of the scoped ATT&CK techniques with a PREVENT control (higher = safer)
 *   detection   — fraction of the scoped ATT&CK techniques with DETECT telemetry (higher = safer)
 *
 * Formula (product form, per spec):  residual = impact × unmitigatedPrevention × detectionGap
 * with per-axis FLOORS so neither control layer alone drives residual to exactly zero — you rarely
 * either fully prevent OR fully detect+respond in time. Every knob here is env-overridable; nothing
 * that scores residual may hardcode a number.
 */

const num = (name, def) => { const v = parseFloat(process.env[name]); return Number.isFinite(v) ? v : def; };

module.exports = {
  // Even with perfect prevention coverage, an unmitigated slice remains (imperfect controls).
  get preventionFloor() { return num('RESIDUAL_PREVENT_FLOOR', 0.10); },
  // Even with perfect detection, damage can occur before response completes — detection never zeroes residual.
  get detectionFloor() { return num('RESIDUAL_DETECT_FLOOR', 0.30); },
  // Scale the 0..1 residual to a 0..100 indicator (comparable to config/scoring ESCALATION_RESIDUAL).
  get scale() { return num('RESIDUAL_SCALE', 100); },
  // Band cutoffs on the 0..100 residual indicator.
  get highBand() { return num('RESIDUAL_HIGH', 50); },   // >= => High
  get medBand() { return num('RESIDUAL_MED', 25); },    // >= => Medium (else Low)
};
