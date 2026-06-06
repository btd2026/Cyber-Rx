'use strict';

const express = require('express');
const router = express.Router();
const ExecutiveAlert = require('../../models/ExecutiveAlert');
const AlertConfig = require('../../models/AlertConfig');
const alertRouter = require('../../services/alerting/AlertRouter');
const thresholdDetector = require('../../services/alerting/ThresholdDetector');
const emailService = require('../../services/alerting/EmailService');
const slackService = require('../../services/alerting/SlackService');
const teamsService = require('../../services/alerting/TeamsService');
const logger = require('../../utils/logger');

/**
 * Alert Feed API Routes
 *
 * REST endpoints for alert history, WebSocket for real-time stream,
 * and alert lifecycle management.
 */

// Middleware to verify JWT and extract tenant info
const authenticate = (req, res, next) => {
  // JWT authentication is handled by middleware in main app
  // This is a placeholder for route-specific auth logic
  next();
};

// Middleware to extract tenant ID from authenticated user
const extractTenant = (req, res, next) => {
  // Tenant ID should be extracted from JWT token
  req.tenantId = req.user?.orgId || req.headers['x-tenant-id'];
  if (!req.tenantId) {
    return res.status(400).json({ error: 'Tenant ID required' });
  }
  next();
};

// Apply middleware to all routes
router.use(authenticate);
router.use(extractTenant);

/**
 * GET /api/alerting/feed
 * Fetch alert history with filtering and pagination
 */
router.get('/feed', async (req, res) => {
  try {
    const {
      role,
      severity,
      metricType,
      status,
      startDate,
      endDate,
      limit = 50,
      offset = 0
    } = req.query;

    const filters = {
      role,
      severity,
      metricType,
      status,
      startDate,
      endDate,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    const alerts = await ExecutiveAlert.findByTenant(req.tenantId, filters);

    res.json({
      success: true,
      data: alerts,
      meta: {
        count: alerts.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error('Failed to fetch alert feed', {
      error: error.message,
      tenantId: req.tenantId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert feed'
    });
  }
});

/**
 * GET /api/alerting/feed/:alertId
 * Fetch single alert by ID
 */
router.get('/feed/:alertId', async (req, res) => {
  try {
    const { alertId } = req.params;
    const alert = await ExecutiveAlert.findById(alertId);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    // Verify tenant access
    if (alert.tenantId !== req.tenantId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    logger.error('Failed to fetch alert', {
      error: error.message,
      alertId: req.params.alertId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert'
    });
  }
});

/**
 * PUT /api/alerting/feed/:alertId/acknowledge
 * Acknowledge an alert
 */
router.put('/feed/:alertId/acknowledge', async (req, res) => {
  try {
    const { alertId } = req.params;
    const acknowledgedBy = req.user?.id || req.headers['x-user-id'];

    if (!acknowledgedBy) {
      return res.status(400).json({
        success: false,
        error: 'User ID required'
      });
    }

    // Verify alert exists and belongs to tenant
    const alert = await ExecutiveAlert.findById(alertId);
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    if (alert.tenantId !== req.tenantId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const acknowledged = await ExecutiveAlert.acknowledge(alertId, acknowledgedBy);

    res.json({
      success: true,
      data: acknowledged,
      message: 'Alert acknowledged'
    });
  } catch (error) {
    logger.error('Failed to acknowledge alert', {
      error: error.message,
      alertId: req.params.alertId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert'
    });
  }
});

/**
 * PUT /api/alerting/feed/:alertId/dismiss
 * Dismiss an alert
 */
router.put('/feed/:alertId/dismiss', async (req, res) => {
  try {
    const { alertId } = req.params;
    const dismissedBy = req.user?.id || req.headers['x-user-id'];

    if (!dismissedBy) {
      return res.status(400).json({
        success: false,
        error: 'User ID required'
      });
    }

    // Verify alert exists and belongs to tenant
    const alert = await ExecutiveAlert.findById(alertId);
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    if (alert.tenantId !== req.tenantId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const dismissed = await ExecutiveAlert.dismiss(alertId, dismissedBy);

    res.json({
      success: true,
      data: dismissed,
      message: 'Alert dismissed'
    });
  } catch (error) {
    logger.error('Failed to dismiss alert', {
      error: error.message,
      alertId: req.params.alertId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to dismiss alert'
    });
  }
});

/**
 * PUT /api/alerting/feed/:alertId/resolve
 * Resolve an alert
 */
router.put('/feed/:alertId/resolve', async (req, res) => {
  try {
    const { alertId } = req.params;
    const { notes } = req.body;
    const resolvedBy = req.user?.id || req.headers['x-user-id'];

    if (!resolvedBy) {
      return res.status(400).json({
        success: false,
        error: 'User ID required'
      });
    }

    // Verify alert exists and belongs to tenant
    const alert = await ExecutiveAlert.findById(alertId);
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    if (alert.tenantId !== req.tenantId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const resolved = await ExecutiveAlert.resolve(alertId, resolvedBy, notes);

    res.json({
      success: true,
      data: resolved,
      message: 'Alert resolved'
    });
  } catch (error) {
    logger.error('Failed to resolve alert', {
      error: error.message,
      alertId: req.params.alertId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert'
    });
  }
});

/**
 * GET /api/alerting/config
 * Fetch alert configuration for tenant
 */
router.get('/config', async (req, res) => {
  try {
    const { role } = req.query;

    const filters = {};
    if (role) {
      filters.role = role;
    }

    const configs = await AlertConfig.findByTenant(req.tenantId, filters);

    res.json({
      success: true,
      data: configs,
      meta: {
        count: configs.length
      }
    });
  } catch (error) {
    logger.error('Failed to fetch alert config', {
      error: error.message,
      tenantId: req.tenantId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert config'
    });
  }
});

/**
 * PUT /api/alerting/config
 * Update alert configuration
 */
router.put('/config', async (req, res) => {
  try {
    const { configId, ...updates } = req.body;

    if (!configId) {
      return res.status(400).json({
        success: false,
        error: 'Config ID required'
      });
    }

    // Verify config exists and belongs to tenant
    const existingConfig = await AlertConfig.findById(configId);
    if (!existingConfig) {
      return res.status(404).json({
        success: false,
        error: 'Config not found'
      });
    }

    if (existingConfig.tenantId !== req.tenantId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const updated = await AlertConfig.update(configId, updates);

    res.json({
      success: true,
      data: updated,
      message: 'Config updated'
    });
  } catch (error) {
    logger.error('Failed to update alert config', {
      error: error.message,
      configId: req.body.configId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to update alert config'
    });
  }
});

/**
 * POST /api/alerting/config
 * Create new alert configuration
 */
router.post('/config', async (req, res) => {
  try {
    const configData = {
      ...req.body,
      tenantId: req.tenantId
    };

    const config = await AlertConfig.create(configData);

    res.status(201).json({
      success: true,
      data: config,
      message: 'Config created'
    });
  } catch (error) {
    logger.error('Failed to create alert config', {
      error: error.message,
      tenantId: req.tenantId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to create alert config'
    });
  }
});

/**
 * GET /api/alerting/stats
 * Get alert statistics for tenant
 */
router.get('/stats', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const [statistics, deliveryStats, severityBreakdown] = await Promise.all([
      ExecutiveAlert.getStatistics(req.tenantId, parseInt(days)),
      ExecutiveAlert.getDeliveryStatistics(req.tenantId, parseInt(days)),
      ExecutiveAlert.getSeverityBreakdown(req.tenantId, parseInt(days))
    ]);

    res.json({
      success: true,
      data: {
        statistics,
        deliveryStats,
        severityBreakdown
      }
    });
  } catch (error) {
    logger.error('Failed to fetch alert stats', {
      error: error.message,
      tenantId: req.tenantId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert stats'
    });
  }
});

/**
 * POST /api/alerting/test
 * Test alerting system (sends test alert)
 */
router.post('/test', async (req, res) => {
  try {
    const { role = 'cfo', channels = ['email'] } = req.body;

    // Create test alert
    const testAlert = await ExecutiveAlert.create({
      tenantId: req.tenantId,
      role,
      severity: 'high',
      metricType: 'dollar_exposure',
      thresholdValue: 1000000,
      actualValue: 1500000,
      contextData: {
        test: true,
        source: 'manual_test',
        timestamp: new Date().toISOString()
      }
    });

    // Route alert
    const routedAlerts = await alertRouter.routeAlert(testAlert);

    // Send notifications
    const notificationResults = [];

    for (const alert of routedAlerts) {
      const routing = await alertRouter.routeToChannels(alert);

      if (channels.includes('email') && routing.channels.email.enabled) {
        const recipients = await alertRouter.getNotificationRecipients(alert);
        const emailResult = await emailService.sendAlert(alert, recipients.email);
        notificationResults.push({ channel: 'email', result: emailResult });
      }

      if (channels.includes('slack') && routing.channels.slack.enabled) {
        const recipients = await alertRouter.getNotificationRecipients(alert);
        const slackResult = await slackService.sendAlert(alert, recipients.slack);
        notificationResults.push({ channel: 'slack', result: slackResult });
      }

      if (channels.includes('teams') && routing.channels.teams.enabled) {
        const recipients = await alertRouter.getNotificationRecipients(alert);
        const teamsResult = await teamsService.sendAlert(alert, recipients.teams);
        notificationResults.push({ channel: 'teams', result: teamsResult });
      }
    }

    res.json({
      success: true,
      data: {
        alertId: testAlert.alertId,
        routedAlerts: routedAlerts.map(a => ({ alertId: a.alertId, role: a.role })),
        notifications: notificationResults
      },
      message: 'Test alert sent'
    });
  } catch (error) {
    logger.error('Failed to send test alert', {
      error: error.message,
      tenantId: req.tenantId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to send test alert'
    });
  }
});

/**
 * POST /api/alerting/evaluate
 * Manually trigger threshold evaluation
 */
router.post('/evaluate', async (req, res) => {
  try {
    const { role, metricType, actualValue, context } = req.body;

    if (!role || !metricType || actualValue === undefined) {
      return res.status(400).json({
        success: false,
        error: 'role, metricType, and actualValue required'
      });
    }

    const alert = await thresholdDetector.evaluate({
      tenantId: req.tenantId,
      role,
      metricType,
      actualValue,
      context: context || {}
    });

    if (!alert) {
      return res.json({
        success: true,
        message: 'No threshold breach detected',
        data: null
      });
    }

    // Route and send notifications
    const routedAlerts = await alertRouter.routeAlert(alert);

    res.json({
      success: true,
      data: {
        alert,
        routedAlerts: routedAlerts.map(a => ({ alertId: a.alertId, role: a.role }))
      },
      message: 'Threshold breach detected and alert created'
    });
  } catch (error) {
    logger.error('Failed to evaluate threshold', {
      error: error.message,
      tenantId: req.tenantId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to evaluate threshold'
    });
  }
});

/**
 * GET /api/alerting/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  const stats = {
    thresholdDetector: thresholdDetector.getCacheStats(),
    alertRouter: alertRouter.getStats(),
    emailService: emailService.getStats(),
    slackService: slackService.getStats(),
    teamsService: teamsService.getStats()
  };

  res.json({
    success: true,
    data: stats,
    message: 'Alerting system operational'
  });
});

module.exports = router;
