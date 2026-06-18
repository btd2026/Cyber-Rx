'use strict';

/**
 * AssessmentEngine — ONE unified per-control result from TWO evidence streams:
 *   - automated  : latest validation-run requirement scores (score_history)
 *   - document   : LLM/heuristic document review (control_assessment)
 *
 * mergeEvidence() (pure, tested) combines them per the control's assessment_type,
 * producing status / score / confidence / gap / recommendation and an
 * evidence_refs trace. run() writes assessment_result rows (NEVER overwriting a
 * human-reviewed row), and rollup() aggregates per framework. review() records a
 * consultant override and marks the row reviewed (human-in-the-loop).
 */

const db = require('../utils/db');
const logger = require('../utils/logger');

const CONTROL_FRAMEWORKS = ['nist_csf_2', 'nist_800_53_r5', 'cis_v8_1', 'iso_27001', 'soc_2'];
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';

const statusFromScore = (s) => (s >= 80 ? 'met' : s >= 50 ? 'partially met' : 'not met');
const scoreFromStatus = (st) => (st === 'met' ? 100 : st === 'partially met' ? 50 : 0);

/**
 * mergeEvidence(req, automated, document) -> unified result | null
 *   req:       { framework_id, requirement_id, assessment_type }
 *   automated: { score, runId } | null
 *   document:  { status, finding, excerpt, uploadId } | null
 */
function mergeEvidence(req, automated, document) {
  const type = (req && req.assessment_type) || 'hybrid';
  const a = automated && automated.score != null ? { score: Number(automated.score), status: statusFromScore(Number(automated.score)) } : null;
  const m = document && document.status ? { score: scoreFromStatus(document.status), status: document.status } : null;

  let score = null, status = null, confidence = 'low';
  const sources = [];

  if (type === 'automated') {
    if (a) { score = a.score; status = a.status; confidence = 'high'; sources.push('automated'); }
    else if (m) { score = m.score; status = m.status; confidence = 'low'; sources.push('document'); }
  } else if (type === 'manual') {
    if (m) { score = m.score; status = m.status; confidence = document.excerpt ? 'medium' : 'low'; sources.push('document'); }
    else if (a) { score = a.score; status = a.status; confidence = 'low'; sources.push('automated'); }
  } else { // hybrid
    if (a && m) { score = Math.round((a.score + m.score) / 2); status = statusFromScore(score); confidence = a.status === m.status ? 'high' : 'medium'; sources.push('automated', 'document'); }
    else if (a) { score = a.score; status = a.status; confidence = 'medium'; sources.push('automated'); }
    else if (m) { score = m.score; status = m.status; confidence = 'low'; sources.push('document'); }
  }

  if (score == null) return null; // no evidence at all

  const gap = status === 'met' ? null : (document && document.finding) || `Requirement not fully evidenced (${status}).`;
  const recommendation = status === 'met'
    ? 'Operating effectively — re-test on schedule.'
    : (document && document.finding) ? `Address: ${document.finding}` : 'Provide evidence or remediate to meet the requirement.';

  const evidence_refs = [];
  if (a && automated) evidence_refs.push({ type: 'automated', runId: automated.runId, score: a.score });
  if (m && document) evidence_refs.push({ type: 'document', uploadId: document.uploadId, status: document.status, excerpt: document.excerpt });

  return { status, score, confidence, gap, recommendation, sources, evidence_refs };
}

async function latestRunId(orgId) {
  const r = await db.query('SELECT id FROM validation_runs WHERE org_id=$1 ORDER BY id DESC LIMIT 1', [orgId]);
  return r[0] ? r[0].id : null;
}

async function run(orgId) {
  const reqs = await db.query(
    `SELECT framework_id, requirement_id, assessment_type FROM framework_requirements WHERE framework_id = ANY($1)`, [CONTROL_FRAMEWORKS]);

  const runId = await latestRunId(orgId);
  const auto = {};
  if (runId) {
    const rows = await db.query('SELECT framework_id, scope, score FROM score_history WHERE org_id=$1 AND run_id=$2', [orgId, runId]);
    rows.forEach((r) => { auto[`${r.framework_id}::${r.scope}`] = { score: Number(r.score), runId }; });
  }

  const document = {};
  const ca = await db.query(
    `SELECT framework_id, requirement_id, status, finding, evidence_excerpt, document_upload_id
       FROM control_assessment WHERE org_id=$1 ORDER BY reviewed_at ASC NULLS FIRST`, [orgId]);
  ca.forEach((r) => { document[`${r.framework_id}::${r.requirement_id}`] = { status: r.status, finding: r.finding, excerpt: r.evidence_excerpt, uploadId: r.document_upload_id }; }); // latest wins

  let written = 0;
  for (const req of reqs) {
    const key = `${req.framework_id}::${req.requirement_id}`;
    const merged = mergeEvidence(req, auto[key] || null, document[key] || null);
    if (!merged) continue;
    await db.query(
      `INSERT INTO assessment_result
         (id, organization_id, framework_id, requirement_id, status, score, confidence, gap, recommendation, review_status, evidence_refs, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10,NOW())
       ON CONFLICT (organization_id, framework_id, requirement_id) DO UPDATE SET
         status=EXCLUDED.status, score=EXCLUDED.score, confidence=EXCLUDED.confidence,
         gap=EXCLUDED.gap, recommendation=EXCLUDED.recommendation, evidence_refs=EXCLUDED.evidence_refs, updated_at=NOW()
       WHERE assessment_result.review_status <> 'reviewed'`,
      [`ar_${orgId}_${slug(req.framework_id)}_${slug(req.requirement_id)}`, orgId, req.framework_id, req.requirement_id,
        merged.status, merged.score, merged.confidence, merged.gap, merged.recommendation, JSON.stringify(merged.evidence_refs)]);
    written++;
  }
  logger.info('assessment engine run', { orgId, runId, results: written });
  return { runId, results: written };
}

async function rollup(orgId, frameworkId) {
  const params = [orgId]; let where = 'organization_id=$1';
  if (frameworkId) { params.push(frameworkId); where += ' AND framework_id=$2'; }
  return db.query(
    `SELECT framework_id, ROUND(AVG(score), 1) AS avg_score, COUNT(*)::int AS total,
            SUM(CASE WHEN status='met' THEN 1 ELSE 0 END)::int AS met,
            SUM(CASE WHEN status='partially met' THEN 1 ELSE 0 END)::int AS partially_met,
            SUM(CASE WHEN status='not met' THEN 1 ELSE 0 END)::int AS not_met,
            SUM(CASE WHEN review_status='reviewed' THEN 1 ELSE 0 END)::int AS reviewed
       FROM assessment_result WHERE ${where} GROUP BY framework_id ORDER BY framework_id`, params);
}

async function listResults(orgId, frameworkId) {
  const params = [orgId]; let where = 'organization_id=$1';
  if (frameworkId) { params.push(frameworkId); where += ' AND framework_id=$2'; }
  return db.query(`SELECT * FROM assessment_result WHERE ${where} ORDER BY framework_id, requirement_id LIMIT 2000`, params);
}

async function review(orgId, frameworkId, requirementId, body = {}) {
  const sets = [], vals = [orgId, frameworkId, requirementId]; let i = 4;
  ['status', 'score', 'gap', 'recommendation'].forEach((k) => { if (body[k] !== undefined) { sets.push(`${k}=$${i++}`); vals.push(body[k]); } });
  sets.push(`review_status='reviewed'`, 'updated_at=NOW()');
  await db.query(`UPDATE assessment_result SET ${sets.join(', ')} WHERE organization_id=$1 AND framework_id=$2 AND requirement_id=$3`, vals);
  const r = await db.query('SELECT * FROM assessment_result WHERE organization_id=$1 AND framework_id=$2 AND requirement_id=$3', [orgId, frameworkId, requirementId]);
  return r[0] || null;
}

module.exports = { mergeEvidence, run, rollup, listResults, review, statusFromScore, scoreFromStatus };
