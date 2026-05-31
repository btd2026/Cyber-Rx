'use strict';

const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const RedisCacheService = require('../../src/services/CorrelationEngineOptimized').RedisCacheService;
const RedisClientFactory = require('../../src/services/redisClient');

describe('Redis Cache Service - Unit Tests', () => {
  let redisClient;
  let cacheService;

  beforeAll(async () => {
    redisClient = await RedisClientFactory.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      database: 1 // Use test database
    });

    cacheService = new RedisCacheService(redisClient);
  });

  afterAll(async () => {
    await redisClient.flushDb();
    await RedisClientFactory.close();
  });

  beforeEach(async () => {
    await redisClient.flushDb();
  });

  describe('Correlation Result Caching', () => {
    it('should cache and retrieve correlation result', async () => {
      const findingId = 'test-finding-1';
      const result = {
        finding: { id: findingId, title: 'Test Finding' },
        executiveNarrative: { summary: 'Test summary' }
      };

      // Cache the result
      await cacheService.cacheCorrelation(findingId, result);

      // Retrieve from cache
      const cached = await cacheService.getCachedCorrelation(findingId);

      expect(cached).toBeDefined();
      expect(cached.finding.id).toBe(findingId);
      expect(cached.finding.title).toBe('Test Finding');
      expect(cached.executiveNarrative.summary).toBe('Test summary');
    });

    it('should return null for non-existent cache entry', async () => {
      const cached = await cacheService.getCachedCorrelation('non-existent-id');
      expect(cached).toBeNull();
    });

    it('should invalidate correlation cache', async () => {
      const findingId = 'test-finding-2';
      const result = { finding: { id: findingId } };

      await cacheService.cacheCorrelation(findingId, result);
      let cached = await cacheService.getCachedCorrelation(findingId);
      expect(cached).toBeDefined();

      await cacheService.invalidateFinding(findingId);
      cached = await cacheService.getCachedCorrelation(findingId);
      expect(cached).toBeNull();
    });

    it('should set TTL on correlation cache', async () => {
      const findingId = 'test-finding-3';
      const result = { finding: { id: findingId } };

      await cacheService.cacheCorrelation(findingId, result);

      // Check TTL exists (should be 3600 seconds)
      const ttl = await redisClient.ttl(`correlation:result:${findingId}`);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(3600);
    });
  });

  describe('Business Process Caching', () => {
    it('should cache and retrieve business process', async () => {
      const processId = 'process-1';
      const process = {
        id: processId,
        name: 'Claims Processing',
        tier: 'Primary',
        criticality: 'Critical'
      };

      await cacheService.cacheProcess(processId, process);
      const cached = await cacheService.getCachedProcess(processId);

      expect(cached).toBeDefined();
      expect(cached.id).toBe(processId);
      expect(cached.name).toBe('Claims Processing');
    });
  });

  describe('Data Object Caching', () => {
    it('should cache and retrieve data object', async () => {
      const dataObjectId = 'data-1';
      const dataObject = {
        id: dataObjectId,
        name: 'Member PHI',
        type: 'PHI',
        sensitivity: 'Critical'
      };

      await cacheService.cacheDataObject(dataObjectId, dataObject);
      const cached = await cacheService.getCachedDataObject(dataObjectId);

      expect(cached).toBeDefined();
      expect(cached.id).toBe(dataObjectId);
      expect(cached.type).toBe('PHI');
    });
  });

  describe('Executive Owner Caching', () => {
    it('should cache and retrieve executive owner', async () => {
      const userId = 'user-1';
      const owner = {
        id: userId,
        roleId: 'CISO',
        name: 'John Doe',
        email: 'john.doe@example.com'
      };

      await cacheService.cacheOwner(userId, owner);
      const cached = await cacheService.getCachedOwner(userId);

      expect(cached).toBeDefined();
      expect(cached.id).toBe(userId);
      expect(cached.roleId).toBe('CISO');
    });
  });

  describe('Batch Caching', () => {
    it('should cache multiple items in batch', async () => {
      const cacheMap = {
        'correlation:data:1': { id: '1', name: 'Data 1' },
        'correlation:data:2': { id: '2', name: 'Data 2' },
        'correlation:data:3': { id: '3', name: 'Data 3' }
      };

      await cacheService.cacheBatch(cacheMap);

      // Verify all items are cached
      const item1 = await cacheService.getCachedDataObject('1');
      const item2 = await cacheService.getCachedDataObject('2');
      const item3 = await cacheService.getCachedDataObject('3');

      expect(item1).toBeDefined();
      expect(item2).toBeDefined();
      expect(item3).toBeDefined();

      expect(item1.name).toBe('Data 1');
      expect(item2.name).toBe('Data 2');
      expect(item3.name).toBe('Data 3');
    });

    it('should handle empty batch cache', async () => {
      await expect(cacheService.cacheBatch({})).resolves.not.toThrow();
    });
  });

  describe('Cache Statistics', () => {
    it('should return cache statistics', async () => {
      const stats = await cacheService.getStats();

      expect(stats).toBeDefined();
      expect(stats.uptime).toBeDefined();
      expect(stats.hits).toBeDefined();
      expect(stats.misses).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      // Create cache service with invalid client
      const badCacheService = new RedisCacheService(null);

      // Should not throw, should return null
      const result = await badCacheService.getCachedCorrelation('test-id');
      expect(result).toBeNull();
    });

    it('should handle cache set errors gracefully', async () => {
      const badCacheService = new RedisCacheService(null);

      // Should not throw
      await expect(badCacheService.cacheCorrelation('test-id', {})).resolves.not.toThrow();
    });

    it('should handle cache invalidation errors gracefully', async () => {
      const badCacheService = new RedisCacheService(null);

      // Should not throw
      await expect(badCacheService.invalidateFinding('test-id')).resolves.not.toThrow();
    });
  });

  describe('Cache Key Patterns', () => {
    it('should use correct key pattern for correlation results', async () => {
      const findingId = 'finding-123';
      const expectedKey = `correlation:result:${findingId}`;

      await cacheService.cacheCorrelation(findingId, { test: true });

      const exists = await redisClient.exists(expectedKey);
      expect(exists).toBe(1);
    });

    it('should use correct key pattern for business processes', async () => {
      const processId = 'process-456';
      const expectedKey = `correlation:process:${processId}`;

      await cacheService.cacheProcess(processId, { id: processId });

      const exists = await redisClient.exists(expectedKey);
      expect(exists).toBe(1);
    });

    it('should use correct key pattern for data objects', async () => {
      const dataObjectId = 'data-789';
      const expectedKey = `correlation:data:${dataObjectId}`;

      await cacheService.cacheDataObject(dataObjectId, { id: dataObjectId });

      const exists = await redisClient.exists(expectedKey);
      expect(exists).toBe(1);
    });

    it('should use correct key pattern for owners', async () => {
      const userId = 'user-999';
      const expectedKey = `correlation:owner:${userId}`;

      await cacheService.cacheOwner(userId, { id: userId });

      const exists = await redisClient.exists(expectedKey);
      expect(exists).toBe(1);
    });
  });

  describe('Data Serialization', () => {
    it('should handle complex nested objects', async () => {
      const complexObject = {
        finding: {
          id: '1',
          metadata: {
            nested: {
              value: 'deep',
              array: [1, 2, 3]
            }
          }
        },
        executiveNarrative: {
          summary: 'Test',
          dataInvolvement: [
            { type: 'PHI', sensitivity: 'Critical' },
            { type: 'PII', sensitivity: 'High' }
          ]
        }
      };

      await cacheService.cacheCorrelation('complex-1', complexObject);
      const cached = await cacheService.getCachedCorrelation('complex-1');

      expect(cached).toEqual(complexObject);
      expect(cached.finding.metadata.nested.array).toEqual([1, 2, 3]);
      expect(cached.executiveNarrative.dataInvolvement).toHaveLength(2);
    });

    it('should handle special characters in data', async () => {
      const specialData = {
        id: 'special-1',
        name: 'Test "quoted" value',
        description: 'Line 1\nLine 2\tTabbed',
        emoji: '🔒 🛡️ 🔐'
      };

      await cacheService.cacheCorrelation('special-1', specialData);
      const cached = await cacheService.getCachedCorrelation('special-1');

      expect(cached.name).toBe('Test "quoted" value');
      expect(cached.description).toContain('Line 1');
      expect(cached.emoji).toBe('🔒 🛡️ 🔐');
    });
  });
});
