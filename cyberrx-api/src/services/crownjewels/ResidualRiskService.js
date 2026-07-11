'use strict';

/**
 * ResidualRiskService — the ONE place the per-crown-jewel residual-risk indicator is computed
 * (spec §4, Phase C). Pure, deterministic, explainable. The formula lives here and its knobs live
 * in config/residual.js — clearly labeled as tunable.
 *
 * HONESTY GUARDRAIL (Phase E): the two axes claim only what telemetry proves.
 *   - CONTROL PRESENCE — a capability is MAPPED to the technique (a control exists). This is NOT
 *     proof the control is effective; it is presence, not proven protection.
 *   - DETECTION COVERAGE — telemetry exists that would observe the technique.
 * Neither axis asserts effectiveness. `effectiveness` is a clearly-marked HOOK for future
 * breach-and-attack-simulation / purple-team results; until that data is wired it stays
 * { measured:false } and is never faked.
 */

const cfg = require('../../config/residual');

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const round = (n) => Math.round(n * 1000) / 1000;

// A clearly-marked hook: effectiveness is only known once BAS / purple-team data is wired.
const EFFECTIVENESS_HOOK = { measured: false, source: 'BAS / purple-team', note: 'hook — control effectiveness not yet measured; presence ≠ proven protection' };

/**
 * Summarize a scoped ATT&CK technique set into the two axes.
 * @param {Array<{status:'present'|'detect'|'none'|'prevent', supporting?:boolean}>} techniques
 *   status is the highest coverage established for the technique. 'prevent' is accepted as a legacy
 *   alias for 'present' (a mapped control). `supporting` (control-level only, no direct telemetry)
 *   counts as a PARTIAL mapping, not confirmed detection.
 * @returns {{ controlPresence:{present,partial,absent,total,coverage}, detection:{observed,blind,total,coverage}, effectiveness:object }}
 */
function coverageAxes(techniques = []) {
  const t = Array.isArray(techniques) ? techniques : [];
  const total = t.length;
  let present = 0, partial = 0, observed = 0;
  for (const x of t) {
    const s = String(x && x.status || 'none').toLowerCase();
    const supporting = !!(x && x.supporting);
    if (s === 'present' || s === 'prevent') { if (supporting) partial++; else present++; }
    else if (s === 'detect') { observed++; }
    // 'none' contributes to neither
  }
  const absent = Math.max(0, total - present - partial);
  const blind = Math.max(0, total - observed);
  // control-presence coverage credits a partial (control mapped, telemetry not confirmed) at half weight.
  const presenceCoverage = total ? clamp01((present + 0.5 * partial) / total) : 0;
  const detectCoverage = total ? clamp01(observed / total) : 0;
  return {
    controlPresence: { present, partial, absent, total, coverage: round(presenceCoverage) },
    detection: { observed, blind, total, coverage: round(detectCoverage) },
    effectiveness: EFFECTIVENESS_HOOK,
  };
}

/**
 * The residual formula (tunable — config/residual.js). Product form per spec, with per-axis floors.
 * @param {{impact:number, controlPresence:number, detection:number, prevention?:number}} inp  each 0..1
 *   `prevention` is a legacy alias for `controlPresence`.
 * @returns {{ residual:number, residual01:number, band:'High'|'Medium'|'Low', breakdown:object, effectiveness:object }}
 */
function residual({ impact = 0, controlPresence, prevention, detection = 0 } = {}) {
  const imp = clamp01(impact);
  const presence = clamp01(controlPresence != null ? controlPresence : (prevention != null ? prevention : 0));
  const det = clamp01(detection);

  // Exposure left where no control is even PRESENT, floored: presence alone (unproven) never zeroes it.
  const noControl = cfg.presenceFloor + (1 - cfg.presenceFloor) * (1 - presence);
  // Detection gap, floored: even full detection can't drop residual below detectionFloor of impact.
  const detGap = cfg.detectionFloor + (1 - cfg.detectionFloor) * (1 - det);

  const residual01 = clamp01(imp * noControl * detGap);
  const score = Math.round(residual01 * cfg.scale);
  const band = score >= cfg.highBand ? 'High' : score >= cfg.medBand ? 'Medium' : 'Low';

  return {
    residual: score,
    residual01: round(residual01),
    band,
    breakdown: {
      impact: round(imp),
      no_control_present: round(noControl), // exposure where no control is mapped (presence, not effectiveness)
      detection_gap: round(detGap),
      control_presence_coverage: round(presence),
      detection_coverage: round(det),
    },
    effectiveness: EFFECTIVENESS_HOOK,
  };
}

/**
 * Convenience: residual for one crown jewel from its impact + scoped technique set.
 * @param {{impact:number, techniques:Array}} jewel
 */
function residualForJewel(jewel = {}) {
  const axes = coverageAxes(jewel.techniques || []);
  const r = residual({ impact: jewel.impact, controlPresence: axes.controlPresence.coverage, detection: axes.detection.coverage });
  return { ...r, axes, rationale: rationale(jewel, axes, r) };
}

function rationale(jewel, axes, r) {
  const name = jewel.name || jewel.id || 'this crown jewel';
  const bits = [];
  if (axes.controlPresence.absent > 0) bits.push(`${axes.controlPresence.absent} of ${axes.controlPresence.total} attack techniques have no mapped control`);
  if (axes.detection.blind > 0) bits.push(`${axes.detection.blind} are detection blind spots`);
  const head = bits.length ? bits.join('; ') : 'a control is mapped and detection exists across the scoped techniques';
  return `${name}: ${head} — residual ${r.residual}/100 (${r.band}). Presence, not proven effectiveness — validate with BAS/purple-team.`;
}

module.exports = { coverageAxes, residual, residualForJewel, EFFECTIVENESS_HOOK };
