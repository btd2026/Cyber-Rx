'use strict';

/**
 * The board/risk register sections were retired: Business capability map, Risk Appetite
 * Statements, Regulatory Register, Materiality Criteria, Benchmark Data, Third-party vendors.
 * Removed from onboarding (UI, state, payload) and the backend intake (normalization +
 * stored JSON). Guard.
 */
const fs = require('fs');
const path = require('path');

const onboarding = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/onboarding.html'), 'utf8');
const crownjewels = fs.readFileSync(path.resolve(__dirname, '../../src/routes/crownjewels.js'), 'utf8');

describe('Legacy register sections removed — onboarding', () => {
  it('no section headers remain', () => {
    ['Business capability map', 'Risk Appetite Statements', 'Regulatory Register',
      'Materiality Criteria', 'Benchmark Data', 'Third-party vendors (tier 1'].forEach((t) => {
      expect(onboarding).not.toContain(t);
    });
  });
  it('no row-list containers or register JS remain', () => {
    ['id="capRows"', 'id="rapRows"', 'id="regRows"', 'id="matRows"', 'id="benRows"', 'id="resVend"'].forEach((id) => {
      expect(onboarding).not.toContain(id);
    });
    expect(onboarding).not.toContain('function addCapRow(');
    expect(onboarding).not.toContain("var RAP=makeRowList('rapRows'");
    expect(onboarding).not.toContain('var VENDORS=');
  });
  it('the go-live payload no longer sends these registers', () => {
    expect(onboarding).not.toContain('capabilities:collectCapabilities()');
    expect(onboarding).not.toContain('riskAppetite:RAP.collect()');
    expect(onboarding).not.toContain('benchmarkData:BEN.collect()');
    expect(onboarding).not.toContain('vendors:(typeof VENDORS');
  });
});

describe('Legacy register sections removed — backend', () => {
  it('the intake route no longer normalizes or stores them', () => {
    expect(crownjewels).not.toContain('const riskAppetite = normReg');
    expect(crownjewels).not.toContain('const regulatoryRegister = normReg');
    expect(crownjewels).not.toContain('const materialityCriteria = normReg');
    expect(crownjewels).not.toContain('const benchmarkData = normReg');
    expect(crownjewels).not.toContain('const capabilities = Array.isArray(b.capabilities)');
    expect(crownjewels).not.toContain('capabilities, crownJewelRegister, bia, riskAppetite');
  });
});
