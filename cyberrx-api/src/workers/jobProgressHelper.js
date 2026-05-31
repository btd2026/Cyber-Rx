'use strict';

const { VendorSyncJob } = require('../models/VendorSyncJob');
const logger = require('../config/logger');

/**
 * Job Progress Helper
 *
 * Provides utilities for worker jobs to report progress and update status.
 * Used by BullMQ job handlers to keep the database in sync with job execution.
 */

/**
 * Update job progress in database
 * @param {string} jobId - Job ID
 * @param {number} progress - Progress percentage (0-100)
 * @param {Object} [metadata] - Additional metadata to update
 * @returns {Promise<void>}
 */
async function updateJobProgress(jobId, progress, metadata = {}) {
  try {
    await VendorSyncJob.updateProgress(jobId, progress, metadata);
    logger.debug('Job progress updated', { jobId, progress, metadata });
  } catch (error) {
    logger.error('Failed to update job progress', {
      error: error.message,
      jobId,
      progress,
      stack: error.stack
    });
    // Don't throw - progress updates are non-critical
  }
}

/**
 * Update job status in database
 * @param {string} jobId - Job ID
 * @param {string} status - New status (queued, running, completed, failed)
 * @param {Object} [options] - Additional options
 * @param {string} [options.errorMessage] - Error message for failed jobs
 * @returns {Promise<void>}
 */
async function updateJobStatus(jobId, status, options = {}) {
  try {
    await VendorSyncJob.updateStatus(jobId, status, options);
    logger.info('Job status updated', { jobId, status, options });
  } catch (error) {
    logger.error('Failed to update job status', {
      error: error.message,
      jobId,
      status,
      stack: error.stack
    });
    // Don't throw - status updates are critical but we can't recover
  }
}

/**
 * Update job metadata
 * @param {string} jobId - Job ID
 * @param {Object} metadata - Metadata to merge
 * @returns {Promise<void>}
 */
async function updateJobMetadata(jobId, metadata) {
  try {
    await VendorSyncJob.updateMetadata(jobId, metadata);
    logger.debug('Job metadata updated', { jobId, metadata });
  } catch (error) {
    logger.error('Failed to update job metadata', {
      error: error.message,
      jobId,
      metadata,
      stack: error.stack
    });
    // Don't throw - metadata updates are non-critical
  }
}

/**
 * Calculate and update progress for batch operations
 * @param {string} jobId - Job ID
 * @param {number} currentIndex - Current item index (0-based)
 * @param {number} totalItems - Total number of items
 * @param {Object} [metadata] - Additional metadata
 * @returns {Promise<number>} Calculated progress percentage
 */
async function updateBatchProgress(jobId, currentIndex, totalItems, metadata = {}) {
  const progress = Math.round(((currentIndex + 1) / totalItems) * 100);
  await updateJobProgress(jobId, progress, {
    ...metadata,
    currentItem: currentIndex + 1,
    totalItems
  });
  return progress;
}

/**
 * Progress reporter for SYNC_VENDOR jobs
 * Tracks progress across multiple connectors being synced
 */
class VendorSyncProgressReporter {
  constructor(jobId, connectorCount) {
    this.jobId = jobId;
    this.connectorCount = connectorCount;
    this.completedConnectors = 0;
  }

  /**
   * Report completion of a connector sync
   * @param {string} connectorType - Type of connector synced
   * @param {Object} [result] - Sync result details
   */
  async reportConnectorComplete(connectorType, result = {}) {
    this.completedConnectors++;
    const progress = Math.round((this.completedConnectors / this.connectorCount) * 100);

    await updateJobProgress(this.jobId, progress, {
      lastConnector: connectorType,
      completedConnectors: this.completedConnectors,
      totalConnectors: this.connectorCount,
      lastResult: result
    });

    return progress;
  }

  /**
   * Report an error during connector sync
   * @param {string} connectorType - Type of connector that failed
   * @param {Error} error - Error that occurred
   */
  async reportConnectorError(connectorType, error) {
    const progress = Math.round((this.completedConnectors / this.connectorCount) * 100);

    await updateJobMetadata(this.jobId, {
      lastConnector: connectorType,
      failedConnector: connectorType,
      errorCount: (this.errorCount || 0) + 1,
      lastError: {
        message: error.message,
        stack: error.stack
      }
    });

    return progress;
  }
}

/**
 * Progress reporter for SYNC_CONNECTOR jobs
 * Tracks progress across multiple vendors being synced
 */
class ConnectorSyncProgressReporter {
  constructor(jobId, vendorCount) {
    this.jobId = jobId;
    this.vendorCount = vendorCount;
    this.completedVendors = 0;
  }

  /**
   * Report completion of a vendor sync
   * @param {string} vendorId - Vendor that was synced
   * @param {Object} [result] - Sync result details
   */
  async reportVendorComplete(vendorId, result = {}) {
    this.completedVendors++;
    const progress = Math.round((this.completedVendors / this.vendorCount) * 100);

    await updateJobProgress(this.jobId, progress, {
      lastVendor: vendorId,
      completedVendors: this.completedVendors,
      totalVendors: this.vendorCount,
      lastResult: result
    });

    return progress;
  }

  /**
   * Report an error during vendor sync
   * @param {string} vendorId - Vendor that failed
   * @param {Error} error - Error that occurred
   */
  async reportVendorError(vendorId, error) {
    await updateJobMetadata(this.jobId, {
      lastVendor: vendorId,
      failedVendor: vendorId,
      errorCount: (this.errorCount || 0) + 1,
      lastError: {
        message: error.message,
        stack: error.stack
      }
    });
  }
}

/**
 * Progress reporter for ASSESSMENT jobs
 * Tracks progress through assessment stages
 */
class AssessmentProgressReporter {
  constructor(jobId, stages) {
    this.jobId = jobId;
    this.stages = stages;
    this.currentStageIndex = 0;
    this.stageProgress = 0;
  }

  /**
   * Move to next stage
   * @param {string} stageName - Name of current stage
   */
  async advanceStage(stageName) {
    if (this.currentStageIndex < this.stages.length) {
      const progressPerStage = 100 / this.stages.length;
      const progress = Math.round((this.currentStageIndex + 1) * progressPerStage);

      await updateJobProgress(this.jobId, progress, {
        currentStage: stageName,
        completedStages: this.currentStageIndex + 1,
        totalStages: this.stages.length
      });

      this.currentStageIndex++;
      return progress;
    }
    return 100;
  }

  /**
   * Update progress within current stage
   * @param {number} stageProgress - Progress within current stage (0-100)
   */
  async updateStageProgress(stageProgress) {
    const progressPerStage = 100 / this.stages.length;
    const baseProgress = this.currentStageIndex * progressPerStage;
    const totalProgress = Math.min(100, Math.round(baseProgress + (stageProgress / 100 * progressPerStage)));

    await updateJobProgress(this.jobId, totalProgress, {
      currentStage: this.stages[this.currentStageIndex],
      stageProgress
    });

    return totalProgress;
  }
}

module.exports = {
  updateJobProgress,
  updateJobStatus,
  updateJobMetadata,
  updateBatchProgress,
  VendorSyncProgressReporter,
  ConnectorSyncProgressReporter,
  AssessmentProgressReporter
};
