'use strict';

const ExecutiveAlert = require('../../models/ExecutiveAlert');
const logger = require('../../utils/logger');

/**
 * Email Notification Service
 *
 * Sends email alerts via SendGrid with HTML templates, tenant branding,
 * and retry logic. Supports batch sending and rate limiting.
 */
class EmailService {
  constructor() {
    // SendGrid configuration
    this.sendgridApiKey = process.env.SENDGRID_API_KEY;
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'alerts@cyberrx.com';
    this.fromName = process.env.SENDGRID_FROM_NAME || 'CyberRx Alerts';

    // Rate limiting (100 emails/minute as per SendGrid best practices)
    this.rateLimit = {
      maxPerMinute: 100,
      sentThisMinute: 0,
      minuteStart: Date.now()
    };

    // Initialize SendGrid client
    if (this.sendgridApiKey) {
      this.sendgrid = require('@sendgrid/mail');
      this.sendgrid.setApiKey(this.sendgridApiKey);
    } else {
      logger.warn('SendGrid not configured - email alerts will be disabled');
    }

    // Retry configuration
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Send alert via email
   * @param {Object} alert - Alert object
   * @param {string[]} recipients - Email recipients
   * @returns {Promise<Object>} Send result
   */
  async sendAlert(alert, recipients) {
    if (!this.sendgrid || !this.sendgridApiKey) {
      logger.warn('SendGrid not configured, skipping email', { alertId: alert.alertId });
      await ExecutiveAlert.updateDeliveryStatus(alert.alertId, 'email', 'sent', {
        note: 'SendGrid not configured'
      });
      return { success: true, skipped: true };
    }

    if (!recipients || recipients.length === 0) {
      logger.warn('No email recipients', { alertId: alert.alertId });
      await ExecutiveAlert.updateDeliveryStatus(alert.alertId, 'email', 'sent', {
        note: 'No recipients'
      });
      return { success: true, skipped: true };
    }

    try {
      // Check rate limit
      await this._checkRateLimit();

      // Build email content
      const { subject, html, text } = this._buildEmailContent(alert);

      // Send email with retry logic
      const result = await this._sendWithRetry({
        to: recipients,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject,
        html,
        text
      });

      // Update alert delivery status
      if (result.success) {
        await ExecutiveAlert.updateDeliveryStatus(alert.alertId, 'email', 'delivered', {
          recipientCount: recipients.length
        });

        // Log delivery for each recipient
        for (const recipient of recipients) {
          await ExecutiveAlert.logDelivery({
            alertId: alert.alertId,
            channel: 'email',
            status: 'delivered',
            recipient
          });
        }

        logger.info('Email alert sent successfully', {
          alertId: alert.alertId,
          recipientCount: recipients.length
        });
      } else {
        await ExecutiveAlert.updateDeliveryStatus(alert.alertId, 'email', 'failed', {
          error: result.error
        });

        for (const recipient of recipients) {
          await ExecutiveAlert.logDelivery({
            alertId: alert.alertId,
            channel: 'email',
            status: 'failed',
            recipient,
            errorMessage: result.error
          });
        }
      }

      return result;
    } catch (error) {
      logger.error('Failed to send email alert', {
        alertId: alert.alertId,
        error: error.message
      });

      await ExecutiveAlert.updateDeliveryStatus(alert.alertId, 'email', 'failed', {
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Send batch of alerts
   * @param {Object[]} alertsAndRecipients - Array of {alert, recipients}
   * @returns {Promise<Object[]>} Send results
   */
  async sendBatch(alertsAndRecipients) {
    const results = [];

    for (const { alert, recipients } of alertsAndRecipients) {
      try {
        const result = await this.sendAlert(alert, recipients);
        results.push({ alertId: alert.alertId, result });
      } catch (error) {
        results.push({
          alertId: alert.alertId,
          result: { success: false, error: error.message }
        });
      }
    }

    return results;
  }

  /**
   * Build email content from alert
   * @private
   * @param {Object} alert - Alert object
   * @returns {Object} Email content
   */
  _buildEmailContent(alert) {
    const template = this._getTemplate(alert.role, alert.severity);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const subject = this._getSubject(alert);

    const html = template
      .replace('{{ALERT_ID}}', alert.alertId)
      .replace('{{ROLE}}', this._formatRole(alert.role))
      .replace('{{SEVERITY}}', alert.severity.toUpperCase())
      .replace('{{METRIC_TYPE}}', this._formatMetricType(alert.metricType))
      .replace('{{THRESHOLD_VALUE}}', this._formatValue(alert.thresholdValue, alert.metricType))
      .replace('{{ACTUAL_VALUE}}', this._formatValue(alert.actualValue, alert.metricType))
      .replace('{{BREACH_AMOUNT}}', this._formatValue(alert.actualValue - alert.thresholdValue, alert.metricType))
      .replace('{{TRIGGERED_AT}}', new Date(alert.triggeredAt).toLocaleString())
      .replace('{{ALERT_URL}}', `${frontendUrl}/alerts/${alert.alertId}`)
      .replace('{{TENANT_ID}}', alert.tenantId)
      .replace('{{CONTEXT_DATA}}', JSON.stringify(alert.contextData, null, 2));

    const text = this._stripHtml(html);

    return { subject, html, text };
  }

  /**
   * Get email template by role and severity
   * @private
   * @param {string} role - Alert role
   * @param {string} severity - Alert severity
   * @returns {string} HTML template
   */
  _getTemplate(role, severity) {
    // Color-coded severity
    const colors = {
      critical: '#dc3545',
      high: '#fd7e14',
      medium: '#ffc107',
      low: '#28a745'
    };

    const color = colors[severity] || colors.medium;

    // Base template
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{SEVERITY}} Alert - {{ROLE}}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${color}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; border-top: none; }
    .metric { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid ${color}; border-radius: 3px; }
    .metric-label { font-weight: bold; color: #666; font-size: 0.9em; }
    .metric-value { font-size: 1.5em; font-weight: bold; color: ${color}; }
    .btn { display: inline-block; padding: 12px 24px; background: ${color}; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    .footer { text-align: center; color: #6c757d; font-size: 0.9em; margin-top: 20px; }
    .context { background: #e9ecef; padding: 15px; border-radius: 5px; margin-top: 15px; }
    .context pre { margin: 0; white-space: pre-wrap; font-size: 0.85em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{SEVERITY}} Alert</h1>
      <p>{{ROLE}} Dashboard Notification</p>
    </div>
    <div class="content">
      <div class="metric">
        <div class="metric-label">Metric Type</div>
        <div>{{METRIC_TYPE}}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Threshold Value</div>
        <div class="metric-value">{{THRESHOLD_VALUE}}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Actual Value</div>
        <div class="metric-value">{{ACTUAL_VALUE}}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Breach Amount</div>
        <div class="metric-value">{{BREACH_AMOUNT}}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Triggered At</div>
        <div>{{TRIGGERED_AT}}</div>
      </div>
      <div class="context">
        <strong>Alert ID:</strong> {{ALERT_ID}}<br>
        <strong>Context Data:</strong>
        <pre>{{CONTEXT_DATA}}</pre>
      </div>
      <center>
        <a href="{{ALERT_URL}}" class="btn">View Alert in Dashboard</a>
      </center>
    </div>
    <div class="footer">
      <p>This is an automated alert from CyberRx. Please do not reply to this email.</p>
      <p>Tenant: {{TENANT_ID}}</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Get email subject line
   * @private
   * @param {Object} alert - Alert object
   * @returns {string} Subject line
   */
  _getSubject(alert) {
    const emoji = {
      critical: '🚨',
      high: '⚠️',
      medium: '⚡',
      low: 'ℹ️'
    };

    const icon = emoji[alert.severity] || '🔔';
    const role = this._formatRole(alert.role);
    const metric = this._formatMetricType(alert.metricType);

    return `${icon} [${alert.severity.toUpperCase()}] ${role}: ${metric} Alert`;
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
      // Format as currency
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }

    if (metricType.includes('impact') || metricType.includes('risk')) {
      // Format as percentage
      return `${value.toFixed(2)}%`;
    }

    // Format as number
    return new Intl.NumberFormat('en-US').format(value);
  }

  /**
   * Strip HTML tags for plain text version
   * @private
   * @param {string} html - HTML content
   * @returns {string} Plain text
   */
  _stripHtml(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * Send email with retry logic
   * @private
   * @param {Object} mailOptions - SendGrid mail options
   * @returns {Promise<Object>} Send result
   */
  async _sendWithRetry(mailOptions) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await this.sendgrid.sendMultiple(mailOptions);
        return { success: true, attempts: attempt };
      } catch (error) {
        lastError = error;

        if (attempt < this.maxRetries) {
          // Exponential backoff
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          logger.warn(`Email send failed, retrying in ${delay}ms`, {
            attempt,
            maxAttempts: this.maxRetries
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      error: lastError.message,
      attempts: this.maxRetries
    };
  }

  /**
   * Check and enforce rate limit
   * @private
   */
  async _checkRateLimit() {
    const now = Date.now();
    const minuteMs = 60 * 1000;

    // Reset counter if minute has passed
    if (now - this.rateLimit.minuteStart > minuteMs) {
      this.rateLimit.sentThisMinute = 0;
      this.rateLimit.minuteStart = now;
    }

    // Check if we've hit the limit
    if (this.rateLimit.sentThisMinute >= this.rateLimit.maxPerMinute) {
      const waitTime = minuteMs - (now - this.rateLimit.minuteStart);
      logger.info(`Rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));

      // Reset after waiting
      this.rateLimit.sentThisMinute = 0;
      this.rateLimit.minuteStart = Date.now();
    }

    this.rateLimit.sentThisMinute++;
  }

  /**
   * Get service statistics
   * @returns {Object} Service stats
   */
  getStats() {
    return {
      configured: !!this.sendgridApiKey,
      fromEmail: this.fromEmail,
      rateLimit: {
        maxPerMinute: this.rateLimit.maxPerMinute,
        sentThisMinute: this.rateLimit.sentThisMinute
      },
      retryConfig: {
        maxRetries: this.maxRetries,
        retryDelay: this.retryDelay
      }
    };
  }
}

// Singleton instance
const emailService = new EmailService();

module.exports = emailService;
