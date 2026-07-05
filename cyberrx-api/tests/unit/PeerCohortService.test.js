'use strict';

const Peer = require('../../src/services/PeerCohortService');

const rows = (overalls) => overalls.map((v) => ({ overall_cmmi: v, function_cmmi: { Govern: v - 0.2, Protect: v + 0.1 } }));

describe('PeerCohortService', () => {
  test('percentile interpolates', () => {
    expect(Peer.percentile([1, 2, 3, 4], 0.5)).toBeCloseTo(2.5, 5);
    expect(Peer.percentile([], 0.5)).toBeNull();
  });

  test('sizeBand from revenue', () => {
    expect(Peer.sizeBand(400e9)).toBe('mega');
    expect(Peer.sizeBand(30e9)).toBe('large');
    expect(Peer.sizeBand(5e9)).toBe('mid');
    expect(Peer.sizeBand(500e6)).toBe('small');
    expect(Peer.sizeBand(0)).toBe('unknown');
  });

  test('sanitize keeps ONLY allowed anonymized fields and clamps CMMI 0..5', () => {
    const s = Peer.sanitize({ org_name: 'Acme Health', org_id: 'org_x', ip: '1.2.3.4', assets: ['ClaimsDB'],
      industry: 'Healthcare', region: 'US', revenue: 400e9, overall_cmmi: 7.9, function_cmmi: { Govern: 4.2, Protect: -3, evil: 'x' } });
    expect(s).toEqual({ industry: 'healthcare', region: 'us', size_band: 'mega', overall_cmmi: 5, function_cmmi: { Govern: 4.2, Protect: 0 } });
    // nothing identifying survives
    expect(JSON.stringify(s)).not.toMatch(/acme|org_x|1\.2\.3\.4|claimsdb|evil/i);
  });

  test('aggregate suppresses cohorts below k-anonymity (MIN_COHORT)', () => {
    const small = Peer.aggregate(rows([3, 3.5, 4, 4.2])); // n=4 < 5
    expect(small.sufficient).toBe(false);
    expect(small.overall).toBeUndefined();
  });

  test('aggregate returns percentiles when cohort is large enough', () => {
    const a = Peer.aggregate(rows([2.5, 3, 3.5, 4, 4.5, 5]));
    expect(a.sufficient).toBe(true);
    expect(a.n).toBe(6);
    expect(a.overall.p50).toBeGreaterThan(3);
    expect(a.overall.p25).toBeLessThan(a.overall.p75);
    expect(a.functions.Govern).toBeTruthy();
  });

  test('per-function stat is suppressed when that function has < MIN_COHORT points', () => {
    const mixed = [
      { overall_cmmi: 3, function_cmmi: { Govern: 3 } },
      { overall_cmmi: 3.2, function_cmmi: { Govern: 3.2 } },
      { overall_cmmi: 3.4, function_cmmi: { Govern: 3.4 } },
      { overall_cmmi: 3.6, function_cmmi: { Govern: 3.6, Rare: 2 } },
      { overall_cmmi: 3.8, function_cmmi: { Govern: 3.8 } },
    ];
    const a = Peer.aggregate(mixed);
    expect(a.sufficient).toBe(true);
    expect(a.functions.Govern).toBeTruthy(); // 5 points
    expect(a.functions.Rare).toBeUndefined(); // only 1 point
  });

  test('percentileOf places a value in the cohort', () => {
    expect(Peer.percentileOf(4, [2, 3, 4, 5, 6])).toBe(60);
    expect(Peer.percentileOf(7, [2, 3, 4, 5, 6])).toBe(100);
    expect(Peer.percentileOf(4, [])).toBeNull();
  });
});
