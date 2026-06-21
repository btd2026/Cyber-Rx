'use strict';

const Visibility = require('../../src/services/VisibilityService');

describe('VisibilityService.assetConfidence (per-asset data completeness)', () => {
  const fullAsset = {
    hostname: 'web-01.corp', ip_address: '10.0.0.5', owner: 'IT Ops',
    criticality: 'High', tier: 'Tier 1',
    business_process_ids: ['bp_1'], data_classification: ['PHI'],
    patch_pct: 92, end_of_support_date: '2030-01-01',
    updated_at: new Date().toISOString(), _findings: 3,
  };

  it('scores a fully-instrumented asset as High with no missing signals', () => {
    const r = Visibility.assetConfidence(fullAsset);
    expect(r.confidence).toBe(100);
    expect(r.band).toBe('High');
    expect(r.missing).toHaveLength(0);
  });

  it('scores a bare asset as Low and names every missing signal', () => {
    const r = Visibility.assetConfidence({ name: 'mystery-box' });
    expect(r.confidence).toBe(0);
    expect(r.band).toBe('Low');
    expect(r.missing.length).toBe(r.signals.length);
  });

  it('credits vuln telemetry from linked findings, not the default-0 counters', () => {
    const noFindings = Visibility.assetConfidence({ ...fullAsset, _findings: 0, vuln_critical: 0, vuln_high: 0 });
    const withFindings = Visibility.assetConfidence({ ...fullAsset, _findings: 2 });
    expect(withFindings.confidence).toBeGreaterThan(noFindings.confidence);
    expect(noFindings.missing).toContain('Vulnerability telemetry (findings)');
  });

  it('treats a stale record (>90d) as missing the freshness signal', () => {
    const stale = Visibility.assetConfidence({ ...fullAsset, updated_at: '2000-01-01T00:00:00Z' });
    expect(stale.missing).toContain('Record refreshed (<90d)');
    expect(stale.confidence).toBeLessThan(100);
  });

  it('is monotonic: adding a present signal never lowers confidence', () => {
    const base = Visibility.assetConfidence({ name: 'x' });
    const withOwner = Visibility.assetConfidence({ name: 'x', owner: 'Jane' });
    expect(withOwner.confidence).toBeGreaterThanOrEqual(base.confidence);
  });
});
