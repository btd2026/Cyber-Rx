'use strict';

/**
 * EvidenceAdapterService unit tests — mocks EvidenceLedgerService so there is
 * no DB. Verifies the catalog-derived crosswalk, the value->verdict policy, and
 * that recordSignals fans each mapped signal out to the ledger per requirement.
 */

jest.mock('../../src/services/EvidenceLedgerService', () => ({
  // Pretend each requirement maps to exactly one library control.
  recordForRequirement: jest.fn(async () => [{ id: 'row' }]),
}));

const adapter = require('../../src/services/EvidenceAdapterService');
const ledger = require('../../src/services/EvidenceLedgerService');

describe('EvidenceAdapterService', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('crosswalk', () => {
    test('derives signal -> CSF refs from the catalog (vendor-independent)', () => {
      expect(adapter.SIGNAL_CONTROLS.mfa_pct).toEqual(expect.arrayContaining(['PR.AA-01', 'PR.AA-03']));
      expect(adapter.SIGNAL_CONTROLS.edr_pct).toEqual(expect.arrayContaining(['DE.CM-03', 'PR.PS-05']));
      expect(adapter.SIGNAL_CONTROLS.mttr_hrs).toEqual(expect.arrayContaining(['RS.MA-02']));
    });
    test('adds explicit mappings for signals the catalog leaves null', () => {
      expect(adapter.SIGNAL_CONTROLS.access_review_pct).toContain('PR.AA-05');
      expect(adapter.SIGNAL_CONTROLS.open_incidents).toEqual(expect.arrayContaining(['DE.AE-06', 'RS.MA-02']));
    });
  });

  describe('evidenceForSignal', () => {
    test('higher-is-better coverage maps to met/partial/not_met', () => {
      expect(adapter.evidenceForSignal({ key: 'mfa_pct', value: 95 }).status).toBe('met');
      expect(adapter.evidenceForSignal({ key: 'mfa_pct', value: 70 }).status).toBe('partial');
      expect(adapter.evidenceForSignal({ key: 'mfa_pct', value: 40 }).status).toBe('not_met');
    });
    test('lower-is-better latency inverts the thresholds', () => {
      expect(adapter.evidenceForSignal({ key: 'mttr_hrs', value: 4 }).status).toBe('met');
      expect(adapter.evidenceForSignal({ key: 'mttr_hrs', value: 12 }).status).toBe('partial');
      expect(adapter.evidenceForSignal({ key: 'mttr_hrs', value: 48 }).status).toBe('not_met');
    });
    test('borderline partial carries lower confidence than a clean verdict', () => {
      expect(adapter.evidenceForSignal({ key: 'mfa_pct', value: 95 }).confidence).toBe(0.9);
      expect(adapter.evidenceForSignal({ key: 'mfa_pct', value: 70 }).confidence).toBe(0.8);
    });
    test('returns null for signals with no policy or no crosswalk', () => {
      expect(adapter.evidenceForSignal({ key: 'priv_accts', value: 640 })).toBeNull();
      expect(adapter.evidenceForSignal({ key: 'totally_unknown', value: 1 })).toBeNull();
      expect(adapter.evidenceForSignal({ key: 'mfa_pct', value: 'n/a' })).toBeNull();
    });
  });

  describe('recordSignals', () => {
    test('records one ledger call per (mapped signal, requirement) with a stable sourceRef', async () => {
      const res = await adapter.recordSignals('org1', {
        connectorKey: 'okta', label: 'Okta',
        signals: [{ key: 'mfa_pct', value: 95, asOf: '2026-01-01T00:00:00Z' }],
      });
      const refs = adapter.SIGNAL_CONTROLS.mfa_pct;
      expect(ledger.recordForRequirement).toHaveBeenCalledTimes(refs.length);
      expect(res.recorded).toBe(refs.length); // one row per requirement (mock)
      const [orgId, framework, requirementId, ev] = ledger.recordForRequirement.mock.calls[0];
      expect(orgId).toBe('org1');
      expect(framework).toBe('nist_csf_2');
      expect(refs).toContain(requirementId);
      expect(ev.status).toBe('met');
      expect(ev.evidenceKind).toBe('connector');
      expect(ev.dimension).toBe('system');
      expect(ev.sourceRef).toBe(`connector:okta:mfa_pct:${requirementId}`);
      expect(ev.excerpt).toContain('Okta');
      expect(ev.freshnessDate).toBe('2026-01-01T00:00:00Z');
    });

    test('skips unmapped signals but still reports them', async () => {
      const res = await adapter.recordSignals('org1', {
        connectorKey: 'entra', label: 'Microsoft Entra ID',
        signals: [{ key: 'priv_accts', value: 640 }, { key: 'mfa_pct', value: 30 }],
      });
      const mapped = res.perSignal.find((s) => s.key === 'mfa_pct');
      const skipped = res.perSignal.find((s) => s.key === 'priv_accts');
      expect(skipped.mapped).toBe(false);
      expect(mapped.mapped).toBe(true);
      expect(mapped.status).toBe('not_met');
    });

    test('validates arguments', async () => {
      await expect(adapter.recordSignals('', { connectorKey: 'okta', signals: [] })).rejects.toThrow(/requires/i);
      await expect(adapter.recordSignals('org1', { connectorKey: 'okta', signals: null })).rejects.toThrow(/requires/i);
    });
  });
});
