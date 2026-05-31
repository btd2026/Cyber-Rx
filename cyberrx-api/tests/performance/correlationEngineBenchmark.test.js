'use strict';

const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const CorrelationEngineOptimized = require('../../src/services/CorrelationEngineOptimized');
const RedisClientFactory = require('../../src/services/redisClient');
const logger = require('../../src/utils/logger');
const { Finding, Risk, BusinessProcess, DataObject, ThreatScenario, LegalObligation } = require('../../src/models');
const { query } = require('../../src/utils/db');

/**
 * Performance Benchmark Tests for Correlation Engine
 * Tests that the optimized engine meets performance targets:
 * - Single finding: <3 seconds
 * - Batch of 50: <30 seconds
 * - Cache hit rate: >80%
 */

describe('Correlation Engine Performance Benchmarks', () => {
  let redisClient;
  let testOrgId;
  let testFindingIds = [];
  let testRiskId;
  let testBusinessProcessId;
  let testDataObjectIds = [];
  let testThreatScenarioId;
  let testLegalObligationIds = [];

  beforeAll(async () => {
    console.log('Setting up performance benchmark environment...');

    // Initialize Redis client
    redisClient = await RedisClientFactory.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      database: 2 // Use separate database for benchmarks
    });

    // Clear any existing data
    await redisClient.flushDb();

    // Initialize correlation engine
    CorrelationEngineOptimized.initialize(redisClient, logger);

    // Create test organization
    testOrgId = 'benchmark-org-' + Date.now();
    await query(
      'INSERT INTO orgs (id, name, type) VALUES ($1, $2, $3)',
      [testOrgId, 'Benchmark Test Organization', 'Payer']
    );

    // Create test business process
    testBusinessProcessId = 'benchmark-process-' + Date.now();
    await BusinessProcess.create({
      id: testBusinessProcessId,
      name: 'Claims Processing Benchmark',
      tier: 'Primary',
      criticality: 'Critical',
      owner: 'CIO',
      organizationId: testOrgId
    });

    // Create test data objects
    for (let i = 0; i < 5; i++) {
      const dataObjectId = `benchmark-data-${Date.now()}-${i}`;
      testDataObjectIds.push(dataObjectId);

      await DataObject.create({
        id: dataObjectId,
        name: `Benchmark Data Object ${i}`,
        type: i === 0 ? 'PHI' : 'PII',
        sensitivity: i < 2 ? 'Critical' : 'High',
        organizationId: testOrgId,
        recordCount: 100000 + (i * 10000)
      });
    }

    // Create test threat scenario
    testThreatScenarioId = 'benchmark-threat-' + Date.now();
    await ThreatScenario.create({
      id: testThreatScenarioId,
      name: 'Ransomware Benchmark Threat',
      type: 'ransomware',
      organizationId: testOrgId,
      probability: 70,
      impactLevel: 'Critical'
    });

    // Create test legal obligations
    for (let i = 0; i < 3; i++) {
      const legalId = `benchmark-legal-${Date.now()}-${i}`;
      testLegalObligationIds.push(legalId);

      await LegalObligation.create({
        id: legalId,
        name: `Benchmark Legal Obligation ${i}`,
        source: i === 0 ? 'HIPAA' : 'CMS',
        organizationId: testOrgId,
        notificationTimeline: `${24 + (i * 24)} hours`,
        maxPenaltyAmount: 1000000 + (i * 500000)
      });
    }

    // Create test risk
    testRiskId = 'benchmark-risk-' + Date.now();
    await Risk.create({
      id: testRiskId,
      title: 'Benchmark Risk',
      severity: 'Critical',
      status: 'open',
      organizationId: testOrgId,
      businessProcessIds: [testBusinessProcessId],
      dataObjectIds: testDataObjectIds,
      threatScenarioId: testThreatScenarioId,
      legalObligationIds: testLegalObligationIds,
      executiveOwner: 'CISO',
      financialExposure: 5000000,
      frameworkMappings: ['NIST-CSF', 'HIPAA', 'CIS-v8']
    });

    // Create test findings for benchmarks
    for (let i = 0; i < 50; i++) {
      const findingId = `benchmark-finding-${Date.now()}-${i}`;
      testFindingIds.push(findingId);

      await Finding.create({
        id: findingId,
        title: `Benchmark Finding ${i}`,
        severity: i < 5 ? 'Critical' : i < 15 ? 'High' : 'Medium',
        status: 'open',
        organizationId: testOrgId,
        discoveredDate: new Date().toISOString(),
        riskId: testRiskId,
        businessProcessId: testBusinessProcessId,
        source: 'Benchmark Scanner',
        tool: 'BenchmarkTool',
        description: `Benchmark test finding ${i} for performance testing`
      });
    }

    console.log(`Created ${testFindingIds.length} test findings for benchmarking`);
  });

  afterAll(async () => {
    console.log('Cleaning up benchmark environment...');

    // Cleanup test data
    await query('DELETE FROM findings WHERE id = ANY($1)', [testFindingIds]);
    await query('DELETE FROM risks WHERE id = $1', [testRiskId]);
    await query('DELETE FROM threat_scenarios WHERE id = $1', [testThreatScenarioId]);
    await query('DELETE FROM data_objects WHERE id = ANY($1)', [testDataObjectIds]);
    await query('DELETE FROM business_processes WHERE id = $1', [testBusinessProcessId]);
    await query('DELETE FROM legal_obligations WHERE id = ANY($1)', [testLegalObligationIds]);
    await query('DELETE FROM orgs WHERE id = $1', [testOrgId]);

    // Clear Redis cache
    await redisClient.flushDb();
    await RedisClientFactory.close();
  });

  describe('Single Finding Correlation Performance', () => {
    it('BENCHMARK: Single finding correlation (cold cache)', async () => {
      const findingId = testFindingIds[0];
      const iterations = 10;
      const timings = [];

      console.log('\n=== Single Finding Correlation Benchmark (Cold Cache) ===');
      console.log(`Running ${iterations} iterations...`);

      for (let i = 0; i < iterations; i++) {
        // Clear cache before each iteration for cold cache test
        await redisClient.flushDb();

        const startTime = Date.now();
        await CorrelationEngineOptimized.generateExecutiveNarrative(findingId, testOrgId);
        const duration = Date.now() - startTime;

        timings.push(duration);
        console.log(`  Iteration ${i + 1}: ${duration}ms`);
      }

      const avgDuration = timings.reduce((a, b) => a + b, 0) / timings.length;
      const maxDuration = Math.max(...timings);
      const minDuration = Math.min(...timings);

      console.log(`\nResults:`);
      console.log(`  Average: ${avgDuration.toFixed(0)}ms`);
      console.log(`  Min: ${minDuration}ms`);
      console.log(`  Max: ${maxDuration}ms`);
      console.log(`  Target: <3000ms`);
      console.log(`  Status: ${avgDuration < 3000 ? '✅ PASS' : '❌ FAIL'}`);

      expect(avgDuration).toBeLessThan(3000);
    });

    it('BENCHMARK: Single finding correlation (warm cache)', async () => {
      const findingId = testFindingIds[0];
      const iterations = 100;
      const timings = [];

      console.log('\n=== Single Finding Correlation Benchmark (Warm Cache) ===');
      console.log(`Running ${iterations} iterations...`);

      // Prime the cache
      await CorrelationEngineOptimized.generateExecutiveNarrative(findingId, testOrgId);

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await CorrelationEngineOptimized.generateExecutiveNarrative(findingId, testOrgId);
        const duration = Date.now() - startTime;

        timings.push(duration);
      }

      const avgDuration = timings.reduce((a, b) => a + b, 0) / timings.length;
      const maxDuration = Math.max(...timings);
      const minDuration = Math.min(...timings);
      const p50 = timings.sort((a, b) => a - b)[Math.floor(timings.length / 2)];
      const p95 = timings.sort((a, b) => a - b)[Math.floor(timings.length * 0.95)];
      const p99 = timings.sort((a, b) => a - b)[Math.floor(timings.length * 0.99)];

      console.log(`\nResults:`);
      console.log(`  Average: ${avgDuration.toFixed(2)}ms`);
      console.log(`  Min: ${minDuration}ms`);
      console.log(`  Max: ${maxDuration}ms`);
      console.log(`  P50: ${p50}ms`);
      console.log(`  P95: ${p95}ms`);
      console.log(`  P99: ${p99}ms`);
      console.log(`  Target: <100ms`);
      console.log(`  Status: ${p95 < 100 ? '✅ PASS' : '❌ FAIL'}`);

      expect(avgDuration).toBeLessThan(100);
      expect(p95).toBeLessThan(100);
    });

    it('BENCHMARK: Sequential single correlations (different findings)', async () => {
      const findingCount = 10;
      const findingsToTest = testFindingIds.slice(0, findingCount);
      const timings = [];

      console.log('\n=== Sequential Single Correlations Benchmark ===');
      console.log(`Correlating ${findingCount} different findings sequentially...`);

      await redisClient.flushDb(); // Start with cold cache

      const startTime = Date.now();

      for (let i = 0; i < findingsToTest.length; i++) {
        const findingStart = Date.now();
        await CorrelationEngineOptimized.generateExecutiveNarrative(
          findingsToTest[i],
          testOrgId
        );
        const duration = Date.now() - findingStart;
        timings.push(duration);

        console.log(`  Finding ${i + 1}: ${duration}ms`);
      }

      const totalDuration = Date.now() - startTime;
      const avgDuration = timings.reduce((a, b) => a + b, 0) / timings.length;

      console.log(`\nResults:`);
      console.log(`  Total: ${totalDuration}ms`);
      console.log(`  Average per finding: ${avgDuration.toFixed(0)}ms`);
      console.log(`  Target per finding: <3000ms`);
      console.log(`  Status: ${avgDuration < 3000 ? '✅ PASS' : '❌ FAIL'}`);

      expect(avgDuration).toBeLessThan(3000);
    });
  });

  describe('Batch Correlation Performance', () => {
    it('BENCHMARK: Batch of 10 findings', async () => {
      const batchSize = 10;
      const findingsToTest = testFindingIds.slice(0, batchSize);

      console.log('\n=== Batch Correlation Benchmark (10 findings) ===');

      await redisClient.flushDb();

      const startTime = Date.now();
      const narratives = await CorrelationEngineOptimized.batchCorrelate(
        findingsToTest,
        testOrgId
      );
      const duration = Date.now() - startTime;
      const avgPerFinding = duration / batchSize;

      console.log(`\nResults:`);
      console.log(`  Total: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
      console.log(`  Average per finding: ${avgPerFinding.toFixed(0)}ms`);
      console.log(`  Narratives returned: ${narratives.length}`);
      console.log(`  Target: <3000ms per finding`);
      console.log(`  Status: ${avgPerFinding < 3000 ? '✅ PASS' : '❌ FAIL'}`);

      expect(narratives.length).toBe(batchSize);
      expect(avgPerFinding).toBeLessThan(3000);
    });

    it('BENCHMARK: Batch of 50 findings (production target)', async () => {
      const batchSize = 50;
      const findingsToTest = testFindingIds.slice(0, batchSize);

      console.log('\n=== Batch Correlation Benchmark (50 findings) ===');
      console.log('This is the main production target test');

      await redisClient.flushDb();

      const startTime = Date.now();
      const narratives = await CorrelationEngineOptimized.batchCorrelate(
        findingsToTest,
        testOrgId
      );
      const duration = Date.now() - startTime;
      const avgPerFinding = duration / batchSize;

      console.log(`\nResults:`);
      console.log(`  Total: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
      console.log(`  Average per finding: ${avgPerFinding.toFixed(0)}ms`);
      console.log(`  Narratives returned: ${narratives.length}`);
      console.log(`  Target total: <30000ms (30s)`);
      console.log(`  Target per finding: <600ms`);
      console.log(`  Status: ${duration < 30000 && avgPerFinding < 600 ? '✅ PASS' : '❌ FAIL'}`);

      expect(narratives.length).toBe(batchSize);
      expect(duration).toBeLessThan(30000); // Total must be under 30 seconds
      expect(avgPerFinding).toBeLessThan(600); // Average must be under 600ms
    });

    it('BENCHMARK: Batch with cache hits', async () => {
      const batchSize = 50;
      const findingsToTest = testFindingIds.slice(0, batchSize);

      console.log('\n=== Batch Correlation Benchmark (with cache) ===');

      // Prime cache for first 25 findings
      for (let i = 0; i < 25; i++) {
        await CorrelationEngineOptimized.generateExecutiveNarrative(
          findingsToTest[i],
          testOrgId
        );
      }

      const startTime = Date.now();
      const narratives = await CorrelationEngineOptimized.batchCorrelate(
        findingsToTest,
        testOrgId
      );
      const duration = Date.now() - startTime;
      const avgPerFinding = duration / batchSize;

      console.log(`\nResults:`);
      console.log(`  Total: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
      console.log(`  Average per finding: ${avgPerFinding.toFixed(0)}ms`);
      console.log(`  First 25 from cache, next 25 cold`);
      console.log(`  Expected significant speedup vs cold cache`);

      // With cache, should be significantly faster
      expect(avgPerFinding).toBeLessThan(1000); // Very generous target
    });
  });

  describe('Cache Hit Rate Performance', () => {
    it('BENCHMARK: Cache hit rate with repeated correlations', async () => {
      const findingId = testFindingIds[0];
      const iterations = 100;
      const hits = [];
      const misses = [];

      console.log('\n=== Cache Hit Rate Benchmark ===');
      console.log(`Running ${iterations} correlations...`);

      await redisClient.flushDb();

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await CorrelationEngineOptimized.generateExecutiveNarrative(findingId, testOrgId);
        const duration = Date.now() - startTime;

        // Hit = <100ms, Miss = >100ms
        if (duration < 100) {
          hits.push(duration);
        } else {
          misses.push(duration);
        }
      }

      const hitRate = (hits.length / iterations) * 100;
      const avgHitTime = hits.length > 0 ? hits.reduce((a, b) => a + b, 0) / hits.length : 0;
      const avgMissTime = misses.length > 0 ? misses.reduce((a, b) => a + b, 0) / misses.length : 0;

      console.log(`\nResults:`);
      console.log(`  Cache hits: ${hits.length} (${hitRate.toFixed(1)}%)`);
      console.log(`  Cache misses: ${misses.length} (${(100 - hitRate).toFixed(1)}%)`);
      console.log(`  Avg hit time: ${avgHitTime.toFixed(2)}ms`);
      console.log(`  Avg miss time: ${avgMissTime.toFixed(0)}ms`);
      console.log(`  Target hit rate: >80%`);
      console.log(`  Status: ${hitRate > 80 ? '✅ PASS' : '❌ FAIL'}`);

      expect(hitRate).toBeGreaterThan(80);
    });
  });

  describe('Performance Metrics Validation', () => {
    it('should track accurate performance metrics', async () => {
      const findingId = testFindingIds[0];

      await redisClient.flushDb();

      // Run some correlations
      await CorrelationEngineOptimized.generateExecutiveNarrative(findingId, testOrgId);
      await CorrelationEngineOptimized.generateExecutiveNarrative(findingId, testOrgId);
      await CorrelationEngineOptimized.generateExecutiveNarrative(findingId, testOrgId);

      const metrics = CorrelationEngineOptimized.getPerformanceMetrics();

      console.log('\n=== Performance Metrics ===');
      console.log(JSON.stringify(metrics, null, 2));

      expect(metrics).toBeDefined();
      expect(metrics.correlationCount).toBeGreaterThan(0);
      expect(metrics.totalTime).toBeGreaterThan(0);
      expect(metrics.avgTime).toBeGreaterThan(0);
      expect(metrics.cacheHitRate).toBeDefined();
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not leak memory during repeated correlations', async () => {
      const findingId = testFindingIds[0];
      const iterations = 100;

      console.log('\n=== Memory Leak Detection ===');
      console.log(`Running ${iterations} correlations...`);

      const initialMemory = process.memoryUsage();
      await redisClient.flushDb();

      for (let i = 0; i < iterations; i++) {
        await CorrelationEngineOptimized.generateExecutiveNarrative(findingId, testOrgId);

        // Check memory every 10 iterations
        if (i % 10 === 0) {
          const currentMemory = process.memoryUsage();
          const heapUsedMB = (currentMemory.heapUsed / 1024 / 1024).toFixed(2);
          console.log(`  Iteration ${i}: Heap used: ${heapUsedMB}MB`);
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = ((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024).toFixed(2);

      console.log(`\nResults:`);
      console.log(`  Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Memory growth: ${memoryGrowth}MB`);
      console.log(`  Status: ${memoryGrowth < 50 ? '✅ PASS' : '⚠️  WARNING'}`);

      // Memory growth should be reasonable (<50MB for 100 correlations)
      expect(parseFloat(memoryGrowth)).toBeLessThan(50);
    });
  });
});
