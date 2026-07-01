'use strict';

const { findDeterministicMatches, normalizeName, cosineSimilarity, identityKey } = require('../../src/services/crownjewels/EntityResolutionService');

describe('EntityResolutionService', () => {
  describe('normalizeName', () => {
    test('lowercases, strips suffixes and non-alphanumeric chars', () => {
      expect(normalizeName('PolicyCenter (Production)')).toBe('policycenter');
      expect(normalizeName('Acme Inc.')).toBe('acme');
      expect(normalizeName('My-DB-Server')).toBe('my db');
    });

    test('handles null/empty', () => {
      expect(normalizeName(null)).toBe('');
      expect(normalizeName('')).toBe('');
    });
  });

  describe('identityKey', () => {
    test('prefers id over hostname over name', () => {
      expect(identityKey({ id: 'A1', hostname: 'srv1', name: 'Server 1' })).toBe('id:a1');
      expect(identityKey({ hostname: 'srv1', name: 'Server 1' })).toBe('host:srv1');
      expect(identityKey({ name: 'Server 1' })).toBe('name:1');
    });

    test('returns null for items with no identity fields', () => {
      expect(identityKey({})).toBe(null);
    });
  });

  describe('cosineSimilarity', () => {
    test('identical vectors = 1', () => {
      expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
    });

    test('orthogonal vectors = 0', () => {
      expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    });

    test('handles edge cases', () => {
      expect(cosineSimilarity([], [])).toBe(0);
      expect(cosineSimilarity(null, [1])).toBe(0);
    });
  });

  describe('findDeterministicMatches', () => {
    test('groups items by exact id match', () => {
      const items = [
        { id: 'A1', name: 'Server Alpha' },
        { id: 'A1', name: 'Alpha Server (prod)' },
        { id: 'A2', name: 'Server Beta' },
      ];
      const { groups, unmatched } = findDeterministicMatches(items);
      expect(groups).toHaveLength(1);
      expect(groups[0]).toHaveLength(2);
      expect(unmatched).toHaveLength(1);
      expect(unmatched[0].id).toBe('A2');
    });

    test('groups items by normalized name', () => {
      const items = [
        { name: 'PolicyCenter Production' },
        { name: 'policycenter (prod)' },
        { name: 'Totally Different' },
      ];
      const { groups, unmatched } = findDeterministicMatches(items);
      expect(groups).toHaveLength(1);
      expect(unmatched).toHaveLength(1);
    });

    test('returns empty results for empty input', () => {
      const { groups, unmatched } = findDeterministicMatches([]);
      expect(groups).toEqual([]);
      expect(unmatched).toEqual([]);
    });

    test('items with no identity fields go to unmatched', () => {
      const { unmatched } = findDeterministicMatches([{}, {}]);
      expect(unmatched).toHaveLength(2);
    });
  });
});
