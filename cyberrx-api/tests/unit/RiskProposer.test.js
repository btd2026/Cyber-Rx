'use strict';

const { proposeRisks, estExposure } = require('../../src/services/crownjewels/RiskProposer');

describe('RiskProposer.proposeRisks (offline, self-contained)', () => {
  test('proposes a data-breach + ransomware risk for an internet-facing PHI system', () => {
    const out = proposeRisks([{ name: 'Clearinghouse', host: 'internet-facing', data: 'PHI, Financial', eol: 'no' }]);
    const titles = out.map((r) => r.title);
    expect(titles.some((t) => /PHI breach/i.test(t))).toBe(true);
    expect(titles.some((t) => /Ransomware disrupting/i.test(t))).toBe(true);
    expect(titles.some((t) => /internet-facing/i.test(t))).toBe(true);
    // every proposed risk is flagged, links to the asset, open, and estimate-labelled
    out.forEach((r) => {
      expect(r.proposed).toBe(true);
      expect(r.asset).toBe('Clearinghouse');
      expect(r.status).toBe('open');
      expect(r.financial_exposure).toBeGreaterThan(0);
      expect(r.description).toMatch(/Proposed by Nerion/);
      expect(r.description).toMatch(/modelled estimate/i);
    });
  });

  test('OT/ICS asset gets an OT ransomware (Critical) risk', () => {
    const out = proposeRisks([{ name: 'SCADA', host: 'application on-prem', data: 'OT, CUI', eol: 'no' }]);
    const ot = out.find((r) => /OT\/ICS ransomware/i.test(r.title));
    expect(ot).toBeTruthy();
    expect(ot.severity).toBe('Critical');
  });

  test('end-of-life system gets an EOL-exploit risk', () => {
    const out = proposeRisks([{ name: 'Legacy mainframe', host: 'application on-prem', data: 'PII', eol: 'yes' }]);
    expect(out.some((r) => /End-of-life-system exploit/i.test(r.title))).toBe(true);
  });

  test('no data class → no headline confidentiality risk, but still an availability risk', () => {
    const out = proposeRisks([{ name: 'Internal tool', host: 'application on-prem', data: 'Internal', eol: 'no' }]);
    expect(out.some((r) => /breach|theft|espionage/i.test(r.title))).toBe(false);
    expect(out.some((r) => /Ransomware disrupting/i.test(r.title))).toBe(true);
  });

  test('deterministic — same input yields identical output (no randomness)', () => {
    const apps = [{ name: 'A', host: 'internet-facing', data: 'PCI', eol: 'no' }];
    expect(JSON.stringify(proposeRisks(apps))).toBe(JSON.stringify(proposeRisks(apps)));
  });

  test('exposure scales up for internet-facing and end-of-life', () => {
    const base = estExposure('Critical', {});
    expect(estExposure('Critical', { internet: true })).toBeGreaterThan(base);
    expect(estExposure('Critical', { internet: true, eol: true })).toBeGreaterThan(estExposure('Critical', { internet: true }));
  });

  test('empty / nameless apps yield no proposals', () => {
    expect(proposeRisks([])).toEqual([]);
    expect(proposeRisks([{ host: 'internet' }, null])).toEqual([]);
  });

  test('caps the total number of proposals for a huge inventory', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ name: 'App' + i, host: 'internet-facing', data: 'PHI', eol: 'yes' }));
    expect(proposeRisks(many).length).toBeLessThanOrEqual(24);
  });
});
