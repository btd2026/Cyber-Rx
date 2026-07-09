'use strict';

/**
 * documentReview — the design-effectiveness engine.
 *
 * Reviews a policy / standard / SOP the way an auditor tests DESIGN: for each
 * control-objective criterion, it (1) finds WHERE the document addresses it and
 * (2) judges whether it is addressed APPROPRIATELY (the specifics a competent
 * reviewer expects). It concludes a per-control design-effectiveness verdict.
 *
 * Deterministic and transparent — every criterion returns its coverage, the
 * exact document excerpt (location) it was found in, and a rationale. This is
 * the "how the engine reviews the document" view the cockpit surfaces. It is a
 * DESIGN test only — it never claims operating effectiveness.
 */

const { REGISTRY, CONTROL_KEYS } = require('./criteria');

const DESIGN_STATUS = {
  EFFECTIVE: 'Design Effective',
  PARTIAL: 'Partially Effective (Design)',
  INEFFECTIVE: 'Ineffective (Design)',
  NOT_ENOUGH: 'Not Enough Evidence',
  NO_DOCUMENT: 'No Document Provided',
};
const COVERAGE = { COVERED: 'Covered', INADEQUATE: 'Inadequate', NOT_COVERED: 'Not Covered' };

function toRe(src) { try { return new RegExp(src, 'i'); } catch (_) { return new RegExp(src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); } }
function firstMatch(text, res) {
  let best = -1;
  for (const r of res) { const m = text.match(r); if (m && (best < 0 || m.index < best)) best = m.index; }
  return best;
}
function anyMatch(text, res) { return res.some((r) => r.test(text)); }
function excerptAround(doc, idx, radius) {
  radius = radius || 90;
  const start = Math.max(0, idx - Math.floor(radius / 3));
  const end = Math.min(doc.length, idx + radius);
  let ex = doc.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) ex = '…' + ex; if (end < doc.length) ex = ex + '…';
  return ex;
}

function reviewCriterion(doc, norm, c) {
  const conceptRes = (c.concepts || []).map(toRe);
  const idx = firstMatch(norm, conceptRes);
  const out = { criterion_id: c.id, text: c.text, required: c.required !== false, expectation: c.good || '', coverage: COVERAGE.NOT_COVERED, appropriate: false, location: null, rationale: '' };
  if (idx < 0) {
    out.rationale = 'No language addressing this criterion was found in the document.';
    return out;
  }
  out.location = { char_index: idx, excerpt: excerptAround(doc, idx) };
  const qualRes = (c.qualifiers || []).map(toRe);
  out.appropriate = qualRes.length ? anyMatch(norm, qualRes) : true;
  if (out.appropriate) {
    out.coverage = COVERAGE.COVERED;
    out.rationale = 'Addressed with the specifics an auditor expects' + (c.good ? ' (' + c.good + ').' : '.');
  } else {
    out.coverage = COVERAGE.INADEQUATE;
    out.rationale = 'The topic is mentioned but the document lacks the specifics an auditor expects' + (c.good ? ' — ' + c.good + '.' : '.');
  }
  return out;
}

/**
 * Review one control's design against a document.
 * @param {object} def   the control's criteria definition (from criteria.js)
 * @param {string} text  the document text (policy/standard/SOP)
 * @param {object} [meta] optional { document_name, document_type }
 */
function reviewControl(def, text, meta) {
  meta = meta || {};
  const base = {
    framework: def.framework, control_id: def.control_id, control_name: def.control_name,
    control_objective: def.control_objective, evidence_layer: 'Design',
    assessment_method: 'Auditor design-effectiveness review — control-objective criteria coverage + appropriateness.',
    document_name: meta.document_name || null, document_type: meta.document_type || null,
    primary_document_types: def.primary_document_types || [],
  };
  const doc = String(text || '');
  if (!doc.trim()) {
    return Object.assign(base, {
      status: DESIGN_STATUS.NO_DOCUMENT, design_effectiveness_score: 0,
      criteria: (def.criteria || []).map((c) => ({ criterion_id: c.id, text: c.text, required: c.required !== false, expectation: c.good || '', coverage: COVERAGE.NOT_COVERED, appropriate: false, location: null, rationale: 'No document provided to review.' })),
      required_criteria: (def.criteria || []).filter((c) => c.required !== false).length,
      covered: 0, inadequate: 0, not_covered: (def.criteria || []).filter((c) => c.required !== false).length,
      what_the_review_proves: 'Nothing yet — upload the governing document to run the design test.',
      what_the_review_does_not_prove: 'Operating effectiveness (that the control actually runs) — that needs telemetry over a period.',
    });
  }
  const norm = doc.toLowerCase();
  const criteria = (def.criteria || []).map((c) => reviewCriterion(doc, norm, c));
  const req = criteria.filter((c) => c.required);
  const covered = req.filter((c) => c.coverage === COVERAGE.COVERED).length;
  const inadequate = req.filter((c) => c.coverage === COVERAGE.INADEQUATE).length;
  const notCovered = req.filter((c) => c.coverage === COVERAGE.NOT_COVERED).length;
  const score = req.length ? Math.round(((covered + 0.5 * inadequate) / req.length) * 100) / 100 : 0;
  let status;
  if (covered === req.length && req.length > 0) status = DESIGN_STATUS.EFFECTIVE;
  else if (covered === 0 && inadequate === 0) status = DESIGN_STATUS.INEFFECTIVE;
  else status = DESIGN_STATUS.PARTIAL;
  return Object.assign(base, {
    status, design_effectiveness_score: score,
    criteria, required_criteria: req.length, covered, inadequate, not_covered: notCovered,
    what_the_review_proves: status === DESIGN_STATUS.EFFECTIVE
      ? 'The document addresses every required element of this control objective appropriately (design is sound).'
      : 'The document addresses ' + covered + ' of ' + req.length + ' required elements appropriately; the gaps below are what an auditor would write up.',
    what_the_review_does_not_prove: 'Operating effectiveness — whether the control is actually performed as written. That requires telemetry evidence over a review period.',
  });
}

// Review one control by id (looks up its criteria).
function reviewById(controlId, text, meta) {
  const def = REGISTRY[controlId];
  if (!def) throw new Error('No design criteria for control ' + controlId);
  return reviewControl(def, text, meta);
}

// The criteria checklist (no document) — what the engine will look for. Used by
// the cockpit to show the auditor checklist even before a document is uploaded.
function checklist(controlId) {
  const def = REGISTRY[controlId];
  if (!def) return null;
  return {
    framework: def.framework, control_id: def.control_id, control_name: def.control_name,
    control_objective: def.control_objective, primary_document_types: def.primary_document_types || [],
    criteria: def.criteria.map((c) => ({ criterion_id: c.id, text: c.text, required: c.required !== false, expectation: c.good || '' })),
  };
}
function allChecklists() { return CONTROL_KEYS.map((k) => checklist(k)); }

module.exports = { DESIGN_STATUS, COVERAGE, reviewControl, reviewById, checklist, allChecklists, CONTROL_KEYS };
