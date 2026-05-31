'use strict';

const request = require('supertest');
const { app } = require('../../src/index');
const { VendorSyncJob } = require('../../src/models/VendorSyncJob');
const { query } = require('../../src/utils/db');
const jwt = require('jsonwebtoken');

// Mock database queries
jest.mock('../../src/utils/db');

// Mock JWT authentication
jest.mock('../../src/middleware/auth', () => ({
  authenticateJWT: (req, res, next) => {
    req.user = {
      userId: 'test-user-id',
      organizationId: 'test-org-id'
    };
    req.orgId = 'test-org-id';
    next();
  }
}));

describe('Sync Status API', () => {
  const mockJobId = '550e8400-e29b-41d4-a716-446655440000';
  const mockVendorId = '550e8400-e29b-41d4-a716-446655440001';
  const mockOrgId = 'test-org-id';
  const mockUserId = 'test-user-id';

  const mockJob = {
    id: mockJobId,
    organization_id: mockOrgId,
    vendor_id: mockVendorId,
    connector_type: 'bcbs_210',
    job_type: 'sync_vendor',
    status: 'running',
    started_at: new Date().toISOString(),
    completed_at: null,
    error_message: null,
    retry_count: 0,
    metadata: { progress: 50 },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/vendors/:vendorId/sync-status/:jobId', () => {
    it('should return sync job status successfully', async () => {
      query.mockResolvedValueOnce([mockJob]);

      const response = await request(app)
        .get(`/api/vendors/${mockVendorId}/sync-status/${mockJobId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        jobId: mockJobId,
        vendorId: mockVendorId,
        connectorType: 'bcbs_210',
        jobType: 'sync_vendor',
        status: 'running',
        progress: 50,
        retryCount: 0
      });
      expect(response.body).toHaveProperty('startedAt');
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should return 404 if job not found', async () => {
      query.mockResolvedValueOnce([]);

      const response = await request(app)
        .get(`/api/vendors/${mockVendorId}/sync-status/${mockJobId}`)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Not Found',
        message: expect.stringContaining('not found')
      });
    });

    it('should return 403 if user does not belong to job organization', async () => {
      const unauthorizedJob = {
        ...mockJob,
        organization_id: 'different-org-id'
      };
      query.mockResolvedValueOnce([unauthorizedJob]);

      const response = await request(app)
        .get(`/api/vendors/${mockVendorId}/sync-status/${mockJobId}`)
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Forbidden',
        message: expect.stringContaining('permission')
      });
    });

    it('should return 400 for invalid vendorId format', async () => {
      const response = await request(app)
        .get('/api/vendors/invalid-uuid/sync-status/550e8400-e29b-41d4-a716-446655440000')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('Invalid vendorId')
      });
    });

    it('should return 400 for invalid jobId format', async () => {
      const response = await request(app)
        .get('/api/vendors/550e8400-e29b-41d4-a716-446655440001/sync-status/invalid-uuid')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('Invalid jobId')
      });
    });

    it('should return 500 if database error occurs', async () => {
      query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get(`/api/vendors/${mockVendorId}/sync-status/${mockJobId}`)
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Internal Server Error',
        message: 'Failed to fetch sync status'
      });
    });

    it('should calculate progress as 0 for queued jobs', async () => {
      const queuedJob = {
        ...mockJob,
        status: 'queued',
        metadata: null
      };
      query.mockResolvedValueOnce([queuedJob]);

      const response = await request(app)
        .get(`/api/vendors/${mockVendorId}/sync-status/${mockJobId}`)
        .expect(200);

      expect(response.body.progress).toBe(0);
    });

    it('should calculate progress as 100 for completed jobs', async () => {
      const completedJob = {
        ...mockJob,
        status: 'completed',
        completed_at: new Date().toISOString()
      };
      query.mockResolvedValueOnce([completedJob]);

      const response = await request(app)
        .get(`/api/vendors/${mockVendorId}/sync-status/${mockJobId}`)
        .expect(200);

      expect(response.body.progress).toBe(100);
    });
  });

  describe('GET /api/vendors/:vendorId/sync-jobs', () => {
    const mockJobs = [
      {
        ...mockJob,
        status: 'completed',
        completed_at: new Date().toISOString()
      },
      {
        ...mockJob,
        id: '550e8400-e29b-41d4-a716-446655440002',
        status: 'running',
        started_at: new Date().toISOString()
      },
      {
        ...mockJob,
        id: '550e8400-e29b-41d4-a716-446655440003',
        status: 'queued'
      }
    ];

    it('should return list of sync jobs for vendor', async () => {
      query.mockResolvedValueOnce(mockJobs);

      const response = await request(app)
        .get(`/api/vendors/${mockVendorId}/sync-jobs`)
        .expect(200);

      expect(response.body).toMatchObject({
        vendorId: mockVendorId,
        jobs: expect.any(Array),
        pagination: expect.any(Object)
      });
      expect(response.body.jobs).toHaveLength(3);
      expect(response.body.pagination).toMatchObject({
        total: expect.any(Number),
        limit: 50,
        offset: 0,
        hasMore: expect.any(Boolean)
      });
    });

    it('should filter jobs by status', async () => {
      const runningJobs = mockJobs.filter(job => job.status === 'running');
      query.mockResolvedValueOnce(runningJobs);
      query.mockResolvedValueOnce(mockJobs); // For count

      const response = await request(app)
        .get(`/api/vendors/${mockVendorId}/sync-jobs?status=running`)
        .expect(200);

      expect(response.body.jobs).toHaveLength(1);
      expect(response.body.jobs[0].status).toBe('running');
    });

    it('should support pagination with limit and offset', async () => {
      query.mockResolvedValueOnce(mockJobs.slice(0, 2));
      query.mockResolvedValueOnce(mockJobs); // For count

      const response = await request(app)
        .get(`/api/vendors/${mockVendorId}/sync-jobs?limit=2&offset=0`)
        .expect(200);

      expect(response.body.jobs).toHaveLength(2);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.offset).toBe(0);
    });

    it('should return 400 for invalid limit', async () => {
      const response = await request(app)
        .get(`/api/vendors/${mockVendorId}/sync-jobs?limit=invalid`)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('Invalid limit')
      });
    });

    it('should return 400 for limit > 100', async () => {
      const response = await request(app)
        .get(`/api/vendors/${mockVendorId}/sync-jobs?limit=101`)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('Must be between 1 and 100')
      });
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .get(`/api/vendors/${mockVendorId}/sync-jobs?status=invalid_status`)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('Invalid status')
      });
    });

    it('should return 400 for invalid vendorId format', async () => {
      const response = await request(app)
        .get('/api/vendors/invalid-uuid/sync-jobs')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('Invalid vendorId')
      });
    });

    it('should return 500 if database error occurs', async () => {
      query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get(`/api/vendors/${mockVendorId}/sync-jobs`)
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Internal Server Error',
        message: 'Failed to fetch sync jobs'
      });
    });

    it('should filter by jobType if specified', async () => {
      query.mockResolvedValueOnce(mockJobs);
      query.mockResolvedValueOnce(mockJobs); // For count

      const response = await request(app)
        .get(`/api/vendors/${mockVendorId}/sync-jobs?jobType=sync_vendor`)
        .expect(200);

      // Jobs should be filtered by jobType in the route handler
      expect(response.body.jobs.every(job => job.jobType === 'sync_vendor')).toBe(true);
    });
  });

  describe('GET /api/sync-jobs', () => {
    const mockJobs = [
      {
        ...mockJob,
        status: 'completed'
      },
      {
        ...mockJob,
        id: '550e8400-e29b-41d4-a716-446655440004',
        vendor_id: '550e8400-e29b-41d4-a716-446655440005',
        status: 'running'
      }
    ];

    it('should return all jobs for organization', async () => {
      query.mockResolvedValueOnce(mockJobs);

      const response = await request(app)
        .get('/api/sync-jobs')
        .expect(200);

      expect(response.body).toMatchObject({
        organizationId: mockOrgId,
        jobs: expect.any(Array),
        pagination: expect.any(Object)
      });
      expect(response.body.jobs).toHaveLength(2);
    });

    it('should filter by vendorId', async () => {
      query.mockResolvedValueOnce([mockJobs[0]]);

      const response = await request(app)
        .get(`/api/sync-jobs?vendorId=${mockVendorId}`)
        .expect(200);

      expect(response.body.jobs).toHaveLength(1);
      expect(response.body.jobs[0].vendorId).toBe(mockVendorId);
    });

    it('should filter by status', async () => {
      const completedJobs = mockJobs.filter(job => job.status === 'completed');
      query.mockResolvedValueOnce(completedJobs);

      const response = await request(app)
        .get('/api/sync-jobs?status=completed')
        .expect(200);

      expect(response.body.jobs.every(job => job.status === 'completed')).toBe(true);
    });

    it('should return 400 for invalid limit', async () => {
      const response = await request(app)
        .get('/api/sync-jobs?limit=abc')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('Invalid limit')
      });
    });

    it('should return 500 if database error occurs', async () => {
      query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/sync-jobs')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Internal Server Error',
        message: 'Failed to fetch sync jobs'
      });
    });
  });
});
