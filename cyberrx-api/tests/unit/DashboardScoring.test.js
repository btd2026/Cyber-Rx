'use strict';

const S = require('../../src/config/scoring');
const Catalog = require('../../src/services/InputCatalogService');
const CJR = require('../../src/services/CrownJewelRiskService');

describe('scoring config (§6)', () => {
  test('norm min-max, equal→0.5', () => {
    expect(S.norm(5, 0, 10)).toBe(0.5);
    expect(S.norm(0, 0, 10)).toBe(0);
    expect(S.norm(10, 0, 10)).toBe(1);
    expect(S.norm(7, 3, 3)).toBe(0.5); // all equal
  });
  test('criticality weights', () => {
    expect(S.criticalityWeight('Critical')).toBe(1.0);
    expect(S.criticalityWeight('high')).toBe(0.75);
    expect(S.criticalityWeight('Low')).toBe(0.25);
    expect(S.criticalityWeight('bogus')).toBe(0);
  });
  test('exploitability: EPSS wins, else cvss/10', () => {
    expect(S.exploitability({ epss: 0.42 })).toBe(0.42);
    expect(S.exploitability({ maxCvss: 9 })).toBe(0.9);
    expect(S.exploitability({})).toBe(0);
  });
  test('exposure: EDR norm, active_threat floors 0.7', () => {
    expect(S.exposure({ edrNorm: 0.2 })).toBe(0.2);
    expect(S.exposure({ edrNorm: 0.2, activeThreat: true })).toBe(0.7);
    expect(S.exposure({ edrNorm: 0.9, activeThreat: true })).toBe(0.9);
  });
  test('composite ×100 and escalation at 25', () => {
    expect(S.compositeRisk({ criticalityNorm: 1, exploit: 1, expose: 1 })).toBe(100);
    expect(S.compositeRisk({ criticalityNorm: 0.5, exploit: 0.5, expose: 0.5 })).toBe(13);
    expect(S.escalates(25)).toBe(true);
    expect(S.escalates(24)).toBe(false);
    expect(S.ESCALATION_RESIDUAL).toBe(25);
  });
  test('confidence bands', () => {
    expect(S.confidence(0.1)).toBe('High');
    expect(S.confidence(0.45)).toBe('Medium');
    expect(S.confidence(0.9)).toBe('Low');
  });
});

describe('InputCatalogService — gating (§4)', () => {
  const ctx = (connectors, setup, invalid) => ({ connectors: new Set(connectors || []), setup: setup || {}, invalid: new Set(invalid || []) });

  test('connector satisfied by any mapped key; missing otherwise', () => {
    expect(Catalog.statusOf('EDR', ctx(['crowdstrike']))).toBe('connected');
    expect(Catalog.statusOf('EDR', ctx([]))).toBe('missing');
    expect(Catalog.statusOf('SIEM', ctx(['splunk']))).toBe('connected');
  });
  test('document provided when setup field present; invalid overrides', () => {
    expect(Catalog.statusOf('Crown Jewel Register', ctx([], { crownJewelRegister: [{ name: 'A' }] }))).toBe('provided');
    expect(Catalog.statusOf('Crown Jewel Register', ctx([], {}))).toBe('missing');
    expect(Catalog.statusOf('SBOM', ctx([], { sbom: [{ component: 'x' }] }, ['SBOM']))).toBe('invalid');
  });
  test('builtin always satisfied', () => {
    expect(Catalog.statusOf('MITRE ATT&CK', ctx([]))).toBe('connected');
  });
  test('er_crown gated until register+CMDB+VM+EDR all satisfied', () => {
    const partial = Catalog.readinessFrom('ciso', ctx(['crowdstrike'], { crownJewelRegister: [{ name: 'A' }] }));
    const crown = partial.widgets.find((w) => w.id === 'er_crown');
    expect(crown.satisfied).toBe(false);
    expect(crown.missing).toEqual(expect.arrayContaining(['CMDB', 'Vulnerability Management']));

    const full = Catalog.readinessFrom('ciso', ctx(['crowdstrike', 'qualys', 'cmdb'], { crownJewelRegister: [{ name: 'A' }] }));
    expect(full.widgets.find((w) => w.id === 'er_crown').satisfied).toBe(true);
  });
  test('readinessPct reflects satisfied widgets', () => {
    const none = Catalog.readinessFrom('ciso', ctx([], {}));
    expect(none.readinessPct).toBe(0);
    expect(none.widgets.every((w) => !w.satisfied)).toBe(true);
  });
});

describe('CrownJewelRiskService — computeFrom (pure)', () => {
  const register = { source: 'register', rows: [
    { asset_id: 'a1', name: 'ClaimsDB', criticality: 'Critical' },
    { asset_id: 'a2', name: 'Portal', criticality: 'Low' },
  ] };
  test('ranks by composite risk, ×100, top-10, escalation flag', () => {
    const out = CJR.computeFrom({
      register,
      vuln: { source: 'connector', rows: [{ asset_id: 'a1', high_crit_count: 5, max_cvss: 9.5 }, { asset_id: 'a2', high_crit_count: 0, max_cvss: 4 }] },
      edr: { source: 'connector', rows: [{ asset_id: 'a1', exposure_score: 0.9, active_threat: true }, { asset_id: 'a2', exposure_score: 0.1 }] },
    });
    expect(out.items[0].asset).toBe('ClaimsDB');
    expect(out.items[0].risk).toBeGreaterThan(out.items[1].risk);
    expect(out.mocked).toBe(false);
    expect(typeof out.items[0].escalate).toBe('boolean');
  });
  test('flags mocked when VM/EDR source is mock', () => {
    const out = CJR.computeFrom({ register, vuln: { source: 'mock', rows: [] }, edr: { source: 'mock', rows: [] } });
    expect(out.mocked).toBe(true);
  });
  test('empty register → empty items, not mocked-crash', () => {
    const out = CJR.computeFrom({ register: { source: 'register', rows: [] }, vuln: { source: 'connector', rows: [] }, edr: { source: 'connector', rows: [] } });
    expect(out.items).toEqual([]);
  });
});
