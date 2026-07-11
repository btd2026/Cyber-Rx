'use strict';

/**
 * Phase B — assisted, human-confirmed revenue criticality.
 * Covers the advisory scorer (RevenueCriticalityService) and the crown-jewel derivation
 * GATE in CriticalityService (confirmed => crown, unconfirmed => provisional only).
 */

const Rev = require('../../src/services/RevenueCriticalityService');
const Crit = require('../../src/services/crownjewels/CriticalityService');

describe('RevenueCriticalityService.scoreProcess — advisory suggestion only', () => {
  test('an entered dollar figure is the strongest signal and drives a high score', () => {
    const r = Rev.scoreProcess({ name: 'Adjudicate & pay claims', financial_impact: '250M' }, { maxFinancial: 250e6 });
    expect(r.score).toBeGreaterThan(0.5);
    expect(r.suggested).toBe(true);
    // the score is the sum of its per-signal basis (auditable)
    const sum = Object.values(r.basis).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - r.score)).toBeLessThan(0.005);
    expect(r.signals.financial_usd).toBe(250e6);
  });

  test('revenue vocabulary in name/function fires without any dollar figure', () => {
    const r = Rev.scoreProcess({ name: 'Order-to-cash billing', function: 'Revenue Operations' });
    expect(r.basis.name).toBeGreaterThan(0);
    expect(r.basis.function).toBeGreaterThan(0);
    expect(r.signals.financial).toBe(0); // no figure entered
  });

  test('a non-revenue internal process scores low and is not suggested', () => {
    const r = Rev.scoreProcess({ name: 'Employee intranet portal', function: 'Internal IT' });
    expect(r.score).toBeLessThan(0.5);
    expect(r.suggested).toBe(false);
  });

  test('confidence is mechanical — how many independent signals fired', () => {
    const none = Rev.scoreProcess({ name: 'Facilities badge access' });
    const all = Rev.scoreProcess({ name: 'Billing revenue collections', function: 'Sales', financial_impact: 1e6 }, { maxFinancial: 1e6 });
    expect(none.confidence).toBe(0);
    expect(all.confidence).toBe(1);
  });

  test('scoring NEVER confirms — it only suggests', () => {
    const r = Rev.scoreProcess({ name: 'Payments', financial_impact: 1e9 }, { maxFinancial: 1e9 });
    expect(r).not.toHaveProperty('criticality_confirmed');
  });

  test('_toNum parses currency shorthand', () => {
    expect(Rev._toNum('$1.4B')).toBe(1.4e9);
    expect(Rev._toNum('250M')).toBe(250e6);
    expect(Rev._toNum('12,500')).toBe(12500);
    expect(Rev._toNum('n/a')).toBe(0);
  });
});

describe('RevenueCriticalityService.rankProcesses', () => {
  test('ranks by advisory score descending and normalizes against the org-max figure', () => {
    const ranked = Rev.rankProcesses([
      { name: 'Cafeteria ordering', financial_impact: 50e3 },
      { name: 'Order-to-cash billing', financial_impact: 800e6 },
      { name: 'HR onboarding' },
    ]);
    expect(ranked[0].name).toBe('Order-to-cash billing');
    expect(ranked[0].revenue_criticality_score).toBeGreaterThan(ranked[1].revenue_criticality_score);
    ranked.forEach((p) => {
      expect(p).toHaveProperty('revenue_criticality_basis');
      expect(p.criticality_confirmed).toBe(false); // never auto-confirmed
    });
  });
});

describe('CriticalityService gate — crown jewels derive only from CONFIRMED revenue processes', () => {
  const jewel = { id: 'A1', name: 'Billing platform', data_classification: ['PCI', 'Financial'], exposure: 'internet_facing' };

  test('CONFIRMED critical process => real crown jewel', () => {
    const r = Crit.scoreAsset(jewel, { processes: [{ criticality: 'Critical', criticality_confirmed: true }], isSpof: true });
    expect(r.crown_jewel).toBe(true);
    expect(r.provisional).toBe(false);
  });

  test('UNCONFIRMED critical process => NOT a crown jewel, marked provisional', () => {
    const r = Crit.scoreAsset(jewel, { processes: [{ criticality: 'Critical', criticality_confirmed: false }], isSpof: true });
    expect(r.crown_jewel).toBe(false);
    expect(r.provisional).toBe(true);
    expect(r.provisional_score).toBeGreaterThanOrEqual(r.score);
    expect(r.rationale).toMatch(/PROVISIONAL/);
  });

  test('backward-compatible: processes with no confirmation field behave as confirmed (legacy)', () => {
    const r = Crit.scoreAsset(jewel, { processes: [{ criticality: 'Critical' }], isSpof: true });
    expect(r.crown_jewel).toBe(true);
    expect(r.provisional).toBe(false);
  });

  test('a low-value asset stays neither crown nor provisional even if its process is unconfirmed', () => {
    const low = { id: 'A2', name: 'Intranet', data_classification: ['Internal'], exposure: 'internal_only' };
    const r = Crit.scoreAsset(low, { processes: [{ criticality: 'Low', criticality_confirmed: false }], isSpof: false });
    expect(r.crown_jewel).toBe(false);
    expect(r.provisional).toBe(false);
  });
});
