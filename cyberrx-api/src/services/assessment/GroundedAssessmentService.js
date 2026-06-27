'use strict';

/**
 * GroundedAssessmentService — Stage 4. The retrieval-grounded, control-by-control
 * spine assessment (§2 steps 3–4, §1 guardrail).
 *
 * For each 800-53A determination statement (the grounding unit):
 *   1. PRE-FILTER (no LLM): embed the determination statement, retrieve the
 *      top-k most similar document chunks. If the best similarity is below
 *      RETRIEVAL_SIM_THRESHOLD → status "Not addressed" with ZERO LLM cost.
 *   2. GROUNDED JUDGMENT: otherwise send ONLY the retrieved evidence + the
 *      determination statement after a cached, stable prefix (system + rubric +
 *      schema). The model returns a structured verdict.
 *
 * GUARDRAIL (never relaxed): a positive verdict (Fully/Partially addressed) MUST
 * quote exact policy text that actually appears in the retrieved evidence, with a
 * section_ref. A positive verdict with empty/ungrounded evidence is rejected and
 * re-routed; if it still fails, it is forced to "Not addressed" — we never infer
 * compliance. This engine assesses DESIGN/DOCUMENTATION coverage only and always
 * records what operating-effectiveness evidence is still required.
 *
 * All external dependencies (embed, search, the Anthropic client) are injectable
 * so the logic is fully unit-testable without a DB, vector store, or network.
 */

const logger = require('../../utils/logger');
const ragCfg = require('../../config/ragConfig');
const models = require('../../config/assessmentModels');
const Embeddings = require('../rag/EmbeddingService');
const VectorStore = require('../rag/VectorStore');

const STATUS = Object.freeze({
  FULL: 'Fully addressed', PARTIAL: 'Partially addressed', NOT: 'Not addressed', NA: 'Not applicable',
});
const POSITIVE = new Set([STATUS.FULL, STATUS.PARTIAL]);

// control_nature -> the kind of live evidence that would prove it actually runs.
const OE_TYPE = { automated_capable: 'system_signal', non_automated_procedural: 'attestation_record', hybrid: 'either' };

const SYSTEM_PROMPT =
  'You are a meticulous compliance assessor. You judge ONLY whether a control requirement is ADDRESSED IN WRITING ' +
  'by the provided policy excerpts — design/documentation coverage, never operating effectiveness. ' +
  'You never infer compliance: if the excerpts do not clearly address the requirement, the status is "Not addressed". ' +
  'Any positive verdict MUST quote exact text copied verbatim from the provided excerpts, each with its section reference.';

const RUBRIC_SCHEMA =
  'Decide one status for the determination statement:\n' +
  '- "Fully addressed": the excerpts clearly and completely satisfy the statement.\n' +
  '- "Partially addressed": the excerpts address part of the statement but leave a gap.\n' +
  '- "Not addressed": the excerpts do not address the statement (DEFAULT when unsure).\n' +
  '- "Not applicable": the statement cannot apply to this organization per the excerpts.\n' +
  'Return ONLY minified JSON: {"status":"...","confidence":0.0-1.0,' +
  '"evidence":[{"quote":"<verbatim text from an excerpt>","section_ref":"<the excerpt\'s section>"}],' +
  '"gap_description":"<what is missing; empty if Fully addressed>",' +
  '"remediation_suggestion":"<actionable, design-level>"}\n' +
  'For "Not addressed"/"Not applicable" use an empty evidence array. ' +
  'For "Fully addressed"/"Partially addressed" evidence MUST be non-empty and every quote MUST be copied verbatim from the excerpts.';

// Build the Anthropic request with a cached stable prefix; dynamic content last.
function buildJudgeRequest(objective, evidenceChunks, { model } = {}) {
  const excerpts = evidenceChunks.map((c, i) => `[E${i + 1} | ${c.section_ref}] ${c.text}`).join('\n\n');
  return {
    model: model || models.judgeModel,
    max_tokens: models.maxTokens,
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: RUBRIC_SCHEMA, cache_control: { type: 'ephemeral' } },
    ],
    messages: [{
      role: 'user',
      content:
        `DETERMINATION STATEMENT:\n${objective.determination_statement}\n\n` +
        `POLICY EXCERPTS (the ONLY evidence you may quote):\n${excerpts}\n\n` +
        'Return the JSON verdict now.',
    }],
  };
}

function parseVerdict(text) {
  const s = String(text || '');
  const a = s.indexOf('{'); const b = s.lastIndexOf('}');
  if (a < 0 || b < 0) throw new Error('no JSON object in model output');
  return JSON.parse(s.slice(a, b + 1));
}

const normWs = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
function normStatus(raw) {
  const s = normWs(raw);
  if (s.startsWith('fully')) return STATUS.FULL;
  if (s.startsWith('partial')) return STATUS.PARTIAL;
  if (s.startsWith('not applicable') || s === 'n/a') return STATUS.NA;
  return STATUS.NOT;
}

/**
 * Enforce the §1 guardrail. Returns { valid, status, evidence, reason }.
 * A positive verdict requires non-empty evidence whose every quote is a verbatim
 * substring of the retrieved excerpts (anti-hallucination grounding check).
 */
function validateVerdict(verdict, evidenceChunks) {
  const status = normStatus(verdict && verdict.status);
  const haystack = evidenceChunks.map((c) => normWs(c.text));
  if (!POSITIVE.has(status)) return { valid: true, status, evidence: [] };
  const ev = Array.isArray(verdict.evidence) ? verdict.evidence.filter((e) => e && e.quote && e.section_ref) : [];
  if (!ev.length) return { valid: false, status, evidence: [], reason: 'positive verdict with empty evidence' };
  const grounded = ev.filter((e) => { const q = normWs(e.quote); return q.length >= 8 && haystack.some((h) => h.includes(q)); });
  if (!grounded.length) return { valid: false, status, evidence: [], reason: 'no evidence quote is grounded in the retrieved excerpts' };
  return { valid: true, status, evidence: grounded };
}

function record(objective, control, fields) {
  return {
    control_id: objective.objective_id || control.control_id,
    framework: control.framework,
    framework_version: control.framework_version,
    status: fields.status,
    control_nature: control.control_nature,
    confidence: fields.confidence == null ? null : Math.max(0, Math.min(1, fields.confidence)),
    evidence: fields.evidence || [],
    gap_description: fields.gap_description || '',
    remediation_suggestion: fields.remediation_suggestion || '',
    operating_effectiveness_note: fields.operating_effectiveness_note
      || 'Design/documentation coverage only — operating-effectiveness evidence still required to prove the control runs.',
    operating_effectiveness_evidence_type: OE_TYPE[control.control_nature] || 'either',
    assessment_method: fields.assessment_method,
    propagated_from: null,
  };
}

// Lazy Anthropic client (injectable).
let _client;
function defaultClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (_client) return _client;
  try { const A = require('@anthropic-ai/sdk'); const Anthropic = A.default || A; _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }); return _client; }
  catch (e) { logger.warn(`Anthropic SDK unavailable: ${e.message}`); return null; }
}
const textOf = (resp) => ((resp && resp.content) || []).filter((b) => b.type === 'text').map((b) => b.text).join('');

/**
 * Assess ONE determination statement against the document.
 * deps: { embed, search, anthropic } — all optional (defaults wired).
 */
async function assessObjective(orgId, uploadId, control, objective, deps = {}) {
  const embed = deps.embed || ((t) => Embeddings.embedQuery(t));
  const search = deps.search || ((vec) => VectorStore.search(orgId, vec, ragCfg.topK, { uploadId }));
  const anthropic = deps.anthropic || defaultClient();

  // 1. Pre-filter (no LLM).
  let hits = [];
  try { const qv = await embed(objective.determination_statement); hits = (await search(qv)) || []; }
  catch (e) { logger.warn(`prefilter failed (${objective.objective_id}): ${e.message}`); }
  const best = hits.length ? Number(hits[0].similarity) : 0;
  if (!hits.length || best < ragCfg.simThreshold) {
    return record(objective, control, {
      status: STATUS.NOT, confidence: hits.length ? 1 - best : 1, evidence: [],
      gap_description: 'No supporting policy text retrieved above the similarity threshold.',
      remediation_suggestion: `Document how the organization satisfies: ${objective.determination_statement}`,
      assessment_method: 'embedding_prefilter',
    });
  }

  // 2. Grounded judgment (LLM). Re-route once on guardrail failure.
  if (!anthropic) {
    return record(objective, control, {
      status: STATUS.NOT, confidence: null, evidence: [],
      gap_description: 'Evidence retrieved but no model available to adjudicate; manual review required.',
      remediation_suggestion: 'Configure the assessment model or route to an analyst.',
      assessment_method: 'embedding_prefilter',
    });
  }
  const evidenceChunks = hits.slice(0, ragCfg.topK);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const resp = await anthropic.messages.create(buildJudgeRequest(objective, evidenceChunks, {}));
      const verdict = parseVerdict(textOf(resp));
      const checked = validateVerdict(verdict, evidenceChunks);
      if (checked.valid) {
        return record(objective, control, {
          status: checked.status, confidence: verdict.confidence,
          evidence: checked.evidence,
          gap_description: checked.status === STATUS.FULL ? '' : (verdict.gap_description || ''),
          remediation_suggestion: verdict.remediation_suggestion || '',
          assessment_method: 'llm',
        });
      }
      logger.warn(`guardrail rejected verdict (${objective.objective_id}, attempt ${attempt + 1}): ${checked.reason}`);
    } catch (e) {
      logger.warn(`judge call failed (${objective.objective_id}, attempt ${attempt + 1}): ${e.message}`);
    }
  }
  // Guardrail never satisfied → never infer compliance.
  return record(objective, control, {
    status: STATUS.NOT, confidence: null, evidence: [],
    gap_description: 'A positive verdict could not be grounded in quoted policy evidence; treated as not addressed.',
    remediation_suggestion: `Document how the organization satisfies: ${objective.determination_statement}`,
    assessment_method: 'llm',
  });
}

/** Assess every determination statement of one control. */
async function assessControl(orgId, uploadId, control, deps = {}) {
  const objectives = (control.assessment_objectives && control.assessment_objectives.length)
    ? control.assessment_objectives
    : [{ objective_id: control.control_id, determination_statement: control.requirement_text || control.title }];
  const records = [];
  for (const obj of objectives) records.push(await assessObjective(orgId, uploadId, control, obj, deps));
  return records;
}

module.exports = {
  STATUS, OE_TYPE,
  buildJudgeRequest, parseVerdict, normStatus, validateVerdict, record,
  assessObjective, assessControl,
  SYSTEM_PROMPT, RUBRIC_SCHEMA,
};
