'use strict';

const axios = require('axios');
const crypto = require('crypto');
const ExecutiveAlert = require('../../models/ExecutiveAlert');
const logger = require('../../utils/logger');

/**
 * Slack Integration Service
 *
 * Sends rich notifications to Slack using Block Kit formatting.
 * Supports per-tenant workspace configuration and interactive buttons.
 */
class SlackService {
  constructor() {
    // Slack configuration
    this.signingSecret = process.env.SLACK_SIGNING_SECRET;
    this.clientId = process.env.SLACK_CLIENT_ID;
    this.clientSecret = process.env.SLACK_CLIENT_SECRET;

    // Webhook URLs (can be overridden per-tenant via config)
    this.webhooks = {
      critical: process.env.SLACK_WEBHOOK_CRITICAL,
      high: process.env.SLACK_WEBHOOK_HIGH,
      medium: process.env.SLACK_WEBHOOK_MEDIUM,
      low: process.env.SLACK_WEBHOOK_LOW
    };

    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  /**
   * Send alert to Slack
   * @param {Object} alert - Alert object
   * @param {string[]} webhooks - Slack webhook URLs
   * @returns {Promise<Object>} Send result
   */
  async sendAlert(alert, webhooks) {
    if (!webhooks || webhooks.length === 0) {
      logger.warn('No Slack webhooks configured', { alertId: alert.alertId });
      await ExecutiveAlert.updateDeliveryStatus(alert.alertId, 'slack', 'sent', {
        note: 'No webhooks configured'
      });
      return { success: true, skipped: true };
    }

    const results = [];

    for (const webhook of webhooks) {
      try {
        const result = await this._sendToWebhook(alert, webhook);
        results.push({ webhook, result });
      } catch (error) {
        logger.error('Failed to send to Slack webhook', {
          alertId: alert.alertId,
          webhook,
          error: error.message
        });
        results.push({ webhook, result: { success: false, error: error.message } });
      }
    }

    // Update delivery status based on results
    const allSucceeded = results.every(r => r.result.success);
    const anySucceeded = results.some(r => r.result.success);

    if (allSucceeded) {
      await ExecutiveAlert.updateDeliveryStatus(alert.alertId, 'slack', 'delivered', {
        webhookCount: webhooks.length
      });
    } else if (anySucceeded) {
      await ExecutiveAlert.updateDeliveryStatus(alert.alertId, 'slack', 'sent', {
        note: 'Partial delivery'
      });
    } else {
      await ExecutiveAlert.updateDeliveryStatus(alert.alertId, 'slack', 'failed', {
        error: 'All webhooks failed'
      });
    }

    return {
      success: anySucceeded,
      results,
      totalWebhooks: webhooks.length,
      successful: results.filter(r => r.result.success).length
    };
  }

  /**
   * Send to specific webhook
   * @private
   * @param {Object} alert - Alert object
   * @param {string} webhook - Webhook URL
   * @returns {Promise<Object>} Send result
   */
  async _sendToWebhook(alert, webhook) {
    const blocks = this._buildBlocks(alert);

    try {
      const response = await axios.post(webhook, { blocks }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (response.status === 200 && response.data === 'ok') {
        await ExecutiveAlert.logDelivery({
          alertId: alert.alertId,
          channel: 'slack',
          status: 'delivered',
          recipient: webhook
        });

        return { success: true };
      } else {
        throw new Error(`Unexpected response: ${response.status}`);
      }
    } catch (error) {
      await ExecutiveAlert.logDelivery({
        alertId: alert.alertId,
        channel: 'slack',
        status: 'failed',
        recipient: webhook,
        errorMessage: error.message
      });

      throw error;
    }
  }

  /**
   * Build Slack Block Kit blocks for alert
   * @private
   * @param {Object} alert - Alert object
   * @returns {Object[]} Slack blocks
   */
  _buildBlocks(alert) {
    const blocks = [];

    // Header with severity icon
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${this._getSeverityEmoji(alert.severity)} ${alert.severity.toUpperCase()} Alert`,
        emoji: true
      }
    });

    // Divider
    blocks.push({ type: 'divider' });

    // Role and metric type
    blocks.push({
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Role:*\n${this._formatRole(alert.role)}`
        },
        {
          type: 'mrkdwn',
          text: `*Metric:*\n${this._formatMetricType(alert.metricType)}`
        }
      ]
    });

    // Values
    blocks.push({
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Threshold:*\n${this._formatValue(alert.thresholdValue, alert.metricType)}`
        },
        {
          type: 'mrkdwn',
          text: `*Actual:*\n${this._formatValue(alert.actualValue, alert.metricType)}`
        }
      ]
    });

    // Breach amount
    const breachAmount = alert.actualValue - alert.thresholdValue;
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Breach Amount:* ${this._formatValue(breachAmount, alert.metricType)}`
      }
    });

    // Context data (if available)
    if (alert.contextData && Object.keys(alert.contextData).length > 0) {
      const contextText = Object.entries(alert.contextData)
        .filter(([key]) => key !== 'source') // Skip source to avoid clutter
        .map(([key, value]) => `• *${this._formatKey(key)}:* ${this._formatContextValue(value)}`)
        .join('\n');

      if (contextText) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Context:*\n${contextText}`
          }
        });
      }
    }

    // Divider
    blocks.push({ type: 'divider' });

    // Alert metadata
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Alert ID: \`${alert.alertId}\` | Triggered: ${new Date(alert.triggeredAt).toLocaleString()}`
        }
      ]
    });

    // Action buttons
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '🔍 View Details',
            emoji: true
          },
          url: `${this.frontendUrl}/alerts/${alert.alertId}`,
          style: 'primary'
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '✅ Acknowledge',
            emoji: true
          },
          url: `${this.frontendUrl}/alerts/${alert.alertId}/acknowledge`,
          style: 'default'
        }
      ]
    });

    return blocks;
  }

  /**
   * Get severity emoji
   * @private
   * @param {string} severity - Alert severity
   * @returns {string} Emoji
   */
  _getSeverityEmoji(severity) {
    const emojis = {
      critical: '🚨',
      high: '⚠️',
      medium: '⚡',
      low: 'ℹ️'
    };

    return emojis[severity] || '🔔';
  }

  /**
   * Format role for display
   * @private
   * @param {string} role - Role code
   * @returns {string} Formatted role
   */
  _formatRole(role) {
    const roleMap = {
      cfo: 'CFO',
      ciso: 'CISO',
      croe: 'CRO',
      clo: 'CLO',
      cio: 'CIO',
      board: 'Board',
      critical: 'Critical'
    };

    return roleMap[role] || role.toUpperCase();
  }

  /**
   * Format metric type for display
   * @private
   * @param {string} metricType - Metric type code
   * @returns {string} Formatted metric type
   */
  _formatMetricType(metricType) {
    return metricType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Format value for display
   * @private
   * @param {number} value - Value to format
   * @param {string} metricType - Metric type for context
   * @returns {string} Formatted value
   */
  _formatValue(value, metricType) {
    if (metricType.includes('exposure') || metricType.includes('loss')) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }

    if (metricType.includes('impact') || metricType.includes('risk')) {
      return `${value.toFixed(2)}%`;
    }

    return new Intl.NumberFormat('en-US').format(value);
  }

  /**
   * Format context key for display
   * @private
   * @param {string} key - Key string
   * @returns {string} Formatted key
   */
  _formatKey(key) {
    return key
      .split(/(?=[A-Z])|_/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Format context value for display
   * @private
   * @param {any} value - Value to format
   * @returns {string} Formatted value
   */
  _formatContextValue(value) {
    if (value === null || value === undefined) {
      return 'N/A';
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    if (typeof value === 'number') {
      return new Intl.NumberFormat('en-US').format(value);
    }

    return String(value);
  }

  /**
   * Verify Slack webhook request signature
   * @param {string} signature - X-Slack-Signature header
   * @param {string} timestamp - X-Slack-Request-Timestamp header
   * @param {string} body - Request body
   * @returns {boolean} True if signature is valid
   */
  verifySignature(signature, timestamp, body) {
    if (!this.signingSecret) {
      logger.warn('Slack signing secret not configured');
      return false;
    }

    // Check timestamp to prevent replay attacks (5 minute tolerance)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > 300) {
      logger.warn('Slack request timestamp too old', { timestamp });
      return false;
    }

    // Compute signature
    const hmac = crypto.createHmac('sha256', this.signingSecret);
    hmac.update(`v0:${timestamp}:${body}`);
    const expectedSignature = `v0=${hmac.digest('hex')}`;

    // Compare signatures using timing-safe comparison
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  }

  /**
   * Handle Slack interactive callback (button click)
   * @param {Object} payload - Slack payload
   * @returns {Promise<Object>} Response
   */
  async handleInteraction(payload) {
    const { type, actions, user, container } = payload;

    if (type !== 'block_actions') {
      return { error: 'Unsupported interaction type' };
    }

    const action = actions[0];
    const alertId = container.alert_id;

    try {
      switch (action.action_id) {
        case 'acknowledge':
          await ExecutiveAlert.acknowledge(alertId, user.id);
          return {
            text: '✅ Alert acknowledged',
            replace_original: true
          };

        case 'dismiss':
          await ExecutiveAlert.dismiss(alertId, user.id);
          return {
            text: '🔕 Alert dismissed',
            replace_original: true
          };

        default:
          return { error: 'Unknown action' };
      }
    } catch (error) {
      logger.error('Failed to handle Slack interaction', {
        error: error.message,
        alertId,
        action: action.action_id
      });

      return {
        text: `❌ Error: ${error.message}`,
        replace_original: false
      };
    }
  }

  /**
   * Get service statistics
   * @returns {Object} Service stats
   */
  getStats() {
    return {
      configured: !!(this.signingSecret && this.clientId),
      webhooksConfigured: Object.values(this.webhooks).filter(w => w).length,
      frontendUrl: this.frontendUrl
    };
  }
}

// Singleton instance
const slackService = new SlackService();

module.exports = slackService;
