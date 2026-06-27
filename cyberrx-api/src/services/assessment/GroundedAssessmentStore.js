'use strict';

/**
 * GroundedAssessmentStore — persists the §4 per-control grounded verdicts so
 * reports/exports, the analyst queue, and incremental re-assessment can read
 * them. Replaces records per scan (idempotent re-runs).
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../../utils/db');

async function saveRecords(orgId, scanId, uploadId, records = []) {
  if (scanId) await db.query('DELETE FROM grounded_assessment WHERE scan_id=$1', [scanId]);
  let n = 0;
  for (const r of records) {
    await db.query(
      `INSERT INTO grounded_assessment
        (id, org_id, scan_id, upload_id, framework, control_id, status, control_nature, confidence,
         evidence, gap_description, remediation_suggestion, operating_effectiveness_note,
         operating_effectiveness_evidence_type, assessment_method, propagated_from, needs_review)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [uuidv4(), orgId, scanId || null, uploadId || null, r.framework, r.control_id, r.status || null,
        r.control_nature || null, r.confidence == null ? null : r.confidence, JSON.stringify(r.evidence || []),
        r.gap_description || null, r.remediation_suggestion || null, r.operating_effectiveness_note || null,
        r.operating_effectiveness_evidence_type || null, r.assessment_method || null, r.propagated_from || null,
        !!r.needs_review]);
    n += 1;
  }
  return { saved: n };
}

const map = (rows) => rows.map((r) => ({
  framework: r.framework, control_id: r.control_id, status: r.status, control_nature: r.control_nature,
  confidence: r.confidence == null ? null : Number(r.confidence), evidence: r.evidence || [],
  gap_description: r.gap_description || '', remediation_suggestion: r.remediation_suggestion || '',
  operating_effectiveness_note: r.operating_effectiveness_note || '',
  operating_effectiveness_evidence_type: r.operating_effectiveness_evidence_type || 'either',
  assessment_method: r.assessment_method, propagated_from: r.propagated_from, needs_review: r.needs_review,
}));

async function listByScan(scanId) { return map(await db.query('SELECT * FROM grounded_assessment WHERE scan_id=$1 ORDER BY framework, control_id', [scanId])); }
async function listByUpload(orgId, uploadId) { return map(await db.query('SELECT * FROM grounded_assessment WHERE org_id=$1 AND upload_id=$2 ORDER BY framework, control_id', [orgId, uploadId])); }

/** control_id -> section_refs it was grounded in (for incremental diff planning). */
async function controlSectionMap(orgId, uploadId) {
  const rows = await db.query('SELECT control_id, evidence FROM grounded_assessment WHERE org_id=$1 AND upload_id=$2', [orgId, uploadId]);
  const out = {};
  for (const r of rows) {
    const refs = (r.evidence || []).map((e) => e.section_ref).filter(Boolean);
    if (refs.length) out[r.control_id] = [...new Set([...(out[r.control_id] || []), ...refs])];
  }
  return out;
}

module.exports = { saveRecords, listByScan, listByUpload, controlSectionMap };
