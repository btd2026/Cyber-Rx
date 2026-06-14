'use strict';

/**
 * Phase 4 — unified assessment engine: mergeEvidence() combines automated +
 * document evidence per the control's assessment_type, with confidence and a
 * traceable evidence_refs list. (DB run/rollup/review run at the route layer.)
 */

const { mergeEvidence } = require('../../src/services/AssessmentEngine');

const req = (type) => ({ framework_id: 'nist_csf_2', requirement_id: 'PR.AA-01', assessment_type: type });

describe('mergeEvidence', () => {
  test('automated control uses the automated score with high confidence', () => {
    const r = mergeEvidence(req('automated'), { score: 90, runId: 12 }, null);
    expect(r.status).toBe('met');
    expect(r.score).toBe(90);
    expect(r.confidence).toBe('high');
    expect(r.evidence_refs).toEqual([{ type: 'automated', runId: 12, score: 90 }]);
  });

  test('manual control uses the document result', () => {
    const r = mergeEvidence(req('manual'), null, { status: 'partially met', finding: 'No review cadence', excerpt: 'reviewed annually', uploadId: 'du_1' });
    expect(r.status).toBe('partially met');
    expect(r.score).toBe(50);
    expect(r.confidence).toBe('medium'); // excerpt present
    expect(r.gap).toBe('No review cadence');
    expect(r.evidence_refs[0]).toMatchObject({ type: 'document', uploadId: 'du_1' });
  });

  test('hybrid with agreeing sources => high confidence, averaged score', () => {
    const r = mergeEvidence(req('hybrid'), { score: 80, runId: 3 }, { status: 'met', uploadId: 'du_2' });
    expect(r.confidence).toBe('high');
    expect(r.score).toBe(90); // (80 + 100) / 2
    expect(r.sources).toEqual(expect.arrayContaining(['automated', 'document']));
    expect(r.evidence_refs).toHaveLength(2);
  });

  test('hybrid with conflicting sources => medium confidence', () => {
    const r = mergeEvidence(req('hybrid'), { score: 90, runId: 3 }, { status: 'not met', uploadId: 'du_3' });
    expect(r.confidence).toBe('medium');
    expect(r.score).toBe(45); // (90 + 0)/2
    expect(r.status).toBe('not met');
  });

  test('no evidence at all => null (nothing to record)', () => {
    expect(mergeEvidence(req('hybrid'), null, null)).toBeNull();
  });

  test('met requirement has no gap and a maintain recommendation', () => {
    const r = mergeEvidence(req('automated'), { score: 95, runId: 1 }, null);
    expect(r.gap).toBeNull();
    expect(r.recommendation).toMatch(/re-test/i);
  });
});
