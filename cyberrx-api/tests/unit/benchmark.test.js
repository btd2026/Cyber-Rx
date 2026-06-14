'use strict';

/**
 * Phase 7 — cross-tenant benchmarking scaffold: the privacy-preserving pure
 * helpers (k-anonymity suppression, cohort stats) + the feature flag.
 * Consent + DB aggregation run at the route layer.
 */

const { kAnonymize, cohortStats, isEnabled, MIN_COHORT } = require('../../src/services/BenchmarkService');

describe('k-anonymity', () => {
  test('suppresses values below the minimum cohort', () => {
    expect(kAnonymize(42, MIN_COHORT - 1)).toBeNull();
    expect(kAnonymize(42, 1)).toBeNull();
  });
  test('returns the value at or above the minimum cohort', () => {
    expect(kAnonymize(42, MIN_COHORT)).toBe(42);
    expect(kAnonymize(42, MIN_COHORT + 5)).toBe(42);
  });
});

describe('cohortStats', () => {
  test('averages and counts, ignoring nulls', () => {
    expect(cohortStats([2, 4, null, 6])).toEqual({ count: 3, avg: 4 });
  });
  test('empty cohort yields a null average', () => {
    expect(cohortStats([])).toEqual({ count: 0, avg: null });
  });
});

describe('feature flag', () => {
  test('isEnabled reflects CROSS_TENANT_BENCHMARKING', () => {
    const prev = process.env.CROSS_TENANT_BENCHMARKING;
    process.env.CROSS_TENANT_BENCHMARKING = 'true'; expect(isEnabled()).toBe(true);
    process.env.CROSS_TENANT_BENCHMARKING = 'false'; expect(isEnabled()).toBe(false);
    delete process.env.CROSS_TENANT_BENCHMARKING; expect(isEnabled()).toBe(false);
    if (prev !== undefined) process.env.CROSS_TENANT_BENCHMARKING = prev;
  });
});
