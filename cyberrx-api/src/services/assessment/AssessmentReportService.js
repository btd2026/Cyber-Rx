'use strict';

/**
 * AssessmentReportService — Stage 8. Assembles the deterministic report data
 * model from the assessment outputs: per-framework scorecard, gap register,
 * evidence-linked findings, and the coverage heatmap. Every output respects the
 * design/documentation-only line and carries the operating-effectiveness handoff.
 */

const STATUS = ['Fully addressed', 'Partially addressed', 'Not addressed', 'Not applicable'];
const POSITIVE = new Set(['Fully addressed', 'Partially addressed']);
const COVERAGE_CAVEAT = 'This assessment reflects DESIGN / DOCUMENTATION coverage only — whether each control is addressed in writing. It does not assess operating effectiveness. Each finding records the operating-effectiveness evidence still required.';

function scorecard(records, framework) {
  const version = records[0] ? records[0].framework_version : null;
  const c = { framework, framework_version: version, total: records.length, fully: 0, partially: 0, not_addressed: 0, not_applicable: 0,
    automated_capable: 0, non_automated_procedural: 0, hybrid: 0, needs_review: 0 };
  for (const r of records) {
    if (r.status === 'Fully addressed') c.fully += 1;
    else if (r.status === 'Partially addressed') c.partially += 1;
    else if (r.status === 'Not applicable') c.not_applicable += 1;
    else c.not_addressed += 1;
    if (r.control_nature && c[r.control_nature] != null) c[r.control_nature] += 1;
    if (r.needs_review) c.needs_review += 1;
  }
  const denom = c.total - c.not_applicable;
  c.coverage_pct = denom > 0 ? Math.round(((c.fully + 0.5 * c.partially) / denom) * 100) : 0;
  return c;
}

const asArray = (recordsOrMap) => (Array.isArray(recordsOrMap) ? recordsOrMap : Object.values(recordsOrMap || {}));

/**
 * @param {object} input { spineVerdicts (map|array), csfRecords (array),
 *   heatmap, conflicts, scanId, documentId, generatedAt, frameworkVersions }
 */
function buildReport(input = {}) {
  const spine = asArray(input.spineVerdicts);
  const csf = asArray(input.csfRecords);
  const all = [...spine, ...csf];

  const frameworks = {};
  if (spine.length) frameworks[spine[0].framework] = scorecard(spine, spine[0].framework);
  if (csf.length) frameworks[csf[0].framework] = scorecard(csf, csf[0].framework);

  const gap_register = all
    .filter((r) => r.status === 'Not addressed' || r.status === 'Partially addressed')
    .map((r) => ({
      framework: r.framework, control_id: r.control_id, status: r.status, control_nature: r.control_nature,
      gap_description: r.gap_description || '', remediation_suggestion: r.remediation_suggestion || '',
      operating_effectiveness_note: r.operating_effectiveness_note || '',
      operating_effectiveness_evidence_type: r.operating_effectiveness_evidence_type || 'either',
      needs_review: !!r.needs_review,
    }))
    .sort((a, b) => (a.framework + a.control_id).localeCompare(b.framework + b.control_id));

  // Evidence-linked findings: each addressed control with its policy citations.
  const findings = all
    .filter((r) => POSITIVE.has(r.status) && (r.evidence || []).length)
    .map((r) => ({
      framework: r.framework, control_id: r.control_id, status: r.status, control_nature: r.control_nature,
      assessment_method: r.assessment_method, propagated_from: r.propagated_from || null,
      evidence: (r.evidence || []).map((e) => ({ quote: e.quote, section_ref: e.section_ref })),
    }))
    .sort((a, b) => (a.framework + a.control_id).localeCompare(b.framework + b.control_id));

  return {
    scan_id: input.scanId || null,
    document_id: input.documentId || null,
    generated_at: input.generatedAt || null, // caller stamps (no Date in pure layer)
    framework_versions: input.frameworkVersions || {},
    coverage_caveat: COVERAGE_CAVEAT,
    frameworks,
    summary: { controls_assessed: all.length, gaps: gap_register.length, findings: findings.length, conflicts: (input.conflicts || []).length },
    scorecards: Object.values(frameworks),
    gap_register,
    findings,
    heatmap: input.heatmap || [],
    conflicts: input.conflicts || [],
  };
}

module.exports = { buildReport, scorecard, COVERAGE_CAVEAT, STATUS };
