'use strict';

/**
 * VerificationService — asymmetric self-consistency check (§2 step 7).
 * A false "compliant" is the dangerous error, so we spend tokens verifying ONLY
 * positive verdicts (Fully/Partially addressed). An independent, skeptical pass
 * re-reads the quoted evidence against the determination statement; if it cannot
 * confirm support, the verdict is downgraded (never upgraded here).
 *
 * Returns { record, usage|null, verified } — usage is the Anthropic usage object
 * when a model call was made (for cost telemetry), else null.
 */

const logger = require('../../utils/logger');
const models = require('../../config/assessmentModels');

const POSITIVE = new Set(['Fully addressed', 'Partially addressed']);

const VERIFY_SYSTEM =
  'You are an independent compliance verifier. You are SKEPTICAL: confirm a positive verdict only if the quoted ' +
  'evidence, on its own, genuinely satisfies the determination statement as written documentation. If the quote is ' +
  'tangential, partial, or does not actually establish the requirement, do NOT confirm. Default to not-supported when unsure.';

function buildVerifyRequest(record, objective, model) {
  const ev = (record.evidence || []).map((e, i) => `[${i + 1} | ${e.section_ref}] "${e.quote}"`).join('\n');
  return {
    model: model || models.escalateModel,
    max_tokens: 400,
    system: [{ type: 'text', text: VERIFY_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{
      role: 'user',
      content:
        `DETERMINATION STATEMENT:\n${objective.determination_statement}\n\n` +
        `CLAIMED STATUS: ${record.status}\n\nQUOTED EVIDENCE:\n${ev}\n\n` +
        'Return ONLY JSON: {"supported":true|false,"corrected_status":"Fully addressed|Partially addressed|Not addressed","reason":"<short>"}',
    }],
  };
}

function parse(text) {
  const s = String(text || ''); const a = s.indexOf('{'); const b = s.lastIndexOf('}');
  if (a < 0 || b < 0) throw new Error('no JSON in verifier output');
  return JSON.parse(s.slice(a, b + 1));
}
const textOf = (r) => ((r && r.content) || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
const normStatus = (s) => {
  const x = String(s || '').toLowerCase();
  if (x.startsWith('fully')) return 'Fully addressed';
  if (x.startsWith('partial')) return 'Partially addressed';
  return 'Not addressed';
};

/**
 * @param {object} record   a §4 assessment record (already guardrail-validated)
 * @param {object} objective { determination_statement }
 * @param {{anthropic, model}} deps
 */
async function verifyPositive(record, objective, deps = {}) {
  if (!models.verifyEnabled || !POSITIVE.has(record.status)) return { record, usage: null, verified: false };
  const anthropic = deps.anthropic;
  if (!anthropic) return { record, usage: null, verified: false };
  try {
    const resp = await anthropic.messages.create(buildVerifyRequest(record, objective, deps.model));
    const v = parse(textOf(resp));
    if (!v.supported) {
      const corrected = normStatus(v.corrected_status);
      const downgraded = {
        ...record,
        status: corrected,
        evidence: corrected === 'Not addressed' ? [] : record.evidence,
        gap_description: `${record.gap_description ? record.gap_description + ' ' : ''}[verification] ${v.reason || 'evidence did not confirm the claim'}`.trim(),
        verification: { supported: false, reason: v.reason || null },
      };
      return { record: downgraded, usage: resp.usage || null, verified: true };
    }
    return { record: { ...record, verification: { supported: true } }, usage: resp.usage || null, verified: true };
  } catch (e) {
    logger.warn(`verification failed (${record.control_id}): ${e.message}`);
    return { record, usage: null, verified: false };
  }
}

module.exports = { verifyPositive, buildVerifyRequest, POSITIVE };
