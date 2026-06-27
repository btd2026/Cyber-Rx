'use strict';

/** Crown-Jewel engine — deterministic, explainable scoring + graph + exposure. */

const Crit = require('../../src/services/crownjewels/CriticalityService');
const Graph = require('../../src/services/crownjewels/GraphModelService');
const { materialExposure } = require('../../src/services/crownjewels/CrownJewelEngine');

describe('CriticalityService.scoreAsset', () => {
  test('internet-facing PHI asset, sole supporter of a critical process => crown jewel with explainable breakdown', () => {
    const a = { id: 'A1', name: 'PolicyCenter', data_classification: ['PHI', 'Financial'], exposure: 'internet_facing' };
    const r = Crit.scoreAsset(a, { processes: [{ criticality: 'Critical' }, { criticality: 'High' }], isSpof: true });
    expect(r.crown_jewel).toBe(true);
    expect(['tier1', 'tier2']).toContain(r.crown_jewel_tier);
    // breakdown contributions sum to the score (auditable)
    const sum = Object.values(r.breakdown).reduce((x, y) => x + y, 0);
    expect(Math.abs(sum - r.score)).toBeLessThan(0.005);
    expect(r.breakdown.spof).toBeGreaterThan(0);
    expect(r.rationale).toMatch(/single point of failure|internet-facing|sensitive/);
  });

  test('low-sensitivity internal asset on a low process is not a crown jewel', () => {
    const a = { id: 'A2', name: 'Intranet', data_classification: ['Internal'], exposure: 'internal_only' };
    const r = Crit.scoreAsset(a, { processes: [{ criticality: 'Low' }], isSpof: false });
    expect(r.crown_jewel).toBe(false);
    expect(r.crown_jewel_tier).toBe('none');
  });

  test('data sensitivity + exposure helpers', () => {
    expect(Crit.dataSensitivity(['Public'])).toBe(0);
    expect(Crit.dataSensitivity(['PII'])).toBe(0.7);
    expect(Crit.dataSensitivity(['PHI'])).toBe(1);
    expect(Crit.exposureValue({ exposure: 'internet_facing' })).toBe(1);
    expect(Crit.exposureValue({ exposure: 'internal_only' })).toBe(0.3);
    expect(Crit.exposureValue({})).toBe(0.5);
  });
});

describe('GraphModelService.build', () => {
  test('produces typed nodes + edges', () => {
    const g = Graph.build({
      processes: [{ id: 'P1', name: 'Claims', criticality: 'Critical' }],
      assets: [{ id: 'A1', name: 'PolicyCenter', business_process_ids: ['P1'], crown_jewel_tier: 'tier1', criticality_score: 0.9 }],
      risks: [{ id: 'R1', title: 'Ransomware', asset_id: 'A1', severity: 'Critical' }],
      controls: [{ framework: 'NIST_SP_800-53', control_id: 'AC-2', asset_id: 'A1', documentation_status: 'not_documented' }],
    });
    expect(g.nodes.find((n) => n.id === 'asset:A1').attrs.crown_jewel_tier).toBe('tier1');
    expect(g.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'proc:P1', target: 'asset:A1', type: 'supports' }),
      expect.objectContaining({ source: 'risk:R1', target: 'asset:A1', type: 'threatens' }),
      expect.objectContaining({ source: 'ctrl:NIST_SP_800-53:AC-2', target: 'asset:A1', type: 'applies_to' }),
    ]));
    expect(g.nodes.find((n) => n.type === 'control').attrs.gap).toBe(true);
  });
});

describe('materialExposure', () => {
  const cj = [{ id: 'A1', business_process_ids: ['P1'] }];
  test('sums open risks tied to crown-jewel assets; excludes closed/unlinked', () => {
    const risks = [
      { title: 'Ransomware', asset_id: 'A1', status: 'open', financial_exposure: 94000000, severity: 'Critical' },
      { title: 'Closed one', asset_id: 'A1', status: 'closed', financial_exposure: 5000000 },
      { title: 'Unlinked', asset_id: 'A9', status: 'open', financial_exposure: 1000000 },
    ];
    const e = materialExposure(cj, risks);
    expect(e.total).toBe(94000000);
    expect(e.items).toHaveLength(1);
    expect(e.basis).toMatch(/risk register/);
  });
  test('reports a clear basis when no quantified risks exist', () => {
    expect(materialExposure(cj, []).basis).toMatch(/No quantified risks/);
  });
});
