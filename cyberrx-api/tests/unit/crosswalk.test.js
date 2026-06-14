'use strict';

/**
 * Phase 3 crosswalk — offline unit tests for the pure scoring + criticality
 * propagation helpers (DB-backed methods are exercised via the routes at runtime).
 */

const { nameScore } = require('../../src/crosswalk/CrosswalkService');
const { rtoHours, tightestRto, highestTier } = require('../../src/crosswalk/PropagationService');

describe('crosswalk name matching', () => {
  test('exact / near-exact names score high', () => {
    expect(nameScore('Claims Adjudication', 'Claims Adjudication')).toBe(1);
    expect(nameScore('Claims Adjudication System', 'Claims Adjudication')).toBeGreaterThanOrEqual(0.7);
  });
  test('unrelated names score low', () => {
    expect(nameScore('Payroll Portal', 'Pharmacy Formulary')).toBeLessThan(0.4);
  });
  test('a business-capability hint can lift the score', () => {
    const withHint = nameScore('APP-4471', 'Member Portal', 'Member Portal Services');
    const without = nameScore('APP-4471', 'Member Portal', null);
    expect(withHint).toBeGreaterThan(without);
  });
});

describe('criticality propagation', () => {
  test('rtoHours parses h/d/w', () => {
    expect(rtoHours('4h')).toBe(4);
    expect(rtoHours('1d')).toBe(24);
    expect(rtoHours('1w')).toBe(168);
    expect(rtoHours(null)).toBe(Infinity);
  });
  test('tightest RTO = smallest duration', () => {
    expect(tightestRto(['72h', '4h', '1d'])).toBe('4h');
    expect(tightestRto([])).toBeNull();
  });
  test('highest tier = smallest tier number', () => {
    expect(highestTier([3, 1, 2])).toBe(1);
    expect(highestTier([])).toBeNull();
  });
});
