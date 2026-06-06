'use strict';

/**
 * Security Monitoring Dashboard API
 *
 * Provides real-time security metrics and monitoring data
 * for the Security Monitoring Dashboard component.
 *
 * HIPAA Compliance: 45 CFR §164.308(a)(2) - Security Management Process
 * SOC 2 Compliance: CC4.1 - Monitoring, CC7.2 - System Operations
 */

const express = require('express');
const router = express.Router();
const AuditLogger = require('../services/audit/AuditLogger');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * GET /api/security-dashboard/metrics
 *
 * Get real-time security metrics for an organization
 *
 * Query Parameters:
 * - organization_id: UUID (required)
 * - time_range: 24h, 7d, 30d (default: 24h)
 *
 * Response:
 * {
 *   "failed_auth_attempts": { "24h": 10, "7d": 45, "30d": 120 },
 *   "failed_authorization_attempts": { "24h": 5, "7d": 20, "30d": 55 },
 *   "data_access_volume": { "24h": 1500, "7d": 8500, "30d": 35000 },
 *   "agent_invocations": { "24h": 200, "7d": 1200, "30d": 4500 },
 *   "config_changes": { "24h": 3, "7d": 15, "30d": 45 },
 *   "audit_log_growth": { "24h": 2500, "7d": 15000, "30d": 60000 }
 * }
 */
router.get('/metrics', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { organization_id, time_range = '24h' } = req.query;

    if (!organization_id) {
      return res.status(400).json({
        error: 'Missing required parameter: organization_id'
      });
    }

    // Calculate date ranges
    const now = new Date();
    const ranges = {
      '24h': { start: new Date(now - 24 * 60 * 60 * 1000), label: '24h' },
      '7d': { start: new Date(now - 7 * 24 * 60 * 60 * 1000), label: '7d' },
      '30d': { start: new Date(now - 30 * 24 * 60 * 60 * 1000), label: '30d' }
    };

    // Get metrics for requested time range
    const metrics = {};

    for (const [key, range] of Object.entries(ranges)) {
      const stats = await getSecurityMetrics(organization_id, range.start, now);

      if (key === time_range || !metrics.primary) {
        metrics.primary = stats;
      }

      metrics[key] = stats;
    }

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching security metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch security metrics',
      message: error.message
    });
  }
});

/**
 * GET /api/security-dashboard/time-series
 *
 * Get time series data for security events
 *
 * Query Parameters:
 * - organization_id: UUID (required)
 * - event_type: Event type to query (required)
 * - interval: 1h, 6h, 24h (default: 1h)
 * - period: 24h, 7d, 30d (default: 24h)
 *
 * Response:
 * {
 *   "data": [
 *     { "timestamp": "2025-06-06T00:00:00Z", "count": 5 },
 *     { "timestamp": "2025-06-06T01:00:00Z", "count": 3 }
 *   ]
 * }
 */
router.get('/time-series', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { organization_id, event_type, interval = '1h', period = '24h' } = req.query;

    if (!organization_id || !event_type) {
      return res.status(400).json({
        error: 'Missing required parameters: organization_id, event_type'
      });
    }

    const intervalMap = {
      '1h': '1 hour',
      '6h': '6 hours',
      '24h': '1 day'
    };

    const periodMap = {
      '24h': 24,
      '7d': 7 * 24,
      '30d': 30 * 24
    };

    const hours = periodMap[period] || 24;
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    const { query } = require('../utils/db');

    const result = await query(
      `SELECT
        date_trunc($1, timestamp) as interval_start,
        COUNT(*) as count
      FROM audit_logs
      WHERE organization_id = $2
        AND event_type = $3
        AND timestamp >= $4
      GROUP BY interval_start
      ORDER BY interval_start ASC`,
      [intervalMap[interval], organization_id, event_type, startDate]
    );

    const data = result.rows.map(row => ({
      timestamp: row.interval_start,
      count: parseInt(row.count)
    }));

    res.json({ data });
  } catch (error) {
    console.error('Error fetching time series data:', error);
    res.status(500).json({
      error: 'Failed to fetch time series data',
      message: error.message
    });
  }
});

/**
 * GET /api/security-dashboard/top-users
 *
 * Get top users by data access volume
 *
 * Query Parameters:
 * - organization_id: UUID (required)
 * - limit: Number of users to return (default: 10)
 * - period: 24h, 7d, 30d (default: 7d)
 *
 * Response:
 * {
 *   "users": [
 *     { "user_id": "123", "access_count": 1500, "last_access": "..." }
 *   ]
 * }
 */
router.get('/top-users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { organization_id, limit = 10, period = '7d' } = req.query;

    if (!organization_id) {
      return res.status(400).json({
        error: 'Missing required parameter: organization_id'
      });
    }

    const periodMap = {
      '24h': 24,
      '7d': 7 * 24,
      '30d': 30 * 24
    };

    const hours = periodMap[period] || 7 * 24;
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    const { query } = require('../utils/db');

    const result = await query(
      `SELECT
        user_id,
        COUNT(*) as access_count,
        MAX(timestamp) as last_access
      FROM audit_logs
      WHERE organization_id = $1
        AND event_type IN ('data_access', 'data_query', 'data_export')
        AND timestamp >= $2
      GROUP BY user_id
      ORDER BY access_count DESC
      LIMIT $3`,
      [organization_id, startDate, limit]
    );

    const users = result.rows.map(row => ({
      userId: row.user_id,
      accessCount: parseInt(row.access_count),
      lastAccess: row.last_access
    }));

    res.json({ users });
  } catch (error) {
    console.error('Error fetching top users:', error);
    res.status(500).json({
      error: 'Failed to fetch top users',
      message: error.message
    });
  }
});

/**
 * GET /api/security-dashboard/recent-changes
 *
 * Get recent configuration changes
 *
 * Query Parameters:
 * - organization_id: UUID (required)
 * - limit: Number of changes to return (default: 20)
 *
 * Response:
 * {
 *   "changes": [
 *     { "timestamp": "...", "user_id": "...", "config_key": "...", "old_value": "...", "new_value": "..." }
 *   ]
 * }
 */
router.get('/recent-changes', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { organization_id, limit = 20 } = req.query;

    if (!organization_id) {
      return res.status(400).json({
        error: 'Missing required parameter: organization_id'
      });
    }

    const { query } = require('../utils/db');

    const result = await query(
      `SELECT
        timestamp,
        user_id,
        context_data->>'configKey' as config_key,
        context_data->>'oldValue' as old_value,
        context_data->>'newValue' as new_value,
        resource_id
      FROM audit_logs
      WHERE organization_id = $1
        AND event_type = 'config_change'
      ORDER BY timestamp DESC
      LIMIT $2`,
      [organization_id, limit]
    );

    const changes = result.rows.map(row => ({
      timestamp: row.timestamp,
      userId: row.user_id,
      configKey: row.config_key,
      oldValue: row.old_value,
      newValue: row.new_value,
      resourceId: row.resource_id
    }));

    res.json({ changes });
  } catch (error) {
    console.error('Error fetching recent changes:', error);
    res.status(500).json({
      error: 'Failed to fetch recent changes',
      message: error.message
    });
  }
});

/**
 * GET /api/security-dashboard/failed-logins
 *
 * Get failed login attempts by IP
 *
 * Query Parameters:
 * - organization_id: UUID (required)
 * - period: 24h, 7d, 30d (default: 24h)
 * - limit: Number of IPs to return (default: 10)
 *
 * Response:
 * {
 *   "ips": [
 *     { "ip_address": "...", "attempt_count": 15, "last_attempt": "..." }
 *   ]
 * }
 */
router.get('/failed-logins', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { organization_id, period = '24h', limit = 10 } = req.query;

    if (!organization_id) {
      return res.status(400).json({
        error: 'Missing required parameter: organization_id'
      });
    }

    const periodMap = {
      '24h': 24,
      '7d': 7 * 24,
      '30d': 30 * 24
    };

    const hours = periodMap[period] || 24;
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    const { query } = require('../utils/db');

    const result = await query(
      `SELECT
        ip_address,
        COUNT(*) as attempt_count,
        MAX(timestamp) as last_attempt
      FROM audit_logs
      WHERE organization_id = $1
        AND event_type IN ('auth_login_failure', 'security_failed_login')
        AND timestamp >= $2
        AND ip_address IS NOT NULL
      GROUP BY ip_address
      ORDER BY attempt_count DESC
      LIMIT $3`,
      [organization_id, startDate, limit]
    );

    const ips = result.rows.map(row => ({
      ipAddress: row.ip_address,
      attemptCount: parseInt(row.attempt_count),
      lastAttempt: row.last_attempt
    }));

    res.json({ ips });
  } catch (error) {
    console.error('Error fetching failed logins:', error);
    res.status(500).json({
      error: 'Failed to fetch failed logins',
      message: error.message
    });
  }
});

/**
 * GET /api/security-dashboard/alerts
 *
 * Get active security alerts based on thresholds
 *
 * Query Parameters:
 * - organization_id: UUID (required)
 *
 * Response:
 * {
 *   "alerts": [
 *     { "type": "...", "severity": "...", "message": "...", "timestamp": "..." }
 *   ]
 * }
 */
router.get('/alerts', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { organization_id } = req.query;

    if (!organization_id) {
      return res.status(400).json({
        error: 'Missing required parameter: organization_id'
      });
    }

    const alerts = await checkSecurityAlerts(organization_id);

    res.json({ alerts });
  } catch (error) {
    console.error('Error fetching security alerts:', error);
    res.status(500).json({
      error: 'Failed to fetch security alerts',
      message: error.message
    });
  }
});

/**
 * Helper function to get security metrics
 * @private
 */
async function getSecurityMetrics(organizationId, startDate, endDate) {
  const { query } = require('../utils/db');

  // Failed auth attempts
  const failedAuthResult = await query(
    `SELECT COUNT(*) as count FROM audit_logs
    WHERE organization_id = $1
      AND timestamp >= $2
      AND timestamp <= $3
      AND event_type IN ('auth_login_failure', 'security_failed_login')`,
    [organizationId, startDate, endDate]
  );

  // Failed authorization attempts
  const failedAuthzResult = await query(
    `SELECT COUNT(*) as count FROM audit_logs
    WHERE organization_id = $1
      AND timestamp >= $2
      AND timestamp <= $3
      AND event_type = 'authz_check_failure'`,
    [organizationId, startDate, endDate]
  );

  // Data access volume
  const dataAccessResult = await query(
    `SELECT COUNT(*) as count FROM audit_logs
    WHERE organization_id = $1
      AND timestamp >= $2
      AND timestamp <= $3
      AND event_type IN ('data_access', 'data_query', 'data_export')`,
    [organizationId, startDate, endDate]
  );

  // Agent invocations
  const agentInvokeResult = await query(
    `SELECT COUNT(*) as count FROM audit_logs
    WHERE organization_id = $1
      AND timestamp >= $2
      AND timestamp <= $3
      AND event_type IN ('agent_invoke', 'agent_response', 'agent_error')`,
    [organizationId, startDate, endDate]
  );

  // Configuration changes
  const configChangeResult = await query(
    `SELECT COUNT(*) as count FROM audit_logs
    WHERE organization_id = $1
      AND timestamp >= $2
      AND timestamp <= $3
      AND event_type = 'config_change'`,
    [organizationId, startDate, endDate]
  );

  // Audit log growth
  const auditGrowthResult = await query(
    `SELECT COUNT(*) as count FROM audit_logs
    WHERE organization_id = $1
      AND timestamp >= $2
      AND timestamp <= $3`,
    [organizationId, startDate, endDate]
  );

  return {
    failedAuthAttempts: parseInt(failedAuthResult.rows[0].count),
    failedAuthorizationAttempts: parseInt(failedAuthzResult.rows[0].count),
    dataAccessVolume: parseInt(dataAccessResult.rows[0].count),
    agentInvocations: parseInt(agentInvokeResult.rows[0].count),
    configChanges: parseInt(configChangeResult.rows[0].count),
    auditLogGrowth: parseInt(auditGrowthResult.rows[0].count)
  };
}

/**
 * Helper function to check security alerts
 * @private
 */
async function checkSecurityAlerts(organizationId) {
  const { query } = require('../utils/db');
  const alerts = [];
  const now = new Date();
  const oneHourAgo = new Date(now - 60 * 60 * 1000);

  // Alert: >10 failed auth attempts per hour per IP
  const ipAlertResult = await query(
    `SELECT ip_address, COUNT(*) as count FROM audit_logs
    WHERE organization_id = $1
      AND timestamp >= $2
      AND event_type IN ('auth_login_failure', 'security_failed_login')
    GROUP BY ip_address
    HAVING COUNT(*) > 10`,
    [organizationId, oneHourAgo]
  );

  ipAlertResult.rows.forEach(row => {
    alerts.push({
      type: 'SUSPICIOUS_IP_ACTIVITY',
      severity: 'high',
      message: `IP ${row.ip_address} has ${row.count} failed login attempts in the last hour`,
      timestamp: now.toISOString(),
      metadata: { ipAddress: row.ip_address, attemptCount: row.count }
    });
  });

  // Alert: >100 failed auth attempts per hour per tenant
  const tenantAlertResult = await query(
    `SELECT COUNT(*) as count FROM audit_logs
    WHERE organization_id = $1
      AND timestamp >= $2
      AND event_type IN ('auth_login_failure', 'security_failed_login')`,
    [organizationId, oneHourAgo]
  );

  if (parseInt(tenantAlertResult.rows[0].count) > 100) {
    alerts.push({
      type: 'HIGH_FAILED_AUTH_VOLUME',
      severity: 'critical',
      message: `Organization has ${tenantAlertResult.rows[0].count} failed login attempts in the last hour`,
      timestamp: now.toISOString()
    });
  }

  // Alert: Admin action outside business hours
  const businessHoursStart = 6; // 6 AM
  const businessHoursEnd = 18; // 6 PM
  const currentHour = now.getHours();

  if (currentHour < businessHoursStart || currentHour > businessHoursEnd) {
    const adminActionResult = await query(
      `SELECT COUNT(*) as count FROM audit_logs
      WHERE organization_id = $1
        AND timestamp >= $2
        AND event_type IN ('admin_action', 'admin_bulk_export')`,
      [organizationId, oneHourAgo]
    );

    if (parseInt(adminActionResult.rows[0].count) > 0) {
      alerts.push({
        type: 'ADMIN_OUTSIDE_HOURS',
        severity: 'medium',
        message: 'Admin actions detected outside business hours',
        timestamp: now.toISOString()
      });
    }
  }

  // Alert: Audit log growth anomaly
  const auditGrowthResult = await query(
    `SELECT COUNT(*) as count FROM audit_logs
    WHERE organization_id = $1
      AND timestamp >= $2`,
    [organizationId, oneHourAgo]
  );

  const auditGrowth = parseInt(auditGrowthResult.rows[0].count);
  const expectedGrowth = 500; // Expected ~500 audit events per hour

  if (auditGrowth > expectedGrowth * 2) {
    alerts.push({
      type: 'AUDIT_LOG_ANOMALY',
      severity: 'medium',
      message: `Audit log growth is unusually high: ${auditGrowth} events in the last hour`,
      timestamp: now.toISOString()
    });
  }

  return alerts;
}

module.exports = router;
