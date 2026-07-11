'use strict';

/**
 * Phase C — the single tunable residual-risk formula + two-axis ATT&CK coverage summary.
 */

const R = require('../../src/services/crownjewels/ResidualRiskService');

describe('ResidualRiskService.coverageAxes — two axes from a scoped technique set', () => {
  test('splits prevent (mitigated/partial) and detect (observed/blind)', () => {
    const a = R.coverageAxes([
      { status: 'prevent' },                 // mitigated
      { status: 'prevent', supporting: true }, // partial (control-mapped, no telemetry)
      { status: 'detect' },                  // observed
      { status: 'none' },                    // gap + blind
    ]);
    expect(a.prevent.mitigated).toBe(1);
    expect(a.prevent.partial).toBe(1);
    expect(a.prevent.gap).toBe(2);           // detect + none have no prevention
    expect(a.detect.observed).toBe(1);
    expect(a.detect.blind).toBe(3);
    // prevention coverage credits partial at half weight: (1 + 0.5)/4 = 0.375
    expect(a.prevent.coverage).toBeCloseTo(0.375, 3);
    expect(a.detect.coverage).toBeCloseTo(0.25, 3);
  });

  test('empty set → zero coverage, no crash', () => {
    const a = R.coverageAxes([]);
    expect(a.prevent.coverage).toBe(0);
    expect(a.detect.coverage).toBe(0);
  });
});

describe('ResidualRiskService.residual — tunable formula properties', () => {
  test('bounded 0..100 and monotonic in impact', () => {
    const lo = R.residual({ impact: 0.2, prevention: 0.5, detection: 0.5 });
    const hi = R.residual({ impact: 0.9, prevention: 0.5, detection: 0.5 });
    expect(hi.residual).toBeGreaterThan(lo.residual);
    expect(hi.residual).toBeLessThanOrEqual(100);
    expect(lo.residual).toBeGreaterThanOrEqual(0);
  });

  test('more prevention lowers residual; more detection lowers residual', () => {
    const base = R.residual({ impact: 1, prevention: 0.2, detection: 0.2 });
    const moreP = R.residual({ impact: 1, prevention: 0.9, detection: 0.2 });
    const moreD = R.residual({ impact: 1, prevention: 0.2, detection: 0.9 });
    expect(moreP.residual).toBeLessThan(base.residual);
    expect(moreD.residual).toBeLessThan(base.residual);
  });

  test('floors: neither control layer alone zeroes residual on a high-impact jewel', () => {
    const perfectPrevention = R.residual({ impact: 1, prevention: 1, detection: 0 });
    const perfectDetection = R.residual({ impact: 1, prevention: 0, detection: 1 });
    expect(perfectPrevention.residual).toBeGreaterThan(0); // preventionFloor keeps it > 0
    expect(perfectDetection.residual).toBeGreaterThan(0);  // detectionFloor keeps it > 0
  });

  test('breakdown is auditable and bands map High/Medium/Low', () => {
    const worst = R.residual({ impact: 1, prevention: 0, detection: 0 });
    expect(worst.band).toBe('High');
    expect(worst.breakdown).toHaveProperty('unmitigated_prevention');
    expect(worst.breakdown).toHaveProperty('detection_gap');
    const safe = R.residual({ impact: 0.1, prevention: 1, detection: 1 });
    expect(['Low', 'Medium']).toContain(safe.band);
  });
});

describe('ResidualRiskService.residualForJewel — end to end', () => {
  test('a high-impact jewel with gaps ranks High and explains why', () => {
    const j = R.residualForJewel({
      name: 'Billing platform', impact: 0.95,
      techniques: [{ status: 'none' }, { status: 'none' }, { status: 'detect' }],
    });
    expect(j.band).toBe('High');
    expect(j.axes.prevent.gap).toBeGreaterThan(0);
    expect(j.rationale).toMatch(/no prevention|blind spot/);
  });
});
