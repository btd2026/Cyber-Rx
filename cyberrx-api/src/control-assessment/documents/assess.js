'use strict';

/**
 * assess — the document control assessment engine.
 *
 * Given a control that relies on document evidence and an uploaded document,
 * this produces a structured assessment that keeps DESIGN and OPERATING
 * EFFECTIVENESS strictly separate and NEVER lets document existence stand in for
 * control effectiveness.
 *
 * Pipeline:
 *   1. classify the document type from its content (client label not trusted).
 *   2. look up the control's OWN framework-native document requirements.
 *   3. review the required design elements — WHERE each is covered (citations)
 *      and whether appropriately (reuses the auditor design reviewer).
 *   4. read metadata (owner / approval / effective / review dates), test
 *      freshness, approval, review cadence.
 *   5. detect OPERATING evidence — a supporting record/report that proves the
 *      process actually ran. Design documents alone never satisfy operating.
 *   6. score conservatively and conclude a status.
 *
 * Hard rules enforced here:
 *   - No "Satisfies Requirement" without design elements covered AND operating
 *     evidence AND current/approved/owned/reviewed metadata AND citations.
 *   - Wrong document type → status Wrong Document Type, scores 0.
 *   - Text not extractable → status Not Enough Evidence, scores 0.
 *   - operating_effectiveness_score stays 0 unless operating evidence is present.
 */

const { classify } = require('./documentTypes');
const { get: getRequirement } = require('./requirements');
const { scoreDocument } = require('./scoring');
const { reviewControl, COVERAGE } = require('../design/documentReview');

const DOC_STATUS = {
  SATISFIES: 'Satisfies Requirement',
  PARTIALLY: 'Partially Satisfies',
  DOES_NOT: 'Does Not Satisfy',
  NOT_ENOUGH: 'Not Enough Evidence',
  EXPIRED: 'Expired / Stale',
  WRONG_TYPE: 'Wrong Document Type',
  NEEDS_SUPPORTING: 'Needs Supporting Evidence',
  NOT_API_TESTABLE: 'Not API-Testable',
  MANUAL_ESCALATION: 'Manual Escalation Required',
  NO_REQUIREMENT: 'No Requirement Defined',
};

const EVIDENCE_LAYER = {
  DOCUMENT_EXISTS: 'Document Exists',
  DESIGN: 'Design Evidence',
  OPERATING: 'Operating Effectiveness Evidence',
  SUPPORTING: 'Supporting Evidence',
  NOT_EVIDENCE: 'Not Evidence',
};

const EVIDENCE_STRENGTH = { DIRECT: 'Direct', PARTIAL: 'Partial', INDICATOR: 'Indicator', NOT_EVIDENCE: 'Not Evidence' };

const MS_PER_MONTH = 30.44 * 864e5;
function monthsBetween(a, b) {
  const da = new Date(a); const db = new Date(b);
  if (isNaN(da) || isNaN(db)) return null;
  return (db - da) / MS_PER_MONTH;
}
function toIso(d) { const x = new Date(d); return isNaN(x) ? null : x.toISOString(); }

/**
 * Detect operating evidence among supporting documents. A supporting document
 * only counts if it classifies as one of the required operating-evidence types
 * AND is operating-capable (a record/report, not another policy) AND is dated.
 */
function detectOperatingEvidence(req, supportingDocuments, nowMs) {
  const wanted = req.required_operational_evidence || [];
  const matches = [];
  (supportingDocuments || []).forEach((s) => {
    const cls = classify(s.text || '', s.fileName || '', s.type || null);
    if (!cls.type) return;
    const isWanted = wanted.indexOf(cls.type) >= 0;
    if (!isWanted || !cls.operating_capable) return;
    const dateIso = toIso(s.date || null);
    // require some content and a date to treat as a real operating record
    if (!(s.text && String(s.text).trim().length > 40)) return;
    matches.push({ type: cls.type, document_name: s.fileName || null, date: dateIso, confidence: cls.confidence, dated: !!dateIso });
  });
  return matches;
}

/**
 * assessDocument(input) → structured assessment result.
 * input: {
 *   framework_key, control_id,
 *   text, fileName, expectedType,
 *   metadata: { owner, approval_date, effective_date, last_review_date, version, hash },
 *   supportingDocuments: [{ type, text, fileName, date }],
 *   findings_remediated: bool,
 *   now: ms (optional, for tests)
 * }
 */
function assessDocument(input) {
  input = input || {};
  const nowMs = input.now != null ? input.now : Date.now();
  const meta = input.metadata || {};
  const text = String(input.text || '');
  const req = getRequirement(input.framework_key, input.control_id);

  const base = {
    framework_key: input.framework_key || null,
    framework: req ? req.framework : null,
    control_id: input.control_id || null,
    control_name: req ? req.control_name : null,
    assessment_method: 'Document control assessment — framework-native document requirements, design elements cited, operating evidence required separately.',
    document_name: input.fileName || null,
    document_type_expected: input.expectedType || (req ? (req.required_document_types || [])[0] : null) || null,
    document_type_detected: null,
    document_type_confidence: 0,
    document_type_wrong: false,
    document_type_operating_capable: false,
    required_document_types: req ? (req.required_document_types || []) : [],
    status: DOC_STATUS.NOT_ENOUGH,
    evidence_layer: EVIDENCE_LAYER.NOT_EVIDENCE,
    evidence_strength: EVIDENCE_STRENGTH.NOT_EVIDENCE,
    control_design_score: 0,
    operating_effectiveness_score: 0,
    overall_score: 0,
    // design element coverage + citations
    required_elements: [],
    elements_covered: 0,
    elements_required: 0,
    design_coverage_ratio: 0,
    design_threshold_met: false,
    citations: [],
    // metadata / lifecycle
    owner: meta.owner || null,
    approval_date: toIso(meta.approval_date),
    effective_date: toIso(meta.effective_date),
    last_review_date: toIso(meta.last_review_date),
    version: meta.version || null,
    hash: meta.hash || null,
    approved: false,
    current: false,
    reviewed: false,
    expired: false,
    freshness_requirement_months: req ? req.freshness_requirement_months : null,
    document_age_months: null,
    // operating evidence
    operating_evidence_required: req ? (req.required_operational_evidence || []) : [],
    operating_evidence_found: [],
    has_operating_evidence: false,
    // narrative
    missing_required_evidence: [],
    what_the_document_proves: '',
    what_the_document_does_not_prove: '',
    what_not_to_infer: req ? req.what_not_to_infer : null,
    pass_fail_rationale: '',
    assessed_at: toIso(nowMs),
  };

  if (!req) {
    base.status = DOC_STATUS.NO_REQUIREMENT;
    base.pass_fail_rationale = 'No framework-native document requirement is defined for ' + input.framework_key + ':' + input.control_id + '. This control is not document-assessable here.';
    return base;
  }

  // 1) extraction / existence
  const extractionFailed = !!input.extraction_failed;
  const exists = !extractionFailed && text.trim().length > 0;
  if (extractionFailed || !exists) {
    base.status = DOC_STATUS.NOT_ENOUGH;
    base.evidence_layer = EVIDENCE_LAYER.NOT_EVIDENCE;
    base.missing_required_evidence = ['Readable document text'];
    base.pass_fail_rationale = extractionFailed
      ? 'Document text could not be extracted (no OCR/parse result). Cannot assess — Not Enough Evidence.'
      : 'No document text provided. Nothing to assess.';
    base.what_the_document_does_not_prove = 'Anything — there is no readable evidence.';
    return base;
  }

  // 2) classify
  const cls = classify(text, input.fileName, input.expectedType || (req.required_document_types || [])[0]);
  base.document_type_detected = cls.type;
  base.document_type_confidence = cls.confidence;
  base.document_type_operating_capable = !!cls.operating_capable;
  const acceptableTypes = req.required_document_types || [];
  const typeAcceptable = cls.type && acceptableTypes.indexOf(cls.type) >= 0;
  base.document_type_wrong = !!cls.type && !typeAcceptable && cls.confidence >= 0.6;
  if (base.document_type_wrong) {
    const sc = scoreDocument({ exists: true, wrong_document_type: true });
    base.status = DOC_STATUS.WRONG_TYPE;
    base.evidence_layer = EVIDENCE_LAYER.NOT_EVIDENCE;
    base.control_design_score = sc.control_design_score;
    base.pass_fail_rationale = 'Uploaded document classifies as "' + cls.type + '" (confidence ' + cls.confidence + '), which is not an accepted type for ' + req.control_id + ' (' + acceptableTypes.join(', ') + ').';
    base.what_the_document_does_not_prove = 'This control — the document is the wrong type.';
    base.missing_required_evidence = acceptableTypes.slice();
    return base;
  }

  // 3) design elements + citations (reuse the auditor design reviewer)
  const def = {
    framework: req.framework, control_id: req.control_id, control_name: req.control_name,
    control_objective: req.control_name, primary_document_types: acceptableTypes,
    criteria: req.required_document_elements || [],
  };
  const review = reviewControl(def, text, { document_name: input.fileName, document_type: cls.type });
  const requiredEls = (req.required_document_elements || []).filter((c) => c.required !== false);
  base.required_elements = review.criteria.map((c) => ({
    id: c.criterion_id, text: c.text, required: c.required, coverage: c.coverage,
    appropriate: c.appropriate, citation: c.location, rationale: c.rationale,
  }));
  base.citations = review.criteria.filter((c) => c.location).map((c) => ({
    element_id: c.criterion_id, char_index: c.location.char_index, excerpt: c.location.excerpt,
  }));
  base.elements_required = requiredEls.length;
  base.elements_covered = review.covered;
  base.design_coverage_ratio = review.design_effectiveness_score;
  base.design_threshold_met = review.design_effectiveness_score >= (req.minimum_design_evidence_threshold || 0.75);

  // 4) metadata / lifecycle
  base.approved = !!base.approval_date && req.approval_requirement !== false;
  if (req.approval_requirement === false) base.approved = true;
  const ageAnchor = base.effective_date || base.approval_date || base.last_review_date;
  base.document_age_months = ageAnchor ? Math.round(monthsBetween(ageAnchor, new Date(nowMs)) * 10) / 10 : null;
  const freshMonths = req.freshness_requirement_months || 12;
  base.current = base.document_age_months != null && base.document_age_months <= freshMonths;
  base.expired = base.document_age_months != null && base.document_age_months > freshMonths;
  const reviewMonths = req.review_cadence_requirement_months || 12;
  const reviewAge = base.last_review_date ? monthsBetween(base.last_review_date, new Date(nowMs)) : null;
  base.reviewed = reviewAge != null && reviewAge <= reviewMonths;

  // 5) operating evidence
  const opEvidence = detectOperatingEvidence(req, input.supportingDocuments, nowMs);
  base.operating_evidence_found = opEvidence;
  base.has_operating_evidence = opEvidence.length > 0;

  // 6) score conservatively
  const metadataComplete = base.approved && base.current && !!base.owner && base.reviewed;
  const sc = scoreDocument({
    exists: true,
    design_threshold_met: base.design_threshold_met,
    design_coverage_ratio: base.design_coverage_ratio,
    approved: base.approved, current: base.current, has_owner: !!base.owner, reviewed: base.reviewed,
    operating_evidence: base.has_operating_evidence,
    findings_remediated: !!input.findings_remediated,
    expired: base.expired,
  });
  base.control_design_score = sc.control_design_score;
  base.operating_effectiveness_score = sc.operating_effectiveness_score;
  base.overall_score = sc.overall_score;

  // 7) conclude — the status vocabulary, conservatively
  const missing = [];
  if (!base.design_threshold_met) missing.push('Required design elements: ' + review.criteria.filter((c) => c.required && c.coverage !== COVERAGE.COVERED).map((c) => c.criterion_id).join(', '));
  if (!base.approved) missing.push('Approval (approval_date)');
  if (!base.owner) missing.push('Document owner');
  if (!base.reviewed) missing.push('Current review (last_review_date within cadence)');
  if (!base.has_operating_evidence) missing.push('Operating evidence: ' + (base.operating_evidence_required.join(' or ') || 'a record/report that the process ran'));
  base.missing_required_evidence = missing;

  if (base.expired) {
    base.status = DOC_STATUS.EXPIRED;
    base.evidence_layer = EVIDENCE_LAYER.DESIGN;
    base.evidence_strength = EVIDENCE_STRENGTH.INDICATOR;
    base.pass_fail_rationale = 'Document is stale (' + base.document_age_months + ' months old, requirement ' + freshMonths + '). Design evidence is discounted and operating effectiveness cannot be relied upon until re-approved.';
  } else if (!base.design_threshold_met) {
    // elements not sufficiently covered → does not satisfy design
    base.status = review.covered === 0 ? DOC_STATUS.DOES_NOT : DOC_STATUS.PARTIALLY;
    base.evidence_layer = EVIDENCE_LAYER.DESIGN;
    base.evidence_strength = review.covered === 0 ? EVIDENCE_STRENGTH.NOT_EVIDENCE : EVIDENCE_STRENGTH.PARTIAL;
    base.pass_fail_rationale = 'Document covers ' + review.covered + ' of ' + requiredEls.length + ' required design elements (threshold ' + (req.minimum_design_evidence_threshold || 0.75) + '). Design requirement not met.';
  } else if (!base.has_operating_evidence) {
    // design is sound but no operating evidence — the key conservative case
    base.status = DOC_STATUS.NEEDS_SUPPORTING;
    base.evidence_layer = EVIDENCE_LAYER.DESIGN;
    base.evidence_strength = EVIDENCE_STRENGTH.DIRECT;
    base.pass_fail_rationale = 'Design elements are covered and cited, but no operating evidence (' + (base.operating_evidence_required.join(' or ') || 'a record/report') + ') was provided. Satisfies design only — operating effectiveness is 0 until a supporting record proves the process ran.';
  } else if (!metadataComplete) {
    base.status = DOC_STATUS.PARTIALLY;
    base.evidence_layer = EVIDENCE_LAYER.OPERATING;
    base.evidence_strength = EVIDENCE_STRENGTH.PARTIAL;
    base.pass_fail_rationale = 'Design covered and operating evidence present, but metadata is incomplete (' + [!base.approved ? 'approval' : null, !base.owner ? 'owner' : null, !base.reviewed ? 'review' : null, !base.current ? 'freshness' : null].filter(Boolean).join(', ') + '). Not concluded as fully satisfying.';
  } else {
    base.status = DOC_STATUS.SATISFIES;
    base.evidence_layer = EVIDENCE_LAYER.OPERATING;
    base.evidence_strength = EVIDENCE_STRENGTH.DIRECT;
    base.pass_fail_rationale = 'Design elements covered and cited; current, approved, owned, reviewed; and operating evidence (' + opEvidence.map((e) => e.type).join(', ') + ') proves the process ran. Satisfies the control requirement.';
  }

  base.what_the_document_proves = base.design_threshold_met
    ? 'The document DESIGNS ' + base.elements_covered + ' of ' + requiredEls.length + ' required elements of ' + req.control_id + ' (cited above).'
    : 'The document partially addresses the design of ' + req.control_id + '.';
  base.what_the_document_does_not_prove = base.has_operating_evidence
    ? 'Nothing beyond the review period / records supplied — continued operation must be re-evidenced each period.'
    : 'That the control OPERATED. A design document is not evidence the process ran; ' + (base.operating_evidence_required.join(' or ') || 'an operating record') + ' is required.';

  return base;
}

module.exports = { assessDocument, DOC_STATUS, EVIDENCE_LAYER, EVIDENCE_STRENGTH };
