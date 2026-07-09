'use strict';

/**
 * scoring — conservative document-evidence scoring bands.
 *
 * A document is scored against a control's OWN requirements, never by crosswalk.
 * The bands are deliberately pessimistic: existence is worth little, design
 * elements more, but a document can NEVER reach the top band on design alone —
 * operating evidence (a record/report that the process actually ran) is required
 * to move past "design", and remediation of open findings to reach full marks.
 *
 * Two separate scores are produced and must stay separate:
 *   control_design_score            — how well the document DESIGNS the control.
 *   operating_effectiveness_score   — 0 unless operating evidence is present.
 *
 * Hard caps override the bands:
 *   wrong document type      → 0
 *   extraction failed        → 0 (caller marks Not Enough Evidence)
 *   expired / stale document → design capped at 0.40
 *   missing approval/owner/review metadata → design capped at 0.60
 */

// facts:
// {
//   exists,                    // text extractable + non-empty
//   extraction_failed,         // could not read the file
//   wrong_document_type,       // classifier says it's the wrong type
//   design_threshold_met,      // >= minimum_design_evidence_threshold of elements covered
//   design_coverage_ratio,     // 0..1 fraction of required elements covered
//   approved,                  // approval_date present
//   current,                   // within freshness window
//   has_owner,                 // owner metadata present
//   reviewed,                  // last_review_date present + within review cadence
//   operating_evidence,        // a supporting record/report proves the process ran
//   findings_remediated,       // open design gaps have been addressed
//   expired,                   // past freshness window
// }
function scoreDocument(facts) {
  const f = facts || {};
  const bands = [];

  if (f.extraction_failed) {
    return { control_design_score: 0, operating_effectiveness_score: 0, overall_score: 0, band: 'Extraction Failed', capped_by: 'extraction_failed', bands: ['extraction_failed'] };
  }
  if (f.wrong_document_type) {
    return { control_design_score: 0, operating_effectiveness_score: 0, overall_score: 0, band: 'Wrong Document Type', capped_by: 'wrong_document_type', bands: ['wrong_document_type'] };
  }
  if (!f.exists) {
    return { control_design_score: 0, operating_effectiveness_score: 0, overall_score: 0, band: 'No Document', capped_by: null, bands: [] };
  }

  // --- design score bands (cumulative, each gate must hold) ---
  let design = 0.25; bands.push('exists');                    // exists → 25%
  if (f.design_threshold_met) { design = 0.60; bands.push('design_elements'); } // elements → 60%
  const metadataComplete = f.approved && f.current && f.has_owner && f.reviewed;
  if (f.design_threshold_met && metadataComplete) { design = 0.75; bands.push('approved_current_owner_reviewed'); }

  // --- operating effectiveness — ZERO unless operating evidence exists ---
  let operating = 0;
  let overall = design;
  if (metadataComplete && f.design_threshold_met && f.operating_evidence) {
    operating = 0.90; overall = 0.90; bands.push('operating_evidence');
    if (f.findings_remediated) { operating = 1.0; overall = 1.0; bands.push('remediation'); }
  }

  // --- hard caps (applied to the DESIGN score; operating already requires the gates) ---
  let cappedBy = null;
  if (f.expired) { design = Math.min(design, 0.40); operating = 0; overall = Math.min(overall, 0.40); cappedBy = 'expired'; bands.push('expired_cap'); }
  else if (!metadataComplete && f.design_threshold_met) { design = Math.min(design, 0.60); cappedBy = 'missing_metadata'; if (overall > 0.60 && !f.operating_evidence) overall = Math.min(overall, 0.60); }

  const round = (n) => Math.round(n * 100) / 100;
  return {
    control_design_score: round(design),
    operating_effectiveness_score: round(operating),
    overall_score: round(operating > 0 ? overall : design),
    band: bands[bands.length - 1] || 'exists',
    capped_by: cappedBy,
    bands,
  };
}

module.exports = { scoreDocument };
