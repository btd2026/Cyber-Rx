'use strict';

const axios = require('axios');
const ExecutiveAlert = require('../../models/ExecutiveAlert');
const logger = require('../../utils/logger');

/**
 * Microsoft Teams Integration Service
 *
 * Sends rich notifications to Microsoft Teams using Adaptive Cards.
 * Supports actionable buttons and per-tenant webhook configuration.
 */
class TeamsService {
  constructor() {
    // Teams webhook base URL (can be overridden per-tenant)
    this.webhookBaseUrl = process.env.TEAMS_WEBHOOK_BASE_URL;

    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  /**
   * Send alert to Teams
   * @param {Object} alert - Alert object
   * @param {string[]} webhooks - Teams webhook URLs
   * @returns {Promise<Object>} Send result
   */
  async sendAlert(alert, webhooks) {
    if (!webhooks || webhooks.length === 0) {
      logger.warn('No Teams webhooks configured', { alertId: alert.alertId });
      await ExecutiveAlert.updateDeliveryStatus(alert.alertId, 'teams', 'sent', {
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
        logger.error('Failed to send to Teams webhook', {
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
      await ExecutiveAlert.updateDeliveryStatus(alert.alertId, 'teams', 'delivered', {
        webhookCount: webhooks.length
      });
    } else if (anySucceeded) {
      await ExecutiveAlert.updateDeliveryStatus(alert.alertId, 'teams', 'sent', {
        note: 'Partial delivery'
      });
    } else {
      await ExecutiveAlert.updateDeliveryStatus(alert.alertId, 'teams', 'failed', {
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
    const card = this._buildAdaptiveCard(alert);

    try {
      const response = await axios.post(webhook, {
        type: 'message',
        attachments: [
          {
            contentType: 'application/vnd.microsoft.card.adaptive',
            contentUrl: null,
            content: card
          }
        ]
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (response.status === 200) {
        await ExecutiveAlert.logDelivery({
          alertId: alert.alertId,
          channel: 'teams',
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
        channel: 'teams',
        status: 'failed',
        recipient: webhook,
        errorMessage: error.message
      });

      throw error;
    }
  }

  /**
   * Build Adaptive Card for alert
   * @private
   * @param {Object} alert - Alert object
   * @returns {Object} Adaptive Card
   */
  _buildAdaptiveCard(alert) {
    const breachAmount = alert.actualValue - alert.thresholdValue;
    const severityColor = this._getSeverityColor(alert.severity);

    return {
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'Container',
          style: alert.severity,
          items: [
            {
              type: 'TextBlock',
              text: `${this._getSeverityEmoji(alert.severity)} ${alert.severity.toUpperCase()} Alert`,
              weight: 'Bolder',
              size: 'Large',
              color: severityColor
            },
            {
              type: 'TextBlock',
              text: `${this._formatRole(alert.role)} Dashboard Notification`,
              size: 'Medium',
              color: 'Good',
              isSubtle: true
            }
          ]
        },
        {
          type: 'Container',
          items: [
            {
              type: 'FactSet',
              facts: [
                {
                  title: 'Role:',
                  value: this._formatRole(alert.role)
                },
                {
                  title: 'Metric:',
                  value: this._formatMetricType(alert.metricType)
                },
                {
                  title: 'Threshold:',
                  value: this._formatValue(alert.thresholdValue, alert.metricType)
                },
                {
                  title: 'Actual:',
                  value: this._formatValue(alert.actualValue, alert.metricType)
                },
                {
                  title: 'Breach Amount:',
                  value: this._formatValue(breachAmount, alert.metricType),
                  highlight: true
                },
                {
                  title: 'Triggered:',
                  value: new Date(alert.triggeredAt).toLocaleString()
                }
              ]
            }
          ]
        },
        {
          type: 'Container',
          items: [
            {
              type: 'TextBlock',
              text: 'Context Data',
              weight: 'Bolder',
              size: 'Medium'
            },
            {
              type: 'RichTextBlock',
              inlines: this._buildContextInlines(alert.contextData)
            }
          ],
          isVisible: !!(alert.contextData && Object.keys(alert.contextData).length > 0)
        }
      ],
      actions: [
        {
          type: 'Action.OpenUrl',
          title: '🔍 View Details',
          url: `${this.frontendUrl}/alerts/${alert.alertId}`,
          style: 'positive'
        },
        {
          type: 'Action.OpenUrl',
          title: '✅ Acknowledge',
          url: `${this.frontendUrl}/alerts/${alert.alertId}/acknowledge`
        }
      ],
      msteams: {
        width: 'full'
      }
    };
  }

  /**
   * Build context data inlines for card
   * @private
   * @param {Object} contextData - Context data
   * @returns {Object[]} Rich text inlines
   */
  _buildContextInlines(contextData) {
    if (!contextData || Object.keys(contextData).length === 0) {
      return [];
    }

    const inlines = [];

    for (const [key, value] of Object.entries(contextData)) {
      if (key === 'source') continue; // Skip source to avoid clutter

      const formattedKey = this._formatKey(key);
      const formattedValue = this._formatContextValue(value);

      inlines.push({
        type: 'TextRun',
        text: `• ${formattedKey}: ${formattedValue}\n`,
        isSubtle: true
      });
    }

    return inlines;
  }

  /**
   * Get severity color for Teams
   * @private
   * @param {string} severity - Alert severity
   * @returns {string} Color name
   */
  _getSeverityColor(severity) {
    const colors = {
      critical: 'Attention',
      high: 'Warning',
      medium: 'Good',
      low: 'Good'
    };

    return colors[severity] || 'Default';
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
   * Get service statistics
   * @returns {Object} Service stats
   */
  getStats() {
    return {
      configured: !!this.webhookBaseUrl,
      webhookBaseUrl: this.webhookBaseUrl,
      frontendUrl: this.frontendUrl
    };
  }
}

// Singleton instance
const teamsService = new TeamsService();

module.exports = teamsService;
