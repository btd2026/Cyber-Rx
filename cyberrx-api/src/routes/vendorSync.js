'use strict';

const express = require('express');
const router = express.Router();
const {
  triggerVendorSync,
  triggerFullSync,
  getSyncStatus,
  getVendorSyncJobs,
  getSyncStatistics
} = require('../controllers/vendorSyncController');
const { authenticateJWT } = require('../middleware/auth');
const { vendorSyncLimiter, apiGetLimiter } = require('../middleware/rateLimit');

/**
 * Vendor Sync API Routes
 *
 * Endpoints for triggering and tracking vendor sync operations.
 * All routes require JWT authentication and org admin role.
 * Rate limited to prevent abuse.
 *
 * Rate Limits:
 * - POST endpoints: 10 requests per minute per organization
 * - GET endpoints: 100 requests per minute per organization
 */

/**
 * POST /api/vendors/:vendorId/sync
 * Queue a background sync job for a specific vendor
 *
 * Request body:
 * {
 *   "connectorType": "securityscorecard" | "bitsight" | "riskrecon" | "all" (optional)
 * }
 *
 * Response:
 * {
 *   "jobId": "string",
 *   "status": "queued",
 *   "vendorId": "string",
 *   "connectorType": "string",
 *   "queuedAt": "ISO8601 timestamp"
 * }
 *
 * @requires JWT authentication
 * @requires org_admin role
 * @rateLimit 10 requests per minute per organization
 */
router.post('/:vendorId/sync',
  vendorSyncLimiter,
  authenticateJWT,
  triggerVendorSync
);

/**
 * POST /api/vendors/:vendorId/sync/all
 * Queue sync jobs for all configured connectors
 *
 * Response:
 * {
 *   "jobIds": ["string"],
 *   "count": number,
 *   "vendorId": "string",
 *   "status": "queued",
 *   "message": "Queued N sync jobs for all connectors"
 * }
 *
 * @requires JWT authentication
 * @requires org_admin role
 * @rateLimit 10 requests per minute per organization
 */
router.post('/:vendorId/sync/all',
  vendorSyncLimiter,
  authenticateJWT,
  triggerFullSync
);

/**
 * GET /api/vendors/sync/statistics
 * Get sync job statistics for organization
 *
 * Response:
 * {
 *   "organizationId": "string",
 *   "statistics": {
 *     "completed": { "count": number, "avgDurationSeconds": number },
 *     "failed": { "count": number, "avgDurationSeconds": number },
 *     "running": { "count": number, "avgDurationSeconds": null },
 *     "queued": { "count": number, "avgDurationSeconds": null }
 *   }
 * }
 *
 * @requires JWT authentication
 * @rateLimit 100 requests per minute per organization
 */
router.get('/sync/statistics',
  apiGetLimiter,
  authenticateJWT,
  getSyncStatistics
);

module.exports = router;
