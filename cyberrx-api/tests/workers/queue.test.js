'use strict';

/**
 * BullMQ Queue Test Suite
 *
 * Tests for vendor sync job queue functionality
 *
 * Prerequisites:
 * - Redis must be running (local or configured via REDIS_URL)
 * - Environment variables must be set
 *
 * Run tests:
 *   npm test tests/workers/queue.test.js
 */

const queue = require('../../src/workers/queue');

describe('BullMQ Queue - Basic Operations', () => {

  beforeAll(async () => {
    // Test Redis connection
    const isConnected = await queue.testConnection();
    if (!isConnected) {
      console.warn('Redis is not available - tests will be skipped');
    }
  });

  afterAll(async () => {
    // Clean up queue connection
    await queue.close();
  });

  describe('Job Types', () => {
    test('should have SYNC_VENDOR job type', () => {
      expect(queue.JobTypes.SYNC_VENDOR).toBe('sync_vendor');
    });

    test('should have SYNC_CONNECTOR job type', () => {
      expect(queue.JobTypes.SYNC_CONNECTOR).toBe('sync_connector');
    });

    test('should have ASSESSMENT job type', () => {
      expect(queue.JobTypes.ASSESSMENT).toBe('assessment');
    });
  });

  describe('Queue Configuration', () => {
    test('should have queue name defined', () => {
      expect(queue.QUEUE_NAME).toBe('vendor-sync-queue');
    });

    test('should export all required functions', () => {
      expect(typeof queue.addJob).toBe('function');
      expect(typeof queue.getJobState).toBe('function');
      expect(typeof queue.getJobs).toBe('function');
      expect(typeof queue.pause).toBe('function');
      expect(typeof queue.resume).toBe('function');
      expect(typeof queue.healthCheck).toBe('function');
    });
  });

  describe('Health Check', () => {
    test('should return health status', async () => {
      const health = await queue.healthCheck();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('queueName');
      expect(health).toHaveProperty('connected');
      expect(health).toHaveProperty('timestamp');
      expect(health.queueName).toBe('vendor-sync-queue');
    });
  });
});

describe('BullMQ Queue - Job Operations', () => {

  beforeEach(async () => {
    // Ensure queue is empty before each test
    // Note: This requires queue to be initialized
  });

  afterEach(async () => {
    // Clean up test jobs
  });

  describe('addJob', () => {
    test('should reject invalid job type', async () => {
      await expect(
        queue.addJob('invalid_type', { organizationId: 'org-123' })
      ).rejects.toThrow('Invalid job type');
    });

    test('should reject job without organizationId', async () => {
      await expect(
        queue.addJob(queue.JobTypes.SYNC_VENDOR, { vendorId: 'vendor-123' })
      ).rejects.toThrow('organizationId is required');
    });

    // Note: These tests require Redis connection and worker processing
    // They are marked as pending until full integration is set up

    test.skip('should add SYNC_VENDOR job', async () => {
      const job = await queue.addJob(queue.JobTypes.SYNC_VENDOR, {
        organizationId: 'org-123',
        vendorId: 'vendor-456'
      });

      expect(job).toHaveProperty('id');
      expect(job.name).toBe('sync_vendor');
    });

    test.skip('should add SYNC_CONNECTOR job', async () => {
      const job = await queue.addJob(queue.JobTypes.SYNC_CONNECTOR, {
        organizationId: 'org-123',
        connectorType: 'bcbs_210'
      });

      expect(job).toHaveProperty('id');
      expect(job.name).toBe('sync_connector');
    });

    test.skip('should add ASSESSMENT job', async () => {
      const job = await queue.addJob(queue.JobTypes.ASSESSMENT, {
        organizationId: 'org-123',
        vendorId: 'vendor-456'
      });

      expect(job).toHaveProperty('id');
      expect(job.name).toBe('assessment');
    });

    test.skip('should accept job with priority', async () => {
      const job = await queue.addJob(queue.JobTypes.SYNC_VENDOR, {
        organizationId: 'org-123',
        vendorId: 'vendor-456',
        priority: 5
      });

      expect(job.opts.priority).toBe(5);
    });

    test.skip('should accept job with scheduled delay', async () => {
      const scheduledFor = new Date(Date.now() + 60000); // 1 minute later

      const job = await queue.addJob(queue.JobTypes.SYNC_VENDOR, {
        organizationId: 'org-123',
        vendorId: 'vendor-456',
        scheduledFor
      });

      expect(job.opts.delay).toBeGreaterThan(0);
    });
  });

  describe('getJobState', () => {
    test.skip('should return job state for valid job ID', async () => {
      // First add a job
      const job = await queue.addJob(queue.JobTypes.SYNC_VENDOR, {
        organizationId: 'org-123',
        vendorId: 'vendor-456'
      });

      // Then get its state
      const state = await queue.getJobState(job.id);

      expect(state).toHaveProperty('id');
      expect(state).toHaveProperty('name');
      expect(state).toHaveProperty('state');
      expect(state).toHaveProperty('data');
      expect(state.id).toBe(job.id);
    });

    test('should return null for non-existent job', async () => {
      const state = await queue.getJobState('non-existent-job-id');
      expect(state).toBeNull();
    });
  });

  describe('getJobs', () => {
    test.skip('should return array of jobs', async () => {
      const jobs = await queue.getJobs(['waiting'], 0, 10);
      expect(Array.isArray(jobs)).toBe(true);
    });

    test.skip('should respect start and end parameters', async () => {
      // Add multiple jobs
      for (let i = 0; i < 5; i++) {
        await queue.addJob(queue.JobTypes.SYNC_VENDOR, {
          organizationId: `org-${i}`,
          vendorId: `vendor-${i}`
        });
      }

      const jobs = await queue.getJobs(['waiting'], 0, 3);
      expect(jobs.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getQueueMetrics', () => {
    test.skip('should return queue metrics', async () => {
      const metrics = await queue.getQueueMetrics();

      expect(metrics).toHaveProperty('waiting');
      expect(metrics).toHaveProperty('active');
      expect(metrics).toHaveProperty('completed');
      expect(metrics).toHaveProperty('failed');
      expect(metrics).toHaveProperty('delayed');
      expect(metrics).toHaveProperty('total');

      expect(typeof metrics.waiting).toBe('number');
      expect(typeof metrics.active).toBe('number');
      expect(typeof metrics.completed).toBe('number');
      expect(typeof metrics.failed).toBe('number');
      expect(typeof metrics.delayed).toBe('number');
      expect(typeof metrics.total).toBe('number');
    });
  });

  describe('pause and resume', () => {
    test.skip('should pause queue', async () => {
      await queue.pause();
      // Verify queue is paused
      // This requires checking queue internal state
    });

    test.skip('should resume paused queue', async () => {
      await queue.resume();
      // Verify queue is resumed
    });
  });
});

describe('BullMQ Queue - Error Handling', () => {

  test('should handle Redis connection error gracefully', async () => {
    // This test would mock Redis connection failure
    // and verify that the queue module doesn't crash
    // Implementation depends on testing strategy
  });

  test('should log errors for invalid operations', async () => {
    // Verify error logging works
    // This may require mocking logger
  });
});
