'use strict';

/**
 * ProvenanceTrail Model
 *
 * Extended audit trail for mapping confirmation events with full provenance chain
 * Tracks WHO confirmed WHAT, WHEN, with WHAT rationale, and traces back to source
 * HIPAA compliant: captures user identification, timestamp, event type, before/after values, rationale
 */

const { query } = require('../utils/db');

/**
 * Log mapping confirmation event
 * @param {Object} params - Confirmation parameters
 * @param {UUID} params.organizationId - Organization UUID
 * @param {number} params.userId - User ID
 * @param {string} params.userEmail - User email
 * @param {string} params.userRole - User role (admin, editor, viewer)
 * @param {string} params.targetType - Type of target (process_mapping, application_mapping)
 * @param {string} params.targetId - ID of the mapping proposal
 * @param {string} params.action - Action performed (accepted, rejected, overridden)
 * @param {Object} params.before - State before confirmation
 * @param {Object} params.after - State after confirmation
 * @param {Object} params.provenance - Provenance chain data
 * @param {string} params.rationale - Human rationale for the action
 * @param {string} params.ipAddress - Client IP address
 * @param {string} params.userAgent - Client user agent
 * @param {string} params.sessionId - User session ID
 * @returns {Promise<number>} Audit log ID
 */
async function logMappingConfirmation({
  organizationId,
  userId,
  userEmail,
  userRole,
  targetType,
  targetId,
  action,
  before,
  after,
  provenance,
  rationale,
  ipAddress,
  userAgent,
  sessionId
}) {
  try {
    const result = await query(
      `INSERT INTO audit_logs (
        organization_id,
        user_id,
        action,
        resource_type,
        resource_id,
        details,
        ip_address,
        user_agent,
        status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      ) RETURNING id`,
      [
        organizationId,
        userId,
        `mapping_${action}`, // mapping_accepted, mapping_rejected, mapping_overridden
        targetType,
        targetId,
        JSON.stringify({
          user_email: userEmail,
          user_role: userRole,
          before,
          after,
          provenance,
          rationale,
          session_id: sessionId
        }),
        ipAddress,
        userAgent,
        'success'
      ]
    );
    return result.rows[0].id;
  } catch (error) {
    console.error('Error logging mapping confirmation:', error);
    // Don't throw - audit log failures shouldn't break the main operation
    return null;
  }
}

/**
 * Query audit logs with filters
 * @param {Object} params - Query parameters
 * @param {UUID} params.organizationId - Organization UUID
 * @param {string} params.startDate - Start date (ISO 8601)
 * @param {string} params.endDate - End date (ISO 8601)
 * @param {Array<string>} params.eventTypes - Event types to filter
 * @param {number} params.userId - Optional user ID filter
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.perPage - Records per page (default: 50)
 * @returns {Promise<Object>} Query results with pagination
 */
async function queryAuditLogs({
  organizationId,
  startDate,
  endDate,
  eventTypes,
  userId,
  page = 1,
  perPage = 50
}) {
  try {
    const conditions = ['organization_id = $1'];
    const params = [organizationId];
    let paramIndex = 2;

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    if (eventTypes && eventTypes.length > 0) {
      conditions.push(`action = ANY($${paramIndex++})`);
      params.push(eventTypes);
    }

    if (userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      params.push(userId);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM audit_logs WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const offset = (page - 1) * perPage;
    params.push(perPage, offset);

    const dataResult = await query(
      `SELECT
        id,
        created_at,
        user_id,
        action,
        resource_type as target_type,
        resource_id as target_id,
        details,
        ip_address,
        user_agent
      FROM audit_logs
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    // Transform to API format
    const auditLogs = dataResult.rows.map(row => ({
      id: row.id,
      timestamp: row.created_at,
      user_email: row.details?.user_email || 'Unknown',
      user_role: row.details?.user_role || 'Unknown',
      action: row.action.replace('mapping_', ''), // accepted, rejected, overridden
      target: {
        type: row.target_type,
        id: row.target_id,
        customer_value: row.details?.before?.customer_value,
        proposed_match: row.details?.before?.proposed_match,
        confirmed_match: row.details?.after?.confirmed_match,
        confidence: row.details?.before?.confidence
      },
      rationale: row.details?.rationale,
      provenance: row.details?.provenance,
      ip_address: row.ip_address,
      session_id: row.details?.session_id
    }));

    return {
      audit_logs: auditLogs,
      pagination: {
        total,
        page,
        per_page: perPage,
        total_pages: Math.ceil(total / perPage)
      }
    };
  } catch (error) {
    console.error('Error querying audit logs:', error);
    throw error;
  }
}

/**
 * Get full audit record with provenance chain
 * @param {number} auditId - Audit log ID
 * @returns {Promise<Object>} Full audit record with provenance chain
 */
async function getAuditRecordWithProvenance(auditId) {
  try {
    const result = await query(
      `SELECT
        id,
        organization_id,
        user_id,
        action,
        resource_type,
        resource_id,
        details,
        ip_address,
        user_agent,
        created_at
      FROM audit_logs
      WHERE id = $1`,
      [auditId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const details = row.details;

    // Build provenance chain
    const provenanceChain = [];

    if (details?.provenance) {
      const prov = details.provenance;

      // Stage 1: Ingest
      if (prov.source_file || prov.ingested_at) {
        provenanceChain.push({
          stage: 'ingest',
          timestamp: prov.ingested_at,
          details: {
            source_file: prov.source_file,
            source_row_id: prov.source_row_id,
            ingest_id: prov.ingest_id
          }
        });
      }

      // Stage 2: Normalize
      if (prov.normalized_at) {
        provenanceChain.push({
          stage: 'normalize',
          timestamp: prov.normalized_at,
          details: {
            normalized_value: prov.normalized_value
          }
        });
      }

      // Stage 3: Match
      if (prov.matched_at) {
        provenanceChain.push({
          stage: 'match',
          timestamp: prov.matched_at,
          details: {
            match_method: prov.match_method,
            proposed_match: prov.proposed_match,
            confidence: prov.confidence
          }
        });
      }

      // Stage 4: Confirm
      provenanceChain.push({
        stage: 'confirm',
        timestamp: row.created_at,
        details: {
          action: row.action,
          confirmed_match: details.after?.confirmed_match,
          rationale: details.rationale,
          user_email: details.user_email
        }
      });
    }

    // Build full audit record
    const auditRecord = {
      id: row.id,
      event_type: row.action,
      timestamp: row.created_at,
      user_id: row.user_id,
      user_email: details?.user_email,
      user_role: details?.user_role,
      organization_id: row.organization_id,
      target_type: row.resource_type,
      target_id: row.resource_id,
      action: row.action.replace('mapping_', ''),
      before: details?.before,
      after: details?.after,
      provenance: details?.provenance,
      rationale: details?.rationale,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      session_id: details?.session_id
    };

    return {
      audit_record: auditRecord,
      provenance_chain: provenanceChain
    };
  } catch (error) {
    console.error('Error fetching audit record:', error);
    throw error;
  }
}

/**
 * Export audit logs as CSV for compliance
 * @param {Object} params - Export parameters
 * @param {UUID} params.organizationId - Organization UUID
 * @param {string} params.startDate - Start date (ISO 8601)
 * @param {string} params.endDate - End date (ISO 8601)
 * @returns {Promise<string>} CSV content
 */
async function exportAuditLogsAsCSV({
  organizationId,
  startDate,
  endDate
}) {
  try {
    const result = await query(
      `SELECT
        id,
        created_at,
        action,
        resource_type,
        resource_id,
        details,
        ip_address,
        user_agent
      FROM audit_logs
      WHERE organization_id = $1
        AND created_at >= $2
        AND created_at <= $3
      ORDER BY created_at ASC`,
      [organizationId, startDate, endDate]
    );

    // CSV headers
    const headers = [
      'ID',
      'Timestamp',
      'User Email',
      'User Role',
      'Action',
      'Target Type',
      'Target ID',
      'Customer Value',
      'Proposed Match',
      'Confirmed Match',
      'Confidence',
      'Rationale',
      'IP Address',
      'Source File',
      'Source Row ID',
      'Ingest Timestamp',
      'Normalize Timestamp',
      'Match Timestamp',
      'Match Method'
    ];

    // Build CSV rows
    const rows = result.rows.map(row => {
      const details = row.details || {};
      const provenance = details.provenance || {};

      return [
        row.id,
        row.created_at,
        details.user_email || '',
        details.user_role || '',
        row.action,
        row.resource_type,
        row.resource_id,
        details.before?.customer_value || '',
        details.before?.proposed_match || '',
        details.after?.confirmed_match || '',
        details.before?.confidence || '',
        details.rationale || '',
        row.ip_address || '',
        provenance.source_file || '',
        provenance.source_row_id || '',
        provenance.ingested_at || '',
        provenance.normalized_at || '',
        provenance.matched_at || '',
        provenance.match_method || ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    throw error;
  }
}

/**
 * Get audit statistics for compliance reporting
 * @param {UUID} organizationId - Organization UUID
 * @param {string} startDate - Start date (ISO 8601)
 * @param {string} endDate - End date (ISO 8601)
 * @returns {Promise<Object>} Audit statistics
 */
async function getAuditStatistics(organizationId, startDate, endDate) {
  try {
    const result = await query(
      `SELECT
        action,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users,
        MAX(created_at) as last_occurrence
      FROM audit_logs
      WHERE organization_id = $1
        AND created_at >= $2
        AND created_at <= $3
      GROUP BY action
      ORDER BY count DESC`,
      [organizationId, startDate, endDate]
    );

    return result.rows.map(row => ({
      event_type: row.action,
      count: parseInt(row.count),
      unique_users: parseInt(row.unique_users),
      last_occurrence: row.last_occurrence
    }));
  } catch (error) {
    console.error('Error fetching audit statistics:', error);
    throw error;
  }
}

module.exports = {
  logMappingConfirmation,
  queryAuditLogs,
  getAuditRecordWithProvenance,
  exportAuditLogsAsCSV,
  getAuditStatistics
};
