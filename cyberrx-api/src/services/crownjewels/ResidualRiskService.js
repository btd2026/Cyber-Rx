'use strict';

/**
 * ResidualRiskService — the ONE place the per-crown-jewel residual-risk indicator is computed
 * (spec §4, Phase C). Pure, deterministic, explainable. The formula lives here and its knobs live
 * in config/residual.js — clearly labeled as tunable.
 *
 * Two axes come from the ATT&CK coverage the platform already computes (technique_coverage:
 * prevent | detect | none). This service summarizes a scoped technique set into those two axes and
 * turns impact + the two axes into a residual indicator with an auditable breakdown.
 */

const cfg = require('../../config/residual');

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const round = (n) => Math.round(n * 1000) / 1000;

/**
 * Summarize a scoped ATT&CK technique set into the two axes.
 * @param {Array<{status:'prevent'|'detect'|'none', supporting?:boolean}>} techniques
 *   status is the highest coverage established for the technique. `supporting` (control-level only,
 *   no direct telemetry) counts as PARTIAL prevention / but not confirmed detection.
 * @returns {{ prevent:{mitigated,partial,gap,total,coverage}, detect:{observed,blind,total,coverage} }}
 */
function coverageAxes(techniques = []) {
  const t = Array.isArray(techniques) ? techniques : [];
  const total = t.length;
  let mitigated = 0, partial = 0, observed = 0;
  for (const x of t) {
    const s = String(x && x.status || 'none').toLowerCase();
    const supporting = !!(x && x.supporting);
    if (s === 'prevent') { if (supporting) partial++; else mitigated++; }
    else if (s === 'detect') { observed++; }
    // 'none' contributes to neither
  }
  const gap = Math.max(0, total - mitigated - partial);
  const blind = Math.max(0, total - observed);
  // prevention coverage credits partial at half weight (control mapped, telemetry not confirmed).
  const preventCoverage = total ? clamp01((mitigated + 0.5 * partial) / total) : 0;
  const detectCoverage = total ? clamp01(observed / total) : 0;
  return {
    prevent: { mitigated, partial, gap, total, coverage: round(preventCoverage) },
    detect: { observed, blind, total, coverage: round(detectCoverage) },
  };
}

/**
 * The residual formula (tunable — config/residual.js). Product form per spec, with per-axis floors.
 * @param {{impact:number, prevention:number, detection:number}} inp  each 0..1
 * @returns {{ residual:number, residual01:number, band:'High'|'Medium'|'Low', breakdown:object }}
 */
function residual({ impact = 0, prevention = 0, detection = 0 } = {}) {
  const imp = clamp01(impact);
  const prev = clamp01(prevention);
  const det = clamp01(detection);

  // Unmitigated prevention, floored: even full prevention leaves preventionFloor of exposure.
  const unmitPrev = cfg.preventionFloor + (1 - cfg.preventionFloor) * (1 - prev);
  // Detection gap, floored: even full detection can't drop residual below detectionFloor of impact.
  const detGap = cfg.detectionFloor + (1 - cfg.detectionFloor) * (1 - det);

  const residual01 = clamp01(imp * unmitPrev * detGap);
  const score = Math.round(residual01 * cfg.scale);
  const band = score >= cfg.highBand ? 'High' : score >= cfg.medBand ? 'Medium' : 'Low';

  return {
    residual: score,
    residual01: round(residual01),
    band,
    breakdown: {
      impact: round(imp),
      unmitigated_prevention: round(unmitPrev),
      detection_gap: round(detGap),
      prevention_coverage: round(prev),
      detection_coverage: round(det),
    },
  };
}

/**
 * Convenience: residual for one crown jewel from its impact + scoped technique set.
 * @param {{impact:number, techniques:Array}} jewel
 */
function residualForJewel(jewel = {}) {
  const axes = coverageAxes(jewel.techniques || []);
  const r = residual({ impact: jewel.impact, prevention: axes.prevent.coverage, detection: axes.detect.coverage });
  return { ...r, axes, rationale: rationale(jewel, axes, r) };
}

function rationale(jewel, axes, r) {
  const name = jewel.name || jewel.id || 'this crown jewel';
  const bits = [];
  if (axes.prevent.gap > 0) bits.push(`${axes.prevent.gap} of ${axes.prevent.total} attack techniques have no prevention`);
  if (axes.detect.blind > 0) bits.push(`${axes.detect.blind} are detection blind spots`);
  const head = bits.length ? bits.join('; ') : 'well covered on both prevention and detection';
  return `${name}: ${head} — residual ${r.residual}/100 (${r.band}).`;
}

module.exports = { coverageAxes, residual, residualForJewel };
