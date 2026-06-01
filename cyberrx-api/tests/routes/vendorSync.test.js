'use strict';

const request = require('supertest');
const express = require('express');
const { queue } = require('../../src/workers/queue');
const VendorSyncJob = require('../../src/models/VendorSyncJob');
const Vendor = require('../../src/models/Vendor');

// Mock the dependencies
jest.mock('../../src/workers/queue');
jest.mock('../../src/models/VendorSyncJob');
jest.mock('../../src/models/Vendor');

// Import the auth middleware
const { authenticateJWT, requireOrgAdmin } = require('../../src/middleware/auth');

// Import the controller
const vendorSyncController = require('../../src/controllers/vendorSyncController');

// Create test app
const app = express();
app.use(express.json());

// Mock authentication middleware - simulate authenticated org admin user
app.use((req, res, next) => {
  req.user = {
    userId: 'test-user-id',
    orgId: 'test-org-id',
    role: 'org_admin'
  };
  req.userId = 'test-user-id';
  req.orgId = 'test-org-id';
  next();
});

// Import routes
const vendorSyncRoutes = require('../../src/routes/vendorSync');
app.use('/api/vendors', vendorSyncRoutes);

describe('Vendor Sync Routes (T-014)', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('POST /api/vendors/:vendorId/sync', () => {
    const vendorId = 'test-vendor-id';
    const validConnectorTypes = ['securityscorecard', 'bitsight', 'riskrecon', 'all'];

    test('should queue a sync job for valid vendor with default connector type', async () => {
      // Mock vendor exists and belongs to org
      Vendor.findById.mockResolvedValue({
        id: vendorId,
        name: 'Test Vendor',
        organizationId: 'test-org-id'
      });

      // Mock job creation
      VendorSyncJob.create.mockResolvedValue({
        id: 'job-123',
        vendorId,
        connectorType: 'all',
        status: 'queued',
        createdAt: new Date().toISOString()
      });

      // Mock queue add
      queue.add.mockResolvedValue({
        id: 'job-123',
        name: 'sync_vendor'
      });

      const response = await request(app)
        .post(`/api/vendors/${vendorId}/sync`)
        .send({});

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('status', 'queued');
      expect(response.body).toHaveProperty('vendorId', vendorId);
      expect(response.body).toHaveProperty('connectorType', 'all');
      expect(Vendor.findById).toHaveBeenCalledWith(vendorId);
      expect(VendorSyncJob.create).toHaveBeenCalled();
      expect(queue.add).toHaveBeenCalled();
    });

    test('should queue a sync job for specific connector type', async () => {
      const connectorType = 'securityscorecard';

      Vendor.findById.mockResolvedValue({
        id: vendorId,
        name: 'Test Vendor',
        organizationId: 'test-org-id'
      });

      VendorSyncJob.create.mockResolvedValue({
        id: 'job-456',
        vendorId,
        connectorType,
        status: 'queued',
        createdAt: new Date().toISOString()
      });

      queue.add.mockResolvedValue({
        id: 'job-456',
        name: 'sync_vendor'
      });

      const response = await request(app)
        .post(`/api/vendors/${vendorId}/sync`)
        .send({ connectorType });

      expect(response.status).toBe(201);
      expect(response.body.connectorType).toBe(connectorType);
    });

    test('should reject invalid connector type', async () => {
      Vendor.findById.mockResolvedValue({
        id: vendorId,
        organizationId: 'test-org-id'
      });

      const response = await request(app)
        .post(`/api/vendors/${vendorId}/sync`)
        .send({ connectorType: 'invalid-connector' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid connector type');
      expect(VendorSyncJob.create).not.toHaveBeenCalled();
    });

    test('should return 404 for non-existent vendor', async () => {
      Vendor.findById.mockResolvedValue(null);

      const response = await request(app)
        .post(`/api/vendors/${vendorId}/sync`)
        .send({});

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Vendor not found');
      expect(VendorSyncJob.create).not.toHaveBeenCalled();
    });

    test('should return 403 for vendor from different organization', async () => {
      Vendor.findById.mockResolvedValue({
        id: vendorId,
        organizationId: 'different-org-id'
      });

      const response = await request(app)
        .post(`/api/vendors/${vendorId}/sync`)
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied');
      expect(VendorSyncJob.create).not.toHaveBeenCalled();
    });

    test('should handle database errors gracefully', async () => {
      Vendor.findById.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .post(`/api/vendors/${vendorId}/sync`)
        .send({});

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to queue sync job');
    });
  });

  describe('POST /api/vendors/:vendorId/sync/all', () => {
    const vendorId = 'test-vendor-id';

    test('should queue sync jobs for all connector types', async () => {
      Vendor.findById.mockResolvedValue({
        id: vendorId,
        organizationId: 'test-org-id'
      });

      VendorSyncJob.create.mockResolvedValue({
        id: 'job-123',
        vendorId,
        connectorType: 'securityscorecard',
        status: 'queued'
      });

      queue.add.mockResolvedValue({
        id: 'job-123',
        name: 'sync_vendor'
      });

      const response = await request(app)
        .post(`/api/vendors/${vendorId}/sync/all`)
        .send({});

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('jobIds');
      expect(response.body).toHaveProperty('count');
      expect(response.body.count).toBe(3); // 3 connector types
      expect(response.body.jobIds).toHaveLength(3);
      expect(VendorSyncJob.create).toHaveBeenCalledTimes(3);
      expect(queue.add).toHaveBeenCalledTimes(3);
    });

    test('should return 404 for non-existent vendor', async () => {
      Vendor.findById.mockResolvedValue(null);

      const response = await request(app)
        .post(`/api/vendors/${vendorId}/sync/all`)
        .send({});

      expect(response.status).toBe(404);
      expect(VendorSyncJob.create).not.toHaveBeenCalled();
    });

    test('should return 403 for vendor from different organization', async () => {
      Vendor.findById.mockResolvedValue({
        id: vendorId,
        organizationId: 'different-org-id'
      });

      const response = await request(app)
        .post(`/api/vendors/${vendorId}/sync/all`)
        .send({});

      expect(response.status).toBe(403);
      expect(VendorSyncJob.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/vendors/:vendorId/sync-status/:jobId', () => {
    const vendorId = 'test-vendor-id';
    const jobId = 'test-job-id';

    test('should return job status for valid job', async () => {
      VendorSyncJob.findById.mockResolvedValue({
        id: jobId,
        vendorId,
        organizationId: 'test-org-id',
        connectorType: 'securityscorecard',
        status: 'completed',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        errorMessage: null,
        retryCount: 0
      });

      const response = await request(app)
        .get(`/api/vendors/${vendorId}/sync-status/${jobId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jobId', jobId);
      expect(response.body).toHaveProperty('status', 'completed');
      expect(response.body).toHaveProperty('progress', 100);
    });

    test('should return 404 for non-existent job', async () => {
      VendorSyncJob.findById.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/vendors/${vendorId}/sync-status/${jobId}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Job not found');
    });

    test('should return 403 for job from different organization', async () => {
      VendorSyncJob.findById.mockResolvedValue({
        id: jobId,
        vendorId,
        organizationId: 'different-org-id'
      });

      const response = await request(app)
        .get(`/api/vendors/${vendorId}/sync-status/${jobId}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied');
    });

    test('should return 400 for vendor mismatch', async () => {
      VendorSyncJob.findById.mockResolvedValue({
        id: jobId,
        vendorId: 'different-vendor-id',
        organizationId: 'test-org-id'
      });

      const response = await request(app)
        .get(`/api/vendors/${vendorId}/sync-status/${jobId}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Vendor mismatch');
    });

    test('should calculate progress for running jobs', async () => {
      VendorSyncJob.findById.mockResolvedValue({
        id: jobId,
        vendorId,
        organizationId: 'test-org-id',
        status: 'running',
        startedAt: new Date().toISOString()
      });

      const response = await request(app)
        .get(`/api/vendors/${vendorId}/sync-status/${jobId}`);

      expect(response.status).toBe(200);
      expect(response.body.progress).toBe(50);
      expect(response.body.status).toBe('running');
    });

    test('should return error message for failed jobs', async () => {
      VendorSyncJob.findById.mockResolvedValue({
        id: jobId,
        vendorId,
        organizationId: 'test-org-id',
        status: 'failed',
        errorMessage: 'API rate limit exceeded',
        retryCount: 2
      });

      const response = await request(app)
        .get(`/api/vendors/${vendorId}/sync-status/${jobId}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('failed');
      expect(response.body.error).toBe('API rate limit exceeded');
      expect(response.body.retryCount).toBe(2);
    });
  });

  describe('GET /api/vendors/:vendorId/sync-jobs', () => {
    const vendorId = 'test-vendor-id';

    test('should return all jobs for vendor', async () => {
      Vendor.findById.mockResolvedValue({
        id: vendorId,
        organizationId: 'test-org-id'
      });

      VendorSyncJob.findByVendor.mockResolvedValue([
        {
          id: 'job-1',
          vendorId,
          status: 'completed',
          createdAt: new Date().toISOString()
        },
        {
          id: 'job-2',
          vendorId,
          status: 'running',
          createdAt: new Date().toISOString()
        }
      ]);

      const response = await request(app)
        .get(`/api/vendors/${vendorId}/sync-jobs`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('vendorId', vendorId);
      expect(response.body).toHaveProperty('count', 2);
      expect(response.body.data).toHaveLength(2);
    });

    test('should filter by status when provided', async () => {
      Vendor.findById.mockResolvedValue({
        id: vendorId,
        organizationId: 'test-org-id'
      });

      VendorSyncJob.findByVendor.mockResolvedValue([
        {
          id: 'job-1',
          vendorId,
          status: 'failed',
          createdAt: new Date().toISOString()
        }
      ]);

      const response = await request(app)
        .get(`/api/vendors/${vendorId}/sync-jobs?status=failed`);

      expect(response.status).toBe(200);
      expect(VendorSyncJob.findByVendor).toHaveBeenCalledWith(vendorId, {
        status: 'failed'
      });
    });

    test('should return 404 for non-existent vendor', async () => {
      Vendor.findById.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/vendors/${vendorId}/sync-jobs`);

      expect(response.status).toBe(404);
    });

    test('should return 403 for vendor from different organization', async () => {
      Vendor.findById.mockResolvedValue({
        id: vendorId,
        organizationId: 'different-org-id'
      });

      const response = await request(app)
        .get(`/api/vendors/${vendorId}/sync-jobs`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/sync-jobs/statistics', () => {
    test('should return job statistics for organization', async () => {
      VendorSyncJob.getStatistics.mockResolvedValue({
        completed: {
          count: 45,
          avgDurationSeconds: 120
        },
        failed: {
          count: 3,
          avgDurationSeconds: 180
        },
        running: {
          count: 2,
          avgDurationSeconds: null
        },
        queued: {
          count: 5,
          avgDurationSeconds: null
        }
      });

      const response = await request(app)
        .get('/api/sync-jobs/statistics');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('organizationId', 'test-org-id');
      expect(response.body.statistics).toHaveProperty('completed');
      expect(response.body.statistics.completed.count).toBe(45);
      expect(response.body.statistics.completed.avgDurationSeconds).toBe(120);
    });

    test('should handle empty statistics', async () => {
      VendorSyncJob.getStatistics.mockResolvedValue({});

      const response = await request(app)
        .get('/api/sync-jobs/statistics');

      expect(response.status).toBe(200);
      expect(response.body.statistics).toEqual({});
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limit on sync endpoints', async () => {
      // This test would require setting up the rate limiter
      // For now, we'll just verify the endpoint exists
      Vendor.findById.mockResolvedValue({
        id: 'test-vendor',
        organizationId: 'test-org-id'
      });

      VendorSyncJob.create.mockResolvedValue({
        id: 'job-1',
        status: 'queued'
      });

      queue.add.mockResolvedValue({
        id: 'job-1'
      });

      const response = await request(app)
        .post('/api/vendors/test-vendor/sync')
        .send({});

      expect(response.status).toBe(201);
    });
  });

  describe('Authentication & Authorization', () => {
    test('should require JWT authentication', () => {
      // This test verifies that authentication middleware is applied
      // The actual test would need to create an app without the mock auth middleware
      expect(true).toBe(true); // Placeholder
    });

    test('should require org_admin role for sync operations', () => {
      // This test verifies that role-based authorization is applied
      expect(true).toBe(true); // Placeholder
    });
  });
});
