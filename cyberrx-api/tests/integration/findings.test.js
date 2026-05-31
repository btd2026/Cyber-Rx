const request = require('supertest');
const app = require('../../src/index');
const { insertSampleData, sampleFindings } = require('../fixtures/sampleData');

describe('Findings API Integration Tests', () => {
  let authToken;
  let orgId = 'test-org-123';

  beforeAll(async () => {
    // Setup test database
    await insertSampleData(global.testPool);

    // Generate auth token
    authToken = global.generateTestToken(1, 'cio');
  });

  beforeEach(async () => {
    // Reset database before each test
    await global.resetTestDatabase();
  });

  describe('POST /api/findings - Create finding', () => {
    const validFinding = {
      title: 'Critical CVE in Claims System',
      description: 'Remote code execution vulnerability',
      severity: 'Critical',
      status: 'open',
      discoveredDate: new Date('2024-01-15').toISOString(),
      source: 'RecordedFuture',
      tool: 'RecordedFuture',
      sourceRef: 'CVE-2024-1234'
    };

    it('should create finding successfully', async () => {
      const response = await request(app)
        .post('/api/findings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .send(validFinding)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(validFinding.title);
      expect(response.body.severity).toBe(validFinding.severity);
      expect(response.body.status).toBe(validFinding.status);
      expect(response.body.organizationId).toBe(orgId);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/findings')
        .set('x-org-id', orgId)
        .send(validFinding)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should require organization ID header', async () => {
      const response = await request(app)
        .post('/api/findings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validFinding)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should validate required title field', async () => {
      const invalidFinding = { ...validFinding };
      delete invalidFinding.title;

      const response = await request(app)
        .post('/api/findings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .send(invalidFinding)
        .expect(400);

      expect(response.body.error).toContain('title');
    });

    it('should validate severity enum', async () => {
      const invalidFinding = {
        ...validFinding,
        severity: 'Urgent'
      };

      const response = await request(app)
        .post('/api/findings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .send(invalidFinding)
        .expect(400);

      expect(response.body.error).toContain('Severity');
    });

    it('should validate status enum', async () => {
      const invalidFinding = {
        ...validFinding,
        status: 'pending'
      };

      const response = await request(app)
        .post('/api/findings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .send(invalidFinding)
        .expect(400);

      expect(response.body.error).toContain('Status');
    });

    it('should require discoveredDate', async () => {
      const invalidFinding = { ...validFinding };
      delete invalidFinding.discoveredDate;

      const response = await request(app)
        .post('/api/findings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .send(invalidFinding)
        .expect(400);

      expect(response.body.error).toContain('Discovered date');
    });

    it('should auto-detect repeat findings', async () => {
      // Create first finding
      await request(app)
        .post('/api/findings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .send({
          ...validFinding,
          assetId: 'asset-123',
          tool: 'RecordedFuture'
        })
        .expect(201);

      // Create similar finding (should be marked as repeat)
      const response = await request(app)
        .post('/api/findings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .send({
          ...validFinding,
          assetId: 'asset-123',
          tool: 'RecordedFuture'
        })
        .expect(201);

      expect(response.body.isRepeat).toBe(true);
      expect(response.body.repeatCount).toBe(1);
      expect(response.body.originalFindingId).toBeDefined();
    });
  });

  describe('GET /api/findings - Get findings', () => {
    beforeEach(async () => {
      // Insert sample findings
      for (const [key, finding] of Object.entries(sampleFindings)) {
        await global.testPool.query(
          `INSERT INTO test_findings (id, title, severity, status, source, organization_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [finding.id, finding.title, finding.severity, finding.status, finding.source, finding.organization_id]
        );
      }
    });

    it('should get all findings for organization', async () => {
      const response = await request(app)
        .get('/api/findings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should filter findings by severity', async () => {
      const response = await request(app)
        .get('/api/findings?severity=Critical')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .expect(200);

      response.body.forEach(finding => {
        expect(finding.severity).toBe('Critical');
      });
    });

    it('should filter findings by status', async () => {
      const response = await request(app)
        .get('/api/findings?status=open')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .expect(200);

      response.body.forEach(finding => {
        expect(finding.status).toBe('open');
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/findings')
        .set('x-org-id', orgId)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/findings?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(2);
    });
  });

  describe('GET /api/findings/:id - Get finding by ID', () => {
    it('should get finding by ID', async () => {
      // Create a finding first
      const createResponse = await request(app)
        .post('/api/findings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .send({
          title: 'Test Finding',
          severity: 'High',
          status: 'open',
          discoveredDate: new Date().toISOString()
        })
        .expect(201);

      const findingId = createResponse.body.id;

      // Get the finding
      const response = await request(app)
        .get(`/api/findings/${findingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .expect(200);

      expect(response.body.id).toBe(findingId);
      expect(response.body.title).toBe('Test Finding');
    });

    it('should return 404 for non-existent finding', async () => {
      const response = await request(app)
        .get('/api/findings/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('should deny access to findings from other organizations', async () => {
      // Create finding for org-123
      const createResponse = await request(app)
        .post('/api/findings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .send({
          title: 'Test Finding',
          severity: 'High',
          status: 'open',
          discoveredDate: new Date().toISOString()
        })
        .expect(201);

      const findingId = createResponse.body.id;

      // Try to access with different org
      const response = await request(app)
        .get(`/api/findings/${findingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', 'different-org')
        .expect(403);

      expect(response.body.error).toContain('access');
    });
  });

  describe('PUT /api/findings/:id - Update finding', () => {
    it('should update finding successfully', async () => {
      // Create finding
      const createResponse = await request(app)
        .post('/api/findings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .send({
          title: 'Original Title',
          severity: 'High',
          status: 'open',
          discoveredDate: new Date().toISOString()
        })
        .expect(201);

      const findingId = createResponse.body.id;

      // Update finding
      const response = await request(app)
        .put(`/api/findings/${findingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .send({
          title: 'Updated Title',
          status: 'in_progress'
        })
        .expect(200);

      expect(response.body.title).toBe('Updated Title');
      expect(response.body.status).toBe('in_progress');
    });

    it('should prevent updating severity to invalid value', async () => {
      // Create finding
      const createResponse = await request(app)
        .post('/api/findings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .send({
          title: 'Test Finding',
          severity: 'High',
          status: 'open',
          discoveredDate: new Date().toISOString()
        })
        .expect(201);

      const findingId = createResponse.body.id;

      // Try to update with invalid severity
      const response = await request(app)
        .put(`/api/findings/${findingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .send({
          severity: 'Invalid'
        })
        .expect(400);

      expect(response.body.error).toContain('Severity');
    });
  });

  describe('DELETE /api/findings/:id - Delete finding', () => {
    it('should delete finding successfully', async () => {
      // Create finding
      const createResponse = await request(app)
        .post('/api/findings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .send({
          title: 'Test Finding',
          severity: 'High',
          status: 'open',
          discoveredDate: new Date().toISOString()
        })
        .expect(201);

      const findingId = createResponse.body.id;

      // Delete finding
      await request(app)
        .delete(`/api/findings/${findingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .expect(200);

      // Verify deletion
      await request(app)
        .get(`/api/findings/${findingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .expect(404);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/findings/some-id')
        .set('x-org-id', orgId)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should deny access to findings from other organizations', async () => {
      // Create finding for org-123
      const createResponse = await request(app)
        .post('/api/findings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .send({
          title: 'Test Finding',
          severity: 'High',
          status: 'open',
          discoveredDate: new Date().toISOString()
        })
        .expect(201);

      const findingId = createResponse.body.id;

      // Try to delete with different org
      const response = await request(app)
        .delete(`/api/findings/${findingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', 'different-org')
        .expect(403);

      expect(response.body.error).toContain('access');
    });
  });

  describe('GET /api/findings/statistics - Get finding statistics', () => {
    beforeEach(async () => {
      // Insert sample findings
      for (const [key, finding] of Object.entries(sampleFindings)) {
        await global.testPool.query(
          `INSERT INTO test_findings (id, title, severity, status, source, organization_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [finding.id, finding.title, finding.severity, finding.status, finding.source, finding.organization_id]
        );
      }
    });

    it('should get finding statistics', async () => {
      const response = await request(app)
        .get('/api/findings/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('bySeverity');
      expect(response.body).toHaveProperty('openFindings');
    });
  });

  describe('GET /api/findings/repeats - Get repeat findings', () => {
    it('should get repeat findings', async () => {
      // Create repeat findings
      await request(app)
        .post('/api/findings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .send({
          title: 'Repeat Finding',
          severity: 'High',
          status: 'open',
          discoveredDate: new Date().toISOString(),
          assetId: 'asset-123',
          tool: 'RecordedFuture',
          isRepeat: true,
          originalFindingId: 'original-1',
          repeatCount: 3
        })
        .expect(201);

      const response = await request(app)
        .get('/api/findings/repeats')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-org-id', orgId)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });
  });
});
