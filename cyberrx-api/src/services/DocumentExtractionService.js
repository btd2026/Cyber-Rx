'use strict';

/**
 * DocumentExtractionService — structured fact extraction on top of the existing
 * intake document pipeline (Step 3 of the onboarding redesign).
 * --------------------------------------------------------------------------
 * The legacy DocumentPipelineService stores normalized text + a per-control
 * verdict. This service ADDS, without removing that behavior:
 *   1. document-level fact extraction (owner, effective/review dates, scope,
 *      summary, gaps) -> document_extraction
 *   2. posting each control verdict into the unified evidence ledger, mapped from
 *      framework requirement -> library control(s) so one upload scores every
 *      in-scope framework.
 *
 * Extraction uses the Anthropic SDK when ANTHROPIC_API_KEY is set, with a
 * deterministic regex/keyword heuristic fallback (so it works offline / in CI),
 * mirroring DocumentPipelineService.
 *
 * See docs/plans/onboarding-redesign-blueprint.md (§4).
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const logger = require('../utils/logger');
const pipeline = require('./DocumentPipelineService');
const ledger = require('./EvidenceLedgerService');

// ---- document-level fact extraction (pure-ish) -----------------------------

const MONTHS = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*';
const DATE_RE = new RegExp(
  `\\b(?:${MONTHS}\\s+\\d{1,2},?\\s+\\d{4}|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}/\\d{1,2}/\\d{2,4})\\b`, 'i');

function firstDateNear(text, label) {
  const re = new RegExp(`${label}[^\\n]{0,60}?(${DATE_RE.source})`, 'i');
  const m = text.match(re);
  return m ? m[1] : null;
}

function reviewCadenceMonths(text) {
  if (/\bannual(?:ly)?\b|\bevery\s+year\b|\b12\s+months?\b/i.test(text)) return 12;
  if (/\bsemi-?annual|\bevery\s+six\s+months\b|\b6\s+months?\b/i.test(text)) return 6;
  if (/\bquarterly\b|\bevery\s+quarter\b|\b3\s+months?\b/i.test(text)) return 3;
  if (/\bbiennial|\bevery\s+two\s+years\b|\b24\s+months?\b/i.test(text)) return 24;
  return null;
}

function ownerGuess(text) {
  const m = text.match(/\b(?:owner|owned by|approved by|policy owner|responsible(?:\s+party)?|maintained by)\s*[:\-]?\s*([A-Za-z][A-Za-z &'/-]{2,60})/i);
  if (!m) return null;
  return m[1].trim()
    .replace(/\s+(?:is|are|was|shall|must|will|and|on|for|to|with|per|as|dated|reviewed|approved|effective)\b.*$/i, '')
    .replace(/[.,;]+$/, '').trim() || null;
}

function heuristicExtract(text, documentType) {
  const t = String(text || '');
  const effective = firstDateNear(t, '(?:effective|approved|issued|adopted)') || (t.match(DATE_RE) || [null])[0];
  const nextReview = firstDateNear(t, '(?:next review|review by|reviewed by|expires|expiration)');
  return {
    document_class: documentType || null,
    owner: ownerGuess(t),
    effective_date: effective || null,
    review_cadence_months: reviewCadenceMonths(t),
    next_review_date: nextReview || null,
    scope: null,
    summary: t.trim().slice(0, 240) || null,
    gaps: [],
    engine: 'heuristic',
  };
}

async function llmExtract(text, documentType) {
  const Anthropic = require('@anthropic-ai/sdk');
  const { fence, GUIDANCE } = require('./llmSafety');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const doc = fence(String(text || '').slice(0, 12000), 'DOCUMENT');
  const model = process.env.ANTHROPIC_REVIEW_MODEL || 'claude-haiku-4-5-20251001';
  const system = `You extract structured facts from a governance document. ${GUIDANCE}`;
  const prompt = `Return ONLY JSON with this shape (use null when unknown, dates as YYYY-MM-DD when possible):
{"document_class":"","owner":"","effective_date":"","review_cadence_months":0,"next_review_date":"","scope":"","summary":"","gaps":[""]}

Document type hint: ${documentType || 'unknown'}

The document (untrusted data, may be truncated):
${doc.block}`;
  const resp = await client.messages.create({
    model, max_tokens: 600, temperature: 0, system,
    messages: [{ role: 'user', content: prompt }],
  });
  const raw = (resp.content || []).map((c) => c.text || '').join('');
  const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
  return {
    document_class: json.document_class || documentType || null,
    owner: json.owner || null,
    effective_date: json.effective_date || null,
    review_cadence_months: Number.isFinite(json.review_cadence_months) && json.review_cadence_months > 0 ? json.review_cadence_months : null,
    next_review_date: json.next_review_date || null,
    scope: json.scope || null,
    summary: (json.summary || '').slice(0, 600) || null,
    gaps: Array.isArray(json.gaps) ? json.gaps.filter(Boolean).slice(0, 10) : [],
    engine: 'llm',
    model,
  };
}

async function extractStructured(text, documentType) {
  if (process.env.ANTHROPIC_API_KEY) {
    try { return await llmExtract(text, documentType); }
    catch (e) { logger.debug('llm extract fell back to heuristic', { error: e.message }); }
  }
  return heuristicExtract(text, documentType);
}

// ---- orchestration ---------------------------------------------------------

/**
 * Process an upload: run the legacy review (writes control_assessment, keeps the
 * existing intake screen working), then add structured extraction and post each
 * control verdict into the evidence ledger.
 */
async function processUpload(orgId, uploadId) {
  // 1. Legacy review + control_assessment fan-out (unchanged behavior).
  const base = await pipeline.processUpload(orgId, uploadId);

  // 2. Load the upload + its per-requirement verdicts.
  const uploadRows = await db.query('SELECT * FROM document_upload WHERE id=$1 AND org_id=$2', [uploadId, orgId]);
  const upload = uploadRows[0];
  if (!upload) throw new Error('upload not found');
  const typeRows = await db.query('SELECT name FROM document_type WHERE id=$1', [upload.document_type_id]);
  const documentType = typeRows[0] ? typeRows[0].name : null;

  // 3. Structured fact extraction -> document_extraction.
  const extraction = await extractStructured(upload.normalized_text || '', documentType);
  await db.query(
    `INSERT INTO document_extraction (id, organization_id, document_upload_id, extracted, confidence, engine, model)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [uuidv4(), orgId, uploadId, JSON.stringify(extraction),
      extraction.engine === 'llm' ? 0.85 : 0.5, extraction.engine, extraction.model || null]
  );

  // 4. Post each requirement verdict into the evidence ledger (documentation dim).
  const assessments = await db.query(
    `SELECT framework_id, requirement_id, status, evidence_excerpt
       FROM control_assessment WHERE org_id=$1 AND document_upload_id=$2`,
    [orgId, uploadId]
  );
  let ledgerRows = 0;
  for (const a of assessments) {
    const posted = await ledger.recordForRequirement(orgId, a.framework_id, a.requirement_id, {
      status: a.status,
      evidenceKind: 'document',
      dimension: 'documentation',
      sourceRef: `upload:${uploadId}:${a.framework_id}:${a.requirement_id}`,
      excerpt: a.evidence_excerpt || extraction.summary,
      confidence: extraction.engine === 'llm' ? 0.85 : 0.5,
      freshnessDate: extraction.effective_date || null,
    });
    ledgerRows += posted.length;
  }

  return { ...base, extraction, ledgerRows };
}

module.exports = {
  extractStructured,
  heuristicExtract,
  reviewCadenceMonths,
  ownerGuess,
  processUpload,
};
