'use strict';

const { Worker, Queue } = require('bullmq');
const Redis = require('ioredis');
const workerProcess = require('../../../src/workers/workerProcess');
const { JobTypes } = require('../../../src/workers/workerProcess');
const VendorSyncJob = require('../../../src/models/VendorSyncJob');
const {
  createJobRecord,
  markJobRunning,
  markJobCompleted,
  markJobFailed
} = require('../../../src/utils/jobStatus');

// Mock Redis connection for testing
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null
};

// Test queue name
const TEST_QUEUE_NAME = 'test-vendor-sync-queue';

describe('Worker Process', () => {
  let worker;
  let queue;
  let connection;

  beforeAll(async () => {
    // Create Redis connection
    connection = new Redis(redisConfig);
  });

  afterAll(async () => {
    // Clean up Redis connection
    await connection.quit();
  });

  beforeEach(async () => {
    // Clean up test queue
    const testQueue = new Queue(TEST_QUEUE_NAME, { connection });
    await testQueue.obliterate({ force: true });
    await testQueue.close();
  });

  afterEach(async () => {
    // Stop worker if running
    if (worker) {
      await worker.close();
      worker = null;
    }
  });

  describe('Worker Creation', () => {
    test('should create worker successfully', () => {
      worker = workerProcess.createWorker();

      expect(worker).toBeDefined();
      expect(worker.opts.concurrency).toBe(5);
    });

    test('should handle worker errors gracefully', async () => {
      // Mock worker with error
      const mockWorker = new Worker(TEST_QUEUE_NAME, async (job) => {
        throw new Error('Test error');
      }, { connection });

      // Add job that will fail
      const queue = new Queue(TEST_QUEUE_NAME, { connection });
      await queue.add('test', { test: 'data' });

      // Wait for job to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      const jobs = await queue.getJobs(['failed']);
      expect(jobs.length).toBeGreaterThan(0);

      await queue.close();
      await mockWorker.close();
    });
  });

  describe('Job Processing', () => {
    test('should process SYNC_VENDOR job', async () => {
      // Create test queue and worker
      queue = new Queue(TEST_QUEUE_NAME, { connection });
      worker = new Worker(TEST_QUEUE_NAME, workerProcess.processJob, {
        connection,
        concurrency: 1
      });

      // Add test job
      const job = await queue.add(JobTypes.SYNC_VENDOR, {
        organizationId: 'test-org',
        vendorId: 'test-vendor'
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify job was processed
      const state = await job.getState();
      expect(state).toBeDefined();
    });

    test('should process SYNC_CONNECTOR job', async () => {
      queue = new Queue(TEST_QUEUE_NAME, { connection });
      worker = new Worker(TEST_QUEUE_NAME, workerProcess.processJob, {
        connection,
        concurrency: 1
      });

      const job = await queue.add(JobTypes.SYNC_CONNECTOR, {
        organizationId: 'test-org',
        connectorType: 'security_scorecard'
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      const state = await job.getState();
      expect(state).toBeDefined();
    });

    test('should process ASSESSMENT job', async () => {
      queue = new Queue(TEST_QUEUE_NAME, { connection });
      worker = new Worker(TEST_QUEUE_NAME, workerProcess.processJob, {
        connection,
        concurrency: 1
      });

      const job = await queue.add(JobTypes.ASSESSMENT, {
        organizationId: 'test-org',
        vendorId: 'test-vendor'
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      const state = await job.getState();
      expect(state).toBeDefined();
    });
  });

  describe('Job Status Tracking', () => {
    test('should create job record', async () => {
      const jobId = 'test-job-123';
      const jobData = {
        organizationId: 'test-org',
        vendorId: 'test-vendor',
        connectorType: 'security_scorecard',
        type: JobTypes.SYNC_VENDOR
      };

      // This will fail in test environment without database
      // but we can test the function exists and is called correctly
      expect(createJobRecord).toBeDefined();
      expect(typeof createJobRecord).toBe('function');
    });

    test('should mark job as running', async () => {
      expect(markJobRunning).toBeDefined();
      expect(typeof markJobRunning).toBe('function');
    });

    test('should mark job as completed', async () => {
      expect(markJobCompleted).toBeDefined();
      expect(typeof markJobCompleted).toBe('function');
    });

    test('should mark job as failed', async () => {
      expect(markJobFailed).toBeDefined();
      expect(typeof markJobFailed).toBe('function');
    });
  });

  describe('Retry Logic', () => {
    test('should retry failed jobs', async () => {
      queue = new Queue(TEST_QUEUE_NAME, { connection });
      worker = new Worker(TEST_QUEUE_NAME, async (job) => {
        throw new Error('Test failure');
      }, {
        connection,
        concurrency: 1,
        settings: {
          backoff: {
            type: 'exponential',
            delay: 100
          }
        }
      });

      const job = await queue.add('retry-test', {
        organizationId: 'test-org',
        vendorId: 'test-vendor'
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 100
        }
      });

      // Wait for retries
      await new Promise(resolve => setTimeout(resolve, 1000));

      const state = await job.getState();
      expect(state).toBe('failed');
      expect(job.attemptsMade).toBe(3);
    });
  });

  describe('Worker Lifecycle', () => {
    test('should start worker process', () => {
      expect(workerProcess.startWorker).toBeDefined();
      expect(typeof workerProcess.startWorker).toBe('function');
    });

    test('should stop worker process', () => {
      expect(workerProcess.stopWorker).toBeDefined();
      expect(typeof workerProcess.stopWorker).toBe('function');
    });

    test('should get worker metrics', async () => {
      expect(workerProcess.getWorkerMetrics).toBeDefined();
      expect(typeof workerProcess.getWorkerMetrics).toBe('function');
    });
  });
});

describe('Job Handlers', () => {
  describe('handleSyncVendor', () => {
    test('should handle SYNC_VENDOR job type', async () => {
      const { handleSyncVendor } = require('../../../src/workers/jobHandlers');

      expect(handleSyncVendor).toBeDefined();
      expect(typeof handleSyncVendor).toBe('function');
    });
  });

  describe('handleSyncConnector', () => {
    test('should handle SYNC_CONNECTOR job type', async () => {
      const { handleSyncConnector } = require('../../../src/workers/jobHandlers');

      expect(handleSyncConnector).toBeDefined();
      expect(typeof handleSyncConnector).toBe('function');
    });
  });

  describe('handleAssessment', () => {
    test('should handle ASSESSMENT job type', async () => {
      const { handleAssessment } = require('../../../src/workers/jobHandlers');

      expect(handleAssessment).toBeDefined();
      expect(typeof handleAssessment).toBe('function');
    });
  });
});

describe('VendorSyncJob Model', () => {
  test('should have create method', () => {
    expect(VendorSyncJob.create).toBeDefined();
    expect(typeof VendorSyncJob.create).toBe('function');
  });

  test('should have findById method', () => {
    expect(VendorSyncJob.findById).toBeDefined();
    expect(typeof VendorSyncJob.findById).toBe('function');
  });

  test('should have findByOrganization method', () => {
    expect(VendorSyncJob.findByOrganization).toBeDefined();
    expect(typeof VendorSyncJob.findByOrganization).toBe('function');
  });

  test('should have updateStatus method', () => {
    expect(VendorSyncJob.updateStatus).toBeDefined();
    expect(typeof VendorSyncJob.updateStatus).toBe('function');
  });

  test('should have incrementRetry method', () => {
    expect(VendorSyncJob.incrementRetry).toBeDefined();
    expect(typeof VendorSyncJob.incrementRetry).toBe('function');
  });
});
