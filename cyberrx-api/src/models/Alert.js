'use strict';

const crypto = require('crypto');
const { query } = require('../utils/db');

// Generate UUID v4
const uuidv4 = () => crypto.randomUUID();

/**
 * Alert Model
 *
 * Represents vendor monitoring alerts sent to users via email and Slack
 * Stores alert history, delivery status, and acknowledgment state
 */
class Alert {
  // Valid alert types
  static VALID_TYPES = [
    'critical_signal',
    'score_increase',
    'grade_degradation',
    'multi_provider_confirmed',
    'sync_failure'
  ];

  // Valid severities
  static VALID_SEVERITIES = ['Critical', 'High', 'Medium', 'Low', 'Info'];

  // Valid delivery statuses
  static VALID_DELIVERY_STATUSES = ['pending', 'sent', 'failed', 'delivered'];

  /**
   * Create a new alert
   * @param {Object} data - Alert data
   * @param {string} [data.id] - UUID (optional, will be generated if not provided)
   * @param {string} data.organizationId - Organization ID
   * @param {string} data.vendorId - Vendor ID
   * @param {string} data.vendorName - Vendor name
   * @param {string} data.type - Alert type
   * @param {string} data.severity - Alert severity
   * @param {string} data.message - Alert message
   * @param {Object} [data.data] - Alert data payload
   * @param {string} [data.deliveryStatus] - Delivery status
   * @param {Object} [data.metadata] - Additional metadata
   * @returns {Promise<Object>} Created alert
   */
  static async create(data) {
    const {
      id = uuidv4(),
      organizationId,
      vendorId,
      vendorName,
      type,
      severity,
      message,
      data: alertData = {},
      deliveryStatus = 'pending',
      metadata = {}
    } = data;

    // Validate
    if (!this.VALID_TYPES.includes(type)) {
      throw new Error(`Invalid alert type: ${type}`);
    }

    if (!this.VALID_SEVERITIES.includes(severity)) {
      throw new Error(`Invalid severity: ${severity}`);
    }

    const result = await query(
      `INSERT INTO vendor_alerts (
        id, organization_id, vendor_id, alert_type, severity, message,
        data, delivery_status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *`,
      [
        id,
        organizationId,
        vendorId,
        type,
        severity,
        message,
        JSON.stringify(alertData),
        deliveryStatus
      ]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Find alert by ID
   * @param {string} id - Alert ID
   * @returns {Promise<Object|null>} Alert or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM vendor_alerts WHERE id = $1',
      [id]
    );

    if (result.length === 0) {
      return null;
    }

    return this._transformFromDb(result[0]);
  }

  /**
   * Find alerts by organization
   * @param {string} organizationId - Organization ID
   * @param {Object} [filters] - Optional filters
   * @param {string} [filters.type] - Filter by type
   * @param {string} [filters.severity] - Filter by severity
   * @param {string} [filters.vendorId] - Filter by vendor
   * @param {number} [filters.limit] - Limit results
   * @param {number} [filters.offset] - Offset results
   * @returns {Promise<Object[]>} Array of alerts
   */
  static async findByOrganization(organizationId, filters = {}) {
    const conditions = ['organization_id = $1'];
    const params = [organizationId];
    let paramIndex = 2;

    if (filters.type) {
      conditions.push(`alert_type = $${paramIndex++}`);
      params.push(filters.type);
    }

    if (filters.severity) {
      conditions.push(`severity = $${paramIndex++}`);
      params.push(filters.severity);
    }

    if (filters.vendorId) {
      conditions.push(`vendor_id = $${paramIndex++}`);
      params.push(filters.vendorId);
    }

    const whereClause = conditions.join(' AND ');
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const result = await query(
      `SELECT * FROM vendor_alerts WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find alerts by vendor
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @param {number} [limit=50] - Limit results
   * @returns {Promise<Object[]>} Array of alerts
   */
  static async findByVendor(vendorId, organizationId, limit = 50) {
    const result = await query(
      `SELECT * FROM vendor_alerts
       WHERE vendor_id = $1 AND organization_id = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [vendorId, organizationId, limit]
    );

    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find pending alerts
   * @param {number} [limit=100] - Limit results
   * @returns {Promise<Object[]>} Array of pending alerts
   */
  static async findPending(limit = 100) {
    const result = await query(
      `SELECT * FROM vendor_alerts
       WHERE delivery_status = 'pending'
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit]
    );

    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Update alert delivery status
   * @param {string} id - Alert ID
   * @param {string} status - New delivery status
   * @param {Object} [metadata] - Additional metadata
   * @returns {Promise<Object>} Updated alert
   */
  static async updateDeliveryStatus(id, status, metadata = {}) {
    if (!this.VALID_DELIVERY_STATUSES.includes(status)) {
      throw new Error(`Invalid delivery status: ${status}`);
    }

    const result = await query(
      `UPDATE vendor_alerts
       SET delivery_status = $1,
           data = COALESCE(data, '{}'::jsonb) || $3::jsonb,
           sent_at = CASE WHEN $1 = 'sent' THEN NOW() ELSE sent_at END
       WHERE id = $2
       RETURNING *`,
      [status, id, JSON.stringify(metadata)]
    );

    if (result.length === 0) {
      throw new Error('Alert not found');
    }

    return this._transformFromDb(result[0]);
  }

  /**
   * Acknowledge alert
   * @param {string} id - Alert ID
   * @param {string} acknowledgedBy - User ID
   * @returns {Promise<Object>} Updated alert
   */
  static async acknowledge(id, acknowledgedBy) {
    const result = await query(
      `UPDATE vendor_alerts
       SET acknowledged_at = NOW(),
           data = jsonb_set(
             COALESCE(data, '{}'::jsonb),
             '{acknowledgedBy}',
             to_jsonb($1)
           )
       WHERE id = $2
       RETURNING *`,
      [acknowledgedBy, id]
    );

    if (result.length === 0) {
      throw new Error('Alert not found');
    }

    return this._transformFromDb(result[0]);
  }

  /**
   * Get alert statistics by organization
   * @param {string} organizationId - Organization ID
   * @param {number} [days=30] - Number of days to look back
   * @returns {Promise<Object>} Alert statistics
   */
  static async getStatistics(organizationId, days = 30) {
    const result = await query(
      `SELECT
         alert_type as type,
         severity,
         COUNT(*) as count,
         COUNT(CASE WHEN delivery_status = 'sent' THEN 1 END) as delivered,
         COUNT(CASE WHEN delivery_status = 'failed' THEN 1 END) as failed,
         COUNT(CASE WHEN acknowledged_at IS NOT NULL THEN 1 END) as acknowledged
       FROM vendor_alerts
       WHERE organization_id = $1
         AND created_at > NOW() - INTERVAL '1 day' * $2
       GROUP BY alert_type, severity
       ORDER BY count DESC`,
      [organizationId, days]
    );

    return result.map(row => ({
      type: row.type,
      severity: row.severity,
      count: parseInt(row.count),
      delivered: parseInt(row.delivered),
      failed: parseInt(row.failed),
      acknowledged: parseInt(row.acknowledged)
    }));
  }

  /**
   * Delete old alerts
   * @param {number} [days=90] - Delete alerts older than this many days
   * @returns {Promise<number>} Number of deleted alerts
   */
  static async deleteOld(days = 90) {
    const result = await query(
      `DELETE FROM vendor_alerts
       WHERE created_at < NOW() - INTERVAL '1 day' * $1
       AND delivery_status IN ('sent', 'failed')
       AND acknowledged_at IS NOT NULL`,
      [days]
    );

    return result.rowCount || 0;
  }

  /**
   * Transform database row to application format
   * @private
   * @param {Object} row - Database row
   * @returns {Object} Transformed alert
   */
  static _transformFromDb(row) {
    if (!row) return null;

    return {
      id: row.id,
      organizationId: row.organization_id,
      vendorId: row.vendor_id,
      vendorName: row.vendor_name,
      type: row.alert_type,
      severity: row.severity,
      message: row.message,
      data: row.data,
      deliveryStatus: row.delivery_status,
      sentAt: row.sent_at,
      acknowledgedAt: row.acknowledged_at,
      acknowledgedBy: row.data?.acknowledgedBy || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = Alert;
