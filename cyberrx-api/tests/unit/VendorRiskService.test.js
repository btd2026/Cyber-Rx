'use strict';

const V = require('../../src/services/VendorRiskService');

describe('VendorRiskService', () => {
  test('normalizeScore maps each provider scale to 0–100', () => {
    expect(V.normalizeScore(900, 'bitsight')).toBe(100);
    expect(V.normalizeScore(250, 'bitsight')).toBe(0);
    expect(V.normalizeScore(575, 'bitsight')).toBe(50);
    expect(V.normalizeScore(8, 'riskrecon')).toBe(80);
    expect(V.normalizeScore(82, 'securityscorecard')).toBe(82);
    expect(V.normalizeScore(93, 'blackkite')).toBe(93);
  });

  test('normalizeScore accepts letter grades from any grader', () => {
    expect(V.normalizeScore('A', 'securityscorecard')).toBe(93);
    expect(V.normalizeScore('F', 'blackkite')).toBe(35);
    expect(V.normalizeScore('C+', 'upguard')).toBe(77);
    expect(V.normalizeScore('zzz', 'x')).toBeNull();
  });

  test('band uses the shared coverage color scale', () => {
    expect(V.band(95).color).toBe('good');
    expect(V.band(80).color).toBe('blue');
    expect(V.band(60).color).toBe('warn');
    expect(V.band(40).color).toBe('crit');
    expect(V.band(null).color).toBe('muted');
  });

  test('tierNorm normalizes free-text tiers', () => {
    expect(V.tierNorm('Tier 1')).toBe('tier1');
    expect(V.tierNorm('critical')).toBe('tier1');
    expect(V.tierNorm('2')).toBe('tier2');
    expect(V.tierNorm('')).toBe('tier2');
  });

  test('scorePortfolio ranks worst-first and counts risk', () => {
    const p = V.scorePortfolio([
      { name: 'Safe Co', tier: 'tier1', score: 95, live: true },
      { name: 'Weak Co', tier: 'tier2', grade: 'F' },      // 35 → critical
      { name: 'Watch Co', tier: 'tier1', score: 60 },      // warn, at risk
    ], { provider: 'securityscorecard', topN: 2 });
    expect(p.count).toBe(3);
    expect(p.tier1).toBe(2);
    expect(p.tier2).toBe(1);
    expect(p.at_risk).toBe(2);   // 35 and 60
    expect(p.critical).toBe(1);  // 35
    expect(p.any_live).toBe(true);
    expect(p.top).toHaveLength(2);
    expect(p.top[0].name).toBe('Weak Co');   // worst first
    expect(p.top[0].color).toBe('crit');
    expect(p.top[1].name).toBe('Watch Co');
    expect(p.avg_score).toBe(Math.round((95 + 35 + 60) / 3));
  });

  test('scorePortfolio sinks unrated vendors to the bottom', () => {
    const p = V.scorePortfolio([
      { name: 'Rated', score: 70 },
      { name: 'Unrated', grade: 'not-a-grade' },
    ]);
    expect(p.top[0].name).toBe('Rated');
    expect(p.vendors[p.vendors.length - 1].name).toBe('Unrated');
    expect(p.vendors[p.vendors.length - 1].score).toBeNull();
  });

  test('refreshDue enforces the weekly cadence', () => {
    const now = 1_000_000_000_000;
    expect(V.refreshDue(null, 'weekly', now)).toBe(true);          // never refreshed
    expect(V.refreshDue(now - 8 * 864e5, 'weekly', now)).toBe(true);   // 8 days old
    expect(V.refreshDue(now - 2 * 864e5, 'weekly', now)).toBe(false);  // 2 days old
    expect(V.refreshDue(now - 2 * 864e5, 'daily', now)).toBe(true);    // daily cadence
  });
});
