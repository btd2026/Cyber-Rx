'use strict';

const MetricsEngine = require('../../../src/services/MetricsEngine');

// A representative inputs map (what loadInputs produces from metric_inputs +
// setup_json). computeCFO is pure over this map.
function baseInputs(overrides = {}) {
  return {
    phi_records: 3000000, revenue: 10000000000, surplus: 2500000000, ibnr: 1500000000,
    it_budget: 300000000, ins_limit: 50000000, ins_deductible: 0, rbc_ratio_current: 420,
    phi_notif_per_record: 35, breach_fixed: 62000000, breach_classaction_per_record: 60,
    breach_classaction_cap: 250000000, regulatory_surplus_pct: 0.138, fwa_rev_pct: 0.03,
    phi_darkweb_per_record: 22, reput_rev_pct: 0.04, interrupt_rev_pct: 0.0137,
    interrupt_fixed: 55000000, legal_fixed: 50000000, recovery_it_pct: 0.037,
    ponemon_per_record: 429, ops_rev_pct: 0.017, capital_legal_base: 50000000,
    security_spend_pct_of_it: 0.6, avoided_loss: 380000000, annual_loss_exp: 115000000,
    prob_significant_breach: 0.23, prob_catastrophic: 0.08, catastrophic_multiplier: 3.4,
    catastrophic_ibnr_pct: 0.145, rbc_min: 200, rbc_warning: 250,
    claims_risk: 217000000, it_risk: 11000000,
    mfa_pct: 78, edr_pct: 71, patch_pct: 63, phishing_pct: 9.2, training_pct: 82,
    pam_pct: 64, vuln_sla_pct: 71, siem_days: 14, mttd_hrs: 47, mttr_hrs: 6.8,
    ...overrides,
  };
}

describe('MetricsEngine.computeCFO', () => {
  it('computes coherent exposure figures from inputs', () => {
    const c = MetricsEngine.computeCFO(baseInputs());
    expect(c.grossExp).toBeGreaterThan(0);
    expect(c.netExp).toBe(c.grossExp - 50000000); // gross minus insurance limit
    // Net exposure = gross minus insurance limit input
    expect(c.fraudM).toBe(Math.round((10000000000 * 0.03 + 3000000 * 22) / 1e6));
    expect(c.scenarios).toHaveLength(3);
    expect(['ok', 'warning', 'critical']).toContain(c.rbcStatus);
  });

  it('is editable: increasing revenue increases revenue-driven exposure', () => {
    const lo = MetricsEngine.computeCFO(baseInputs({ revenue: 10000000000 }));
    const hi = MetricsEngine.computeCFO(baseInputs({ revenue: 20000000000 }));
    expect(hi.fraudM).toBeGreaterThan(lo.fraudM);
    expect(hi.reputM).toBeGreaterThan(lo.reputM);
    expect(hi.interruptM).toBeGreaterThan(lo.interruptM);
    expect(hi.grossExp).toBeGreaterThan(lo.grossExp);
  });

  it('is editable: changing a coefficient changes the figure', () => {
    const base = MetricsEngine.computeCFO(baseInputs());
    const doubled = MetricsEngine.computeCFO(baseInputs({ phi_notif_per_record: 70 }));
    expect(doubled.breachRespM).toBeGreaterThan(base.breachRespM);
  });

  it('insurance limit drives net exposure', () => {
    const a = MetricsEngine.computeCFO(baseInputs({ ins_limit: 50000000 }));
    const b = MetricsEngine.computeCFO(baseInputs({ ins_limit: 150000000 }));
    expect(b.netExp).toBe(a.netExp - 100000000);
  });
});

describe('MetricsEngine posture', () => {
  it('postureScore is a weighted blend and cmmiLevel maps bands', () => {
    const score = MetricsEngine.postureScore(baseInputs());
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(MetricsEngine.cmmiLevel(85)).toBe(5);
    expect(MetricsEngine.cmmiLevel(65)).toBe(4);
    expect(MetricsEngine.cmmiLevel(10)).toBe(1);
  });

  it('improving posture inputs raises the score', () => {
    const lo = MetricsEngine.postureScore(baseInputs({ mfa_pct: 50, edr_pct: 50 }));
    const hi = MetricsEngine.postureScore(baseInputs({ mfa_pct: 100, edr_pct: 100 }));
    expect(hi).toBeGreaterThan(lo);
  });
});
