'use strict';

/**
 * CrosswalkPropagationService — Stage 6. The 800-53 spine is assessed once; its
 * evidence-backed control verdicts propagate to mapped NIST CSF 2.0 controls via
 * the crosswalk. We NEVER run an independent framework pass.
 *
 *   - FULL (equivalent) mapping: propagate the spine verdict directly — no LLM.
 *   - PARTIAL / provisional mapping: re-invoke the model on the CSF outcome using
 *     ONLY the spine evidence already quoted (the §1 guardrail still applies). If
 *     no model is available, the CSF control is left unverified (routed to the
 *     analyst queue) — we never infer compliance from a partial mapping.
 *
 * A CSF control mapped from several spine controls is reconciled: a full,
 * evidence-backed mapping wins; otherwise the partial sources' evidence is
 * combined for the single re-judgment.
 */

const logger = require('../../utils/logger');
const models = require('../../config/assessmentModels');
const GA = require('./GroundedAssessmentService');
const { dedupeEvidence } = require('./RollupService');

const STRENGTH = { 'Fully addressed': 3, 'Partially addressed': 2, 'Not applicable': 1, 'Not addressed': 0 };
const POSITIVE = new Set(['Fully addressed', 'Partially addressed']);
const TARGET = 'NIST_CSF_2.0';
const textOf = (m) => ((m && m.content) || []).filter((b) => b.type === 'text').map((b) => b.text).join('');

function csfRecord(csfId, meta, fields) {
  const nature = meta.control_nature || 'hybrid';
  return {
    control_id: csfId,
    framework: TARGET,
    framework_version: meta.framework_version || '2.0',
    status: fields.status,
    control_nature: nature,
    confidence: fields.confidence == null ? null : fields.confidence,
    evidence: fields.evidence || [],
    gap_description: fields.gap_description || '',
    remediation_suggestion: fields.remediation_suggestion || '',
    operating_effectiveness_note: 'Design/documentation coverage only — operating-effectiveness evidence still required to prove the control runs.',
    operating_effectiveness_evidence_type: GA.OE_TYPE[nature] || 'either',
    assessment_method: 'propagated',
    propagated_from: fields.propagated_from || null,
    needs_review: !!fields.needs_review,
  };
}

const strongest = (verdicts) => verdicts.reduce((a, b) => (STRENGTH[b.status] > STRENGTH[a.status] ? b : a));

async function reJudgePartial(csfId, meta, excerpts, fromIds, anthropic) {
  const obj = { objective_id: csfId, determination_statement: meta.requirement_text || meta.title || csfId };
  if (!anthropic) {
    return csfRecord(csfId, meta, {
      status: 'Not addressed', evidence: [], propagated_from: fromIds.join(','), needs_review: true,
      gap_description: 'Partial crosswalk mapping requires model re-verification; routed to analyst review.',
    });
  }
  try {
    const resp = await anthropic.messages.create(GA.buildJudgeRequest(obj, excerpts, { model: models.judgeModel }));
    const verdict = GA.parseVerdict(textOf(resp));
    const checked = GA.validateVerdict(verdict, excerpts);
    if (checked.valid) {
      return csfRecord(csfId, meta, {
        status: checked.status, evidence: checked.evidence, confidence: verdict.confidence,
        gap_description: checked.status === 'Fully addressed' ? '' : (verdict.gap_description || ''),
        remediation_suggestion: verdict.remediation_suggestion || '', propagated_from: fromIds.join(','),
      });
    }
  } catch (e) { logger.warn(`partial re-judge failed (${csfId}): ${e.message}`); }
  return csfRecord(csfId, meta, {
    status: 'Not addressed', evidence: [], propagated_from: fromIds.join(','),
    gap_description: 'Partial mapping could not be grounded on re-verification; treated as not addressed.',
  });
}

/**
 * @param {Object<string,verdict>} controlVerdicts  spine control verdicts (RollupService.rollup output)
 * @param {object} deps { spineCorpus, csfCorpus, anthropic }
 *   spineCorpus: control_id -> { crosswalk }      csfCorpus: csfId -> { control_nature, framework_version, requirement_text, title }
 * @returns {Promise<Array>} CSF §4 records
 */
async function propagate(controlVerdicts, { spineCorpus = {}, csfCorpus = {}, anthropic = null } = {}) {
  // Gather mapping sources per CSF control.
  const sources = {};
  for (const v of Object.values(controlVerdicts)) {
    const maps = ((spineCorpus[v.control_id] || {}).crosswalk || {})[TARGET] || [];
    for (const m of maps) (sources[m.control_id] = sources[m.control_id] || []).push({ mapping: m.mapping, verdict: v });
  }

  const records = [];
  for (const [csfId, srcs] of Object.entries(sources)) {
    const meta = csfCorpus[csfId] || {};
    const fullBacked = srcs.filter((s) => s.mapping === 'full' && (s.verdict.evidence || []).length);
    if (fullBacked.length) {
      const best = strongest(fullBacked.map((s) => s.verdict));
      records.push(csfRecord(csfId, meta, {
        status: best.status, evidence: best.evidence, confidence: best.confidence,
        propagated_from: best.control_id,
        gap_description: best.status === 'Fully addressed' ? '' : `Propagated from ${best.control_id} (equivalent mapping).`,
      }));
      continue;
    }
    // Only partial/provisional mappings exist for this CSF control.
    const partialPos = srcs.filter((s) => POSITIVE.has(s.verdict.status) && (s.verdict.evidence || []).length);
    if (!partialPos.length) {
      records.push(csfRecord(csfId, meta, {
        status: 'Not addressed', evidence: [], propagated_from: srcs.map((s) => s.verdict.control_id).join(','),
        gap_description: 'No evidence-backed spine control maps to this outcome.',
      }));
      continue;
    }
    const excerpts = dedupeEvidence(partialPos.flatMap((s) => s.verdict.evidence)).map((e) => ({ section_ref: e.section_ref, text: e.quote }));
    records.push(await reJudgePartial(csfId, meta, excerpts, partialPos.map((s) => s.verdict.control_id), anthropic));
  }
  return records;
}

module.exports = { propagate, csfRecord, strongest, TARGET };
