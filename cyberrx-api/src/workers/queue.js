'use strict';

const { Queue } = require('bullmq');
const Redis = require('ioredis');
const logger = require('../utils/logger');

/**
 * BullMQ Job Queue Configuration for Vendor Sync Operations
 *
 * This module sets up a Redis-backed job queue for processing vendor sync operations
 * asynchronously. It handles connection management, error recovery, and provides
 * a clean API for job operations.
 *
 * Job Types:
 * - SYNC_VENDOR: Sync all connectors for one vendor
 * - SYNC_CONNECTOR: Sync one connector for all vendors
 * - ASSESSMENT: Full vendor risk assessment
 * - SEND_ALERT: Send vendor monitoring alert (email/Slack)
 *
 * Environment Variables:
 * - REDIS_URL: Redis connection URL (fallback: localhost:6379)
 * - REDIS_PASSWORD: Redis password (optional)
 * - REDIS_HOST: Redis host (if not using REDIS_URL)
 * - REDIS_PORT: Redis port (if not using REDIS_URL)
 */

// Job type constants
const JobTypes = {
  SYNC_VENDOR: 'sync_vendor',
  SYNC_CONNECTOR: 'sync_connector',
  ASSESSMENT: 'assessment',
  SEND_ALERT: 'SEND_ALERT'
};

// Queue configuration
const QUEUE_NAME = 'vendor-sync-queue';
const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 5000, 30000, 120000, 360000]; // 1s, 5s, 30s, 2m, 6m

/**
 * Redis connection factory
 * Creates and configures a Redis connection with proper error handling
 *
 * @returns {Redis} Configured Redis connection
 */
function createRedisConnection() {
  // Try REDIS_URL first, then fall back to individual params
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    logger.info('Connecting to Redis using REDIS_URL', {
      url: redisUrl.replace(/:[^:@]+@/, ':****@') // Sanitize password in logs
    });
    return new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Redis connection attempt ${times} failed, retrying in ${delay}ms`);
        return delay;
      }
    });
  }

  // Fallback to individual connection parameters
  const host = process.env.REDIS_HOST || 'localhost';
  const port = process.env.REDIS_PORT || 6379;
  const password = process.env.REDIS_PASSWORD;

  logger.info('Connecting to Redis using host/port', { host, port });

  const config = {
    host,
    port,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      logger.warn(`Redis connection attempt ${times} failed, retrying in ${delay}ms`);
      return delay;
    }
  };

  if (password) {
    config.password = password;
  }

  return new Redis(config);
}

/**
 * Create and configure the BullMQ queue
 *
 * @returns {Queue} Configured BullMQ queue instance
 */
function createQueue() {
  try {
    const connection = createRedisConnection();

    // Create queue with connection
    const queue = new Queue(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: MAX_RETRIES,
        backoff: {
          type: 'exponential',
          delay: RETRY_DELAYS[0]
        },
        removeOnComplete: false, // Keep completed jobs for audit
        removeOnFail: false, // Keep failed jobs for debugging
        // Prevent duplicates for 24 hours
        jobId: undefined // Will be set per job
      }
    });

    // Set up event listeners for queue lifecycle
    queue.on('error', (error) => {
      logger.error('Queue error', { error: error.message, stack: error.stack });
    });

    queue.on('waiting', (jobId) => {
      logger.debug(`Job ${jobId} is waiting`);
    });

    queue.on('active', (job) => {
      logger.info(`Job ${job.id} is now processing`, {
        type: job.name,
        data: job.data
      });
    });

    queue.on('completed', (job) => {
      logger.info(`Job ${job.id} completed successfully`, {
        type: job.name,
        duration: job.finishedOn - job.processedOn
      });
    });

    queue.on('failed', (job, error) => {
      logger.error(`Job ${job?.id} failed`, {
        type: job?.name,
        error: error.message,
        attemptsMade: job?.attemptsMade,
        stack: error.stack
      });
    });

    queue.on('stalled', (job) => {
      logger.warn(`Job ${job} stalled`);
    });

    logger.info('Vendor sync queue created successfully', { queueName: QUEUE_NAME });

    return queue;

  } catch (error) {
    logger.error('Failed to create queue', { error: error.message, stack: error.stack });
    throw error;
  }
}

// Singleton queue instance
let queueInstance = null;

/**
 * Get or create the queue instance (singleton pattern)
 *
 * @returns {Queue} Queue instance
 */
function getQueue() {
  if (!queueInstance) {
    queueInstance = createQueue();
  }
  return queueInstance;
}

/**
 * Add a job to the queue
 *
 * @param {string} type - Job type from JobTypes
 * @param {Object} data - Job data
 * @param {string} data.organizationId - Organization UUID
 * @param {string} [data.vendorId] - Vendor UUID (for SYNC_VENDOR)
 * @param {string} [data.connectorType] - Connector type (for SYNC_CONNECTOR)
 * @param {number} [data.priority=1] - Job priority (1-10, 1=highest)
 * @param {Date} [data.scheduledFor] - Schedule job for specific time
 * @param {Object} [options] - Additional BullMQ job options
 * @returns {Promise<Job>} Created job instance
 */
async function addJob(type, data, options = {}) {
  try {
    const queue = getQueue();

    // Validate job type
    if (!Object.values(JobTypes).includes(type)) {
      throw new Error(`Invalid job type: ${type}. Must be one of: ${Object.values(JobTypes).join(', ')}`);
    }

    // Validate required fields
    if (!data.organizationId) {
      throw new Error('organizationId is required');
    }

    // Generate job ID if not provided
    const jobId = options.jobId || `${type}-${data.organizationId}-${Date.now()}`;

    // Set default job options
    const jobOptions = {
      jobId,
      priority: data.priority || 1,
      delay: data.scheduledFor ? Math.max(0, new Date(data.scheduledFor) - Date.now()) : 0,
      ...options
    };

    // Add job to queue
    const job = await queue.add(type, data, jobOptions);

    logger.info('Job added to queue', {
      jobId: job.id,
      type,
      organizationId: data.organizationId,
      vendorId: data.vendorId,
      connectorType: data.connectorType,
      scheduledFor: data.scheduledFor
    });

    return job;

  } catch (error) {
    logger.error('Failed to add job to queue', {
      type,
      data,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Get job state and details
 *
 * @param {string} jobId - Job ID
 * @returns {Promise<Object|null>} Job state and details
 */
async function getJobState(jobId) {
  try {
    const queue = getQueue();
    const job = await queue.getJob(jobId);

    if (!job) {
      logger.warn('Job not found', { jobId });
      return null;
    }

    const state = await job.getState();

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      state,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      returnvalue: job.returnvalue
    };

  } catch (error) {
    logger.error('Failed to get job state', { jobId, error: error.message });
    throw error;
  }
}

/**
 * Get jobs by state
 *
 * @param {string[]} [states] - Job states to filter (e.g., ['waiting', 'active'])
 * @param {number} [start=0] - Start index
 * @param {number} [end=10] - End index
 * @returns {Promise<Job[]>} Array of jobs
 */
async function getJobs(states = ['waiting', 'active'], start = 0, end = 10) {
  try {
    const queue = getQueue();
    const jobs = await queue.getJobs(states, start, end);

    logger.debug('Retrieved jobs', {
      count: jobs.length,
      states,
      start,
      end
    });

    return jobs;

  } catch (error) {
    logger.error('Failed to get jobs', { states, error: error.message });
    throw error;
  }
}

/**
 * Pause the queue (stop processing jobs)
 *
 * @returns {Promise<void>}
 */
async function pause() {
  try {
    const queue = getQueue();
    await queue.pause();
    logger.info('Queue paused');
  } catch (error) {
    logger.error('Failed to pause queue', { error: error.message });
    throw error;
  }
}

/**
 * Resume the queue (start processing jobs)
 *
 * @returns {Promise<void>}
 */
async function resume() {
  try {
    const queue = getQueue();
    await queue.resume();
    logger.info('Queue resumed');
  } catch (error) {
    logger.error('Failed to resume queue', { error: error.message });
    throw error;
  }
}

/**
 * Obsolete (remove) all jobs in the queue
 * Use with caution - this cannot be undone!
 *
 * @returns {Promise<void>}
 */
async function obliterate() {
  try {
    const queue = getQueue();
    await queue.obliterate({ force: true });
    logger.warn('Queue obliterated - all jobs removed');
  } catch (error) {
    logger.error('Failed to obliterate queue', { error: error.message });
    throw error;
  }
}

/**
 * Get queue metrics
 *
 * @returns {Promise<Object>} Queue metrics
 */
async function getQueueMetrics() {
  try {
    const queue = getQueue();

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getJobCountsByTypes('waiting'),
      queue.getJobCountsByTypes('active'),
      queue.getJobCountsByTypes('completed'),
      queue.getJobCountsByTypes('failed'),
      queue.getJobCountsByTypes('delayed')
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed
    };

  } catch (error) {
    logger.error('Failed to get queue metrics', { error: error.message });
    throw error;
  }
}

/**
 * Gracefully close the queue connection
 * Should be called on application shutdown
 *
 * @returns {Promise<void>}
 */
async function close() {
  try {
    if (queueInstance) {
      await queueInstance.close();
      queueInstance = null;
      logger.info('Queue connection closed');
    }
  } catch (error) {
    logger.error('Failed to close queue', { error: error.message });
    throw error;
  }
}

/**
 * Test queue connectivity
 *
 * @returns {Promise<boolean>} True if connected, false otherwise
 */
async function testConnection() {
  try {
    const queue = getQueue();
    await queue.client.ping();
    logger.info('Queue connection test successful');
    return true;
  } catch (error) {
    logger.error('Queue connection test failed', { error: error.message });
    return false;
  }
}

/**
 * Health check for queue
 *
 * @returns {Promise<Object>} Health status
 */
async function healthCheck() {
  try {
    const isConnected = await testConnection();
    const metrics = isConnected ? await getQueueMetrics() : null;

    return {
      status: isConnected ? 'healthy' : 'unhealthy',
      queueName: QUEUE_NAME,
      connected: isConnected,
      metrics,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Queue health check failed', { error: error.message });
    return {
      status: 'unhealthy',
      queueName: QUEUE_NAME,
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Export everything
module.exports = {
  JobTypes,
  QUEUE_NAME,
  getQueue,
  addJob,
  getJobState,
  getJobs,
  pause,
  resume,
  obliterate,
  getQueueMetrics,
  close,
  testConnection,
  healthCheck
};
