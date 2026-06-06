'use strict';

const ExecutiveAlert = require('../../models/ExecutiveAlert');
const AlertConfig = require('../../models/AlertConfig');
const logger = require('../../utils/logger');

/**
 * Alert Router Service
 *
 * Intelligently routes alerts to appropriate executive roles based on severity and type.
 * Supports tenant-aware routing, escalation, and dead letter queue for failed alerts.
 */
class AlertRouter {
  constructor() {
    // Dead letter queue for failed alerts
    this.deadLetterQueue = [];

    // Routing statistics
    this.routingStats = {
      totalRouted: 0,
      routingErrors: 0,
      escalations: 0,
      multiRoleAlerts: 0
    };
  }

  /**
   * Route an alert to appropriate roles
   * @param {Object} alert - Alert object
   * @returns {Promise<Object[]>} Array of routed alerts (may be multiple for escalation)
   */
  async routeAlert(alert) {
    try {
      this.routingStats.totalRouted++;

      // Get alert config to determine routing
      const config = await AlertConfig.findByUniqueKey(
        alert.tenantId,
        alert.role,
        alert.metricType
      );

      if (!config) {
        logger.warn('No config found for alert', {
          alertId: alert.alertId,
          tenantId: alert.tenantId,
          role: alert.role,
          metricType: alert.metricType
        });
        return [alert];
      }

      // Determine routing targets based on severity and role
      const routingTargets = this._determineRoutingTargets(alert, config);

      // If single target, return as-is
      if (routingTargets.length === 1 && routingTargets[0] === alert.role) {
        logger.debug('Alert routed to primary role', {
          alertId: alert.alertId,
          role: alert.role
        });
        return [alert];
      }

      // Multi-role routing (escalation or critical alerts)
      const routedAlerts = [];

      for (const targetRole of routingTargets) {
        // For primary role, use original alert
        if (targetRole === alert.role) {
          routedAlerts.push(alert);
          continue;
        }

        // For additional roles, create escalation alerts
        const escalationAlert = await this._createEscalationAlert(alert, targetRole);

        if (escalationAlert) {
          routedAlerts.push(escalationAlert);
          this.routingStats.escalations++;
        }
      }

      if (routedAlerts.length > 1) {
        this.routingStats.multiRoleAlerts++;
        logger.info('Alert routed to multiple roles', {
          alertId: alert.alertId,
          roles: routedAlerts.map(a => a.role)
        });
      }

      return routedAlerts;
    } catch (error) {
      this.routingStats.routingErrors++;
      logger.error('Failed to route alert', {
        error: error.message,
        alertId: alert.alertId
      });

      // Add to dead letter queue
      this.deadLetterQueue.push({
        alert,
        error: error.message,
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * Determine routing targets based on alert and config
   * @private
   * @param {Object} alert - Alert object
   * @param {Object} config - Alert config
   * @returns {string[]} Array of role names
   */
  _determineRoutingTargets(alert, config) {
    const targets = [];

    // Always include primary role
    targets.push(alert.role);

    // Check severity-based escalation
    if (alert.severity === 'critical') {
      // Critical alerts route to all executive roles
      return ['cfo', 'ciso', 'croe', 'clo', 'cio', 'board'];
    }

    if (alert.severity === 'high') {
      // High severity escalates to Board
      if (!targets.includes('board')) {
        targets.push('board');
      }
    }

    // Check custom escalation rules from config
    if (config.escalationRules && config.escalationRules[alert.severity]) {
      const escalationConfig = config.escalationRules[alert.severity];

      if (escalationConfig.escalateTo && Array.isArray(escalationConfig.escalateTo)) {
        for (const role of escalationConfig.escalateTo) {
          if (!targets.includes(role)) {
            targets.push(role);
          }
        }
      }
    }

    return targets;
  }

  /**
   * Create escalation alert for additional role
   * @private
   * @param {Object} originalAlert - Original alert
   * @param {string} targetRole - Target role for escalation
   * @returns {Promise<Object>} Created escalation alert
   */
  async _createEscalationAlert(originalAlert, targetRole) {
    try {
      const escalationData = {
        tenantId: originalAlert.tenantId,
        role: targetRole,
        severity: originalAlert.severity,
        metricType: 'governance', // Escalations are governance issues
        thresholdValue: originalAlert.thresholdValue,
        actualValue: originalAlert.actualValue,
        contextData: {
          escalatedFrom: originalAlert.role,
          escalatedFromAlertId: originalAlert.alertId,
          escalationReason: `Severity ${originalAlert.severity} ${originalAlert.role} alert`,
          originalAlert: {
            role: originalAlert.role,
            metricType: originalAlert.metricType,
            actualValue: originalAlert.actualValue,
            thresholdValue: originalAlert.thresholdValue
          }
        }
      };

      const escalationAlert = await ExecutiveAlert.create(escalationData);

      // Update original alert with escalation info
      await ExecutiveAlert.escalate(originalAlert.alertId, [targetRole]);

      logger.info('Created escalation alert', {
        originalAlertId: originalAlert.alertId,
        escalationAlertId: escalationAlert.alertId,
        from: originalAlert.role,
        to: targetRole
      });

      return escalationAlert;
    } catch (error) {
      logger.error('Failed to create escalation alert', {
        error: error.message,
        originalAlertId: originalAlert.alertId,
        targetRole
      });
      return null;
    }
  }

  /**
   * Get users for a role within a tenant
   * @param {string} tenantId - Tenant ID
   * @param {string} role - Executive role
   * @returns {Promise<Object[]>} Array of users
   */
  async getUsersForRole(tenantId, role) {
    try {
      const { query } = require('../../utils/db');

      // Map alert roles to user roles
      const roleMapping = {
        cfo: ['CFO', 'executive'],
        ciso: ['CISO', 'executive'],
        croe: ['CRO', 'executive'],
        clo: ['CLO', 'executive'],
        cio: ['CIO', 'executive'],
        board: ['Board', 'executive'],
        critical: ['CFO', 'CISO', 'CRO', 'CLO', 'CIO', 'Board', 'executive']
      };

      const userRoles = roleMapping[role] || [role];

      const result = await query(
        `SELECT id, email, name, role
         FROM users
         WHERE org_id = $1 AND role = ANY($2)
         ORDER BY role`,
        [tenantId, userRoles]
      );

      return result.map(row => ({
        userId: row.id,
        email: row.email,
        name: row.name,
        role: row.role
      }));
    } catch (error) {
      logger.error('Failed to get users for role', {
        error: error.message,
        tenantId,
        role
      });
      return [];
    }
  }

  /**
   * Get notification recipients for an alert
   * @param {Object} alert - Alert object
   * @returns {Promise<Object>} Recipients by channel
   */
  async getNotificationRecipients(alert) {
    try {
      const config = await AlertConfig.findByUniqueKey(
        alert.tenantId,
        alert.role,
        alert.metricType
      );

      if (!config) {
        return {
          email: [],
          slack: [],
          teams: []
        };
      }

      const users = await this.getUsersForRole(alert.tenantId, alert.role);

      // Build recipient lists
      const recipients = {
        email: this._getEmailRecipients(config, users),
        slack: this._getSlackRecipients(config, alert.severity),
        teams: this._getTeamsRecipients(config, alert.severity)
      };

      return recipients;
    } catch (error) {
      logger.error('Failed to get notification recipients', {
        error: error.message,
        alertId: alert.alertId
      });

      return {
        email: [],
        slack: [],
        teams: []
      };
    }
  }

  /**
   * Get email recipients from config
   * @private
   * @param {Object} config - Alert config
   * @param {Object[]} users - Users for role
   * @returns {string[]} Email addresses
   */
  _getEmailRecipients(config, users) {
    // If custom recipients defined, use them
    if (config.emailRecipients && config.emailRecipients.length > 0) {
      return config.emailRecipients;
    }

    // Otherwise use user emails
    return users.map(u => u.email).filter(Boolean);
  }

  /**
   * Get Slack channels from config
   * @private
   * @param {Object} config - Alert config
   * @param {string} severity - Alert severity
   * @returns {string[]} Slack channel URLs
   */
  _getSlackRecipients(config, severity) {
    const channels = config.slackChannels || {};

    // Try severity-specific channel first
    if (channels[severity]) {
      return [channels[severity]];
    }

    // Fall back to default channel
    if (channels.default) {
      return [channels.default];
    }

    return [];
  }

  /**
   * Get Teams webhooks from config
   * @private
   * @param {Object} config - Alert config
   * @param {string} severity - Alert severity
   * @returns {string[]} Teams webhook URLs
   */
  _getTeamsRecipients(config, severity) {
    const webhooks = config.teamsWebhooks || {};

    // Try severity-specific webhook first
    if (webhooks[severity]) {
      return [webhooks[severity]];
    }

    // Fall back to default webhook
    if (webhooks.default) {
      return [webhooks.default];
    }

    return [];
  }

  /**
   * Route alert to notification channels
   * @param {Object} alert - Alert object
   * @returns {Promise<Object>} Routing results
   */
  async routeToChannels(alert) {
    const recipients = await this.getNotificationRecipients(alert);

    const routing = {
      alertId: alert.alertId,
      channels: {
        email: {
          enabled: recipients.email.length > 0,
          recipients: recipients.email,
          status: 'pending'
        },
        slack: {
          enabled: recipients.slack.length > 0,
          channels: recipients.slack,
          status: 'pending'
        },
        teams: {
          enabled: recipients.teams.length > 0,
          webhooks: recipients.teams,
          status: 'pending'
        }
      }
    };

    logger.info('Alert routed to channels', {
      alertId: alert.alertId,
      emailEnabled: routing.channels.email.enabled,
      slackEnabled: routing.channels.slack.enabled,
      teamsEnabled: routing.channels.teams.enabled
    });

    return routing;
  }

  /**
   * Process alerts from dead letter queue
   * @returns {Promise<Object[]>} Successfully reprocessed alerts
   */
  async processDeadLetterQueue() {
    const reprocessed = [];

    for (const item of this.deadLetterQueue) {
      try {
        const routed = await this.routeAlert(item.alert);
        reprocessed.push(...routed);
      } catch (error) {
        logger.error('Failed to reprocess DLQ item', {
          error: error.message,
          alertId: item.alert.alertId
        });
      }
    }

    // Clear processed items
    this.deadLetterQueue = this.deadLetterQueue.filter(item => {
      return !reprocessed.some(ra => ra.alertId === item.alert.alertId);
    });

    return reprocessed;
  }

  /**
   * Get routing statistics
   * @returns {Object} Routing stats
   */
  getStats() {
    return {
      ...this.routingStats,
      deadLetterQueueSize: this.deadLetterQueue.length
    };
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue() {
    this.deadLetterQueue = [];
    logger.info('Dead letter queue cleared');
  }
}

// Singleton instance
const alertRouter = new AlertRouter();

module.exports = alertRouter;
