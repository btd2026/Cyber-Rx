'use strict';

/** EconomicsService — pure financial translation + Monte-Carlo VaR. No DB/LLM. */

const E = require('../../src/services/crownjewels/EconomicsService');

describe('EconomicsService.ratios', () => {
  test('expresses loss as % of revenue, days of operating income, % of EV', () => {
    const r = E.ratios(68e6, { revenue: 8.4e9, operatingIncome: 1.4e9, enterpriseValue: 30e9 });
    expect(r.pct_of_revenue).toBeCloseTo(68e6 / 8.4e9, 6);
    expect(r.days_of_operating_income).toBeCloseTo(68e6 / (1.4e9 / 365), 2);
    expect(r.pct_of_enterprise_value).toBeCloseTo(68e6 / 30e9, 6);
  });
  test('returns null for a ratio when its denominator is missing', () => {
    const r = E.ratios(10e6, { revenue: 0 });
    expect(r.pct_of_revenue).toBeNull();
  });
});

describe('EconomicsService.materialityThreshold', () => {
  test('anchors on 5% of net income by default', () => {
    expect(E.materialityThreshold({ netIncome: 1.06e9 }).value).toBeCloseTo(0.05 * 1.06e9, 2);
  });
  test('falls back to a share of revenue when net income is absent', () => {
    const m = E.materialityThreshold({ revenue: 8.4e9 });
    expect(m.value).toBeCloseTo(0.005 * 8.4e9, 2);
    expect(m.basis).toMatch(/revenue/);
  });
});

describe('EconomicsService.appetite & insurance', () => {
  test('appetite: expected within, tail over', () => {
    const a = E.appetiteStatus(68e6, 180e6, 120e6);
    expect(a.within).toBe(true);
    expect(a.tail_within).toBe(false);
    expect(a.headroom).toBe(120e6 - 68e6);
  });
  test('insurance: gap = tail − limit, transfer efficiency = insured/tail', () => {
    const i = E.insurance(180e6, 68e6, { limit: 150e6, premium: 4.2e6 });
    expect(i.gap).toBe(30e6);
    expect(i.transfer_efficiency).toBeCloseTo(150e6 / 180e6, 6);
    expect(i.premium).toBe(4.2e6);
  });
  test('no policy → nulls, not zeros pretending to be coverage', () => {
    expect(E.insurance(180e6, 68e6, {}).limit).toBeNull();
  });
});

describe('EconomicsService.simulateVaR', () => {
  test('deterministic Monte-Carlo: tail exceeds the mean; reproducible with a seed', () => {
    const risks = [
      { title: 'Ransomware', magMin: 30e6, magMode: 52e6, magMax: 120e6 },
      { title: 'Data exposure', magMin: 4e6, magMode: 8e6, magMax: 20e6 },
    ];
    const a = E.simulateVaR(risks, { seed: 42, iterations: 5000 });
    const b = E.simulateVaR(risks, { seed: 42, iterations: 5000 });
    expect(a.expected).toBeGreaterThan(0);
    expect(a.var).toBeGreaterThan(a.expected);          // tail is worse than expected
    expect(a.var_extreme).toBeGreaterThanOrEqual(a.var); // 99th ≥ 95th
    expect(a.var).toBeCloseTo(b.var, 6);                 // seeded → reproducible
    expect(a.iterations).toBe(5000);
  });
  test('spreads a point estimate into a range so a tail still exists', () => {
    const a = E.simulateVaR([{ title: 'R', financial_exposure: 50e6 }], { seed: 7, iterations: 4000 });
    expect(a.var).toBeGreaterThan(a.expected);
    expect(a.expected).toBeGreaterThan(0);
  });
  test('no quantified risks → zeros with a clear basis', () => {
    const a = E.simulateVaR([]);
    expect(a.expected).toBe(0);
    expect(a.basis).toMatch(/no quantified risks/);
  });
});

describe('EconomicsService.compose', () => {
  test('derives the tail from the risk register when not supplied', () => {
    const out = E.compose({
      ale: 68e6,
      financials: { revenue: 8.4e9, netIncome: 1.06e9, operatingIncome: 1.4e9 },
      appetite: 120e6,
      insurance: { limit: 150e6, premium: 4.2e6 },
      risks: [{ title: 'Ransomware', magMin: 30e6, magMode: 52e6, magMax: 120e6 }],
    });
    expect(out.tail).toBeGreaterThan(0);
    expect(out.materiality.value).toBeCloseTo(0.05 * 1.06e9, 2);
    expect(out.appetite.within).toBe(true);
    expect(out.insurance.gap).toBeGreaterThanOrEqual(0);
    expect(out.ratios.pct_of_revenue).toBeCloseTo(68e6 / 8.4e9, 6);
  });
});
