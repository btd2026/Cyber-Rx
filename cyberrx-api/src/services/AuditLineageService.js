'use strict';

/**
 * AuditLineageService — audit-ready oversight evidence for the CLO. For each
 * unified assessment result, returns the full lineage: control → framework →
 * evidence (automated run / document upload, from evidence_refs) → cross-framework
 * peers (requirement_crosswalks). One assessment, traceable across CSF / 800-53 /
 * CIS — the disclosure-era "we exercised oversight" pack.
 */

const db = require('../utils/db');

async function summary(orgId) {
  const r = (await db.query(
    `SELECT COUNT(*)::int AS total,
            SUM(CASE WHEN review_status='reviewed' THEN 1 ELSE 0 END)::int AS reviewed,
            SUM(CASE WHEN status='met' THEN 1 ELSE 0 END)::int AS met
       FROM assessment_result WHERE organization_id=$1`, [orgId]))[0];
  return r;
}

async function lineage(orgId, frameworkId) {
  const params = [orgId]; let where = 'ar.organization_id=$1';
  if (frameworkId) { params.push(frameworkId); where += ' AND ar.framework_id=$2'; }
  const rows = await db.query(
    `SELECT ar.framework_id, ar.requirement_id, ar.status, ar.score, ar.confidence, ar.review_status,
            ar.gap, ar.recommendation, ar.evidence_refs, fr.title, fr.assessment_type
       FROM assessment_result ar
       LEFT JOIN framework_requirements fr ON fr.framework_id=ar.framework_id AND fr.requirement_id=ar.requirement_id
      WHERE ${where}
      ORDER BY ar.framework_id, ar.requirement_id
      LIMIT 200`, params);

  const out = [];
  for (const r of rows) {
    const xwalk = await db.query(
      `SELECT to_framework, to_id, relationship FROM requirement_crosswalks
        WHERE from_framework=$1 AND from_id=$2 LIMIT 20`, [r.framework_id, r.requirement_id]);
    const evidence = typeof r.evidence_refs === 'string' ? JSON.parse(r.evidence_refs || '[]') : (r.evidence_refs || []);
    out.push({
      framework_id: r.framework_id, requirement_id: r.requirement_id, title: r.title,
      assessment_type: r.assessment_type, status: r.status, score: r.score, confidence: r.confidence,
      review_status: r.review_status, gap: r.gap, recommendation: r.recommendation,
      evidence, crosswalk: xwalk,
    });
  }
  return out;
}

module.exports = { summary, lineage };
