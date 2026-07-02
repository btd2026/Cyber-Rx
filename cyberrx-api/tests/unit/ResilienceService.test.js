'use strict';

/** ResilienceService — CIO/CRO operational-resilience math. Pure. */

const R = require('../../src/services/crownjewels/ResilienceService');

describe('ResilienceService', () => {
  const processes = [
    { name: 'Payments', revenue: 20.1e9, rtoHours: 6 },
    { name: 'Portal', revenue: 5.2e9, rtoHours: 12 },
  ];
  const assets = [
    { name: 'PayGateway', vendor: 'Cloud A', recoveryHours: 74, perHr: 2.3e6, eol: false },
    { name: 'PortalWeb', vendor: 'Cloud A', recoveryHours: 40, perHr: 0.6e6, eol: false },
    { name: 'SettleEngine', vendor: 'Cloud B', recoveryHours: 28, perHr: 0.9e6, eol: false },
    { name: 'LegacyMainframe', vendor: 'Cloud B', recoveryHours: 8, perHr: 0.1e6, eol: true, exposure: 12e6 },
  ];

  test('downtime cost/hr = annual revenue ÷ operating hours, ranked', () => {
    const d = R.processDowntime(processes);
    expect(d[0].name).toBe('Payments');
    expect(d[0].per_hr).toBeCloseTo(20.1e9 / 8760, 0); // ≈ $2.29M/hr
    expect(d[0].per_hr).toBeGreaterThan(d[1].per_hr);
  });

  test('worst-case recovery is the slowest system', () => {
    expect(R.worstRecovery(assets)).toBe(74);
  });

  test('single-vendor blast radius sums $/hr of dependent systems', () => {
    const v = R.vendorBlast(assets);
    expect(v.top.vendor).toBe('Cloud A');            // 2.3M + 0.6M = 2.9M/hr
    expect(v.top.per_hr).toBeCloseTo(2.9e6, 0);
    expect(v.top.systems).toEqual(['PayGateway', 'PortalWeb']);
  });

  test('tech-debt exposure sums open-risk exposure on EOL assets', () => {
    const t = R.techDebt(assets);
    expect(t.count).toBe(1);
    expect(t.exposure).toBe(12e6);
    expect(t.assets).toEqual(['LegacyMainframe']);
  });

  test('compute() assembles the block and flags data presence', () => {
    const out = R.compute({ processes, assets });
    expect(out.top_downtime_per_hr).toBeGreaterThan(0);
    expect(out.worst_recovery_hours).toBe(74);
    expect(out.top_vendor_blast.vendor).toBe('Cloud A');
    expect(out.tech_debt.exposure).toBe(12e6);
    expect(out.has_data).toBe(true);
  });

  test('no data → empty block, has_data false', () => {
    const out = R.compute({});
    expect(out.has_data).toBe(false);
    expect(out.downtime_by_process).toEqual([]);
    expect(out.worst_recovery_hours).toBeNull();
  });
});
