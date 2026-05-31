'use strict';

const { query } = require('../utils/db');

/**
 * VendorAlert Model
 *
 * Represents alerts sent for vendor monitoring
 * Stores alert history, delivery status, and acknowledgment
 */
class VendorAlert {
  /**
   * Create a new vendor alert
   * @param {Object} data - Alert data
   * @param {number} data.organizationId - Organization ID
   * @param {number} [data.vendorId] - Vendor ID
   * @param {string} data.alertType - Alert type
   * @param {string} data.severity - Severity level
   * @param {string} data.message - Alert message
   * @param {Object} [data.data] - Alert metadata
   * @returns {Promise<Object>} Created alert
   */
  static async create(data) {
    const {
      organizationId,
      vendorId = null,
      alertType,
      severity,
      message,
      data: alertData = {}
    } = data;

    const result = await query(
      `INSERT INTO vendor_alerts (
        organization_id, vendor_id, alert_type, severity, message, data
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [organizationId, vendorId, alertType, severity, message, JSON.stringify(alertData)]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Find alert by ID
   * @param {number} id - Alert ID
   * @returns {Promise<Object|null>} Alert or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM vendor_alerts WHERE id = $1',
      [id]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Find all alerts for an organization
   * @param {number} organizationId - Organization ID
   * @param {Object} [options] - Query options
   * @param {number} [options.limit] - Limit results
   * @param {number} [options.offset] - Offset results
   * @param {string} [options.severity] - Filter by severity
   * @param {string} [options.alertType] - Filter by alert type
   * @param {string} [options.deliveryStatus] - Filter by delivery status
   * @param {number} [options.vendorId] - Filter by vendor
   * @returns {Promise<Array>} Array of alerts
   */
  static async findByOrganization(organizationId, options = {}) {
    let sql = 'SELECT * FROM vendor_alerts WHERE organization_id = $1';
    const params = [organizationId];
    let paramCount = 2;

    if (options.severity) {
      sql += ` AND severity = $${paramCount}`;
      params.push(options.severity);
      paramCount++;
    }

    if (options.alertType) {
      sql += ` AND alert_type = $${paramCount}`;
      params.push(options.alertType);
      paramCount++;
    }

    if (options.deliveryStatus) {
      sql += ` AND delivery_status = $${paramCount}`;
      params.push(options.deliveryStatus);
      paramCount++;
    }

    if (options.vendorId) {
      sql += ` AND vendor_id = $${paramCount}`;
      params.push(options.vendorId);
      paramCount++;
    }

    sql += ' ORDER BY created_at DESC';

    if (options.limit) {
      sql += ` LIMIT $${paramCount}`;
      params.push(options.limit);
      paramCount++;

      if (options.offset) {
        sql += ` OFFSET $${paramCount}`;
        params.push(options.offset);
      }
    }

    const result = await query(sql, params);
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find alerts by vendor
   * @param {number} vendorId - Vendor ID
   * @param {Object} [options] - Query options
   * @param {number} [options.limit] - Limit results
   * @returns {Promise<Array>} Array of alerts
   */
  static async findByVendor(vendorId, options = {}) {
    const limit = options.limit || 100;

    const result = await query(
      `SELECT * FROM vendor_alerts
       WHERE vendor_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [vendorId, limit]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find pending alerts (for worker)
   * @param {Object} [options] - Query options
   * @param {number} [options.limit] - Limit results
   * @returns {Promise<Array>} Array of pending alerts
   */
  static async findPending(options = {}) {
    const limit = options.limit || 50;

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
   * Find alerts by severity
   * @param {string} severity - Severity level
   * @param {number} organizationId - Organization ID
   * @param {Object} [options] - Query options
   * @param {number} [options.limit] - Limit results
   * @returns {Promise<Array>} Array of alerts
   */
  static async findBySeverity(severity, organizationId, options = {}) {
    const limit = options.limit || 50;

    const result = await query(
      `SELECT * FROM vendor_alerts
       WHERE organization_id = $1 AND severity = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [organizationId, severity, limit]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find alerts by alert type
   * @param {string} alertType - Alert type
   * @param {number} organizationId - Organization ID
   * @param {Object} [options] - Query options
   * @param {number} [options.limit] - Limit results
   * @returns {Promise<Array>} Array of alerts
   */
  static async findByType(alertType, organizationId, options = {}) {
    const limit = options.limit || 50;

    const result = await query(
      `SELECT * FROM vendor_alerts
       WHERE organization_id = $1 AND alert_type = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [organizationId, alertType, limit]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Update alert delivery status
   * @param {number} id - Alert ID
   * @param {string} deliveryStatus - New delivery status
   * @param {Date} [sentAt] - Sent timestamp
   * @returns {Promise<Object>} Updated alert
   */
  static async updateDeliveryStatus(id, deliveryStatus, sentAt = null) {
    const result = await query(
      `UPDATE vendor_alerts
       SET delivery_status = $1, sent_at = $2
       WHERE id = $3
       RETURNING *`,
      [deliveryStatus, sentAt, id]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Acknowledge alert
   * @param {number} id - Alert ID
   * @param {number} userId - User ID acknowledging
   * @returns {Promise<Object>} Updated alert
   */
  static async acknowledge(id, userId) {
    const result = await query(
      `UPDATE vendor_alerts
       SET acknowledged_at = NOW(),
           data = jsonb_set(COALESCE(data, '{}'::jsonb), '{acknowledgedBy}', to_jsonb($2))
       WHERE id = $1
       RETURNING *`,
      [id, userId]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Update alert data
   * @param {number} id - Alert ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated alert
   */
  static async update(id, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['message', 'data', 'deliveryStatus', 'sentAt', 'acknowledgedAt'];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        const dbField = this._camelToSnake(field);
        if (field === 'data') {
          updates.push(`${dbField} = $${paramCount}`);
          values.push(JSON.stringify(data[field]));
        } else {
          updates.push(`${dbField} = $${paramCount}`);
          values.push(data[field]);
        }
        paramCount++;
      }
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const result = await query(
      `UPDATE vendor_alerts SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Delete alert
   * @param {number} id - Alert ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const result = await query('DELETE FROM vendor_alerts WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  /**
   * Get alert statistics for organization
   * @param {number} organizationId - Organization ID
   * @param {number} [days=30] - Number of days to look back
   * @returns {Promise<Object>} Alert statistics
   */
  static async getStats(organizationId, days = 30) {
    const result = await query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE severity = 'Critical') as critical,
        COUNT(*) FILTER (WHERE severity = 'High') as high,
        COUNT(*) FILTER (WHERE severity = 'Medium') as medium,
        COUNT(*) FILTER (WHERE severity = 'Low') as low,
        COUNT(*) FILTER (WHERE severity = 'Info') as info
       FROM vendor_alerts
       WHERE organization_id = $1
         AND created_at > NOW() - INTERVAL '1 day' * $2`,
      [organizationId, days]
    );

    const stats = result[0];
    return {
      total: parseInt(stats.total),
      critical: parseInt(stats.critical),
      high: parseInt(stats.high),
      medium: parseInt(stats.medium),
      low: parseInt(stats.low),
      info: parseInt(stats.info)
    };
  }

  /**
   * Get recent alerts with vendor names
   * @param {number} organizationId - Organization ID
   * @param {number} [limit=50] - Limit results
   * @param {number} [offset=0] - Offset results
   * @returns {Promise<Array>} Array of alerts with vendor names
   */
  static async getRecentWithVendors(organizationId, limit = 50, offset = 0) {
    const result = await query(
      `SELECT
        va.id,
        va.alert_type,
        va.severity,
        va.message,
        va.data,
        va.delivery_status,
        va.sent_at,
        va.acknowledged_at,
        va.created_at,
        v.name as vendor_name
       FROM vendor_alerts va
       LEFT JOIN vendors v ON va.vendor_id = v.id
       WHERE va.organization_id = $1
       ORDER BY va.created_at DESC
       LIMIT $2 OFFSET $3`,
      [organizationId, limit, offset]
    );

    return result.map(row => ({
      id: row.id,
      alertType: row.alert_type,
      severity: row.severity,
      message: row.message,
      data: row.data,
      deliveryStatus: row.delivery_status,
      sentAt: row.sent_at,
      acknowledgedAt: row.acknowledged_at,
      createdAt: row.created_at,
      vendorName: row.vendor_name
    }));
  }

  /**
   * Transform database row to camelCase model
   * @private
   */
  static _transformFromDb(row) {
    if (!row) return null;
    return {
      id: row.id,
      organizationId: row.organization_id,
      vendorId: row.vendor_id,
      alertType: row.alert_type,
      severity: row.severity,
      message: row.message,
      data: row.data,
      deliveryStatus: row.delivery_status,
      sentAt: row.sent_at,
      acknowledgedAt: row.acknowledged_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Convert camelCase to snake_case
   * @private
   */
  static _camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

module.exports = VendorAlert;
