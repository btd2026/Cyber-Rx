'use strict';

/**
 * Optional steps — pure helpers: entity-resolution clustering + CFO exposure
 * allocation. DB-backed methods run at the route layer.
 */

const { clusterDuplicates, pairScore } = require('../../src/services/ResolverService');
const { allocate } = require('../../src/services/CfoQuantService');

describe('entity resolution clustering', () => {
  test('groups near-duplicate application names', () => {
    const groups = clusterDuplicates([
      { id: 'a1', name: 'Claims Adjudication System' },
      { id: 'a2', name: 'Claims Adjudication' },
      { id: 'a3', name: 'Member Portal' },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].survivor.id).toBe('a1');
    expect(groups[0].duplicates.map((d) => d.id)).toContain('a2');
  });
  test('identical external_ref is a certain match regardless of name', () => {
    const groups = clusterDuplicates([
      { id: 'a1', name: 'Foo', external_ref: 'CI-100' },
      { id: 'a2', name: 'Totally Different', external_ref: 'CI-100' },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].duplicates[0].confidence).toBe(1);
  });
  test('distinct apps are not grouped', () => {
    expect(clusterDuplicates([{ id: 'a1', name: 'Payroll' }, { id: 'a2', name: 'Pharmacy Formulary' }])).toHaveLength(0);
  });
  test('pairScore: containment scores high, unrelated low', () => {
    expect(pairScore('Member Portal App', 'Member Portal')).toBeGreaterThanOrEqual(0.85);
    expect(pairScore('Payroll', 'Pharmacy')).toBeLessThan(0.5);
  });
});

describe('CFO exposure allocation', () => {
  test('distributes total by score share', () => {
    const out = allocate(1000, [{ id: 'x', score: 75 }, { id: 'y', score: 25 }]);
    expect(out.find((o) => o.id === 'x').weightedExposure).toBe(750);
    expect(out.find((o) => o.id === 'y').weightedExposure).toBe(250);
  });
  test('zero total scores => zero exposure, no divide-by-zero', () => {
    const out = allocate(1000, [{ id: 'x', score: 0 }]);
    expect(out[0].weightedExposure).toBe(0);
  });
});
