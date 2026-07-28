'use strict';

/** Tenant-validation harness — unit tests for the pure validators. */

const { checkSignal, controlCoverage, validateResult } = require('../../../scripts/validate-connectors');
const iso = () => new Date().toISOString();

describe('connector validation harness', () => {
  test('checkSignal enforces pct range, non-negative counts, freshness + provenance', () => {
    expect(checkSignal({ key: 'sspm_pct', value: 75, asOf: iso(), raw: {} }).level).toBe('PASS');
    expect(checkSignal({ key: 'sspm_pct', value: 140, asOf: iso(), raw: {} }).level).toBe('FAIL');
    expect(checkSignal({ key: 'siem_log_sources', value: -1, asOf: iso(), raw: {} }).level).toBe('FAIL');
    expect(checkSignal({ key: 'edr_pct', value: 'x', asOf: iso(), raw: {} }).level).toBe('FAIL');
    expect(checkSignal({ key: 'mfa_pct', value: 90, raw: {} }).level).toBe('WARN');            // no asOf
    expect(checkSignal({ key: 'mfa_pct', value: 90, asOf: iso() }).level).toBe('WARN');        // no raw
  });

  test('controlCoverage maps emitted signals to the 11 cockpit controls', () => {
    expect(controlCoverage([{ key: 'sspm_pct', value: 75 }])).toEqual({ SSPM: 'sspm_pct' });
    expect(controlCoverage([{ key: 'patch_pct', value: 88 }])).toEqual({ 'Vuln & Patch': 'patch_pct' });
    expect(controlCoverage([{ key: 'not_a_control', value: 1 }])).toEqual({});
  });

  test('validateResult flags catalog drift and surfaces reconciliation', () => {
    const clean = validateResult({ signals: ['sspm_pct'] }, [{ key: 'sspm_pct', value: 75, asOf: iso(), raw: {} }]);
    expect(clean.status).toBe('PASS');
    expect(clean.controlSignals).toEqual({ SSPM: 'sspm_pct' });
    expect(clean.reconciliation).toHaveLength(1);
    expect(clean.reconciliation[0].reconcileAgainst).toMatch(/posture management/i);

    const drift = validateResult({ signals: ['sspm_pct'] }, [
      { key: 'sspm_pct', value: 75, asOf: iso(), raw: {} },
      { key: 'mystery', value: 1, asOf: iso(), raw: {} },
    ]);
    expect(drift.status).toBe('WARN');
    expect(drift.undeclaredSignals).toEqual(['mystery']);
  });
});
