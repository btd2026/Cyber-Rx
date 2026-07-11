'use strict';

/**
 * residual.js — the SINGLE, TUNABLE place for the per-crown-jewel residual-risk formula
 * (spec §4 / docs/CROWNJEWEL_PIPELINE_REVENUE_GATE.md §3, Phase C).
 *
 * Residual is driven by three axes, each 0..1:
 *   impact          — how much is at stake (crown-jewel criticality / normalized loss)
 *   controlPresence — fraction of the scoped ATT&CK techniques with a MAPPED control (a control
 *                     EXISTS — presence, NOT proven effectiveness). Honest by design (Phase E).
 *   detection       — fraction of the scoped ATT&CK techniques with DETECTION telemetry
 *
 * Formula (product form, per spec):  residual = impact × noControlPresent × detectionGap
 * with per-axis FLOORS so neither axis alone drives residual to exactly zero — control PRESENCE is
 * not proof of protection, and detection rarely stops loss in time. Effectiveness (BAS/purple-team)
 * is a separate, not-yet-wired hook. Every knob here is env-overridable; nothing hardcodes a number.
 */

const num = (name, def) => { const v = parseFloat(process.env[name]); return Number.isFinite(v) ? v : def; };

module.exports = {
  // Even with a control mapped everywhere, presence is not proven effectiveness — a slice remains.
  get presenceFloor() { return num('RESIDUAL_PRESENCE_FLOOR', 0.10); },
  // Back-compat alias.
  get preventionFloor() { return this.presenceFloor; },
  // Even with perfect detection, damage can occur before response completes — detection never zeroes residual.
  get detectionFloor() { return num('RESIDUAL_DETECT_FLOOR', 0.30); },
  // Scale the 0..1 residual to a 0..100 indicator (comparable to config/scoring ESCALATION_RESIDUAL).
  get scale() { return num('RESIDUAL_SCALE', 100); },
  // Band cutoffs on the 0..100 residual indicator.
  get highBand() { return num('RESIDUAL_HIGH', 50); },   // >= => High
  get medBand() { return num('RESIDUAL_MED', 25); },    // >= => Medium (else Low)
};
