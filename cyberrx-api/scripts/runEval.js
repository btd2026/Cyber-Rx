'use strict';

/**
 * Run the assessment eval and print scores. Re-run after any prompt/routing
 * change to catch regressions (especially false "addressed").
 *
 *   node scripts/runEval.js                 # deterministic reference baseline
 *   ANTHROPIC_API_KEY=... EVAL_LIVE=1 node scripts/runEval.js   # real grounded engine
 */

const { buildDataset } = require('../tests/eval/dataset');
const { evaluate, referenceJudge, groundedJudge, formatReport } = require('../src/eval/EvalHarness');

(async () => {
  const cases = buildDataset(100);
  let judge = referenceJudge; let label = 'reference (lexical baseline)';
  if (process.env.EVAL_LIVE === '1' && process.env.ANTHROPIC_API_KEY) {
    const A = require('@anthropic-ai/sdk'); const Anthropic = A.default || A;
    judge = groundedJudge({ anthropic: new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) });
    label = 'grounded engine (live model)';
  }
  const { report } = await evaluate(cases, { judge });
  console.log(`\n=== Assessment eval — judge: ${label} ===`);
  console.log(formatReport(report));
  console.log(`\nfalse-addressed cases: ${report.false_addressed_cases.join(', ') || '(none)'}`);
  process.exit(0);
})();
