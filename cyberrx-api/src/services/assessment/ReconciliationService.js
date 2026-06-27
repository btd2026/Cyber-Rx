'use strict';

/**
 * ReconciliationService — Stage 7. Reconciles the control-driven verdicts
 * (authoritative) against the document-driven reverse pass, and builds the
 * coverage heatmap. Conflicts are surfaced for the analyst queue:
 *
 *   - missed_coverage:     control verdict is Not addressed / NA, yet the reverse
 *                          pass found policy text touching it (possible miss).
 *   - unsupported_verdict: control verdict is positive, yet no chunk touched it
 *                          in the reverse pass (possible spurious match).
 *   - low_confidence:      positive verdict below the confidence floor.
 *
 * The control-driven verdict stays authoritative; reconciliation only flags.
 */

const POSITIVE = new Set(['Fully addressed', 'Partially addressed']);
const famOf = (id) => String(id).split(/[-.]/)[0].toUpperCase();

/**
 * @param {Object<string,verdict>} controlVerdicts  by control_id (rollup output)
 * @param {Object<string,string[]>} touchedByControl  control_id -> [section_refs]
 * @param {{lowConfidence?:number}} [opts]
 */
function reconcile(controlVerdicts, touchedByControl = {}, opts = {}) {
  const floor = opts.lowConfidence == null ? 0.5 : opts.lowConfidence;
  const conflicts = [];
  const verdictIds = new Set(Object.keys(controlVerdicts));

  for (const [cid, v] of Object.entries(controlVerdicts)) {
    const touches = touchedByControl[cid] || [];
    if (POSITIVE.has(v.status)) {
      if (!touches.length) conflicts.push({ type: 'unsupported_verdict', control_id: cid, control_status: v.status, doc_touches: [], reason: 'Positive verdict but the document-driven pass found no policy text touching this control.' });
      if (v.confidence != null && v.confidence < floor) conflicts.push({ type: 'low_confidence', control_id: cid, control_status: v.status, confidence: v.confidence, reason: `Positive verdict with confidence ${v.confidence} below ${floor}.` });
    } else if (touches.length) {
      conflicts.push({ type: 'missed_coverage', control_id: cid, control_status: v.status, doc_touches: touches, reason: 'Document-driven pass found policy text touching a control the control-driven pass marked not addressed.' });
    }
  }
  // Controls the reverse pass surfaced that were never in the control-driven set at all.
  for (const cid of Object.keys(touchedByControl)) {
    if (!verdictIds.has(cid)) conflicts.push({ type: 'missed_coverage', control_id: cid, control_status: 'not_assessed', doc_touches: touchedByControl[cid], reason: 'Policy text maps to a control that was not in the assessed spine set.' });
  }
  return { conflicts, conflictCount: conflicts.length };
}

/** Per-family coverage heatmap from verdicts + reverse touches. */
function heatmap(controlVerdicts, touchedByControl = {}) {
  const fam = {};
  const bucket = (f) => (fam[f] = fam[f] || { family: f, assessed: 0, fully: 0, partially: 0, not_addressed: 0, not_applicable: 0, doc_touched: 0 });
  for (const v of Object.values(controlVerdicts)) {
    const b = bucket(famOf(v.control_id));
    b.assessed += 1;
    if (v.status === 'Fully addressed') b.fully += 1;
    else if (v.status === 'Partially addressed') b.partially += 1;
    else if (v.status === 'Not applicable') b.not_applicable += 1;
    else b.not_addressed += 1;
  }
  const touchedFams = {};
  for (const cid of Object.keys(touchedByControl)) { const f = famOf(cid); touchedFams[f] = (touchedFams[f] || 0) + 1; }
  for (const [f, n] of Object.entries(touchedFams)) bucket(f).doc_touched = n;
  // coverage score per family = (fully + 0.5*partially) / assessed
  return Object.values(fam).map((b) => ({
    ...b,
    coverage_pct: b.assessed ? Math.round(((b.fully + 0.5 * b.partially) / b.assessed) * 100) : 0,
  })).sort((a, b) => a.family.localeCompare(b.family));
}

module.exports = { reconcile, heatmap, POSITIVE, famOf };
