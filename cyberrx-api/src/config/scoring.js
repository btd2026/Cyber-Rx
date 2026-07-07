'use strict';

/**
 * scoring.js — the SINGLE source of truth for every weight, threshold and limit
 * used by the C-Suite dashboard computations (Build Brief §6). Nothing that scores
 * or ranks a widget may hardcode a number; it imports from here.
 *
 * Defaults are the brief's §6 defaults, except the exec escalation threshold which
 * the customer set to 25.
 */

// Criticality label → weight (Critical 1.0 … Low 0.25).
const CRITICALITY_WEIGHT = { critical: 1.0, high: 0.75, medium: 0.5, low: 0.25 };

// A vulnerability is "High/Critical" at CVSS ≥ 7.0.
const HIGH_CRIT_VULN_CVSS = 7.0;

// Exposure floor when an active threat is present on the asset.
const ACTIVE_THREAT_FLOOR = 0.7;

// Residual score at/above which an item escalates to executive attention.
// Customer-set (brief §6 offered 15 or 25).
const ESCALATION_RESIDUAL = 25;

// Confidence bands on the *spread/uncertainty* of a normalized value.
//   < 0.30 → High confidence, 0.30–0.60 → Medium, > 0.60 → Low.
const CONFIDENCE_BANDS = [
  { max: 0.30, label: 'High' },
  { max: 0.60, label: 'Medium' },
  { max: Infinity, label: 'Low' },
];

/**
 * Min-max normalize x to 0–1 across a result set [min,max].
 * If all values are equal (max===min) → 0.5 (brief §6).
 */
function norm(x, min, max) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  const lo = Number(min); const hi = Number(max);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi === lo) return 0.5;
  return Math.max(0, Math.min(1, (n - lo) / (hi - lo)));
}

/** Convenience: normalize x against an array of numbers. */
function normAgainst(x, arr) {
  const nums = (arr || []).map(Number).filter(Number.isFinite);
  if (!nums.length) return 0.5;
  return norm(x, Math.min(...nums), Math.max(...nums));
}

/** Criticality label (any case) → weight; unknown → 0 (not scored). */
function criticalityWeight(label) {
  const k = String(label || '').trim().toLowerCase();
  return CRITICALITY_WEIGHT[k] != null ? CRITICALITY_WEIGHT[k] : 0;
}

/**
 * Exploitability 0–1: EPSS (already 0–1) when available, else max_cvss/10.
 * @param {{epss?:number, maxCvss?:number}} v
 */
function exploitability({ epss, maxCvss } = {}) {
  const e = Number(epss);
  if (Number.isFinite(e) && e >= 0) return Math.max(0, Math.min(1, e));
  const c = Number(maxCvss);
  if (Number.isFinite(c) && c >= 0) return Math.max(0, Math.min(1, c / 10));
  return 0;
}

/**
 * Exposure 0–1 from a normalized EDR score; active_threat floors it at 0.7.
 * @param {{edrNorm?:number, activeThreat?:boolean}} v
 */
function exposure({ edrNorm, activeThreat } = {}) {
  let x = Number(edrNorm);
  if (!Number.isFinite(x)) x = 0;
  x = Math.max(0, Math.min(1, x));
  if (activeThreat) x = Math.max(x, ACTIVE_THREAT_FLOOR);
  return x;
}

/**
 * Composite risk (e.g. crown jewels): norm(criticality) × exploitability × exposure,
 * ×100 for display. Inputs are already 0–1.
 */
function compositeRisk({ criticalityNorm, exploit, expose }) {
  const a = Math.max(0, Math.min(1, Number(criticalityNorm) || 0));
  const b = Math.max(0, Math.min(1, Number(exploit) || 0));
  const c = Math.max(0, Math.min(1, Number(expose) || 0));
  return Math.round(a * b * c * 100);
}

/** Confidence label from a spread value (0–1). */
function confidence(spread) {
  const s = Number(spread) || 0;
  return (CONFIDENCE_BANDS.find((b) => s < b.max) || CONFIDENCE_BANDS[CONFIDENCE_BANDS.length - 1]).label;
}

/** Whether a residual score escalates to executives. */
function escalates(residual) {
  return Number(residual) >= ESCALATION_RESIDUAL;
}

module.exports = {
  CRITICALITY_WEIGHT, HIGH_CRIT_VULN_CVSS, ACTIVE_THREAT_FLOOR, ESCALATION_RESIDUAL, CONFIDENCE_BANDS,
  norm, normAgainst, criticalityWeight, exploitability, exposure, compositeRisk, confidence, escalates,
};
