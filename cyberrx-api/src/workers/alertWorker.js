'use strict';

const { Worker } = require('bullmq');
const Redis = require('ioredis');
const logger = require('../utils/logger');
const AlertService = require('../services/AlertService');

// Queue configuration
const QUEUE_NAME = 'vendor-sync-queue';

/**
 * Create Redis connection for worker
 */
function createRedisConnection() {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    logger.info('Alert worker connecting to Redis using REDIS_URL');
    return new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    });
  }

  const host = process.env.REDIS_HOST || 'localhost';
  const port = process.env.REDIS_PORT || 6379;
  const password = process.env.REDIS_PASSWORD;

  const config = {
    host,
    port,
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  };

  if (password) {
    config.password = password;
  }

  logger.info('Alert worker connecting to Redis using host/port', { host, port });
  return new Redis(config);
}

/**
 * Process SEND_ALERT job
 * Sends alerts via email and Slack
 */
async function processAlertJob(job) {
  const alert = job.data;

  logger.info('Processing alert job', {
    alertId: alert.id,
    type: alert.type,
    severity: alert.severity,
    vendor: alert.vendorName
  });

  const alertService = new AlertService();
  const errors = [];

  // Send email alert
  try {
    await alertService.sendEmail(alert);
    logger.info('Email alert sent successfully', { alertId: alert.id });
  } catch (error) {
    logger.error('Failed to send email alert', {
      alertId: alert.id,
      error: error.message
    });
    errors.push({ channel: 'email', error: error.message });
  }

  // Send Slack alert
  try {
    await alertService.sendSlack(alert);
    logger.info('Slack alert sent successfully', { alertId: alert.id });
  } catch (error) {
    logger.error('Failed to send Slack alert', {
      alertId: alert.id,
      error: error.message
    });
    errors.push({ channel: 'slack', error: error.message });
  }

  // If both channels failed, throw error to trigger retry
  if (errors.length >= 2) {
    throw new Error(`All alert channels failed: ${JSON.stringify(errors)}`);
  }

  // Return success with partial failures
  return {
    success: true,
    alertId: alert.id,
    partialFailures: errors
  };
}

/**
 * Create and start alert worker
 */
function createAlertWorker() {
  const connection = createRedisConnection();

  const worker = new Worker(QUEUE_NAME, async (job) => {
    // Only process SEND_ALERT jobs
    if (job.name === 'SEND_ALERT') {
      return await processAlertJob(job);
    } else {
      logger.warn(`Alert worker skipping job of type: ${job.name}`);
      return null;
    }
  }, {
    connection,
    concurrency: 5, // Process up to 5 alerts concurrently
    limiter: {
      max: 10, // Max 10 jobs per duration
      duration: 1000 // Per second
    }
  });

  // Set up event listeners
  worker.on('completed', (job, result) => {
    logger.info('Alert job completed', {
      jobId: job.id,
      alertId: job.data.id,
      result
    });
  });

  worker.on('failed', (job, error) => {
    logger.error('Alert job failed', {
      jobId: job?.id,
      alertId: job?.data?.id,
      error: error.message,
      attemptsMade: job?.attemptsMade
    });
  });

  worker.on('error', (error) => {
    logger.error('Alert worker error', { error: error.message });
  });

  logger.info('Alert worker started', {
    queue: QUEUE_NAME,
    concurrency: 5
  });

  return worker;
}

// Start worker if this file is run directly
if (require.main === module) {
  const worker = createAlertWorker();

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('Alert worker shutting down...');
    await worker.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('Alert worker shutting down...');
    await worker.close();
    process.exit(0);
  });
}

module.exports = { createAlertWorker, processAlertJob };
