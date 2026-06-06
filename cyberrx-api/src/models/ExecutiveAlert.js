'use strict';

const crypto = require('crypto');
const { query } = require('../utils/db');

// Generate UUID v4
const uuidv4 = () => crypto.randomUUID();

/**
 * Executive Alert Model
 *
 * Comprehensive alerting system for CFO, CISO, CRO, CLO, CIO, and Board agents.
 * Supports threshold breach detection, multi-channel notifications, and alert lifecycle management.
 */
class ExecutiveAlert {
  // Valid roles
  static VALID_ROLES = ['cfo', 'ciso', 'croe', 'clo', 'cio', 'board', 'critical'];

  // Valid severities
  static VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'];

  // Valid metric types
  static VALID_METRIC_TYPES = [
    'dollar_exposure',
    'blast_radius',
    'risk_score',
    'governance',
    'mlr_impact',
    'stop_loss_exposure',
    'attack_pathway_count',
    'crown_jewel_tier',
    'compliance_breach'
  ];

  // Valid statuses
  static VALID_STATUSES = ['active', 'acknowledged', 'dismissed', 'escalated', 'resolved'];

  // Valid delivery statuses
  static VALID_DELIVERY_STATUSES = ['pending', 'sent', 'delivered', 'failed', 'bounced'];

  // Valid notification channels
  static VALID_CHANNELS = ['email', 'slack', 'teams', 'websocket'];

  /**
   * Create a new executive alert
   * @param {Object} data - Alert data
   * @param {string} [data.alertId] - UUID (optional, will be generated if not provided)
   * @param {string} data.tenantId - Tenant ID
   * @param {string} data.role - Executive role (cfo, ciso, board, etc.)
   * @param {string} data.severity - Alert severity
   * @param {string} data.metricType - Type of metric that triggered alert
   * @param {number} data.thresholdValue - Threshold that was breached
   * @param {number} data.actualValue - Actual value that breached threshold
   * @param {Object} [data.contextData] - Additional context (JSONB)
   * @param {string} [data.status] - Alert status
   * @returns {Promise<Object>} Created alert
   */
  static async create(data) {
    const {
      alertId = uuidv4(),
      tenantId,
      role,
      severity,
      metricType,
      thresholdValue,
      actualValue,
      contextData = {},
      status = 'active'
    } = data;

    // Validate
    if (!this.VALID_ROLES.includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }

    if (!this.VALID_SEVERITIES.includes(severity)) {
      throw new Error(`Invalid severity: ${severity}`);
    }

    if (!this.VALID_METRIC_TYPES.includes(metricType)) {
      throw new Error(`Invalid metric type: ${metricType}`);
    }

    const result = await query(
      `INSERT INTO alerts (
        alert_id, tenant_id, role, severity, metric_type,
        threshold_value, actual_value, context_data, status,
        delivery_status, triggered_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *`,
      [
        alertId,
        tenantId,
        role,
        severity,
        metricType,
        thresholdValue,
        actualValue,
        JSON.stringify(contextData),
        status,
        JSON.stringify({
          email: 'pending',
          slack: 'pending',
          teams: 'pending'
        })
      ]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Find alert by ID
   * @param {string} alertId - Alert ID
   * @returns {Promise<Object|null>} Alert or null
   */
  static async findById(alertId) {
    const result = await query(
      'SELECT * FROM alerts WHERE alert_id = $1',
      [alertId]
    );

    if (result.length === 0) {
      return null;
    }

    return this._transformFromDb(result[0]);
  }

  /**
   * Find alerts by tenant
   * @param {string} tenantId - Tenant ID
   * @param {Object} [filters] - Optional filters
   * @param {string} [filters.role] - Filter by role
   * @param {string} [filters.severity] - Filter by severity
   * @param {string} [filters.metricType] - Filter by metric type
   * @param {string} [filters.status] - Filter by status
   * @param {string} [filters.startDate] - Filter by start date
   * @param {string} [filters.endDate] - Filter by end date
   * @param {number} [filters.limit] - Limit results
   * @param {number} [filters.offset] - Offset results
   * @returns {Promise<Object[]>} Array of alerts
   */
  static async findByTenant(tenantId, filters = {}) {
    const conditions = ['tenant_id = $1'];
    const params = [tenantId];
    let paramIndex = 2;

    if (filters.role) {
      conditions.push(`role = $${paramIndex++}`);
      params.push(filters.role);
    }

    if (filters.severity) {
      conditions.push(`severity = $${paramIndex++}`);
      params.push(filters.severity);
    }

    if (filters.metricType) {
      conditions.push(`metric_type = $${paramIndex++}`);
      params.push(filters.metricType);
    }

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters.startDate) {
      conditions.push(`triggered_at >= $${paramIndex++}`);
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`triggered_at <= $${paramIndex++}`);
      params.push(filters.endDate);
    }

    const whereClause = conditions.join(' AND ');
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const result = await query(
      `SELECT * FROM alerts WHERE ${whereClause} ORDER BY triggered_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find alerts by role
   * @param {string} tenantId - Tenant ID
   * @param {string} role - Executive role
   * @param {Object} [filters] - Optional filters
   * @returns {Promise<Object[]>} Array of alerts
   */
  static async findByRole(tenantId, role, filters = {}) {
    return this.findByTenant(tenantId, { ...filters, role });
  }

  /**
   * Find active alerts
   * @param {string} tenantId - Tenant ID
   * @param {number} [limit=100] - Limit results
   * @returns {Promise<Object[]>} Array of active alerts
   */
  static async findActive(tenantId, limit = 100) {
    const result = await query(
      `SELECT * FROM alerts
       WHERE tenant_id = $1 AND status = 'active'
       ORDER BY triggered_at DESC
       LIMIT $2`,
      [tenantId, limit]
    );

    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find critical alerts
   * @param {string} tenantId - Tenant ID
   * @param {number} [limit=50] - Limit results
   * @returns {Promise<Object[]>} Array of critical alerts
   */
  static async findCritical(tenantId, limit = 50) {
    const result = await query(
      `SELECT * FROM alerts
       WHERE tenant_id = $1 AND severity = 'critical' AND status IN ('active', 'escalated')
       ORDER BY triggered_at DESC
       LIMIT $2`,
      [tenantId, limit]
    );

    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find recent alerts for dashboard
   * @param {string} tenantId - Tenant ID
   * @param {number} [hours=24] - Hours to look back
   * @param {number} [limit=20] - Limit results
   * @returns {Promise<Object[]>} Array of recent alerts
   */
  static async findRecent(tenantId, hours = 24, limit = 20) {
    const result = await query(
      `SELECT * FROM alerts
       WHERE tenant_id = $1
         AND triggered_at > NOW() - INTERVAL '1 hour' * $2
       ORDER BY triggered_at DESC
       LIMIT $3`,
      [tenantId, hours, limit]
    );

    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Acknowledge an alert
   * @param {string} alertId - Alert ID
   * @param {string} acknowledgedBy - User ID
   * @returns {Promise<Object>} Updated alert
   */
  static async acknowledge(alertId, acknowledgedBy) {
    const result = await query(
      `UPDATE alerts
       SET status = 'acknowledged',
           acknowledged_by = $2,
           acknowledged_at = NOW(),
           updated_at = NOW()
       WHERE alert_id = $1
       RETURNING *`,
      [alertId, acknowledgedBy]
    );

    if (result.length === 0) {
      throw new Error('Alert not found');
    }

    return this._transformFromDb(result[0]);
  }

  /**
   * Dismiss an alert
   * @param {string} alertId - Alert ID
   * @param {string} dismissedBy - User ID
   * @returns {Promise<Object>} Updated alert
   */
  static async dismiss(alertId, dismissedBy) {
    const result = await query(
      `UPDATE alerts
       SET status = 'dismissed',
           acknowledged_by = $2,
           acknowledged_at = NOW(),
           updated_at = NOW()
       WHERE alert_id = $1
       RETURNING *`,
      [alertId, dismissedBy]
    );

    if (result.length === 0) {
      throw new Error('Alert not found');
    }

    return this._transformFromDb(result[0]);
  }

  /**
   * Escalate an alert
   * @param {string} alertId - Alert ID
   * @param {string[]} escalateToRoles - Array of roles to escalate to
   * @returns {Promise<Object>} Updated alert
   */
  static async escalate(alertId, escalateToRoles) {
    const result = await query(
      `UPDATE alerts
       SET status = 'escalated',
           context_data = jsonb_set(
             COALESCE(context_data, '{}'::jsonb),
             '{escalation}',
             $2::jsonb
           ),
           updated_at = NOW()
       WHERE alert_id = $1
       RETURNING *`,
      [alertId, JSON.stringify({ escalateTo: escalateToRoles, escalatedAt: new Date() })]
    );

    if (result.length === 0) {
      throw new Error('Alert not found');
    }

    return this._transformFromDb(result[0]);
  }

  /**
   * Resolve an alert
   * @param {string} alertId - Alert ID
   * @param {string} resolvedBy - User ID
   * @param {string} [resolutionNotes] - Optional resolution notes
   * @returns {Promise<Object>} Updated alert
   */
  static async resolve(alertId, resolvedBy, resolutionNotes = '') {
    const result = await query(
      `UPDATE alerts
       SET status = 'resolved',
           acknowledged_by = $2,
           acknowledged_at = NOW(),
           context_data = jsonb_set(
             COALESCE(context_data, '{}'::jsonb),
             '{resolution}',
             $3::jsonb
           ),
           updated_at = NOW()
       WHERE alert_id = $1
       RETURNING *`,
      [alertId, resolvedBy, JSON.stringify({ notes: resolutionNotes, resolvedBy })]
    );

    if (result.length === 0) {
      throw new Error('Alert not found');
    }

    return this._transformFromDb(result[0]);
  }

  /**
   * Update delivery status for a specific channel
   * @param {string} alertId - Alert ID
   * @param {string} channel - Channel (email, slack, teams)
   * @param {string} status - Delivery status
   * @param {Object} [metadata] - Additional metadata
   * @returns {Promise<Object>} Updated alert
   */
  static async updateDeliveryStatus(alertId, channel, status, metadata = {}) {
    if (!this.VALID_CHANNELS.includes(channel)) {
      throw new Error(`Invalid channel: ${channel}`);
    }

    if (!this.VALID_DELIVERY_STATUSES.includes(status)) {
      throw new Error(`Invalid delivery status: ${status}`);
    }

    const result = await query(
      `UPDATE alerts
       SET delivery_status = jsonb_set(
             COALESCE(delivery_status, '{}'::jsonb),
             $2,
             $3::jsonb
           ),
           retry_count = CASE WHEN $4 = 'failed' THEN retry_count + 1 ELSE retry_count END,
           last_retry_at = CASE WHEN $4 = 'failed' THEN NOW() ELSE last_retry_at END,
           updated_at = NOW()
       WHERE alert_id = $1
       RETURNING *`,
      [alertId, `{${channel}}`, JSON.stringify(status), status]
    );

    if (result.length === 0) {
      throw new Error('Alert not found');
    }

    return this._transformFromDb(result[0]);
  }

  /**
   * Log delivery attempt
   * @param {Object} data - Delivery log data
   * @param {string} data.alertId - Alert ID
   * @param {string} data.channel - Channel
   * @param {string} data.status - Status
   * @param {string} data.recipient - Recipient
   * @param {string} [data.errorMessage] - Error message
   * @returns {Promise<Object>} Created delivery log
   */
  static async logDelivery(data) {
    const {
      alertId,
      channel,
      status,
      recipient,
      errorMessage = null
    } = data;

    const result = await query(
      `INSERT INTO alert_delivery_log (alert_id, channel, status, recipient, error_message, sent_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [alertId, channel, status, recipient, errorMessage]
    );

    return result[0];
  }

  /**
   * Get alert statistics by tenant
   * @param {string} tenantId - Tenant ID
   * @param {number} [days=30] - Number of days to look back
   * @returns {Promise<Object>} Alert statistics
   */
  static async getStatistics(tenantId, days = 30) {
    const result = await query(
      `SELECT
         role,
         severity,
         COUNT(*) AS total_count,
         COUNT(*) FILTER (WHERE status = 'active') AS active_count,
         COUNT(*) FILTER (WHERE status = 'acknowledged') AS acknowledged_count,
         COUNT(*) FILTER (WHERE status = 'escalated') AS escalated_count,
         COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_count,
         COUNT(*) FILTER (WHERE status = 'dismissed') AS dismissed_count,
         AVG(actual_value) AS avg_value,
         MAX(actual_value) AS max_value,
         MIN(actual_value) AS min_value
       FROM alerts
       WHERE tenant_id = $1
         AND triggered_at > NOW() - INTERVAL '1 day' * $2
       GROUP BY role, severity
       ORDER BY role, severity`,
      [tenantId, days]
    );

    return result.map(row => ({
      role: row.role,
      severity: row.severity,
      totalCount: parseInt(row.total_count),
      activeCount: parseInt(row.active_count),
      acknowledgedCount: parseInt(row.acknowledged_count),
      escalatedCount: parseInt(row.escalated_count),
      resolvedCount: parseInt(row.resolved_count),
      dismissedCount: parseInt(row.dismissed_count),
      avgValue: parseFloat(row.avg_value) || 0,
      maxValue: parseFloat(row.max_value) || 0,
      minValue: parseFloat(row.min_value) || 0
    }));
  }

  /**
   * Get alert delivery statistics
   * @param {string} tenantId - Tenant ID
   * @param {number} [days=30] - Number of days to look back
   * @returns {Promise<Object>} Delivery statistics
   */
  static async getDeliveryStatistics(tenantId, days = 30) {
    const result = await query(
      `SELECT
         a.channel,
         a.status,
         COUNT(*) AS count,
         COUNT(DISTINCT a.alert_id) AS unique_alerts
       FROM alert_delivery_log a
       JOIN alerts b ON a.alert_id = b.alert_id
       WHERE b.tenant_id = $1
         AND a.created_at > NOW() - INTERVAL '1 day' * $2
       GROUP BY a.channel, a.status
       ORDER BY a.channel, a.status`,
      [tenantId, days]
    );

    return result.map(row => ({
      channel: row.channel,
      status: row.status,
      count: parseInt(row.count),
      uniqueAlerts: parseInt(row.unique_alerts)
    }));
  }

  /**
   * Get alerts by severity breakdown
   * @param {string} tenantId - Tenant ID
   * @param {number} [days=30] - Number of days to look back
   * @returns {Promise<Object>} Severity breakdown
   */
  static async getSeverityBreakdown(tenantId, days = 30) {
    const result = await query(
      `SELECT
         severity,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE triggered_at > NOW() - INTERVAL '1 day') AS last_24h,
         COUNT(*) FILTER (WHERE triggered_at > NOW() - INTERVAL '7 days') AS last_7d,
         COUNT(*) FILTER (WHERE triggered_at > NOW() - INTERVAL '30 days') AS last_30d
       FROM alerts
       WHERE tenant_id = $1
         AND triggered_at > NOW() - INTERVAL '1 day' * $2
       GROUP BY severity
       ORDER BY severity`,
      [tenantId, days]
    );

    return result.map(row => ({
      severity: row.severity,
      total: parseInt(row.total),
      last24h: parseInt(row.last_24h),
      last7d: parseInt(row.last_7d),
      last30d: parseInt(row.last_30d)
    }));
  }

  /**
   * Delete old alerts
   * @param {number} [days=90] - Delete alerts older than this many days
   * @returns {Promise<number>} Number of deleted alerts
   */
  static async deleteOld(days = 90) {
    const result = await query(
      `DELETE FROM alerts
       WHERE status IN ('resolved', 'dismissed', 'acknowledged')
         AND acknowledged_at < NOW() - INTERVAL '1 day' * $1
         AND triggered_at < NOW() - INTERVAL '1 day' * $1`,
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
      alertId: row.alert_id,
      tenantId: row.tenant_id,
      role: row.role,
      severity: row.severity,
      metricType: row.metric_type,
      thresholdValue: parseFloat(row.threshold_value),
      actualValue: parseFloat(row.actual_value),
      triggeredAt: row.triggered_at,
      status: row.status,
      acknowledgedBy: row.acknowledged_by,
      acknowledgedAt: row.acknowledged_at,
      contextData: row.context_data,
      deliveryStatus: row.delivery_status,
      retryCount: row.retry_count,
      lastRetryAt: row.last_retry_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = ExecutiveAlert;
