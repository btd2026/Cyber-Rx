'use strict';

/** Crown-Jewel engine — deterministic, explainable scoring + graph + exposure. */

const Crit = require('../../src/services/crownjewels/CriticalityService');
const Graph = require('../../src/services/crownjewels/GraphModelService');
const { materialExposure, processExposure, crownEconomics, valueChain, severityImpact, normAsset, normRisk } = require('../../src/services/crownjewels/CrownJewelEngine');

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

describe('processExposure', () => {
  const processes = [
    { id: 'P1', name: 'Claims', criticality: 'Critical' },
    { id: 'P2', name: 'Settlement', criticality: 'High' },
    { id: 'P3', name: 'Intranet', criticality: 'Low' },
  ];
  const scored = [
    { id: 'A1', business_process_ids: ['P1'], crown_jewel: true },
    { id: 'A2', business_process_ids: ['P2'], crown_jewel: false },
  ];
  test('attributes each open risk to the processes its asset supports, ranked desc', () => {
    const risks = [
      { title: 'Ransomware', asset_id: 'A1', status: 'open', financial_exposure: 34000000 },
      { title: 'Breach', asset_id: 'A2', status: 'open', financial_exposure: 11000000 },
      { title: 'Closed', asset_id: 'A1', status: 'closed', financial_exposure: 9000000 },
    ];
    const pe = processExposure(scored, risks, processes);
    expect(pe.map((p) => p.name)).toEqual(['Claims', 'Settlement']); // ranked; Intranet has no risk → excluded
    expect(pe[0].exposure_usd).toBe(34000000);
    expect(pe[0].crown_jewel).toBe(true);
    expect(pe[1].crown_jewel).toBe(false);
  });
  test('falls back to the risk’s own linked processes when it has no asset', () => {
    const risks = [{ title: 'AI risk', business_process_ids: ['P2'], status: 'open', financial_exposure: 8000000 }];
    const pe = processExposure(scored, risks, processes);
    expect(pe).toHaveLength(1);
    expect(pe[0].name).toBe('Settlement');
    expect(pe[0].exposure_usd).toBe(8000000);
  });
});

describe('crownEconomics', () => {
  const processes = [
    { id: 'P1', name: 'Claims' },
    { id: 'P2', name: 'Settlement' },
    { id: 'P3', name: 'Portal' },
  ];
  const scored = [
    { id: 'A1', name: 'ClaimsDB', business_process_ids: ['P1', 'P2'] }, // supports two processes
    { id: 'A2', name: 'SettleEngine', business_process_ids: ['P2'] }, // shares P2 with A1
    { id: 'A3', name: 'PortalApp', business_process_ids: ['P3'] }, // isolated
  ];
  const rp = {
    Claims: { revenue: 365000000, txPerDay: 480000, tolerance: 9000000 },
    Settlement: { revenue: 73000000, txPerDay: 95000, tolerance: 5000000 },
    Portal: { revenue: 0 },
  };

  test('daily value = Σ process revenue ÷ 365; tx/day summed; tolerance = most-binding', () => {
    const e = crownEconomics(scored, processes, rp);
    // A1 supports Claims ($1M/day) + Settlement ($0.2M/day) = $1.2M/day
    expect(e.A1.daily_value_usd).toBe(1000000 + 200000);
    expect(e.A1.tx_per_day).toBe(575000);
    expect(e.A1.tolerance_usd).toBe(5000000); // min(9M, 5M)
    expect(e.A1.tolerance_process).toBe('Settlement');
  });

  test('impact radius = other systems sharing a process; isolated system has none', () => {
    const e = crownEconomics(scored, processes, rp);
    expect(e.A1.impact_radius).toEqual(['SettleEngine']); // shares P2
    expect(e.A2.impact_radius).toEqual(['ClaimsDB']);
    expect(e.A3.impact_radius).toEqual([]);
  });

  test('missing economics degrade to null, not zero/NaN', () => {
    const e = crownEconomics(scored, processes, rp);
    expect(e.A3.daily_value_usd).toBeNull();
    expect(e.A3.tx_per_day).toBeNull();
    expect(e.A3.tolerance_usd).toBeNull();
  });

  test('per-system inventory values override the process-derived fallback', () => {
    const ra = { ClaimsDB: { valuePerDay: 1200000, txPerDay: 480000 } };
    const e = crownEconomics(scored, processes, rp, ra);
    expect(e.A1.daily_value_usd).toBe(1200000); // inventory wins over $1.2M/day process-derived
    expect(e.A1.daily_value_source).toBe('inventory');
    expect(e.A1.tx_per_day).toBe(480000);
    expect(e.A1.tx_per_day_source).toBe('inventory');
    // A2 has no inventory override → still process-derived
    expect(e.A2.daily_value_source).toBe('process_revenue');
  });
});

describe('valueChain', () => {
  const processes = [
    { id: 'P1', name: 'Claims processing', criticality: 'Critical' },
    { id: 'P2', name: 'Provider payments', criticality: 'High' },
    { id: 'P3', name: 'Pharmacy', criticality: 'Critical' },
  ];
  const scored = [
    { id: 'A1', name: 'Clearinghouse', exposure: 'internet_facing', business_process_ids: ['P1', 'P2'], crown_jewel: true, crown_jewel_tier: 'tier1' },
    { id: 'A2', name: 'RxPlatform', exposure: 'internal_only', business_process_ids: ['P3'], crown_jewel: true, crown_jewel_tier: 'tier2' },
  ];
  const risks = [
    { title: 'Ransomware', severity: 'Critical', status: 'open', asset_id: 'A1', financial_exposure: 180e6 },
    { title: 'Vendor breach', severity: 'High', status: 'open', asset_id: 'A2', financial_exposure: 40e6 },
    { title: 'Closed one', severity: 'Critical', status: 'closed', asset_id: 'A1', financial_exposure: 99e6 },
  ];
  const rp = {
    'Claims processing': { revenue: 200e9, rto: 4, function: 'Claims' },
    'Provider payments': { revenue: 30e9, rto: 12, function: 'Claims' },
    Pharmacy: { revenue: 120e9, rto: 6, function: 'Pharmacy' },
  };
  const ra = { Clearinghouse: { recovery: 48 }, RxPlatform: { recovery: 12 } };

  test('groups processes into business functions with annual + daily $', () => {
    const vc = valueChain(scored, processes, risks, rp, ra);
    const names = vc.functions.map((f) => f.name).sort();
    expect(names).toEqual(['Claims', 'Pharmacy']);
    const claims = vc.functions.find((f) => f.name === 'Claims');
    expect(claims.annual_usd).toBe(230e9); // 200B + 30B
    expect(claims.daily_usd).toBe(Math.round(200e9 / 365) + Math.round(30e9 / 365));
    expect(claims.process_count).toBe(2);
  });

  test('per-process fraction of function sums to ~1', () => {
    const vc = valueChain(scored, processes, risks, rp, ra);
    const claims = vc.functions.find((f) => f.name === 'Claims');
    const sum = claims.processes.reduce((s, p) => s + (p.fraction_of_function || 0), 0);
    expect(Math.abs(sum - 1)).toBeLessThan(0.001);
    expect(claims.processes.find((p) => p.name === 'Claims processing').fraction_of_function).toBeCloseTo(200 / 230, 3);
  });

  test('cyber-risk layer = process $/hr × recovery × severity fraction (complete stop)', () => {
    const vc = valueChain(scored, processes, risks, rp, ra);
    const proc = vc.functions.find((f) => f.name === 'Claims').processes.find((p) => p.name === 'Claims processing');
    const asset = proc.assets.find((a) => a.name === 'Clearinghouse');
    const r = asset.risks[0];
    expect(proc.per_hr).toBe(Math.round(200e9 / 8760)); // rounded for display
    expect(r.impact_fraction).toBe(1.0); // Critical = full stop
    expect(r.process_stop_usd).toBe(Math.round((200e9 / 8760) * 48 * 1.0)); // stop uses unrounded $/hr
    expect(asset.internet_facing).toBe(true);
  });

  test('closed risks are excluded; severity drives the impact fraction', () => {
    const vc = valueChain(scored, processes, risks, rp, ra);
    const allRisks = vc.functions.flatMap((f) => f.processes.flatMap((p) => p.assets.flatMap((a) => a.risks)));
    expect(allRisks.find((r) => r.title === 'Closed one')).toBeUndefined();
    expect(severityImpact('high')).toBe(0.6);
    const vendor = allRisks.find((r) => r.title === 'Vendor breach');
    expect(vendor.impact_fraction).toBe(0.6);
  });

  test('each process is its own function when no function grouping is given', () => {
    const noFn = { 'Claims processing': { revenue: 200e9 }, 'Provider payments': { revenue: 30e9 }, Pharmacy: { revenue: 120e9 } };
    const vc = valueChain(scored, processes, risks, noFn, ra);
    expect(vc.functions.length).toBe(3); // one per process
  });
});

// Regression guard: models return camelCase (businessProcessIds/dataClassification/
// financialExposure), but the scorer + materialExposure read snake_case. If these
// normalizers regress, live data silently scores 0 crown jewels / $0 exposure
// (the exact bug that shipped in #267/#269). Lock the aliasing.
describe('field-casing normalization (regression guard for #267/#269)', () => {
  test('normAsset aliases model camelCase to the snake_case the scorer reads', () => {
    const a = normAsset({ id: 'A1', businessProcessIds: ['P1'], dataClassification: ['PHI'], cloudProvider: 'aws' });
    expect(a.business_process_ids).toEqual(['P1']);
    expect(a.data_classification).toEqual(['PHI']);
    expect(a.cloud_provider).toBe('aws');
  });
  test('normAsset preserves existing snake_case (unit fixtures) without clobbering', () => {
    const a = normAsset({ id: 'A1', business_process_ids: ['P2'], data_classification: ['PII'] });
    expect(a.business_process_ids).toEqual(['P2']);
    expect(a.data_classification).toEqual(['PII']);
  });
  test('normRisk aliases camelCase risk fields for materialExposure', () => {
    const r = normRisk({ assetId: 'A1', businessProcessIds: ['P1'], financialExposure: 52000000 });
    expect(r.asset_id).toBe('A1');
    expect(r.business_process_ids).toEqual(['P1']);
    expect(r.financial_exposure).toBe(52000000);
  });
  test('a camelCase (model-shaped) crown-jewel asset + risk still yields exposure end-to-end', () => {
    const crownAssets = [normAsset({ id: 'A1', businessProcessIds: ['P1'] })];
    const risks = [normRisk({ assetId: 'A1', status: 'open', financialExposure: 60000000, title: 'R' })];
    expect(materialExposure(crownAssets, risks).total).toBe(60000000);
  });
});
