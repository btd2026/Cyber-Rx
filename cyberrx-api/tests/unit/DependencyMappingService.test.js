'use strict';

const { extractExplicit, cosineSim, pairKey } = require('../../src/services/crownjewels/DependencyMappingService');

describe('DependencyMappingService', () => {
  describe('extractExplicit', () => {
    test('creates edges from asset.businessProcessIds', () => {
      const assets = [{ id: 'A1', businessProcessIds: ['P1', 'P2'] }];
      const edges = extractExplicit(assets, []);
      expect(edges).toHaveLength(2);
      expect(edges[0].origin).toBe('explicit');
      expect(edges[0].confidence).toBe(1.0);
      expect(edges[0].review_status).toBe('auto');
      expect(edges[0].process_id).toBe('P1');
      expect(edges[0].asset_id).toBe('A1');
    });

    test('creates edges from process.supportedBySystems', () => {
      const processes = [{ id: 'P1', supportedBySystems: ['A1', 'A2'] }];
      const edges = extractExplicit([], processes);
      expect(edges).toHaveLength(2);
      expect(edges[0].asset_id).toBe('A1');
    });

    test('deduplicates on (process_id, asset_id)', () => {
      const assets = [{ id: 'A1', businessProcessIds: ['P1'] }];
      const processes = [{ id: 'P1', supportedBySystems: ['A1'] }];
      const edges = extractExplicit(assets, processes);
      expect(edges).toHaveLength(1);
    });

    test('each edge has rationale and id', () => {
      const assets = [{ id: 'A1', businessProcessIds: ['P1'] }];
      const edges = extractExplicit(assets, []);
      expect(edges[0].id).toBeTruthy();
      expect(edges[0].rationale).toMatch(/asset\.businessProcessIds/);
    });

    test('handles empty inputs', () => {
      expect(extractExplicit([], [])).toEqual([]);
    });
  });

  describe('cosineSim', () => {
    test('identical vectors = 1', () => {
      expect(cosineSim([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
    });

    test('orthogonal = 0', () => {
      expect(cosineSim([1, 0], [0, 1])).toBeCloseTo(0);
    });
  });

  describe('pairKey', () => {
    test('deterministic key', () => {
      expect(pairKey('P1', 'A1')).toBe('P1::A1');
    });
  });
});
