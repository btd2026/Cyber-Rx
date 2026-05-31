'use strict';

const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const CorrelationEngineOptimized = require('../../src/services/CorrelationEngineOptimized');
const RedisClientFactory = require('../../src/services/redisClient');
const logger = require('../../src/utils/logger');
const { Finding, Risk, BusinessProcess, DataObject, ThreatScenario, FinancialImpact, LegalObligation, ExecutiveOwner } = require('../../src/models');
const { init, query } = require('../../src/utils/db');

describe('Correlation Engine Optimized - Integration Tests', () => {
  let redisClient;
  let testOrgId;
  let testFindingId;
  let testRiskId;
  let testBusinessProcessId;
  let testDataObjectIds;
  let testThreatScenarioId;
  let testLegalObligationIds;

  beforeAll(async () => {
    // Initialize database
    await init();

    // Initialize Redis client
    redisClient = await RedisClientFactory.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      database: 1 // Use test database
    });

    // Initialize correlation engine
    CorrelationEngineOptimized.initialize(redisClient, logger);

    // Create test organization
    testOrgId = 'test-org-' + Date.now();
    await query(
      'INSERT INTO orgs (id, name, type) VALUES ($1, $2, $3)',
      [testOrgId, 'Test Organization', 'Payer']
    );

    // Create test business process
    testBusinessProcessId = 'test-process-' + Date.now();
    await BusinessProcess.create({
      id: testBusinessProcessId,
      name: 'Claims Processing',
      tier: 'Primary',
      criticality: 'Critical',
      owner: 'CIO',
      organizationId: testOrgId,
      description: 'Primary claims processing workflow'
    });

    // Create test data objects
    const phiDataObjectId = 'data-phi-' + Date.now();
    const piiDataObjectId = 'data-pii-' + Date.now();
    testDataObjectIds = [phiDataObjectId, piiDataObjectId];

    await DataObject.create({
      id: phiDataObjectId,
      name: 'Member PHI Records',
      type: 'PHI',
      sensitivity: 'Critical',
      organizationId: testOrgId,
      recordCount: 100000,
      dataOwner: 'CISO'
    });

    await DataObject.create({
      id: piiDataObjectId,
      name: 'Member PII Records',
      type: 'PII',
      sensitivity: 'High',
      organizationId: testOrgId,
      recordCount: 100000,
      dataOwner: 'CISO'
    });

    // Create test threat scenario
    testThreatScenarioId = 'threat-ransomware-' + Date.now();
    await ThreatScenario.create({
      id: testThreatScenarioId,
      name: 'Ransomware Attack on Claims System',
      type: 'ransomware',
      organizationId: testOrgId,
      probability: 70,
      impactLevel: 'Critical',
      description: 'Ransomware targeting claims processing system'
    });

    // Create test legal obligations
    const hipaaObligationId = 'legal-hipaa-' + Date.now();
    const cmsObligationId = 'legal-cms-' + Date.now();
    testLegalObligationIds = [hipaaObligationId, cmsObligationId];

    await LegalObligation.create({
      id: hipaaObligationId,
      name: 'HIPAA Breach Notification',
      source: 'HIPAA',
      organizationId: testOrgId,
      notificationTimeline: '60 days',
      citation: '45 CFR 164.400',
      maxPenaltyAmount: 2500000
    });

    await LegalObligation.create({
      id: cmsObligationId,
      name: 'CMS Data Breach Notification',
      source: 'CMS',
      organizationId: testOrgId,
      notificationTimeline: '24 hours',
      citation: '42 CFR 423.520',
      maxPenaltyAmount: 100000
    });

    // Create test risk
    testRiskId = 'test-risk-' + Date.now();
    await Risk.create({
      id: testRiskId,
      title: 'Ransomware Risk in Claims Processing',
      severity: 'Critical',
      status: 'open',
      organizationId: testOrgId,
      businessProcessIds: [testBusinessProcessId],
      dataObjectIds: testDataObjectIds,
      threatScenarioId: testThreatScenarioId,
      legalObligationIds: testLegalObligationIds,
      executiveOwner: 'CISO',
      remediationOwner: 'IT Security',
      evidenceOwner: 'CISO Office',
      financialExposure: 5000000,
      frameworkMappings: ['NIST-CSF', 'HIPAA'],
      auditEvidenceRequired: 'Evidence of incident response procedures',
      auditTestIds: ['TEST-001', 'TEST-002'],
      likelihood: 'High'
    });

    // Create test finding
    testFindingId = 'test-finding-' + Date.now();
    await Finding.create({
      id: testFindingId,
      title: 'Unencrypted Data at Rest in Claims Database',
      severity: 'Critical',
      status: 'open',
      organizationId: testOrgId,
      discoveredDate: new Date().toISOString(),
      riskId: testRiskId,
      businessProcessId: testBusinessProcessId,
      source: 'Vulnerability Scanner',
      tool: 'Nessus',
      description: 'Unencrypted sensitive data found in claims database'
    });

    // Wait for database consistency
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Cleanup test data
    await query('DELETE FROM findings WHERE id = $1', [testFindingId]);
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

  beforeEach(async () => {
    // Clear Redis cache before each test
    await redisClient.flushDb();
  });

  describe('Single Finding Correlation Performance', () => {
    it('should correlate a single finding in under 3 seconds (cache miss)', async () => {
      const startTime = Date.now();

      const narrative = await CorrelationEngineOptimized.generateExecutiveNarrative(
        testFindingId,
        testOrgId
      );

      const duration = Date.now() - startTime;

      expect(narrative).toBeDefined();
      expect(narrative.finding).toBeDefined();
      expect(narrative.finding.id).toBe(testFindingId);
      expect(narrative.executiveNarrative).toBeDefined();
      expect(duration).toBeLessThan(3000); // Must be under 3 seconds

      console.log(`Single correlation took ${duration}ms`);
    });

    it('should correlate a cached finding in under 100ms (cache hit)', async () => {
      // First call to populate cache
      await CorrelationEngineOptimized.generateExecutiveNarrative(
        testFindingId,
        testOrgId
      );

      // Wait a bit for cache to set
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second call should hit cache
      const startTime = Date.now();
      const narrative = await CorrelationEngineOptimized.generateExecutiveNarrative(
        testFindingId,
        testOrgId
      );
      const duration = Date.now() - startTime;

      expect(narrative).toBeDefined();
      expect(narrative.finding.id).toBe(testFindingId);
      expect(duration).toBeLessThan(100); // Cache hit should be very fast

      console.log(`Cached correlation took ${duration}ms`);
    });

    it('should include all correlation components in narrative', async () => {
      const narrative = await CorrelationEngineOptimized.generateExecutiveNarrative(
        testFindingId,
        testOrgId
      );

      expect(narrative.finding).toBeDefined();
      expect(narrative.executiveNarrative).toBeDefined();
      expect(narrative.correlation).toBeDefined();

      // Check business process
      expect(narrative.executiveNarrative.businessProcess).toBeDefined();
      expect(narrative.executiveNarrative.businessProcess.name).toBe('Claims Processing');

      // Check data involvement
      expect(narrative.executiveNarrative.dataInvolvement).toBeDefined();
      expect(narrative.executiveNarrative.dataInvolvement.length).toBeGreaterThan(0);

      // Check threat
      expect(narrative.executiveNarrative.threat).toBeDefined();
      expect(narrative.executiveNarrative.threat.type).toBe('ransomware');

      // Check financial exposure
      expect(narrative.executiveNarrative.financialExposure).toBeDefined();
      expect(narrative.executiveNarrative.financialExposure.totalGrossExposure).toBe(5000000);

      // Check regulatory
      expect(narrative.executiveNarrative.regulatory).toBeDefined();
      expect(narrative.executiveNarrative.regulatory.obligations.length).toBeGreaterThan(0);

      // Check ownership
      expect(narrative.executiveNarrative.ownership).toBeDefined();
      expect(narrative.executiveNarrative.ownership.executive).toBeDefined();

      // Check audit evidence
      expect(narrative.executiveNarrative.auditEvidence).toBeDefined();
      expect(narrative.executiveNarrative.auditEvidence.required).toBe(true);
    });
  });

  describe('Batch Correlation Performance', () => {
    let testFindingIds = [];

    beforeAll(async () => {
      // Create additional test findings for batch testing
      for (let i = 0; i < 50; i++) {
        const findingId = `test-finding-batch-${Date.now()}-${i}`;
        testFindingIds.push(findingId);

        await Finding.create({
          id: findingId,
          title: `Batch Test Finding ${i}`,
          severity: 'High',
          status: 'open',
          organizationId: testOrgId,
          discoveredDate: new Date().toISOString(),
          riskId: testRiskId,
          businessProcessId: testBusinessProcessId,
          source: 'Vulnerability Scanner',
          tool: 'Nessus'
        });
      }
    });

    afterAll(async () => {
      // Cleanup batch test findings
      await query('DELETE FROM findings WHERE id = ANY($1)', [testFindingIds]);
    });

    it('should correlate 50 findings in under 30 seconds', async () => {
      const startTime = Date.now();

      const narratives = await CorrelationEngineOptimized.batchCorrelate(
        testFindingIds,
        testOrgId
      );

      const duration = Date.now() - startTime;
      const avgPerFinding = duration / testFindingIds.length;

      expect(narratives).toBeDefined();
      expect(narratives.length).toBe(testFindingIds.length);
      expect(duration).toBeLessThan(30000); // Must be under 30 seconds
      expect(avgPerFinding).toBeLessThan(600); // Average must be under 600ms per finding

      console.log(`Batch of ${testFindingIds.length} took ${duration}ms (avg: ${avgPerFinding.toFixed(0)}ms per finding)`);
    });

    it('should handle batch with mixed valid and invalid finding IDs', async () => {
      const mixedIds = [
        testFindingIds[0],
        testFindingIds[1],
        'invalid-finding-id-1',
        testFindingIds[2],
        'invalid-finding-id-2'
      ];

      const narratives = await CorrelationEngineOptimized.batchCorrelate(
        mixedIds,
        testOrgId
      );

      expect(narratives).toBeDefined();
      expect(narratives.length).toBe(mixedIds.length);

      // Check that invalid findings return error objects
      const invalidResults = narratives.filter(n => n.error);
      expect(invalidResults.length).toBe(2);

      // Check that valid findings return narratives
      const validResults = narratives.filter(n => !n.error && n.finding);
      expect(validResults.length).toBe(3);
    });
  });

  describe('Cache Performance', () => {
    it('should achieve >80% cache hit rate on repeated correlations', async () => {
      const iterations = 100;
      const timings = [];

      // First pass to populate cache
      for (let i = 0; i < 10; i++) {
        await CorrelationEngineOptimized.generateExecutiveNarrative(
          testFindingId,
          testOrgId
        );
      }

      // Second pass to measure cache hits
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await CorrelationEngineOptimized.generateExecutiveNarrative(
          testFindingId,
          testOrgId
        );
        timings.push(Date.now() - startTime);
      }

      // Calculate cache hit rate based on timing
      // Cache hits should be <100ms, misses >1000ms
      const hits = timings.filter(t => t < 100).length;
      const hitRate = (hits / iterations) * 100;

      expect(hitRate).toBeGreaterThan(80);

      console.log(`Cache hit rate: ${hitRate.toFixed(2)}% (${hits}/${iterations})`);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics', async () => {
      // Run some correlations
      await CorrelationEngineOptimized.generateExecutiveNarrative(
        testFindingId,
        testOrgId
      );

      const metrics = CorrelationEngineOptimized.getPerformanceMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.correlationCount).toBeGreaterThan(0);
      expect(metrics.totalTime).toBeGreaterThan(0);
      expect(metrics.avgTime).toBeGreaterThan(0);
      expect(metrics.cacheHitRate).toBeDefined();

      console.log('Performance metrics:', metrics);
    });

    it('should provide cache statistics', async () => {
      const cacheStats = await CorrelationEngineOptimized.getCacheStats();

      expect(cacheStats).toBeDefined();
      expect(cacheStats.uptime).toBeDefined();
      expect(cacheStats.hits).toBeDefined();
      expect(cacheStats.misses).toBeDefined();

      console.log('Cache stats:', cacheStats);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache for a finding', async () => {
      // Populate cache
      await CorrelationEngineOptimized.generateExecutiveNarrative(
        testFindingId,
        testOrgId
      );

      // Invalidate cache
      await CorrelationEngineOptimized.invalidateCache(testFindingId);

      // Next call should be a cache miss
      const startTime = Date.now();
      await CorrelationEngineOptimized.generateExecutiveNarrative(
        testFindingId,
        testOrgId
      );
      const duration = Date.now() - startTime;

      // Should take longer than cache hit (<100ms)
      expect(duration).toBeGreaterThan(100);

      console.log(`After invalidation, correlation took ${duration}ms`);
    });
  });

  describe('Organization Risk Summary', () => {
    it('should return organization risk summary', async () => {
      const summary = await CorrelationEngineOptimized.getOrganizationRiskSummary(testOrgId);

      expect(summary).toBeDefined();
      expect(summary.organizationId).toBe(testOrgId);
      expect(summary.summary).toBeDefined();
      expect(summary.summary.totalRisks).toBeGreaterThan(0);
      expect(summary.financialExposure).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle finding without risk', async () => {
      const noRiskFindingId = 'test-finding-no-risk-' + Date.now();

      await Finding.create({
        id: noRiskFindingId,
        title: 'Finding Without Risk',
        severity: 'Medium',
        status: 'open',
        organizationId: testOrgId,
        discoveredDate: new Date().toISOString()
      });

      const narrative = await CorrelationEngineOptimized.generateExecutiveNarrative(
        noRiskFindingId,
        testOrgId
      );

      expect(narrative).toBeDefined();
      expect(narrative.finding.id).toBe(noRiskFindingId);
      expect(narrative.correlation.riskId).toBeNull();

      await query('DELETE FROM findings WHERE id = $1', [noRiskFindingId]);
    });

    it('should handle finding without business process', async () => {
      const noProcessFindingId = 'test-finding-no-process-' + Date.now();

      await Finding.create({
        id: noProcessFindingId,
        title: 'Finding Without Business Process',
        severity: 'Low',
        status: 'open',
        organizationId: testOrgId,
        discoveredDate: new Date().toISOString(),
        riskId: testRiskId
      });

      const narrative = await CorrelationEngineOptimized.generateExecutiveNarrative(
        noProcessFindingId,
        testOrgId
      );

      expect(narrative).toBeDefined();
      expect(narrative.executiveNarrative.businessProcess).toBeDefined();

      await query('DELETE FROM findings WHERE id = $1', [noProcessFindingId]);
    });

    it('should throw error for non-existent finding', async () => {
      await expect(
        CorrelationEngineOptimized.generateExecutiveNarrative('non-existent-id', testOrgId)
      ).rejects.toThrow('Finding not found');
    });

    it('should throw error for access denied (wrong org)', async () => {
      await expect(
        CorrelationEngineOptimized.generateExecutiveNarrative(testFindingId, 'other-org-id')
      ).rejects.toThrow('Access denied');
    });
  });
});
