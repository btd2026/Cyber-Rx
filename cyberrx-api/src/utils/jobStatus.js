'use strict';

const VendorSyncJob = require('../models/VendorSyncJob');
const logger = require('./logger');

/**
 * Job Status Helper Functions
 *
 * Provides utilities for managing vendor sync job status in the database
 * Works alongside BullMQ to provide persistent status tracking
 */

/**
 * Create a new job record in database
 * Called when job is added to queue
 * @param {string} jobId - Job ID from BullMQ
 * @param {Object} jobData - Job data from queue
 * @returns {Promise<Object>} Created job record
 */
async function createJobRecord(jobId, jobData) {
  try {
    const { organizationId, vendorId, connectorType, type } = jobData;

    const jobRecord = await VendorSyncJob.create({
      id: jobId,
      organizationId,
      vendorId,
      connectorType: connectorType || type,
      jobType: type
    });

    logger.info('Created job record in database', {
      jobId,
      organizationId,
      vendorId,
      connectorType,
      jobType: type
    });

    return jobRecord;
  } catch (error) {
    logger.error('Failed to create job record', {
      jobId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Update job status to running
 * Called when worker starts processing job
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Updated job record
 */
async function markJobRunning(jobId) {
  try {
    const job = await VendorSyncJob.updateStatus(jobId, 'running');

    logger.info('Job marked as running', { jobId });

    return job;
  } catch (error) {
    logger.error('Failed to mark job as running', {
      jobId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Update job status to completed
 * Called when job finishes successfully
 * @param {string} jobId - Job ID
 * @param {Object} [result] - Optional job result data
 * @returns {Promise<Object>} Updated job record
 */
async function markJobCompleted(jobId, result = null) {
  try {
    const job = await VendorSyncJob.updateStatus(jobId, 'completed');

    logger.info('Job marked as completed', {
      jobId,
      result: result ? JSON.stringify(result).substring(0, 200) : null
    });

    return job;
  } catch (error) {
    logger.error('Failed to mark job as completed', {
      jobId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Update job status to failed
 * Called when job fails after all retries
 * @param {string} jobId - Job ID
 * @param {string} errorMessage - Error message
 * @param {number} retryCount - Current retry count
 * @returns {Promise<Object>} Updated job record
 */
async function markJobFailed(jobId, errorMessage, retryCount) {
  try {
    const job = await VendorSyncJob.updateStatus(jobId, 'failed', {
      errorMessage,
      retryCount
    });

    logger.error('Job marked as failed', {
      jobId,
      errorMessage,
      retryCount
    });

    return job;
  } catch (error) {
    logger.error('Failed to mark job as failed', {
      jobId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Update job retry count
 * Called when job is being retried
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Updated job record
 */
async function incrementJobRetry(jobId) {
  try {
    const job = await VendorSyncJob.incrementRetry(jobId);

    logger.warn('Job retry count incremented', {
      jobId,
      retryCount: job.retryCount
    });

    return job;
  } catch (error) {
    logger.error('Failed to increment job retry', {
      jobId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get job by ID
 * @param {string} jobId - Job ID
 * @returns {Promise<Object|null>} Job record or null
 */
async function getJobById(jobId) {
  try {
    return await VendorSyncJob.findById(jobId);
  } catch (error) {
    logger.error('Failed to get job by ID', {
      jobId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get jobs for organization
 * @param {string} organizationId - Organization ID
 * @param {Object} [options] - Query options
 * @returns {Promise<Array>} Array of job records
 */
async function getJobsForOrganization(organizationId, options = {}) {
  try {
    return await VendorSyncJob.findByOrganization(organizationId, options);
  } catch (error) {
    logger.error('Failed to get jobs for organization', {
      organizationId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get job statistics for organization
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Object>} Job statistics
 */
async function getJobStatistics(organizationId) {
  try {
    return await VendorSyncJob.getStatistics(organizationId);
  } catch (error) {
    logger.error('Failed to get job statistics', {
      organizationId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Clean up old completed/failed jobs
 * @param {number} [days=30] - Days to retain
 * @returns {Promise<number>} Number of deleted jobs
 */
async function cleanupOldJobs(days = 30) {
  try {
    const deleted = await VendorSyncJob.deleteOld(days);

    if (deleted > 0) {
      logger.info('Cleaned up old jobs', { deleted, days });
    }

    return deleted;
  } catch (error) {
    logger.error('Failed to cleanup old jobs', {
      days,
      error: error.message
    });
    throw error;
  }
}

/**
 * Log job lifecycle event
 * @param {string} jobId - Job ID
 * @param {string} event - Event name
 * @param {Object} [data] - Additional event data
 */
function logJobEvent(jobId, event, data = {}) {
  logger.info(`Job event: ${event}`, {
    jobId,
    event,
    ...data
  });
}

module.exports = {
  createJobRecord,
  markJobRunning,
  markJobCompleted,
  markJobFailed,
  incrementJobRetry,
  getJobById,
  getJobsForOrganization,
  getJobStatistics,
  cleanupOldJobs,
  logJobEvent
};
