'use strict';

jest.mock('../../../src/utils/db', () => ({ query: jest.fn() }));

const db = require('../../../src/utils/db');
const Org = require('../../../src/services/OrgStructureService');

describe('OrgStructureService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('slug', () => {
    it('produces a stable id slug that matches the cockpit/onboarding convention', () => {
      expect(Org.slug('EMEA')).toBe('emea');
      expect(Org.slug('Americas')).toBe('americas');
      expect(Org.slug('UK & Ireland')).toBe('uk_ireland');
      expect(Org.slug('')).toBe('x');
    });
  });

  describe('normalizeStructure', () => {
    it('slugs region + entity ids so they line up across onboarding, API and cockpit', () => {
      const out = Org.normalizeStructure([
        { label: 'EMEA', countries: 'UK · Germany', regime: 'GDPR', entities: [{ label: 'UK & Ireland' }, { label: 'DACH' }] },
      ]);
      expect(out).toEqual([
        { id: 'emea', label: 'EMEA', countries: 'UK · Germany', regime: 'GDPR', entities: [
          { id: 'emea_uk_ireland', label: 'UK & Ireland', model: 'centralized' }, { id: 'emea_dach', label: 'DACH', model: 'centralized' },
        ] },
      ]);
    });

    it('drops regions/entities with no label and tolerates non-array input', () => {
      expect(Org.normalizeStructure(null)).toEqual([]);
      const out = Org.normalizeStructure([{ label: '' }, { label: 'APAC', entities: [{ label: '' }, { label: 'Japan' }] }]);
      expect(out).toHaveLength(1);
      expect(out[0].id).toBe('apac');
      expect(out[0].entities).toEqual([{ id: 'apac_japan', label: 'Japan', model: 'centralized' }]);
    });

    it('preserves each entity\'s operating model (default centralized; federated passes through)', () => {
      const out = Org.normalizeStructure([
        { label: 'EMEA', entities: [{ label: 'UK', model: 'federated' }, { label: 'DACH', model: 'bogus' }, { label: 'Iberia' }] },
      ]);
      expect(out[0].entities.map((e) => e.model)).toEqual(['federated', 'centralized', 'centralized']);
    });
  });

  describe('flattenScopes', () => {
    it('produces Enterprise + regions + entities with parent refs', () => {
      const scopes = Org.flattenScopes([{ id: 'apac', label: 'APAC', entities: [{ id: 'apac_japan', label: 'Japan' }] }]);
      expect(scopes[0]).toEqual({ id: 'enterprise', label: 'Enterprise', kind: 'rollup', parent: null });
      expect(scopes).toContainEqual({ id: 'apac', label: 'APAC', kind: 'region', parent: 'enterprise', countries: '', regime: '' });
      expect(scopes).toContainEqual({ id: 'apac_japan', label: 'Japan', kind: 'entity', parent: 'apac', model: 'centralized' });
    });
  });

  describe('save', () => {
    it('normalizes then persists to orgs.setup_json.org_structure via jsonb_set', async () => {
      db.query.mockResolvedValue({ rows: [] });
      const structure = await Org.save('org1', [{ label: 'Americas', entities: [{ label: 'US HQ' }] }]);
      expect(structure[0].id).toBe('americas');
      expect(db.query).toHaveBeenCalledTimes(1);
      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain("jsonb_set(COALESCE(setup_json, '{}'::jsonb), '{org_structure}'");
      expect(params[0]).toBe('org1');
      expect(JSON.parse(params[1])[0].id).toBe('americas');
    });

    it('rejects a missing orgId', async () => {
      await expect(Org.save('', [])).rejects.toThrow('orgId is required');
      expect(db.query).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('reads the stored structure back from setup_json', async () => {
      db.query.mockResolvedValue({ rows: [{ setup_json: { org_structure: [{ id: 'emea', label: 'EMEA', entities: [] }] } }] });
      const out = await Org.get('org1');
      expect(out).toEqual([{ id: 'emea', label: 'EMEA', entities: [] }]);
    });

    it('returns [] when the org has no structure', async () => {
      db.query.mockResolvedValue({ rows: [{ setup_json: {} }] });
      expect(await Org.get('org1')).toEqual([]);
      db.query.mockResolvedValue({ rows: [] });
      expect(await Org.get('org1')).toEqual([]);
    });
  });
});
