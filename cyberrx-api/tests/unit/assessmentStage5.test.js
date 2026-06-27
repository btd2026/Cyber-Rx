'use strict';

/**
 * Stage 5 unit tests: cost telemetry, model routing, asymmetric verification,
 * and the batch orchestrator (Message Batches API mocked end-to-end).
 */

const { CostMeter } = require('../../src/services/assessment/CostMeter');
const Router = require('../../src/services/assessment/ModelRouter');
const Verification = require('../../src/services/assessment/VerificationService');
const Batch = require('../../src/services/assessment/BatchAssessmentService');

const ORIG = { ...process.env };
afterEach(() => { process.env = { ...ORIG }; });

describe('CostMeter', () => {
  test('accumulates by stage, computes cost + cache-read ratio, applies batch discount', () => {
    const m = new CostMeter();
    m.record('judge', 'claude-sonnet-4-6', { input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 9000 }, { batch: true });
    m.record('verify', 'claude-opus-4-8', { input_tokens: 500, output_tokens: 100 });
    const u = m.toScanUsage();
    expect(u.calls).toBe(2);
    expect(u.input).toBe(1500);
    expect(u.cached_read).toBe(9000);
    expect(u.output).toBe(300);
    expect(u.by_stage.judge.calls).toBe(1);
    expect(u.by_stage.verify.est_cost_usd).toBeGreaterThan(0);
    // cache-read ratio = 9000 / (1500 + 9000)
    expect(u.cache_read_ratio).toBeCloseTo(9000 / 10500, 2);
    // batch halves sonnet input/output cost: judge cost < non-batch equivalent
    const m2 = new CostMeter(); m2.record('judge', 'claude-sonnet-4-6', { input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 9000 });
    expect(u.by_stage.judge.est_cost_usd).toBeLessThan(m2.toScanUsage().by_stage.judge.est_cost_usd);
  });
});

describe('ModelRouter', () => {
  test('routes obvious (high-similarity) items to the cheap model, others to mid', () => {
    expect(Router.pickInitialModel({ topSim: 0.9 })).toBe('claude-haiku-4-5-20251001');
    expect(Router.pickInitialModel({ topSim: 0.6 })).toBe('claude-sonnet-4-6');
  });
  test('escalates ambiguous (Partially) and low-confidence verdicts', () => {
    expect(Router.needsEscalation({ status: 'Partially addressed', confidence: 0.9 })).toBe(true);
    expect(Router.needsEscalation({ status: 'Fully addressed', confidence: 0.4 })).toBe(true);
    expect(Router.needsEscalation({ status: 'Fully addressed', confidence: 0.95 })).toBe(false);
    expect(Router.needsEscalation({ status: 'Not addressed', confidence: null })).toBe(false);
  });
});

describe('VerificationService (asymmetric)', () => {
  const rec = (status) => ({ control_id: 'AC-2', status, evidence: [{ quote: 'q', section_ref: '§1' }], gap_description: '' });
  const obj = { determination_statement: 'x' };
  const anthropicSays = (o) => ({ messages: { create: jest.fn(async () => ({ content: [{ type: 'text', text: JSON.stringify(o) }], usage: { input_tokens: 10, output_tokens: 5 } })) } });

  test('skips non-positive verdicts (no model call)', async () => {
    const a = anthropicSays({ supported: false });
    const r = await Verification.verifyPositive(rec('Not addressed'), obj, { anthropic: a });
    expect(r.verified).toBe(false);
    expect(a.messages.create).not.toHaveBeenCalled();
  });
  test('keeps a confirmed positive verdict', async () => {
    const a = anthropicSays({ supported: true });
    const r = await Verification.verifyPositive(rec('Fully addressed'), obj, { anthropic: a });
    expect(r.record.status).toBe('Fully addressed');
    expect(r.record.verification.supported).toBe(true);
  });
  test('downgrades an unconfirmed positive and clears evidence when -> Not addressed', async () => {
    const a = anthropicSays({ supported: false, corrected_status: 'Not addressed', reason: 'quote is tangential' });
    const r = await Verification.verifyPositive(rec('Fully addressed'), obj, { anthropic: a });
    expect(r.record.status).toBe('Not addressed');
    expect(r.record.evidence).toEqual([]);
    expect(r.record.gap_description).toMatch(/verification/);
  });
  test('honors ASSESSMENT_VERIFY=false', async () => {
    process.env.ASSESSMENT_VERIFY = 'false';
    const a = anthropicSays({ supported: false });
    const r = await Verification.verifyPositive(rec('Fully addressed'), obj, { anthropic: a });
    expect(r.verified).toBe(false);
    expect(a.messages.create).not.toHaveBeenCalled();
  });
});

describe('BatchAssessmentService.runSpine (Batches API mocked)', () => {
  const CONTROL = {
    control_id: 'AC-2', framework: 'NIST_SP_800-53', framework_version: '5.2.0', control_nature: 'automated_capable',
    assessment_objectives: [
      { objective_id: 'AC-02a', determination_statement: 'dormant accounts are disabled after a defined period' },
      { objective_id: 'AC-02b', determination_statement: 'a quantum teleportation log is maintained' }, // absent -> prefiltered
    ],
  };
  const CHUNK = { section_ref: '§2.2', text: 'Dormant accounts inactive for 45 days are automatically disabled.', similarity: 0.78 };
  const embed = async () => [0.1];
  // return a hit only for the first objective; nothing for the absurd one
  const search = (() => { let n = 0; return async () => (n++ === 0 ? [CHUNK] : []); })();

  // Mock the Batches API: create -> ended immediately -> results yields a grounded verdict.
  function mockBatchClient(verdictByCustomId) {
    return {
      create: jest.fn(async ({ requests }) => ({ id: 'batch_1', processing_status: 'ended', _requests: requests })),
      retrieve: jest.fn(async () => ({ processing_status: 'ended' })),
      results: jest.fn(async () => (async function* () {
        for (const [custom_id, v] of Object.entries(verdictByCustomId)) {
          yield { custom_id, result: { type: 'succeeded', message: { content: [{ type: 'text', text: JSON.stringify(v) }], usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 800 } } } };
        }
      })()),
    };
  }

  test('prefilters absent objectives (no batch entry) and judges survivors with cost telemetry', async () => {
    const batchClient = mockBatchClient({
      'AC-2::AC-02a': { status: 'Fully addressed', confidence: 0.9, evidence: [{ quote: 'Dormant accounts inactive for 45 days are automatically disabled.', section_ref: '§2.2' }], gap_description: '', remediation_suggestion: '' },
    });
    const anthropic = { messages: { create: jest.fn(async () => ({ content: [{ type: 'text', text: '{"supported":true}' }], usage: { input_tokens: 10, output_tokens: 4 } })) } };
    const { records, usage } = await Batch.runSpine('o', 'u', [CONTROL], { embed, search, batchClient, anthropic, sleep: async () => {} });

    expect(records).toHaveLength(2);
    const a = records.find((r) => r.control_id === 'AC-02a');
    const b = records.find((r) => r.control_id === 'AC-02b');
    expect(b.status).toBe('Not addressed');
    expect(b.assessment_method).toBe('embedding_prefilter'); // never entered the batch
    expect(a.status).toBe('Fully addressed');
    expect(a.assessment_method).toBe('llm');
    // only ONE request was batched (the survivor)
    expect(batchClient.create.mock.calls[0][0].requests).toHaveLength(1);
    // cost telemetry recorded the judge stage (batch) + the verify stage
    expect(usage.by_stage.judge.calls).toBe(1);
    expect(usage.by_stage.verify.calls).toBe(1); // positive verdict verified
    expect(usage.est_cost_usd).toBeGreaterThan(0);
    expect(usage.cache_read_ratio).toBeGreaterThan(0); // prompt cache hits observed
  });

  test('an ungrounded batch verdict is forced to Not addressed (guardrail holds in batch path)', async () => {
    const search1 = async () => [CHUNK];
    const batchClient = mockBatchClient({
      'AC-2::AC-02a': { status: 'Fully addressed', evidence: [{ quote: 'totally unrelated text', section_ref: '§9' }] },
    });
    const ctrl = { ...CONTROL, assessment_objectives: [CONTROL.assessment_objectives[0]] };
    const { records } = await Batch.runSpine('o', 'u', [ctrl], { embed, search: search1, batchClient, anthropic: null, sleep: async () => {} });
    expect(records[0].status).toBe('Not addressed');
  });
});
