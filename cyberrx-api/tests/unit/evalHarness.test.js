'use strict';

/** Stage 9 eval harness — scorer correctness + a baseline run over ~100 cases. */

const { buildDataset, CORE } = require('../eval/dataset');
const { evaluate, referenceJudge, groundedJudge } = require('../../src/eval/EvalHarness');
const { score } = require('../../src/eval/scorer');

describe('scorer', () => {
  test('computes accuracy, per-class F1, and the heavy false-addressed penalty', () => {
    const rows = [
      { id: 1, gold: 'Fully addressed', pred: 'Fully addressed' },
      { id: 2, gold: 'Not addressed', pred: 'Fully addressed' }, // FALSE ADDRESSED
      { id: 3, gold: 'Not addressed', pred: 'Not addressed' },
      { id: 4, gold: 'Partially addressed', pred: 'Not addressed' }, // ordinary miss
    ];
    const s = score(rows, { falseAddressedPenalty: 5 });
    expect(s.n).toBe(4);
    expect(s.accuracy).toBe(0.5);
    expect(s.false_addressed).toBe(1);
    expect(s.false_addressed_cases).toEqual([2]);
    expect(s.risk_adjusted_score).toBe(-0.5); // (2 - 4*1)/4
    expect(s.addressed.fp).toBe(1);
  });
});

describe('dataset', () => {
  test('builds ~100 labeled cases across all verdict classes', () => {
    const ds = buildDataset(100);
    expect(ds.length).toBe(100);
    expect(new Set(ds.map((c) => c.gold))).toEqual(new Set(['Fully addressed', 'Partially addressed', 'Not addressed', 'Not applicable']));
    ds.forEach((c) => { expect(c.determination_statement).toBeTruthy(); expect(c.excerpts.length).toBeGreaterThan(0); });
  });
});

describe('harness — reference baseline', () => {
  test('runs over the dataset; guardrail keeps false-addressed bounded', async () => {
    const { report } = await evaluate(buildDataset(100), { judge: referenceJudge });
    expect(report.n).toBe(100);
    expect(report.addressed_precision).not.toBeNull();
    expect(report.false_addressed_rate).toBeLessThan(0.15);
  });

  test('the guardrail coerces an ungrounded positive judge output to Not addressed', async () => {
    const liar = async () => ({ status: 'Fully addressed', evidence: [{ quote: 'text not in the excerpt', section_ref: '§9' }] });
    const cases = [{ id: 'X', gold: 'Not addressed', determination_statement: 'mfa required', excerpts: [{ section_ref: '§1', text: 'unrelated content' }] }];
    const { rows } = await evaluate(cases, { judge: liar });
    expect(rows[0].pred).toBe('Not addressed');
  });
});

describe('groundedJudge adapter', () => {
  test('drives the real assessor and returns its status (mocked model)', async () => {
    const anthropic = { messages: { create: async () => ({ content: [{ type: 'text', text: JSON.stringify({ status: 'Fully addressed', confidence: 0.9, evidence: [{ quote: 'All remote access to corporate systems requires multi-factor authentication.', section_ref: '§1' }] }) }] }) } };
    const judge = groundedJudge({ anthropic });
    const c = CORE.find((x) => x.topic === 'mfa' && x.gold === 'Fully addressed');
    const v = await judge(c.determination_statement, c.excerpts);
    expect(v.status).toBe('Fully addressed');
  });
});
