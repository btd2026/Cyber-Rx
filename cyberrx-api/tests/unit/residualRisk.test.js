'use strict';

/**
 * Phase C + E — the single tunable residual-risk formula and the two HONEST coverage axes.
 * Axis wording claims only what telemetry proves: CONTROL PRESENCE (a control is mapped, not proven
 * effective) and DETECTION COVERAGE. Effectiveness is a not-yet-wired hook, never faked.
 */

const R = require('../../src/services/crownjewels/ResidualRiskService');

describe('ResidualRiskService.coverageAxes — control presence + detection (honest)', () => {
  test('splits control-presence (present/partial/absent) and detection (observed/blind)', () => {
    const a = R.coverageAxes([
      { status: 'present' },                  // control mapped
      { status: 'present', supporting: true },// partial (control mapped, no telemetry)
      { status: 'detect' },                   // detection only
      { status: 'none' },                     // absent + blind
    ]);
    expect(a.controlPresence.present).toBe(1);
    expect(a.controlPresence.partial).toBe(1);
    expect(a.controlPresence.absent).toBe(2);
    expect(a.detection.observed).toBe(1);
    expect(a.detection.blind).toBe(3);
    expect(a.controlPresence.coverage).toBeCloseTo(0.375, 3); // (1 + 0.5)/4
    expect(a.detection.coverage).toBeCloseTo(0.25, 3);
  });

  test("accepts legacy 'prevent' status as an alias for 'present'", () => {
    const a = R.coverageAxes([{ status: 'prevent' }]);
    expect(a.controlPresence.present).toBe(1);
  });

  test('carries a clearly-marked effectiveness hook — never claims proven effectiveness', () => {
    const a = R.coverageAxes([{ status: 'present' }]);
    expect(a.effectiveness.measured).toBe(false);
    expect(a.effectiveness.source).toMatch(/BAS|purple/i);
  });

  test('empty set → zero coverage, no crash', () => {
    const a = R.coverageAxes([]);
    expect(a.controlPresence.coverage).toBe(0);
    expect(a.detection.coverage).toBe(0);
  });
});

describe('ResidualRiskService.residual — tunable formula properties', () => {
  test('bounded 0..100 and monotonic in impact', () => {
    const lo = R.residual({ impact: 0.2, controlPresence: 0.5, detection: 0.5 });
    const hi = R.residual({ impact: 0.9, controlPresence: 0.5, detection: 0.5 });
    expect(hi.residual).toBeGreaterThan(lo.residual);
    expect(hi.residual).toBeLessThanOrEqual(100);
    expect(lo.residual).toBeGreaterThanOrEqual(0);
  });

  test('more control presence lowers residual; more detection lowers residual', () => {
    const base = R.residual({ impact: 1, controlPresence: 0.2, detection: 0.2 });
    const moreP = R.residual({ impact: 1, controlPresence: 0.9, detection: 0.2 });
    const moreD = R.residual({ impact: 1, controlPresence: 0.2, detection: 0.9 });
    expect(moreP.residual).toBeLessThan(base.residual);
    expect(moreD.residual).toBeLessThan(base.residual);
  });

  test('legacy `prevention` param is accepted as an alias', () => {
    const a = R.residual({ impact: 1, prevention: 0.9, detection: 0.2 });
    const b = R.residual({ impact: 1, controlPresence: 0.9, detection: 0.2 });
    expect(a.residual).toBe(b.residual);
  });

  test('floors: neither axis alone zeroes residual on a high-impact jewel', () => {
    const fullPresence = R.residual({ impact: 1, controlPresence: 1, detection: 0 });
    const fullDetection = R.residual({ impact: 1, controlPresence: 0, detection: 1 });
    expect(fullPresence.residual).toBeGreaterThan(0);
    expect(fullDetection.residual).toBeGreaterThan(0);
  });

  test('breakdown is auditable (no_control_present + detection_gap) and bands map High/Medium/Low', () => {
    const worst = R.residual({ impact: 1, controlPresence: 0, detection: 0 });
    expect(worst.band).toBe('High');
    expect(worst.breakdown).toHaveProperty('no_control_present');
    expect(worst.breakdown).toHaveProperty('detection_gap');
    const safe = R.residual({ impact: 0.1, controlPresence: 1, detection: 1 });
    expect(['Low', 'Medium']).toContain(safe.band);
  });
});

describe('ResidualRiskService.residualForJewel — end to end', () => {
  test('a high-impact jewel with gaps ranks High and explains why (presence, not proven)', () => {
    const j = R.residualForJewel({
      name: 'Billing platform', impact: 0.95,
      techniques: [{ status: 'none' }, { status: 'none' }, { status: 'detect' }],
    });
    expect(j.band).toBe('High');
    expect(j.axes.controlPresence.absent).toBeGreaterThan(0);
    expect(j.rationale).toMatch(/no mapped control|blind spot/);
    expect(j.rationale).toMatch(/proven effectiveness|BAS|purple/i);
  });
});
