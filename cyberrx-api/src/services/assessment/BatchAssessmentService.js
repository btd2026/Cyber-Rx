'use strict';

/**
 * BatchAssessmentService — Stage 5. Runs the spine sweep through the Message
 * Batches API (async, ~50% off), with model routing, asymmetric verification of
 * positive verdicts, and per-stage cost telemetry.
 *
 * Flow:
 *   1. Pre-filter every determination statement (no LLM). Below threshold ->
 *      'Not addressed' immediately.
 *   2. Batch the survivors as grounded judge requests, each routed to a model by
 *      difficulty (obvious -> cheap, normal -> mid).
 *   3. Parse + guardrail-validate each result; escalate low-confidence/ambiguous
 *      verdicts to the flagship model (individual calls).
 *   4. Asymmetrically verify positive verdicts; downgrade unconfirmed ones.
 *   5. Accumulate token usage + estimated cost by stage.
 *
 * Batch caching + the cached judge prefix stack. All deps (embed, search, the
 * batch client, the anthropic client, sleep) are injectable for testing.
 */

const logger = require('../../utils/logger');
const ragCfg = require('../../config/ragConfig');
const GA = require('./GroundedAssessmentService');
const Router = require('./ModelRouter');
const Verification = require('./VerificationService');
const { CostMeter } = require('./CostMeter');
const Embeddings = require('../rag/EmbeddingService');
const VectorStore = require('../rag/VectorStore');

const textOf = (m) => ((m && m.content) || []).filter((b) => b.type === 'text').map((b) => b.text).join('');

// Drive a Message Batch to completion and return { custom_id -> message }.
async function runBatch(batchClient, requests, { sleep, maxPolls = 240, pollMs = 250 } = {}) {
  if (!requests.length) return {};
  const created = await batchClient.create({ requests });
  const id = created.id;
  let status = created.processing_status;
  const wait = sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  for (let i = 0; status !== 'ended' && i < maxPolls; i += 1) {
    await wait(pollMs);
    status = (await batchClient.retrieve(id)).processing_status;
  }
  if (status !== 'ended') throw new Error(`batch ${id} did not complete in time`);
  const out = {};
  const results = await batchClient.results(id);
  for await (const r of results) {
    if (r && r.result && r.result.type === 'succeeded') out[r.custom_id] = r.result.message;
  }
  return out;
}

// Validate a model message into a §4 record, or null if it fails the guardrail.
function recordFromMessage(obj, control, evidenceChunks, message, method) {
  try {
    const verdict = GA.parseVerdict(textOf(message));
    const checked = GA.validateVerdict(verdict, evidenceChunks);
    if (!checked.valid) return null;
    return GA.record(obj, control, {
      status: checked.status, confidence: verdict.confidence, evidence: checked.evidence,
      gap_description: checked.status === 'Fully addressed' ? '' : (verdict.gap_description || ''),
      remediation_suggestion: verdict.remediation_suggestion || '', assessment_method: method,
    });
  } catch (_) { return null; }
}

const forcedNotAddressed = (obj, control, reason) => GA.record(obj, control, {
  status: 'Not addressed', confidence: null, evidence: [],
  gap_description: reason, remediation_suggestion: `Document how the organization satisfies: ${obj.determination_statement}`,
  assessment_method: 'llm',
});

function objectivesOf(control) {
  return (control.assessment_objectives && control.assessment_objectives.length)
    ? control.assessment_objectives
    : [{ objective_id: control.control_id, determination_statement: control.requirement_text || control.title }];
}

/**
 * Assess the spine for one document.
 * @param {string} orgId @param {string} uploadId
 * @param {Array} controls  §4 corpus records (spine)
 * @param {object} deps  { embed, search, batchClient, anthropic, sleep }
 * @returns {Promise<{records, usage}>}
 */
async function runSpine(orgId, uploadId, controls, deps = {}) {
  const embed = deps.embed || ((t) => Embeddings.embedQuery(t));
  const search = deps.search || ((vec) => VectorStore.search(orgId, vec, ragCfg.topK, { uploadId }));
  const anthropic = deps.anthropic || null;
  const batchClient = deps.batchClient || (anthropic && anthropic.messages && anthropic.messages.batches) || null;
  const meter = new CostMeter();

  // 1. Pre-filter (no LLM).
  const records = []; const toJudge = [];
  for (const control of controls) {
    for (const obj of objectivesOf(control)) {
      let hits = [];
      try { hits = (await search(await embed(obj.determination_statement))) || []; }
      catch (e) { logger.warn(`prefilter failed (${obj.objective_id}): ${e.message}`); }
      const best = hits.length ? Number(hits[0].similarity) : 0;
      if (!hits.length || best < ragCfg.simThreshold) {
        records.push(GA.record(obj, control, {
          status: 'Not addressed', confidence: hits.length ? 1 - best : 1, evidence: [],
          gap_description: 'No supporting policy text retrieved above the similarity threshold.',
          remediation_suggestion: `Document how the organization satisfies: ${obj.determination_statement}`,
          assessment_method: 'embedding_prefilter',
        }));
      } else {
        toJudge.push({ key: `${control.control_id}::${obj.objective_id}`, control, obj, ev: hits.slice(0, ragCfg.topK), model: Router.pickInitialModel({ topSim: best }) });
      }
    }
  }

  // 2. Batch the survivors (routed per item).
  let results = {};
  if (toJudge.length && batchClient) {
    const requests = toJudge.map((j) => ({ custom_id: j.key, params: GA.buildJudgeRequest(j.obj, j.ev, { model: j.model }) }));
    try { results = await runBatch(batchClient, requests, deps); }
    catch (e) { logger.warn(`batch sweep failed: ${e.message}`); }
  }

  // 3. Validate + escalate + 4. verify, per survivor.
  for (const j of toJudge) {
    const msg = results[j.key];
    if (msg && msg.usage) meter.record('judge', j.model, msg.usage, { batch: true });
    let rec = msg ? recordFromMessage(j.obj, j.control, j.ev, msg, 'llm') : null;
    if (!rec) rec = forcedNotAddressed(j.obj, j.control, batchClient ? 'A positive verdict could not be grounded in quoted evidence; treated as not addressed.' : 'No model available to adjudicate; manual review required.');

    // Escalate low-confidence / ambiguous to the flagship model (individual call).
    if (anthropic && Router.needsEscalation(rec)) {
      try {
        const m = Router.escalationModel();
        const esc = await anthropic.messages.create(GA.buildJudgeRequest(j.obj, j.ev, { model: m }));
        if (esc && esc.usage) meter.record('escalate', m, esc.usage);
        const r2 = recordFromMessage(j.obj, j.control, j.ev, esc, 'llm');
        if (r2) rec = r2;
      } catch (e) { logger.warn(`escalation failed (${j.key}): ${e.message}`); }
    }

    // Asymmetric verification of positives.
    if (anthropic && Verification.POSITIVE.has(rec.status)) {
      const { record: vr, usage } = await Verification.verifyPositive(rec, j.obj, { anthropic });
      if (usage) meter.record('verify', Router.escalationModel(), usage);
      rec = vr;
    }
    records.push(rec);
  }

  return { records, usage: meter.toScanUsage() };
}

module.exports = { runSpine, runBatch, recordFromMessage, objectivesOf };
