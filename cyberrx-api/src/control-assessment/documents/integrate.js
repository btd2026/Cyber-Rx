'use strict';

/**
 * integrate — fold a document assessment into the SAME control-assessment view
 * that telemetry produces, so a control can be evidenced by documents, telemetry,
 * or both (mixed evidence) without either standing in for the other.
 *
 * Rules (conservative, no overclaim):
 *   - DESIGN evidence comes from the document (element coverage + citations).
 *   - OPERATING effectiveness may come from telemetry (a live-tenant-validated
 *     connector proving the control ran) OR from a document operating record
 *     (a tabletop report, incident register, restore test, access-review report).
 *   - A control is only "Effective / Satisfies" when design is covered AND some
 *     operating evidence (telemetry or record) exists AND metadata is complete.
 *   - Document existence never becomes operating effectiveness.
 */

const { STATUS } = require('../evidenceModel');
const { DOC_STATUS } = require('./assess');

// Map a document status into the unified control status vocabulary.
function combine(telemetry, doc) {
  const t = telemetry || null;
  const d = doc || null;

  const telemetryOperating = !!(t && (t.assessment_status === STATUS.EFFECTIVE || t.evidence_layer === 'Operating Effectiveness'));
  const docDesign = !!(d && d.design_threshold_met);
  const docOperating = !!(d && d.has_operating_evidence);
  const anyOperating = telemetryOperating || docOperating;

  const sources = [];
  if (t && t.assessment_status && t.assessment_status !== STATUS.NOT_TESTED) sources.push('telemetry');
  if (d && d.status && d.status !== DOC_STATUS.NO_REQUIREMENT) sources.push('document');

  let status;
  let rationale;
  if (!d && !t) { status = 'Not Assessed'; rationale = 'No document and no telemetry evidence.'; }
  else if (d && d.status === DOC_STATUS.WRONG_TYPE) { status = 'Does Not Satisfy'; rationale = d.pass_fail_rationale; }
  else if (d && d.status === DOC_STATUS.EXPIRED) { status = 'Expired / Stale'; rationale = d.pass_fail_rationale; }
  else if (docDesign && anyOperating) {
    // metadata completeness still governs "fully satisfies"
    const metaOk = d && d.approved && d.current && d.owner && d.reviewed;
    status = metaOk ? 'Satisfies Requirement' : 'Partially Satisfies';
    rationale = 'Design covered' + (docOperating ? ' with a supporting operating record' : '') + (telemetryOperating ? ' and live telemetry proving operation' : '') + (metaOk ? '.' : '; document metadata incomplete.');
  } else if (docDesign) {
    status = 'Needs Supporting Evidence';
    rationale = 'Design covered but no operating evidence (telemetry or record). Design only.';
  } else if (d && (d.status === DOC_STATUS.PARTIALLY || d.status === DOC_STATUS.DOES_NOT)) {
    status = d.status; rationale = d.pass_fail_rationale;
  } else if (telemetryOperating) {
    status = 'Partially Satisfies'; rationale = 'Telemetry shows operation, but the governing document design is not covered.';
  } else {
    status = 'Not Enough Evidence';
    rationale = (d && d.pass_fail_rationale) || (t && t.pass_fail_rationale) || 'Insufficient evidence.';
  }

  return {
    framework_key: (d && d.framework_key) || null,
    control_id: (d && d.control_id) || (t && t.control_id) || null,
    control_name: (d && d.control_name) || (t && t.control_name) || null,
    status,
    evidence_sources: sources,
    control_design_score: d ? d.control_design_score : 0,
    operating_effectiveness_score: docOperating ? (d ? d.operating_effectiveness_score : 0) : (telemetryOperating ? (t ? t.control_effectiveness_score : 0) : 0),
    design_from: docDesign ? 'document' : null,
    operating_from: telemetryOperating ? 'telemetry' : (docOperating ? 'document_record' : null),
    document_status: d ? d.status : null,
    telemetry_status: t ? t.assessment_status : null,
    citations: d ? d.citations : [],
    missing_required_evidence: d ? d.missing_required_evidence : [],
    pass_fail_rationale: rationale,
    what_not_to_infer: d ? d.what_not_to_infer : null,
  };
}

module.exports = { combine };
