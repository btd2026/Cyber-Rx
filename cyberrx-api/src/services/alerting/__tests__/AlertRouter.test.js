'use strict';

const ExecutiveAlert = require('../../models/ExecutiveAlert');
const AlertConfig = require('../../models/AlertConfig');

/**
 * Alert Router Unit Tests
 */

describe('AlertRouter', () => {
  let alertRouter;
  let mockTenantId;

  beforeEach(() => {
    jest.resetModules();
    alertRouter = require('../AlertRouter');
    mockTenantId = 'test-tenant-' + Date.now();
  });

  describe('routeAlert()', () => {
    it('should route alert to primary role for normal severity', async () => {
      const alert = await ExecutiveAlert.create({
        tenantId: mockTenantId,
        role: 'cfo',
        severity: 'medium',
        metricType: 'dollar_exposure',
        thresholdValue: 1000000,
        actualValue: 1500000
      });

      const routed = await alertRouter.routeAlert(alert);

      expect(routed).toHaveLength(1);
      expect(routed[0].role).toBe('cfo');
    });

    it('should escalate high severity to board', async () => {
      const alert = await ExecutiveAlert.create({
        tenantId: mockTenantId,
        role: 'cfo',
        severity: 'high',
        metricType: 'dollar_exposure',
        thresholdValue: 1000000,
        actualValue: 1500000
      });

      await AlertConfig.create({
        tenantId: mockTenantId,
        role: 'cfo',
        metricType: 'dollar_exposure',
        thresholdValue: 1000000,
        severity: 'high',
        enabled: true
      });

      const routed = await alertRouter.routeAlert(alert);

      expect(routed.length).toBeGreaterThanOrEqual(1);
      expect(routed.some(r => r.role === 'cfo')).toBe(true);
      expect(routed.some(r => r.role === 'board')).toBe(true);
    });

    it('should escalate critical severity to all roles', async () => {
      const alert = await ExecutiveAlert.create({
        tenantId: mockTenantId,
        role: 'ciso',
        severity: 'critical',
        metricType: 'blast_radius',
        thresholdValue: 50,
        actualValue: 75
      });

      const routed = await alertRouter.routeAlert(alert);

      expect(routed.length).toBeGreaterThanOrEqual(3);
      expect(routed.some(r => r.role === 'ciso')).toBe(true);
      expect(routed.some(r => r.role === 'cfo')).toBe(true);
      expect(routed.some(r => r.role === 'board')).toBe(true);
    });

    it('should respect custom escalation rules', async () => {
      const alert = await ExecutiveAlert.create({
        tenantId: mockTenantId,
        role: 'ciso',
        severity: 'high',
        metricType: 'risk_score',
        thresholdValue: 70,
        actualValue: 85
      });

      await AlertConfig.create({
        tenantId: mockTenantId,
        role: 'ciso',
        metricType: 'risk_score',
        thresholdValue: 70,
        severity: 'high',
        enabled: true,
        escalationRules: {
          high: {
            escalateTo: ['cfo', 'croe'],
            delayMinutes: 60
          }
        }
      });

      const routed = await alertRouter.routeAlert(alert);

      expect(routed.some(r => r.role === 'ciso')).toBe(true);
      expect(routed.some(r => r.role === 'cfo')).toBe(true);
      expect(routed.some(r => r.role === 'croe')).toBe(true);
    });
  });

  describe('getNotificationRecipients()', () => {
    it('should return empty arrays when no config', async () => {
      const alert = await ExecutiveAlert.create({
        tenantId: mockTenantId,
        role: 'cfo',
        severity: 'medium',
        metricType: 'dollar_exposure',
        thresholdValue: 1000000,
        actualValue: 1500000
      });

      const recipients = await alertRouter.getNotificationRecipients(alert);

      expect(recipients).toHaveProperty('email');
      expect(recipients).toHaveProperty('slack');
      expect(recipients).toHaveProperty('teams');
      expect(recipients.email).toEqual([]);
      expect(recipients.slack).toEqual([]);
      expect(recipients.teams).toEqual([]);
    });

    it('should use custom email recipients from config', async () => {
      const customRecipients = ['cfo@example.com', 'admin@example.com'];

      await AlertConfig.create({
        tenantId: mockTenantId,
        role: 'cfo',
        metricType: 'dollar_exposure',
        thresholdValue: 1000000,
        severity: 'high',
        enabled: true,
        emailRecipients: customRecipients
      });

      const alert = await ExecutiveAlert.create({
        tenantId: mockTenantId,
        role: 'cfo',
        severity: 'high',
        metricType: 'dollar_exposure',
        thresholdValue: 1000000,
        actualValue: 1500000
      });

      const recipients = await alertRouter.getNotificationRecipients(alert);

      expect(recipients.email).toEqual(customRecipients);
    });

    it('should use severity-specific Slack channels', async () => {
      await AlertConfig.create({
        tenantId: mockTenantId,
        role: 'ciso',
        metricType: 'blast_radius',
        thresholdValue: 50,
        severity: 'critical',
        enabled: true,
        slackChannels: {
          critical: 'https://hooks.slack.com/critical',
          high: 'https://hooks.slack.com/high',
          default: 'https://hooks.slack.com/default'
        }
      });

      const alert = await ExecutiveAlert.create({
        tenantId: mockTenantId,
        role: 'ciso',
        severity: 'critical',
        metricType: 'blast_radius',
        thresholdValue: 50,
        actualValue: 75
      });

      const recipients = await alertRouter.getNotificationRecipients(alert);

      expect(recipients.slack).toContain('https://hooks.slack.com/critical');
    });
  });

  describe('getStats()', () => {
    it('should return routing statistics', () => {
      const stats = alertRouter.getStats();

      expect(stats).toHaveProperty('totalRouted');
      expect(stats).toHaveProperty('routingErrors');
      expect(stats).toHaveProperty('escalations');
      expect(stats).toHaveProperty('multiRoleAlerts');
      expect(stats).toHaveProperty('deadLetterQueueSize');
    });
  });
});
