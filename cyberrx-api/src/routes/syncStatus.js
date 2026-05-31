'use strict';

const express = require('express');
const router = express.Router();
const { VendorSyncJob } = require('../models/VendorSyncJob');
const { authenticateJWT } = require('../middleware/auth');
const logger = require('../config/logger');

/**
 * Calculate progress percentage for a sync job
 * @param {Object} job - Job record
 * @returns {number} Progress percentage (0-100)
 */
function calculateProgress(job) {
  // If job has explicit progress in metadata, use it
  if (job.metadata && job.metadata.progress !== undefined) {
    return Math.min(100, Math.max(0, job.metadata.progress));
  }

  // Otherwise, calculate based on status
  switch (job.status) {
    case 'queued':
      return 0;
    case 'running':
      // Default to 50% if running but no specific progress
      return 50;
    case 'completed':
      return 100;
    case 'failed':
      // Return progress at point of failure
      return job.metadata?.progress || 0;
    default:
      return 0;
  }
}

/**
 * GET /api/vendors/:vendorId/sync-status/:jobId
 *
 * Get detailed status of a specific sync job
 *
 * Query params: None
 *
 * Returns:
 * {
 *   jobId: string,
 *   vendorId: string,
 *   connectorType: string,
 *   jobType: string,
 *   status: 'queued' | 'running' | 'completed' | 'failed',
 *   progress: number (0-100),
 *   startedAt: string | null,
 *   completedAt: string | null,
 *   errorMessage: string | null,
 *   retryCount: number,
 *   metadata: object,
 *   createdAt: string,
 *   updatedAt: string
 * }
 */
router.get('/:vendorId/sync-status/:jobId', authenticateJWT, async (req, res) => {
  const { vendorId, jobId } = req.params;
  const { organizationId: userOrgId } = req.user;

  try {
    // Validate UUID formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(vendorId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid vendorId format. Expected UUID.'
      });
    }
    if (!uuidRegex.test(jobId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid jobId format. Expected UUID.'
      });
    }

    // Fetch job from database
    const job = await VendorSyncJob.findById(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Sync job ${jobId} not found`
      });
    }

    // Verify organization access
    if (job.organizationId !== userOrgId) {
      logger.warn('Unauthorized sync status access attempt', {
        userId: req.userId,
        userOrgId,
        jobOrgId: job.organizationId,
        jobId
      });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this sync job'
      });
    }

    // Verify vendor matches
    if (job.vendorId !== vendorId) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Sync job ${jobId} does not belong to vendor ${vendorId}`
      });
    }

    // Calculate progress percentage
    const progress = calculateProgress(job);

    res.json({
      jobId: job.id,
      vendorId: job.vendorId,
      connectorType: job.connectorType,
      jobType: job.jobType || 'sync_vendor',
      status: job.status,
      progress,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      errorMessage: job.errorMessage,
      retryCount: job.retryCount,
      metadata: job.metadata || {},
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    });
  } catch (error) {
    logger.error('Error fetching sync status', {
      error: error.message,
      vendorId,
      jobId,
      userId: req.userId,
      stack: error.stack
    });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch sync status'
    });
  }
});

/**
 * GET /api/vendors/:vendorId/sync-jobs
 *
 * List all sync jobs for a specific vendor
 *
 * Query params:
 * - status: Filter by status (queued, running, completed, failed)
 * - jobType: Filter by job type (sync_vendor, sync_connector, assessment)
 * - limit: Max number of results (default: 50, max: 100)
 * - offset: Number of results to skip (default: 0)
 *
 * Returns:
 * {
 *   vendorId: string,
 *   jobs: Array<{
 *     jobId: string,
 *     connectorType: string,
 *     jobType: string,
 *     status: string,
 *     progress: number,
 *     startedAt: string | null,
 *     completedAt: string | null,
 *     errorMessage: string | null,
 *     createdAt: string
 *   }>,
 *   pagination: {
 *     total: number,
 *     limit: number,
 *     offset: number,
 *     hasMore: boolean
 *   }
 * }
 */
router.get('/:vendorId/sync-jobs', authenticateJWT, async (req, res) => {
  const { vendorId } = req.params;
  const { organizationId: userOrgId } = req.user;
  const { status, jobType, limit = 50, offset = 0 } = req.query;

  try {
    // Validate vendorId format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(vendorId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid vendorId format. Expected UUID.'
      });
    }

    // Parse and validate limit
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid limit. Must be between 1 and 100.'
      });
    }

    // Parse and validate offset
    const parsedOffset = parseInt(offset, 10);
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid offset. Must be 0 or greater.'
      });
    }

    // Validate status if provided
    const validStatuses = ['queued', 'running', 'completed', 'failed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Fetch jobs for this vendor and organization
    const jobs = await VendorSyncJob.findByOrganization(userOrgId, {
      vendorId,
      status,
      limit: parsedLimit,
      offset: parsedOffset
    });

    // Filter by jobType if specified (post-filter since model doesn't support it)
    let filteredJobs = jobs;
    if (jobType) {
      filteredJobs = jobs.filter(job => job.jobType === jobType);
    }

    // Get total count for pagination
    // Note: This is an approximation - for exact count we'd need a separate count query
    const totalJobs = await VendorSyncJob.findByOrganization(userOrgId, {
      vendorId,
      status
    });
    let totalCount = totalJobs.length;
    if (jobType) {
      totalCount = totalJobs.filter(job => job.jobType === jobType).length;
    }

    // Transform jobs to response format
    const jobsResponse = filteredJobs.map(job => ({
      jobId: job.id,
      connectorType: job.connectorType,
      jobType: job.jobType || 'sync_vendor',
      status: job.status,
      progress: calculateProgress(job),
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt
    }));

    res.json({
      vendorId,
      jobs: jobsResponse,
      pagination: {
        total: totalCount,
        limit: parsedLimit,
        offset: parsedOffset,
        hasMore: totalCount > parsedOffset + parsedLimit
      }
    });
  } catch (error) {
    logger.error('Error fetching sync jobs', {
      error: error.message,
      vendorId,
      userId: req.userId,
      userOrgId,
      stack: error.stack
    });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch sync jobs'
    });
  }
});

/**
 * GET /api/sync-jobs
 *
 * List all sync jobs for the authenticated user's organization
 *
 * Query params:
 * - vendorId: Filter by vendor (optional)
 * - status: Filter by status (queued, running, completed, failed)
 * - jobType: Filter by job type (sync_vendor, sync_connector, assessment)
 * - limit: Max number of results (default: 50, max: 100)
 * - offset: Number of results to skip (default: 0)
 *
 * Returns: Same format as /api/vendors/:vendorId/sync-jobs
 */
router.get('/sync-jobs', authenticateJWT, async (req, res) => {
  const { organizationId: userOrgId } = req.user;
  const { vendorId, status, jobType, limit = 50, offset = 0 } = req.query;

  try {
    // Parse and validate limit
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid limit. Must be between 1 and 100.'
      });
    }

    // Parse and validate offset
    const parsedOffset = parseInt(offset, 10);
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid offset. Must be 0 or greater.'
      });
    }

    // Validate status if provided
    const validStatuses = ['queued', 'running', 'completed', 'failed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Fetch jobs
    const jobs = await VendorSyncJob.findByOrganization(userOrgId, {
      vendorId,
      status,
      limit: parsedLimit,
      offset: parsedOffset
    });

    // Filter by jobType if specified
    let filteredJobs = jobs;
    if (jobType) {
      filteredJobs = jobs.filter(job => job.jobType === jobType);
    }

    // Get total count for pagination
    const totalJobs = await VendorSyncJob.findByOrganization(userOrgId, {
      vendorId,
      status
    });
    let totalCount = totalJobs.length;
    if (jobType) {
      totalCount = totalJobs.filter(job => job.jobType === jobType).length;
    }

    // Transform jobs to response format
    const jobsResponse = filteredJobs.map(job => ({
      jobId: job.id,
      vendorId: job.vendorId,
      connectorType: job.connectorType,
      jobType: job.jobType || 'sync_vendor',
      status: job.status,
      progress: calculateProgress(job),
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt
    }));

    res.json({
      organizationId: userOrgId,
      jobs: jobsResponse,
      pagination: {
        total: totalCount,
        limit: parsedLimit,
        offset: parsedOffset,
        hasMore: totalCount > parsedOffset + parsedLimit
      }
    });
  } catch (error) {
    logger.error('Error fetching organization sync jobs', {
      error: error.message,
      userId: req.userId,
      userOrgId,
      stack: error.stack
    });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch sync jobs'
    });
  }
});

module.exports = router;
