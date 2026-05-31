const request = require('supertest');
const app = require('../../src/index');
const { insertSampleData, sampleFindings } = require('../fixtures/sampleData');

describe('Correlation API Integration Tests', () => {
  let authToken;
  let orgId = 'test-org-123';
  let testFindingId;

  beforeAll(async () => {
    // Setup test database
    await insertSampleData(global.testPool);

    // Generate auth token
    authToken = global.generateTestToken(1, 'cio');

    // Create a test finding
    const response = await request(app)
      .post('/api/findings')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-org-id', orgId)
      .send({
        title: 'Critical CVE in Claims System',
        severity: 'Critical',
        status: 'open',
        discoveredDate: new Date('2024-01-15').toISOString(),
        source: 'RecordedFuture',
        tool: 'RecordedFuture',
        riskId: 'risk-1',
        assetId: 'asset-1',
        businessProcessId: 'bp-1'
      });

    testFindingId = response.body.id;
  });

  beforeEach(async () => {
    // Reset database before each test
    await global.resetTestDatabase();
    // Re-insert sample data
    await insertSampleData(global.testPool);
  });

  describe('POST /api/correlation/narrative/:findingId - Generate executive narrative', () => {
    it('should generate executive narrative successfully', async () => {
      const response = await request(app)
        .post(`/api/correlation/narrative/${testFindingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .expect(200);

      // Verify structure
      expect(response.body).toHaveProperty('finding');
      expect(response.body).toHaveProperty('executiveNarrative');
      expect(response.body).toHaveProperty('correlation');

      // Verify finding data
      expect(response.body.finding.id).toBe(testFindingId);
      expect(response.body.finding.title).toBeDefined();
      expect(response.body.finding.severity).toBeDefined();

      // Verify executive narrative
      const narrative = response.body.executiveNarrative;
      expect(narrative).toHaveProperty('summary');
      expect(narrative).toHaveProperty('financialExposure');
      expect(narrative).toHaveProperty('regulatory');
      expect(narrative).toHaveProperty('ownership');
    });

    it('should include business process correlation', async () => {
      const response = await request(app)
        .post(`/api/correlation/narrative/${testFindingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .expect(200);

      expect(response.body.executiveNarrative.businessProcess).toBeDefined();
      expect(response.body.correlation.businessProcessId).toBeDefined();
    });

    it('should include threat scenario analysis', async () => {
      const response = await request(app)
        .post(`/api/correlation/narrative/${testFindingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .expect(200);

      // Threat scenario might be null if not linked
      const threat = response.body.executiveNarrative.threat;
      if (threat) {
        expect(threat).toHaveProperty('type');
        expect(threat).toHaveProperty('probability');
        expect(threat).toHaveProperty('impact');
      }
    });

    it('should include financial exposure analysis', async () => {
      const response = await request(app)
        .post(`/api/correlation/narrative/${testFindingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .expect(200);

      const financial = response.body.executiveNarrative.financialExposure;
      expect(financial).toBeDefined();
      expect(financial).toHaveProperty('totalGrossExposure');
    });

    it('should include regulatory compliance information', async () => {
      const response = await request(app)
        .post(`/api/correlation/narrative/${testFindingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .expect(200);

      const regulatory = response.body.executiveNarrative.regulatory;
      expect(regulatory).toBeDefined();
      expect(regulatory).toHaveProperty('frameworks');
      expect(regulatory).toHaveProperty('obligations');
    });

    it('should include ownership information', async () => {
      const response = await request(app)
        .post(`/api/correlation/narrative/${testFindingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .expect(200);

      const ownership = response.body.executiveNarrative.ownership;
      expect(ownership).toBeDefined();
      expect(ownership).toHaveProperty('executive');
      expect(ownership).toHaveProperty('remediationOwner');
      expect(ownership).toHaveProperty('evidenceOwner');
    });

    it('should return 404 for non-existent finding', async () => {
      const response = await request(app)
        .post('/api/correlation/narrative/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/correlation/narrative/${testFindingId}`)
        .set('x-org-id', orgId)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should deny access to findings from other organizations', async () => {
      const response = await request(app)
        .post(`/api/correlation/narrative/${testFindingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', 'different-org')
        .expect(403);

      expect(response.body.error).toContain('access');
    });
  });

  describe('POST /api/correlation/batch - Batch correlate findings', () => {
    let findingIds;

    beforeEach(async () => {
      // Create multiple findings for batch testing
      findingIds = [];
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/findings')
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-org-id', orgId)
          .send({
            title: `Test Finding ${i}`,
            severity: 'High',
            status: 'open',
            discoveredDate: new Date().toISOString()
          });
        findingIds.push(response.body.id);
      }
    });

    it('should batch correlate multiple findings', async () => {
      const response = await request(app)
        .post('/api/correlation/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .send({ findingIds })
        .expect(200);

      expect(response.body).toHaveProperty('count');
      expect(response.body.count).toBe(3);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(3);
    });

    it('should return narratives for all findings', async () => {
      const response = await request(app)
        .post('/api/correlation/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .send({ findingIds })
        .expect(200);

      response.body.data.forEach((narrative, index) => {
        expect(narrative.finding.id).toBe(findingIds[index]);
        expect(narrative.executiveNarrative).toBeDefined();
      });
    });

    it('should require findingIds array', async () => {
      const response = await request(app)
        .post('/api/correlation/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .send({})
        .expect(400);

      expect(response.body.error).toContain('findingIds');
    });

    it('should limit batch size to 50 findings', async () => {
      const largeArray = Array(51).fill('finding-id');

      const response = await request(app)
        .post('/api/correlation/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .send({ findingIds: largeArray })
        .expect(400);

      expect(response.body.error).toContain('Maximum 50');
    });

    it('should handle individual correlation failures gracefully', async () => {
      const invalidFindingIds = [...findingIds, 'nonexistent-id'];

      const response = await request(app)
        .post('/api/correlation/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .send({ findingIds: invalidFindingIds })
        .expect(200);

      expect(response.body.count).toBe(4);
      expect(response.body.data[3].error).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/correlation/batch')
        .set('x-org-id', orgId)
        .send({ findingIds })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/correlation/summary - Get organization risk summary', () => {
    beforeEach(async () => {
      // Insert sample findings for summary
      for (const [key, finding] of Object.entries(sampleFindings)) {
        await global.testPool.query(
          `INSERT INTO test_findings (id, title, severity, status, source, organization_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [finding.id, finding.title, finding.severity, finding.status, finding.source, finding.organization_id]
        );
      }
    });

    it('should get organization risk summary', async () => {
      const response = await request(app)
        .get('/api/correlation/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .expect(200);

      expect(response.body).toHaveProperty('organizationId');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('financialExposure');
      expect(response.body).toHaveProperty('topRisks');
      expect(response.body).toHaveProperty('repeatFindings');
    });

    it('should include risk statistics', async () => {
      const response = await request(app)
        .get('/api/correlation/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .expect(200);

      const summary = response.body.summary;
      expect(summary).toHaveProperty('totalRisks');
      expect(summary).toHaveProperty('openRisks');
      expect(summary).toHaveProperty('criticalRisks');
      expect(summary).toHaveProperty('repeatFindings');
    });

    it('should include financial exposure totals', async () => {
      const response = await request(app)
        .get('/api/correlation/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .expect(200);

      const financial = response.body.financialExposure;
      expect(financial).toBeDefined();
    });

    it('should include executive roster', async () => {
      const response = await request(app)
        .get('/api/correlation/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .expect(200);

      expect(response.body).toHaveProperty('executiveRoster');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/correlation/summary')
        .set('x-org-id', orgId)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle finding with no correlations gracefully', async () => {
      // Create minimal finding with no relationships
      const response = await request(app)
        .post('/api/findings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .send({
          title: 'Minimal Finding',
          severity: 'Low',
          status: 'open',
          discoveredDate: new Date().toISOString()
        });

      const findingId = response.body.id;

      const narrative = await request(app)
        .post(`/api/correlation/narrative/${findingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .expect(200);

      // Should still return complete structure, even with null fields
      expect(narrative.body.executiveNarrative).toBeDefined();
    });

    it('should handle malformed finding IDs', async () => {
      const response = await request(app)
        .post('/api/correlation/narrative/invalid-id-format')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('should handle empty batch request', async () => {
      const response = await request(app)
        .post('/api/correlation/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .send({ findingIds: [] })
        .expect(200);

      expect(response.body.count).toBe(0);
      expect(response.body.data).toEqual([]);
    });
  });
});
