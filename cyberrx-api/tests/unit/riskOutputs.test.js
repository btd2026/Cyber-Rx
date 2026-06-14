'use strict';

/**
 * Phase 5 — risk outputs: the crownScore composite (Tier + Tier-1 process count
 * + RTO). DB-backed aggregations run at the route layer.
 */

const { crownScore } = require('../../src/services/RiskOutputsService');

describe('crownScore', () => {
  test('Tier-1 app supporting several Tier-1 processes with a tight RTO scores near the top', () => {
    const s = crownScore({ tier: 1, tier1Count: 4, rtoHrs: 4 });
    expect(s).toBeGreaterThanOrEqual(85);
  });
  test('Tier-3 app supporting nothing, loose RTO scores low', () => {
    const s = crownScore({ tier: 3, tier1Count: 0, rtoHrs: 168 });
    expect(s).toBeLessThan(40);
  });
  test('higher tier outranks lower tier, all else equal', () => {
    expect(crownScore({ tier: 1, tier1Count: 1, rtoHrs: 24 })).toBeGreaterThan(crownScore({ tier: 3, tier1Count: 1, rtoHrs: 24 }));
  });
  test('more Tier-1 processes raises the score', () => {
    expect(crownScore({ tier: 2, tier1Count: 3, rtoHrs: 24 })).toBeGreaterThan(crownScore({ tier: 2, tier1Count: 0, rtoHrs: 24 }));
  });
  test('missing RTO does not throw and contributes nothing', () => {
    expect(crownScore({ tier: 2, tier1Count: 1, rtoHrs: null })).toBeGreaterThanOrEqual(0);
  });
  test('score is bounded 0..100', () => {
    const s = crownScore({ tier: 1, tier1Count: 99, rtoHrs: 1 });
    expect(s).toBeLessThanOrEqual(100);
    expect(s).toBeGreaterThanOrEqual(0);
  });
});
