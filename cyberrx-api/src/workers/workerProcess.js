'use strict';

const { Worker } = require('bullmq');
const Redis = require('ioredis');
const logger = require('../utils/logger');
const {
  createJobRecord,
  markJobRunning,
  markJobCompleted,
  markJobFailed,
  incrementJobRetry,
  logJobEvent
} = require('../utils/jobStatus');
const {
  handleSyncVendor,
  handleSyncConnector,
  handleAssessment
} = require('./jobHandlers');

/**
 * BullMQ Worker Process
 *
 * Consumes jobs from the vendor-sync-queue and processes them
 * Handles retry logic, error tracking, and status updates
 */

// Job type constants (must match queue.js)
const JobTypes = {
  SYNC_VENDOR: 'sync_vendor',
  SYNC_CONNECTOR: 'sync_connector',
  ASSESSMENT: 'assessment'
};

// Queue configuration (must match queue.js)
const QUEUE_NAME = 'vendor-sync-queue';
const MAX_RETRIES = 5;
const RETRY_DELAYS = [60000, 300000, 1800000, 7200000, 21600000]; // 1min, 5min, 30min, 2hrs, 6hrs

/**
 * Create Redis connection for worker
 * Uses same configuration as queue
 * @returns {Redis} Redis connection
 */
function createRedisConnection() {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    logger.info('Worker connecting to Redis using REDIS_URL', {
      url: redisUrl.replace(/:[^:@]+@/, ':****@')
    });
    return new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    });
  }

  const host = process.env.REDIS_HOST || 'localhost';
  const port = process.env.REDIS_PORT || 6379;
  const password = process.env.REDIS_PASSWORD;

  logger.info('Worker connecting to Redis using host/port', { host, port });

  const config = {
    host,
    port,
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  };

  if (password) {
    config.password = password;
  }

  return new Redis(config);
}

/**
 * Process a single job
 * @param {Object} job - BullMQ job
 * @returns {Promise<Object>} Job result
 */
async function processJob(job) {
  const { type, organizationId, vendorId, connectorType } = job.data;

  logJobEvent(job.id, 'started', {
    type,
    organizationId,
    vendorId,
    connectorType
  });

  // Create database record if it doesn't exist
  try {
    await createJobRecord(job.id, job.data);
  } catch (error) {
    logger.warn('Job record may already exist, continuing...', {
      jobId: job.id,
      error: error.message
    });
  }

  // Update status to running
  await markJobRunning(job.id);

  let result;

  try {
    // Route to appropriate handler based on job type
    switch (type) {
      case JobTypes.SYNC_VENDOR:
        result = await handleSyncVendor(job.data);
        break;

      case JobTypes.SYNC_CONNECTOR:
        result = await handleSyncConnector(job.data);
        break;

      case JobTypes.ASSESSMENT:
        result = await handleAssessment(job.data);
        break;

      default:
        throw new Error(`Unknown job type: ${type}`);
    }

    // Mark job as completed
    await markJobCompleted(job.id, result);

    logJobEvent(job.id, 'completed', {
      type,
      result: JSON.stringify(result).substring(0, 200)
    });

    return result;

  } catch (error) {
    // Increment retry count
    await incrementJobRetry(job.id);

    // Check if this is the final retry
    if (job.attemptsMade >= MAX_RETRIES) {
      // Mark as permanently failed
      await markJobFailed(job.id, error.message, job.attemptsMade);

      logJobEvent(job.id, 'failed_permanent', {
        type,
        error: error.message,
        attemptsMade: job.attemptsMade
      });

      logger.error('Job failed permanently', {
        jobId: job.id,
        type,
        error: error.message,
        attemptsMade: job.attemptsMade
      });
    } else {
      // Job will be retried by BullMQ
      logJobEvent(job.id, 'failed_retry', {
        type,
        error: error.message,
        attemptsMade: job.attemptsMade,
        nextRetryIn: RETRY_DELAYS[job.attemptsMade] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
      });

      logger.warn('Job failed, will retry', {
        jobId: job.id,
        type,
        error: error.message,
        attemptsMade: job.attemptsMade,
        retryNumber: job.attemptsMade + 1
      });
    }

    // Re-throw error so BullMQ can handle retry
    throw error;
  }
}

/**
 * Create and configure worker
 * @returns {Worker} BullMQ worker instance
 */
function createWorker() {
  try {
    const connection = createRedisConnection();

    // Create worker with concurrency limit
    const worker = new Worker(QUEUE_NAME, processJob, {
      connection,
      concurrency: process.env.WORKER_CONCURRENCY || 5, // Process up to 5 jobs concurrently
      limiter: {
        max: 10, // Max 10 jobs per time window
        duration: 1000 // 1 second window
      }
    });

    // Set up event listeners for worker lifecycle
    worker.on('error', (error) => {
      logger.error('Worker error', { error: error.message, stack: error.stack });
    });

    worker.on('ready', () => {
      logger.info('Worker is ready to process jobs');
    });

    worker.on('active', (job) => {
      logger.debug(`Worker is processing job ${job.id}`, {
        type: job.name,
        data: job.data
      });
    });

    worker.on('completed', (job) => {
      logger.info(`Worker completed job ${job.id}`, {
        type: job.name,
        duration: job.finishedOn - job.processedOn
      });
    });

    worker.on('failed', (job, error) => {
      logger.error(`Worker failed job ${job?.id}`, {
        type: job?.name,
        error: error.message,
        attemptsMade: job?.attemptsMade,
        stack: error.stack
      });
    });

    worker.on('stalled', (job) => {
      logger.warn(`Worker stalled job ${job}`);
    });

    worker.on('progress', (job, progress) => {
      logger.debug(`Worker progress for job ${job.id}`, { progress });
    });

    logger.info('Worker created successfully', {
      queueName: QUEUE_NAME,
      concurrency: process.env.WORKER_CONCURRENCY || 5
    });

    return worker;

  } catch (error) {
    logger.error('Failed to create worker', { error: error.message, stack: error.stack });
    throw error;
  }
}

// Singleton worker instance
let workerInstance = null;

/**
 * Get or create worker instance
 * @returns {Worker} Worker instance
 */
function getWorker() {
  if (!workerInstance) {
    workerInstance = createWorker();
  }
  return workerInstance;
}

/**
 * Start worker process
 * Call this to start processing jobs
 */
async function startWorker() {
  try {
    logger.info('Starting worker process...');

    const worker = getWorker();

    logger.info('Worker process started', {
      pid: process.pid,
      queueName: QUEUE_NAME
    });

    // Graceful shutdown handlers
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}, shutting down worker...`);

      try {
        await worker.close();
        logger.info('Worker closed gracefully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during worker shutdown', { error: error.message });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception in worker', {
        error: error.message,
        stack: error.stack
      });
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection in worker', {
        reason: reason?.message || reason,
        promise
      });
    });

  } catch (error) {
    logger.error('Failed to start worker', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

/**
 * Stop worker process
 * Call this to gracefully stop processing jobs
 * @returns {Promise<void>}
 */
async function stopWorker() {
  try {
    if (workerInstance) {
      logger.info('Stopping worker process...');
      await workerInstance.close();
      workerInstance = null;
      logger.info('Worker process stopped');
    }
  } catch (error) {
    logger.error('Failed to stop worker', { error: error.message });
    throw error;
  }
}

/**
 * Get worker metrics
 * @returns {Promise<Object>} Worker metrics
 */
async function getWorkerMetrics() {
  try {
    const worker = getWorker();

    // Get job counts from queue
    const queue = require('./queue').getQueue();
    const queueMetrics = await queue.getJobCountsByTypes('waiting', 'active', 'completed', 'failed', 'delayed');

    return {
      pid: process.pid,
      queueName: QUEUE_NAME,
      concurrency: process.env.WORKER_CONCURRENCY || 5,
      queueMetrics: {
        waiting: queueMetrics.waiting || 0,
        active: queueMetrics.active || 0,
        completed: queueMetrics.completed || 0,
        failed: queueMetrics.failed || 0,
        delayed: queueMetrics.delayed || 0
      },
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Failed to get worker metrics', { error: error.message });
    throw error;
  }
}

// Export functions
module.exports = {
  JobTypes,
  createWorker,
  getWorker,
  startWorker,
  stopWorker,
  getWorkerMetrics
};

// If this file is run directly, start the worker
if (require.main === module) {
  startWorker();
}
