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

describe('CriticalityService gate — revenue-confirmed OR high-impact-if-lost (guardrail 3)', () => {
  const regulated = { id: 'A1', name: 'Billing platform', data_classification: ['PCI', 'Financial'], exposure: 'internet_facing' };
  // non-regulated: qualifies ONLY through revenue, so the provisional path still applies to it
  const plain = { id: 'A2', name: 'Ops scheduler', data_classification: ['Internal'], exposure: 'internet_facing' };

  test('CONFIRMED critical revenue process => crown jewel by revenue', () => {
    const r = Crit.scoreAsset(regulated, { processes: [{ criticality: 'Critical', criticality_confirmed: true }], isSpof: true });
    expect(r.crown_jewel).toBe(true);
    expect(r.qualified_by).toBe('revenue');
    expect(r.provisional).toBe(false);
  });

  test('regulated data (PCI/PHI) qualifies via the IMPACT path even when revenue is unconfirmed', () => {
    const r = Crit.scoreAsset(regulated, { processes: [{ criticality: 'Critical', criticality_confirmed: false }], isSpof: true });
    expect(r.crown_jewel).toBe(true);
    expect(r.qualified_by).toBe('impact');
    expect(r.provisional).toBe(false);
    expect(r.rationale).toMatch(/HIGH-IMPACT/);
  });

  test('an explicit designation (legal_hold) qualifies via impact with no regulated data', () => {
    const r = Crit.scoreAsset({ id: 'A3', name: 'Litigation archive', data_classification: ['Internal'], legal_hold: true }, { processes: [] });
    expect(r.crown_jewel).toBe(true);
    expect(r.qualified_by).toBe('impact');
    expect(r.impact_flags.legal_hold).toBe(true);
  });

  test('a NON-regulated asset with an UNCONFIRMED critical revenue process stays PROVISIONAL', () => {
    const r = Crit.scoreAsset(plain, { processes: [{ criticality: 'Critical', criticality_confirmed: false }, { criticality: 'Critical', criticality_confirmed: false }], isSpof: true });
    expect(r.crown_jewel).toBe(false);
    expect(r.provisional).toBe(true);
    expect(r.qualified_by).toBe('provisional');
    expect(r.rationale).toMatch(/PROVISIONAL/);
  });

  test('backward-compatible: processes with no confirmation field behave as confirmed (legacy)', () => {
    const r = Crit.scoreAsset(regulated, { processes: [{ criticality: 'Critical' }], isSpof: true });
    expect(r.crown_jewel).toBe(true);
    expect(r.provisional).toBe(false);
  });

  test('a low-value non-regulated asset is neither crown nor provisional', () => {
    const low = { id: 'A4', name: 'Intranet', data_classification: ['Internal'], exposure: 'internal_only' };
    const r = Crit.scoreAsset(low, { processes: [{ criticality: 'Low', criticality_confirmed: false }], isSpof: false });
    expect(r.crown_jewel).toBe(false);
    expect(r.provisional).toBe(false);
  });
});
