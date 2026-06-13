'use strict';

/**
 * DocumentPipelineService — intake document review pipeline
 * --------------------------------------------------------
 * Discrete, independently-runnable steps:
 *   1. normalize(file)                     -> DocumentNormalizer (separate module)
 *   2. reviewControl(text, control)        -> one structured finding (pure, testable)
 *      reviewDocument(text, controls)      -> findings for every mapped control
 *   3. processUpload(orgId, uploadId)      -> fan-out: write one control_assessment
 *                                             row per control in the document_type's map
 *      rereview(orgId, uploadId)           -> re-run step 2/3 from stored normalized_text
 *                                             (no re-upload needed)
 *
 * Review uses the Anthropic SDK with STRUCTURED JSON output when ANTHROPIC_API_KEY
 * is set; otherwise a deterministic keyword-coverage heuristic runs (so the
 * pipeline and its tests work offline / in CI).
 */

const db = require('../utils/db');
const logger = require('../utils/logger');

const STATUSES = ['met', 'partially met', 'not met'];
const STOP = new Set(('the a an and or of to for in on with that this which are is be as at by from your our their organization shall must should ensure maintain establish defined documented policy policies procedure procedures process processes control controls per within across using based information system systems data').split(/\s+/));

function keywords(text) {
  return [...new Set(String(text || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP.has(w)))];
}
function bestExcerpt(text, kws) {
  const lines = String(text || '').split(/(?<=[.!?])\s+|\n+/).map((l) => l.trim()).filter((l) => l.length > 8);
  let best = null, bestHits = 0;
  for (const ln of lines) {
    const l = ln.toLowerCase();
    const hits = kws.reduce((n, k) => n + (l.includes(k) ? 1 : 0), 0);
    if (hits > bestHits) { bestHits = hits; best = ln; }
  }
  return best ? best.slice(0, 280) : String(text || '').trim().slice(0, 200);
}

// ---- step 2: review one control (pure; no DB) ------------------------------
function heuristicReview(text, control) {
  const req = control.expected_requirement || control.requirement_text || control.title || '';
  const kws = keywords(req);
  const hay = String(text || '').toLowerCase();
  const hits = kws.filter((k) => hay.includes(k));
  const ratio = kws.length ? hits.length / kws.length : 0;
  const status = !text.trim() ? 'not met' : ratio >= 0.5 ? 'met' : ratio >= 0.2 ? 'partially met' : 'not met';
  return {
    status,
    evidence_excerpt: hits.length ? bestExcerpt(text, hits) : '',
    rationale: `Keyword coverage ${Math.round(ratio * 100)}% (${hits.length}/${kws.length} requirement terms found${hits.length ? `: ${hits.slice(0, 6).join(', ')}` : ''}).`,
    engine: 'heuristic',
  };
}

async function llmReview(text, control) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const req = control.expected_requirement || control.requirement_text || control.title || '';
  const prompt = `You are a GRC assessor. Decide whether the DOCUMENT satisfies the CONTROL REQUIREMENT.
Return ONLY JSON: {"status":"met|partially met|not met","evidence_excerpt":"<verbatim quote from the document, or empty>","rationale":"<one sentence>"}.

CONTROL (${control.framework_id} ${control.requirement_id}): ${req}

DOCUMENT (may be truncated):
"""${String(text || '').slice(0, 12000)}"""`;
  const resp = await client.messages.create({
    model: process.env.ANTHROPIC_REVIEW_MODEL || 'claude-haiku-4-5-20251001',
    max_tokens: 400, temperature: 0,
    messages: [{ role: 'user', content: prompt }],
  });
  const raw = (resp.content || []).map((c) => c.text || '').join('');
  const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
  const status = STATUSES.includes(json.status) ? json.status : 'partially met';
  return { status, evidence_excerpt: String(json.evidence_excerpt || '').slice(0, 400), rationale: String(json.rationale || '').slice(0, 400), engine: 'llm' };
}

async function reviewControl(text, control) {
  if (process.env.ANTHROPIC_API_KEY) {
    try { return await llmReview(text, control); }
    catch (e) { logger.debug('llm review fell back to heuristic', { error: e.message }); }
  }
  return heuristicReview(text, control);
}

async function reviewDocument(text, controls) {
  const out = [];
  for (const c of controls) out.push({ control: c, finding: await reviewControl(text, c) });
  return out;
}

// ---- step 3: fan-out to control_assessment (DB) ----------------------------
async function mappedControls(documentTypeId) {
  return db.query(`
    SELECT m.framework_id, m.requirement_id, m.expected_requirement,
           r.title, r.text AS requirement_text, r.family AS domain
    FROM document_control_map m
    JOIN framework_requirements r ON r.framework_id=m.framework_id AND r.requirement_id=m.requirement_id
    WHERE m.document_type_id=$1`, [documentTypeId]);
}

async function fanOut(orgId, upload, findings) {
  // one control_assessment row per mapped control (replace prior rows for this upload)
  await db.query(`DELETE FROM control_assessment WHERE org_id=$1 AND document_upload_id=$2`, [orgId, upload.id]);
  for (const { control, finding } of findings) {
    await db.query(`
      INSERT INTO control_assessment
        (org_id, document_upload_id, framework_id, requirement_id, status, finding, evidence_excerpt, reviewed_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      [orgId, upload.id, control.framework_id, control.requirement_id, finding.status,
        finding.rationale, finding.evidence_excerpt]);
  }
  return findings.length;
}

async function loadUpload(orgId, uploadId) {
  const rows = await db.query(`SELECT * FROM document_upload WHERE id=$1 AND org_id=$2`, [uploadId, orgId]);
  return rows[0] || null;
}

// Run step 2 + 3 from the stored normalized_text (re-runnable without re-upload).
async function processUpload(orgId, uploadId) {
  const upload = await loadUpload(orgId, uploadId);
  if (!upload) throw new Error('upload not found');
  const controls = await mappedControls(upload.document_type_id);
  const findings = await reviewDocument(upload.normalized_text || '', controls);
  const n = await fanOut(orgId, upload, findings);
  await db.query(`UPDATE document_upload SET status='reviewed', error=NULL WHERE id=$1`, [uploadId]);
  return { uploadId, controlsAssessed: n, engine: findings[0] ? findings[0].finding.engine : 'none',
    summary: tally(findings) };
}
const rereview = processUpload;

function tally(findings) {
  const t = { 'met': 0, 'partially met': 0, 'not met': 0 };
  findings.forEach((f) => { t[f.finding.status] = (t[f.finding.status] || 0) + 1; });
  return t;
}

module.exports = { reviewControl, reviewDocument, processUpload, rereview, mappedControls, heuristicReview };
