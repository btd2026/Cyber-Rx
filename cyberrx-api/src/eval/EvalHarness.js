'use strict';

/**
 * EvalHarness (Stage 9) — runs a judge over the labeled dataset and scores it.
 * Re-runnable after any prompt/routing change to catch regressions, especially
 * increases in false "addressed" verdicts.
 *
 * The judge is pluggable:
 *   - referenceJudge: deterministic lexical baseline (no network) so the harness
 *     and scorer run anywhere and produce a baseline.
 *   - groundedJudge(deps): adapter that drives the REAL GroundedAssessmentService
 *     (pre-filter + cached-prefix LLM judgment) — used in CI/prod with keys.
 *
 * Every prediction passes through the real §1 guardrail (validateVerdict): an
 * ungrounded positive is coerced to "Not addressed", exactly as in the pipeline.
 */

const GA = require('./../services/assessment/GroundedAssessmentService');
const { score, formatReport } = require('./scorer');

const STOP = new Set(['a', 'an', 'the', 'is', 'are', 'be', 'of', 'for', 'to', 'and', 'or', 'in', 'on', 'with', 'within', 'all', 'after', 'defined', 'period', 'that', 'this', 'by', 'as', 'at']);
const toks = (s) => String(s || '').toLowerCase().match(/[a-z0-9]+/g) || [];
const content = (s) => toks(s).filter((t) => t.length > 2 && !STOP.has(t));

// Deterministic lexical baseline judge.
function referenceJudge(statement, excerpts) {
  const want = new Set(content(statement));
  if (!want.size) return { status: 'Not addressed', evidence: [] };
  let best = 0; let bestEx = null;
  for (const e of excerpts) {
    const have = new Set(content(e.text));
    let hit = 0; want.forEach((w) => { if (have.has(w)) hit += 1; });
    const cov = hit / want.size;
    if (cov > best) { best = cov; bestEx = e; }
  }
  if (best >= 0.85 && bestEx) return { status: 'Fully addressed', confidence: best, evidence: [{ quote: bestEx.text, section_ref: bestEx.section_ref }] };
  if (best >= 0.6 && bestEx) return { status: 'Partially addressed', confidence: best, evidence: [{ quote: bestEx.text, section_ref: bestEx.section_ref }] };
  return { status: 'Not addressed', evidence: [] };
}

/** Adapter: use the real grounded engine. deps.anthropic required for live runs. */
function groundedJudge(deps = {}) {
  return async (statement, excerpts) => {
    const control = { control_id: 'EVAL', framework: 'NIST_SP_800-53', framework_version: '5.2.0', control_nature: 'automated_capable' };
    const objective = { objective_id: 'EVAL', determination_statement: statement };
    const rec = await GA.assessObjective('eval', 'eval', control, objective, {
      embed: async () => [1], // retrieval is short-circuited: the case supplies the excerpts
      search: async () => excerpts.map((e, i) => ({ ...e, similarity: 0.9 - i * 0.01 })),
      anthropic: deps.anthropic,
    });
    return { status: rec.status, evidence: rec.evidence };
  };
}

async function evaluate(cases, { judge = referenceJudge, falseAddressedPenalty = 5 } = {}) {
  const rows = [];
  for (const c of cases) {
    let pred = 'Not addressed';
    try {
      const verdict = await judge(c.determination_statement, c.excerpts);
      const checked = GA.validateVerdict(verdict, c.excerpts); // real guardrail
      pred = checked.valid ? checked.status : 'Not addressed';
    } catch (_) { pred = 'Not addressed'; }
    rows.push({ id: c.id, gold: c.gold, pred, topic: c.topic });
  }
  return { rows, report: score(rows, { falseAddressedPenalty }) };
}

module.exports = { evaluate, referenceJudge, groundedJudge, formatReport };
