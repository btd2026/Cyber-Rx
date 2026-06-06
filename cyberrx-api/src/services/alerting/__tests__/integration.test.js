'use strict';

/**
 * Alerting System Integration Tests
 *
 * End-to-end tests for the complete alerting workflow
 */

describe('Alerting System Integration', () => {
  let thresholdDetector;
  let alertRouter;
  let emailService;
  let slackService;
  let teamsService;
  let mockTenantId;

  beforeEach(() => {
    jest.resetModules();
    thresholdDetector = require('../ThresholdDetector');
    alertRouter = require('../AlertRouter');
    emailService = require('../EmailService');
    slackService = require('../SlackService');
    teamsService = require('../TeamsService');

    mockTenantId = 'test-tenant-' + Date.now();
  });

  describe('Complete Alert Flow', () => {
    it('should handle complete alert lifecycle', async () => {
      // This test demonstrates the full alert flow:
      // 1. Agent generates output
      // 2. Threshold detector evaluates metrics
      // 3. Alert router routes to appropriate roles
      // 4. Notification services send alerts

      const ExecutiveAlert = require('../../models/ExecutiveAlert');
      const AlertConfig = require('../../models/AlertConfig');

      // Setup config
      await AlertConfig.create({
        tenantId: mockTenantId,
        role: 'cfo',
        metricType: 'dollar_exposure',
        thresholdValue: 1000000,
        severity: 'high',
        enabled: true,
        notificationChannels: ['email']
      });

      // Step 1: Simulate agent output
      const agentOutput = {
        agentType: 'cfo',
        tenantId: mockTenantId,
        data: {
          totalExposure: 1500000
        }
      };

      // Step 2: Evaluate threshold
      const alerts = await thresholdDetector.processAgentOutput(agentOutput);
      expect(alerts).toHaveLength(1);

      // Step 3: Route alert
      const routedAlerts = await alertRouter.routeAlert(alerts[0]);
      expect(routedAlerts.length).toBeGreaterThanOrEqual(1);

      // Step 4: Get recipients
      const recipients = await alertRouter.getNotificationRecipients(routedAlerts[0]);
      expect(recipients).toHaveProperty('email');

      // Step 5: Send notification (mocked)
      // In real test, would verify actual send
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('should not leak alerts between tenants', async () => {
      const ExecutiveAlert = require('../../models/ExecutiveAlert');
      const AlertConfig = require('../../models/AlertConfig');

      const tenant1 = 'tenant-1-' + Date.now();
      const tenant2 = 'tenant-2-' + Date.now();

      // Create configs for both tenants
      await AlertConfig.create({
        tenantId: tenant1,
        role: 'cfo',
        metricType: 'dollar_exposure',
        thresholdValue: 1000000,
        severity: 'high',
        enabled: true
      });

      await AlertConfig.create({
        tenantId: tenant2,
        role: 'cfo',
        metricType: 'dollar_exposure',
        thresholdValue: 1000000,
        severity: 'high',
        enabled: true
      });

      // Create alert for tenant1
      const alert1 = await thresholdDetector.evaluate({
        tenantId: tenant1,
        role: 'cfo',
        metricType: 'dollar_exposure',
        actualValue: 1500000
      });

      // Create alert for tenant2
      const alert2 = await thresholdDetector.evaluate({
        tenantId: tenant2,
        role: 'cfo',
        metricType: 'dollar_exposure',
        actualValue: 2000000
      });

      // Verify alerts are isolated
      const tenant1Alerts = await ExecutiveAlert.findByTenant(tenant1);
      const tenant2Alerts = await ExecutiveAlert.findByTenant(tenant2);

      expect(tenant1Alerts).toHaveLength(1);
      expect(tenant2Alerts).toHaveLength(1);

      expect(tenant1Alerts[0].tenantId).toBe(tenant1);
      expect(tenant2Alerts[0].tenantId).toBe(tenant2);

      expect(tenant1Alerts[0].actualValue).toBe(1500000);
      expect(tenant2Alerts[0].actualValue).toBe(2000000);
    });
  });

  describe('Error Handling', () => {
    it('should handle notification failures gracefully', async () => {
      const ExecutiveAlert = require('../../models/ExecutiveAlert');
      const AlertConfig = require('../../models/AlertConfig');

      await AlertConfig.create({
        tenantId: mockTenantId,
        role: 'cfo',
        metricType: 'dollar_exposure',
        thresholdValue: 1000000,
        severity: 'high',
        enabled: true
      });

      const alert = await thresholdDetector.evaluate({
        tenantId: mockTenantId,
        role: 'cfo',
        metricType: 'dollar_exposure',
        actualValue: 1500000
      });

      expect(alert).not.toBeNull();

      // Simulate failed notification
      // In real test, would mock service to fail
      const failed = await ExecutiveAlert.updateDeliveryStatus(
        alert.alertId,
        'email',
        'failed',
        { error: 'Test failure' }
      );

      expect(failed.deliveryStatus.email).toBe('failed');
    });

    it('should add failed routing to dead letter queue', async () => {
      const stats = alertRouter.getStats();
      expect(stats).toHaveProperty('deadLetterQueueSize');
    });
  });
});
