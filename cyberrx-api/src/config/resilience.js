'use strict';

/**
 * Operational-resilience config (spec: Data & Formulas, Part B #6-10). Drives the
 * CIO/CRO seats: downtime cost, recovery, single-vendor blast radius, tech-debt.
 * Env-overridable; industry-agnostic.
 */

const int = (name, def) => { const v = parseInt(process.env[name], 10); return Number.isFinite(v) ? v : def; };

module.exports = {
  get operatingHoursPerYear() { return int('RESIL_OP_HOURS', 8760); }, // hours/yr for $/hr conversion
};
