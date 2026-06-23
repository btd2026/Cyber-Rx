'use strict';

jest.mock('../../../src/utils/db', () => ({ query: jest.fn() }));
jest.mock('../../../src/services/ControlLibraryService', () => ({
  projectFromSatisfied: jest.fn(),
  FRAMEWORKS: [{ id: 'nist_csf_2', name: 'NIST CSF 2.0' }],
}));

const db = require('../../../src/utils/db');
const Library = require('../../../src/services/ControlLibraryService');
const Ledger = require('../../../src/services/EvidenceLedgerService');

describe('EvidenceLedgerService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('normalizeStatus', () => {
    it('maps source verdicts to the three-state status', () => {
      expect(Ledger.normalizeStatus('passed')).toBe('met');
      expect(Ledger.normalizeStatus('met')).toBe('met');
      expect(Ledger.normalizeStatus('partially met')).toBe('partial');
      expect(Ledger.normalizeStatus('partial')).toBe('partial');
      expect(Ledger.normalizeStatus('failed')).toBe('not_met');
      expect(Ledger.normalizeStatus('not met')).toBe('not_met');
    });
    it('returns null for no-evidence states', () => {
      expect(Ledger.normalizeStatus('not_tested')).toBeNull();
      expect(Ledger.normalizeStatus('needs_manual_evidence')).toBeNull();
      expect(Ledger.normalizeStatus('')).toBeNull();
      expect(Ledger.normalizeStatus(undefined)).toBeNull();
    });
  });

  describe('record', () => {
    it('requires the key identity fields', async () => {
      await expect(Ledger.record('org1', { evidenceKind: 'document', sourceRef: 'x' }))
        .rejects.toThrow(/libraryControlId/);
    });
    it('upserts and returns the row', async () => {
      db.query.mockResolvedValueOnce([{ id: 'e1' }]);
      const row = await Ledger.record('org1', {
        libraryControlId: 'CL-IAM-001', evidenceKind: 'connector', sourceRef: 'cae:x', status: 'met',
      });
      expect(row).toEqual({ id: 'e1' });
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('recordForRequirement', () => {
    it('fans a verdict out to every mapped library control, normalizing status', async () => {
      // 1st query: librariesForRequirement -> two targets; then one record() per target.
      db.query
        .mockResolvedValueOnce([
          { library_control_id: 'CL-A', dimension: 'system' },
          { library_control_id: 'CL-B', dimension: 'documentation' },
        ])
        .mockResolvedValueOnce([{ id: 'e1' }])
        .mockResolvedValueOnce([{ id: 'e2' }]);
      const out = await Ledger.recordForRequirement('org1', 'nist_csf_2', 'PR.AA-02', {
        status: 'passed', sourceRef: 'upload:9', evidenceKind: 'document',
      });
      expect(out).toHaveLength(2);
      // The record() insert should have received normalized status 'met'.
      const insertCall = db.query.mock.calls[1];
      expect(insertCall[1]).toContain('met');
    });

    it('posts nothing when no library control maps to the requirement', async () => {
      db.query.mockResolvedValueOnce([]); // librariesForRequirement -> none
      const out = await Ledger.recordForRequirement('org1', 'nist_csf_2', 'ZZ.ZZ-99', {
        status: 'met', sourceRef: 'upload:9',
      });
      expect(out).toHaveLength(0);
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('projectOrgFramework', () => {
    it('feeds satisfied control ids into the library projection', async () => {
      db.query.mockResolvedValueOnce([{ library_control_id: 'CL-A' }, { library_control_id: 'CL-B' }]);
      Library.projectFromSatisfied.mockResolvedValueOnce({ framework: 'nist_csf_2', summary: { score: 42 } });
      const out = await Ledger.projectOrgFramework('org1', 'nist_csf_2');
      expect(Library.projectFromSatisfied).toHaveBeenCalledWith('nist_csf_2', ['CL-A', 'CL-B']);
      expect(out.summary.score).toBe(42);
    });
  });

  describe('dimensionRollup', () => {
    it('weights system/documentation/human and reports per-dimension scores', async () => {
      db.query.mockResolvedValueOnce([
        { dimension: 'system', touched: 4, met: 2 },        // 50
        { dimension: 'documentation', touched: 2, met: 2 }, // 100
        { dimension: 'human', touched: 1, met: 0 },         // 0
      ]);
      const out = await Ledger.dimensionRollup('org1');
      expect(out.dimensions.system.score).toBe(50);
      expect(out.dimensions.documentation.score).toBe(100);
      expect(out.dimensions.human.score).toBe(0);
      // weighted: (50*50 + 100*30 + 0*20) / (50+30+20) = (2500+3000+0)/100 = 55
      expect(out.overall).toBe(55);
    });
  });
});
