'use strict';

const { addJob, getJobState, JobTypes } = require('../workers/queue');
const VendorSyncJob = require('../models/VendorSyncJob');
const Vendor = require('../models/Vendor');
const logger = require('../utils/logger');

/**
 * Vendor Sync Controller
 *
 * Handles API endpoints for triggering and tracking vendor sync jobs
 * Integrates with BullMQ queue for async processing
 */

/**
 * Validate connector type
 * @param {string} connectorType - Connector type to validate
 * @returns {boolean} True if valid
 */
function isValidConnectorType(connectorType) {
  const validTypes = ['securityscorecard', 'bitsight', 'riskrecon', 'all'];
  return validTypes.includes(connectorType);
}

/**
 * POST /api/vendors/:vendorId/sync
 * Queue a background sync job for a specific vendor
 */
async function triggerVendorSync(req, res) {
  const { vendorId } = req.params;
  const { connectorType = 'all' } = req.body;
  const organizationId = req.orgId;
  const userId = req.userId;

  try {
    // Validate connector type
    if (!isValidConnectorType(connectorType)) {
      return res.status(400).json({
        error: 'Invalid connector type',
        message: 'Connector type must be one of: securityscorecard, bitsight, riskrecon, all'
      });
    }

    // Verify vendor exists and belongs to organization
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        error: 'Vendor not found',
        message: `Vendor with ID ${vendorId} does not exist`
      });
    }

    if (vendor.organizationId !== organizationId) {
      logger.warn('Attempt to sync vendor from different organization', {
        userId,
        organizationId,
        vendorId,
        vendorOrgId: vendor.organizationId
      });
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to sync this vendor'
      });
    }

    // Generate unique job ID
    const jobId = `sync-vendor-${vendorId}-${connectorType}-${Date.now()}`;

    // Create job record in database
    const jobRecord = await VendorSyncJob.create({
      id: jobId,
      organizationId,
      vendorId,
      connectorType,
      jobType: JobTypes.SYNC_VENDOR
    });

    // Queue the job in BullMQ
    const job = await addJob(JobTypes.SYNC_VENDOR, {
      vendorId,
      organizationId,
      connectorType,
      userId,
      jobId
    });

    logger.info('Vendor sync job queued', {
      jobId: job.id,
      vendorId,
      organizationId,
      connectorType,
      userId
    });

    res.status(201).json({
      jobId: jobRecord.id,
      status: 'queued',
      vendorId,
      connectorType,
      queuedAt: jobRecord.createdAt
    });

  } catch (error) {
    logger.error('Failed to queue vendor sync job', {
      error: error.message,
      vendorId,
      organizationId,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to queue sync job',
      message: error.message
    });
  }
}

/**
 * POST /api/vendors/:vendorId/sync/all
 * Queue sync jobs for all configured connectors
 */
async function triggerFullSync(req, res) {
  const { vendorId } = req.params;
  const organizationId = req.orgId;
  const userId = req.userId;

  try {
    // Verify vendor exists and belongs to organization
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        error: 'Vendor not found',
        message: `Vendor with ID ${vendorId} does not exist`
      });
    }

    if (vendor.organizationId !== organizationId) {
      logger.warn('Attempt to sync vendor from different organization', {
        userId,
        organizationId,
        vendorId,
        vendorOrgId: vendor.organizationId
      });
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to sync this vendor'
      });
    }

    // Define available connector types
    const connectorTypes = ['securityscorecard', 'bitsight', 'riskrecon'];
    const jobIds = [];

    // Queue a job for each connector type
    for (const connectorType of connectorTypes) {
      const jobId = `sync-vendor-${vendorId}-${connectorType}-${Date.now()}`;

      // Create job record in database
      await VendorSyncJob.create({
        id: jobId,
        organizationId,
        vendorId,
        connectorType,
        jobType: JobTypes.SYNC_VENDOR
      });

      // Queue the job in BullMQ
      await addJob(JobTypes.SYNC_VENDOR, {
        vendorId,
        organizationId,
        connectorType,
        userId,
        jobId
      });

      jobIds.push(jobId);
    }

    logger.info('Full vendor sync queued for all connectors', {
      vendorId,
      organizationId,
      jobIds,
      userId
    });

    res.status(201).json({
      jobIds,
      count: jobIds.length,
      vendorId,
      status: 'queued',
      message: `Queued ${jobIds.length} sync jobs for all connectors`
    });

  } catch (error) {
    logger.error('Failed to queue full vendor sync', {
      error: error.message,
      vendorId,
      organizationId,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to queue sync jobs',
      message: error.message
    });
  }
}

/**
 * GET /api/vendors/:vendorId/sync-status/:jobId
 * Track sync job progress
 */
async function getSyncStatus(req, res) {
  const { vendorId, jobId } = req.params;
  const organizationId = req.orgId;

  try {
    // Get job record from database
    const job = await VendorSyncJob.findById(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        message: `Sync job with ID ${jobId} does not exist`
      });
    }

    // Verify organization access
    if (job.organizationId !== organizationId) {
      logger.warn('Attempt to access job from different organization', {
        organizationId,
        jobId,
        jobOrgId: job.organizationId
      });
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to view this job'
      });
    }

    // Verify vendor ID matches
    if (job.vendorId !== vendorId) {
      return res.status(400).json({
        error: 'Vendor mismatch',
        message: 'Job does not belong to the specified vendor'
      });
    }

    // Get additional job state from BullMQ if job is still processing
    let queueState = null;
    if (job.status === 'queued' || job.status === 'running') {
      try {
        queueState = await getJobState(jobId);
      } catch (error) {
        logger.warn('Failed to get queue state', {
          jobId,
          error: error.message
        });
      }
    }

    // Calculate progress percentage
    let progress = 0;
    if (job.status === 'completed') {
      progress = 100;
    } else if (job.status === 'running') {
      progress = 50; // Rough estimate for running jobs
    }

    res.json({
      jobId: job.id,
      vendorId: job.vendorId,
      connectorType: job.connectorType,
      status: job.status,
      progress,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.errorMessage,
      retryCount: job.retryCount,
      createdAt: job.createdAt,
      queueState: queueState ? {
        state: queueState.state,
        attemptsMade: queueState.attemptsMade,
        failedReason: queueState.failedReason
      } : null
    });

  } catch (error) {
    logger.error('Failed to get sync job status', {
      error: error.message,
      jobId,
      vendorId,
      organizationId,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to retrieve job status',
      message: error.message
    });
  }
}

/**
 * GET /api/vendors/:vendorId/sync-jobs
 * Get all sync jobs for a vendor
 */
async function getVendorSyncJobs(req, res) {
  const { vendorId } = req.params;
  const organizationId = req.orgId;
  const { status, limit = 50, offset = 0 } = req.query;

  try {
    // Verify vendor exists and belongs to organization
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        error: 'Vendor not found',
        message: `Vendor with ID ${vendorId} does not exist`
      });
    }

    if (vendor.organizationId !== organizationId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to view jobs for this vendor'
      });
    }

    const jobs = await VendorSyncJob.findByVendor(vendorId, {
      status: status || undefined
    });

    res.json({
      vendorId,
      count: jobs.length,
      data: jobs
    });

  } catch (error) {
    logger.error('Failed to get vendor sync jobs', {
      error: error.message,
      vendorId,
      organizationId,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to retrieve sync jobs',
      message: error.message
    });
  }
}

/**
 * GET /api/sync-jobs/statistics
 * Get sync job statistics for organization
 */
async function getSyncStatistics(req, res) {
  const organizationId = req.orgId;

  try {
    const stats = await VendorSyncJob.getStatistics(organizationId);

    res.json({
      organizationId,
      statistics: stats
    });

  } catch (error) {
    logger.error('Failed to get sync statistics', {
      error: error.message,
      organizationId,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to retrieve statistics',
      message: error.message
    });
  }
}

module.exports = {
  triggerVendorSync,
  triggerFullSync,
  getSyncStatus,
  getVendorSyncJobs,
  getSyncStatistics
};
