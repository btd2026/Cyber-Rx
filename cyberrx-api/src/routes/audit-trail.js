'use strict';

/**
 * Audit Trail API Routes
 *
 * Provides endpoints for querying and exporting audit logs with provenance tracking
 * HIPAA compliant: captures all required audit data for compliance reporting
 */

const express = require('express');
const router = express.Router();
const ProvenanceTrail = require('../models/ProvenanceTrail');
const { authenticateJWT: authenticateToken } = require('../middleware/auth');

/**
 * GET /api/audit-trail
 *
 * Query audit logs with filters
 *
 * Query Parameters:
 * - organization_id: UUID (required)
 * - start_date: ISO 8601 date string (optional)
 * - end_date: ISO 8601 date string (optional)
 * - event_types: Comma-separated list of event types (optional)
 * - user_id: User ID filter (optional)
 * - page: Page number (default: 1)
 * - per_page: Records per page (default: 50)
 *
 * Response:
 * {
 *   "audit_logs": [...],
 *   "pagination": {
 *     "total": 150,
 *     "page": 1,
 *     "per_page": 50,
 *     "total_pages": 3
 *   }
 * }
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      organization_id,
      start_date,
      end_date,
      event_types,
      user_id,
      page = 1,
      per_page = 50
    } = req.query;

    // Validate required parameters
    if (!organization_id) {
      return res.status(400).json({
        error: 'Missing required parameter: organization_id'
      });
    }

    // Validate dates
    if (start_date && isNaN(Date.parse(start_date))) {
      return res.status(400).json({
        error: 'Invalid start_date format. Use ISO 8601 format (e.g., 2025-06-01)'
      });
    }

    if (end_date && isNaN(Date.parse(end_date))) {
      return res.status(400).json({
        error: 'Invalid end_date format. Use ISO 8601 format (e.g., 2025-06-30)'
      });
    }

    // Parse event types
    const eventTypesArray = event_types
      ? event_types.split(',').map(et => et.trim())
      : null;

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const perPageNum = Math.min(100, Math.max(1, parseInt(per_page) || 50));

    // Query audit logs
    const result = await ProvenanceTrail.queryAuditLogs({
      organizationId: organization_id,
      startDate: start_date,
      endDate: end_date,
      eventTypes: eventTypesArray,
      userId: user_id ? parseInt(user_id) : null,
      page: pageNum,
      perPage: perPageNum
    });

    res.json(result);
  } catch (error) {
    console.error('Error querying audit logs:', error);
    res.status(500).json({
      error: 'Failed to query audit logs',
      message: error.message
    });
  }
});

/**
 * GET /api/audit-trail/:id
 *
 * Get full audit record with provenance chain
 *
 * Response:
 * {
 *   "audit_record": { ... },
 *   "provenance_chain": [
 *     { stage: 'ingest', timestamp: '...', details: {...} },
 *     { stage: 'normalize', timestamp: '...', details: {...} },
 *     { stage: 'match', timestamp: '...', details: {...} },
 *     { stage: 'confirm', timestamp: '...', details: {...} }
 *   ]
 * }
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    const auditId = parseInt(id);
    if (isNaN(auditId)) {
      return res.status(400).json({
        error: 'Invalid audit log ID'
      });
    }

    const result = await ProvenanceTrail.getAuditRecordWithProvenance(auditId);

    if (!result) {
      return res.status(404).json({
        error: 'Audit log not found'
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching audit record:', error);
    res.status(500).json({
      error: 'Failed to fetch audit record',
      message: error.message
    });
  }
});

/**
 * GET /api/audit-trail/export
 *
 * Export audit logs as CSV for compliance
 *
 * Query Parameters:
 * - organization_id: UUID (required)
 * - start_date: ISO 8601 date string (required)
 * - end_date: ISO 8601 date string (required)
 *
 * Response: CSV file with text/csv content-type
 */
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const { organization_id, start_date, end_date } = req.query;

    // Validate required parameters
    if (!organization_id) {
      return res.status(400).json({
        error: 'Missing required parameter: organization_id'
      });
    }

    if (!start_date) {
      return res.status(400).json({
        error: 'Missing required parameter: start_date'
      });
    }

    if (!end_date) {
      return res.status(400).json({
        error: 'Missing required parameter: end_date'
      });
    }

    // Validate dates
    if (isNaN(Date.parse(start_date))) {
      return res.status(400).json({
        error: 'Invalid start_date format. Use ISO 8601 format (e.g., 2025-06-01)'
      });
    }

    if (isNaN(Date.parse(end_date))) {
      return res.status(400).json({
        error: 'Invalid end_date format. Use ISO 8601 format (e.g., 2025-06-30)'
      });
    }

    // Generate CSV
    const csv = await ProvenanceTrail.exportAuditLogsAsCSV({
      organizationId: organization_id,
      startDate: start_date,
      endDate: end_date
    });

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-trail-${organization_id}-${start_date}-${end_date}.csv"`);

    res.send(csv);
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({
      error: 'Failed to export audit logs',
      message: error.message
    });
  }
});

/**
 * GET /api/audit-trail/stats
 *
 * Get audit statistics for compliance reporting
 *
 * Query Parameters:
 * - organization_id: UUID (required)
 * - start_date: ISO 8601 date string (required)
 * - end_date: ISO 8601 date string (required)
 *
 * Response:
 * {
 *   "statistics": [
 *     {
 *       "event_type": "mapping_accepted",
 *       "count": 120,
 *       "unique_users": 3,
 *       "last_occurrence": "2025-06-03T10:00:00Z"
 *     }
 *   ]
 * }
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { organization_id, start_date, end_date } = req.query;

    // Validate required parameters
    if (!organization_id) {
      return res.status(400).json({
        error: 'Missing required parameter: organization_id'
      });
    }

    if (!start_date) {
      return res.status(400).json({
        error: 'Missing required parameter: start_date'
      });
    }

    if (!end_date) {
      return res.status(400).json({
        error: 'Missing required parameter: end_date'
      });
    }

    // Validate dates
    if (isNaN(Date.parse(start_date))) {
      return res.status(400).json({
        error: 'Invalid start_date format. Use ISO 8601 format (e.g., 2025-06-01)'
      });
    }

    if (isNaN(Date.parse(end_date))) {
      return res.status(400).json({
        error: 'Invalid end_date format. Use ISO 8601 format (e.g., 2025-06-30)'
      });
    }

    const statistics = await ProvenanceTrail.getAuditStatistics(
      organization_id,
      start_date,
      end_date
    );

    res.json({ statistics });
  } catch (error) {
    console.error('Error fetching audit statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch audit statistics',
      message: error.message
    });
  }
});

module.exports = router;
