'use strict';

jest.mock('../../../src/utils/db', () => ({ query: jest.fn() }));

const db = require('../../../src/utils/db');
const EE = require('../../../src/services/EntityEvidenceService');

describe('EntityEvidenceService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('inheritance chain', () => {
    it('an entity inherits region then enterprise; a region inherits enterprise', () => {
      expect(EE.parentOf('emea_dach')).toBe('emea');
      expect(EE.parentOf('emea')).toBe(null);
      expect(EE.inheritanceChain('emea_dach')).toEqual(['enterprise', 'emea', 'emea_dach']);
      expect(EE.inheritanceChain('emea')).toEqual(['enterprise', 'emea']);
      expect(EE.inheritanceChain('enterprise')).toEqual(['enterprise']);
    });
  });

  describe('merge', () => {
    it('a child scope overrides the parent, key by key', () => {
      const byScope = {
        enterprise: { signals: { edr_pct: 90, mfa_pct: 90 }, doc_scores: { 'GV.OC-01': { cmmi: 4 } } },
        emea: { signals: { mfa_pct: 95 }, doc_scores: { 'PR.DS-01': { cmmi: 4 } } },
        emea_dach: { signals: { edr_pct: 98 } },
      };
      const out = EE.merge(EE.inheritanceChain('emea_dach'), byScope);
      expect(out.signals).toEqual({ edr_pct: 98, mfa_pct: 95 }); // entity edr, region mfa, enterprise base
      expect(out.doc_scores['GV.OC-01']).toEqual({ cmmi: 4 }); // inherited from enterprise
      expect(out.doc_scores['PR.DS-01']).toEqual({ cmmi: 4 }); // from region
    });
  });

  describe('resolve', () => {
    it('reads entity_evidence and merges along the chain', async () => {
      db.query.mockResolvedValue({ rows: [{ setup_json: { entity_evidence: {
        enterprise: { signals: { edr_pct: 88 } },
        apac: { signals: { edr_pct: 68 }, doc_scores: { 'GV.OC-01': { cmmi: 2 } } },
      } } }] });
      const out = await EE.resolve('org1', 'apac');
      expect(out.signals.edr_pct).toBe(68);
      expect(out.doc_scores['GV.OC-01']).toEqual({ cmmi: 2 });
    });

    it('returns empty bundles when nothing is stored', async () => {
      db.query.mockResolvedValue({ rows: [{ setup_json: {} }] });
      expect(await EE.resolve('org1', 'emea')).toEqual({ signals: {}, doc_scores: {} });
    });
  });

  describe('saveEntity', () => {
    it('persists a scope\'s evidence via a nested jsonb_set path', async () => {
      db.query.mockResolvedValue({ rows: [] });
      await EE.saveEntity('org1', 'emea', { signals: { mfa_pct: 95 }, doc_scores: {} });
      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain("ARRAY['entity_evidence', $2]");
      expect(params[0]).toBe('org1');
      expect(params[1]).toBe('emea');
      expect(JSON.parse(params[2]).signals.mfa_pct).toBe(95);
    });

    it('rejects a missing scope', async () => {
      await expect(EE.saveEntity('org1', '', {})).rejects.toThrow('scopeId is required');
    });
  });
});
