'use strict';

jest.mock('../../../src/utils/db', () => ({ query: jest.fn() }));

const db = require('../../../src/utils/db');
const Evidence = require('../../../src/services/EvidenceStore');
const Rules = require('../../../src/data/assessmentRules');
const Engine = require('../../../src/services/ContinuousAssessmentEngine');

describe('EvidenceStore — append-only, immutable', () => {
  beforeEach(() => jest.clearAllMocks());

  it('append() INSERTs a hashed record and never UPDATEs', async () => {
    db.query.mockResolvedValue({ rows: [] });
    const res = await Evidence.append('org1', 'PR.AA-03', { source: 'okta', method: 'live', collectedAt: '2026-03-03T00:00:00Z', payload: { value: 94, observed: 88, known: 100 } });
    expect(db.query).toHaveBeenCalledTimes(1);
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO control_evidence');
    expect(sql).not.toMatch(/UPDATE|DELETE/i);
    expect(res.hash).toBe(Evidence.hashPayload({ value: 94, observed: 88, known: 100 }));
    expect(params[1]).toBe('PR.AA-03');
  });

  it('forControl() reads evidence up to asOf, newest first (recomputability)', async () => {
    db.query.mockResolvedValue([{ control_id: 'PR.AA-03', collected_at: '2026-03-01' }]);
    await Evidence.forControl('org1', 'PR.AA-03', '2026-03-03T00:00:00Z');
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('collected_at <= $3::timestamptz');
    expect(sql).toContain('ORDER BY collected_at DESC');
    expect(params[2]).toBe('2026-03-03T00:00:00Z');
  });
});

describe('Rules — declarative + versioned', () => {
  it('grades a metric into a graded verdict with a coverage denominator', () => {
    const rule = Rules.ruleFor('PR.AA-03'); // latest version = 2 (met 95)
    expect(rule.version).toBe(2);
    expect(Rules.evaluateRule(rule, { value: 94, observed: 88, known: 100 }).verdict).toBe('partial');
    expect(Rules.evaluateRule(rule, { value: 96, observed: 100, known: 100 }).verdict).toBe('met');
    expect(Rules.evaluateRule(rule, { value: 94, observed: 88, known: 100 }).coveragePct).toBe(88);
  });

  it('recomputes under the rule version in effect (v1 met at 90, v2 tightened to 95)', () => {
    const v1 = Rules.ruleFor('PR.AA-03', 1);
    expect(v1.version).toBe(1);
    expect(Rules.evaluateRule(v1, { value: 92, known: 100, observed: 100 }).verdict).toBe('met'); // met under v1
    const v2 = Rules.ruleFor('PR.AA-03', 2);
    expect(Rules.evaluateRule(v2, { value: 92, known: 100, observed: 100 }).verdict).toBe('partial'); // only partial under v2
  });
});

describe('Engine — three-axis assess + recompute', () => {
  beforeEach(() => jest.clearAllMocks());

  it('scores axes MULTIPLIED and decays expired evidence to not_assessed', () => {
    expect(Engine.scoreControl({ verdict: 'met', method: 'live', freshness: 'healthy', coveragePct: 90 })).toBeCloseTo(0.9, 5);
    // freshness decay
    expect(Engine.freshness('live', '2026-03-01T00:00:00Z', '2026-03-05T00:00:00Z', 1)).toBe('expired');
    expect(Engine.freshness('attestation', '2026-01-01T00:00:00Z', '2026-03-01T00:00:00Z', 365)).toBe('healthy');
  });

  it('assess() reads latest evidence as-of a date and grades it under the effect rule', async () => {
    db.query.mockResolvedValue([{ control_id: 'PR.AA-03', method: 'live', collected_at: '2026-03-03T00:00:00Z', payload: { value: 96, observed: 100, known: 100 } }]);
    const a = await Engine.assess('org1', 'PR.AA-03', '2026-03-03T04:00:00Z');
    expect(a.verdict).toBe('met');
    expect(a.method).toBe('live');
    expect(a.confidence).toBe('high');
    expect(a.score).toBeGreaterThan(0.9);
  });

  it('an expired attestation is not passing (verdict → not_assessed, score 0)', async () => {
    db.query.mockResolvedValue([{ control_id: 'GV.RM-02', method: 'attestation', collected_at: '2025-01-01T00:00:00Z', payload: { present: true } }]);
    const a = await Engine.assess('org1', 'GV.RM-02', '2026-07-01T00:00:00Z'); // >365d old
    expect(a.freshness).toBe('expired');
    expect(a.verdict).toBe('not_assessed');
    expect(a.score).toBe(0);
  });
});

describe('Engine — crown-jewel-weighted, weakest-link rollup', () => {
  it('does NOT simple-average — a broken crown-jewel control drags its category down', () => {
    const assessments = [
      { controlId: 'PR.AA-01', score: 0.1, method: 'live' }, // crown-jewel control, broken
      { controlId: 'PR.AA-03', score: 0.9, method: 'live' },
      { controlId: 'PR.AA-05', score: 0.9, method: 'live' },
    ];
    const weights = { 'PR.AA-01': 3, 'PR.AA-03': 1, 'PR.AA-05': 1 };
    const r = Engine.rollup(assessments, weights);
    const simpleAvg = (0.1 + 0.9 + 0.9) / 3;
    expect(r.categories['PR.AA'].score).toBeLessThan(simpleAvg); // weakest-link pulled it below the average
    expect(r.confidence).toBeCloseTo(1, 5); // all live
  });
});
