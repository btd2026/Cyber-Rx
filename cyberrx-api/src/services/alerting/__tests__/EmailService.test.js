'use strict';

const ExecutiveAlert = require('../../models/ExecutiveAlert');

/**
 * Email Service Unit Tests
 */

describe('EmailService', () => {
  let emailService;
  let mockAlert;

  beforeEach(() => {
    jest.resetModules();
    emailService = require('../EmailService');

    // Mock SendGrid
    jest.mock('@sendgrid/mail', () => ({
      setApiKey: jest.fn(),
      sendMultiple: jest.fn()
    }));
  });

  describe('sendAlert()', () => {
    it('should skip when SendGrid not configured', async () => {
      // Clear API key to simulate not configured
      emailService.sendgridApiKey = null;
      emailService.sendgrid = null;

      mockAlert = await ExecutiveAlert.create({
        tenantId: 'test-tenant',
        role: 'cfo',
        severity: 'high',
        metricType: 'dollar_exposure',
        thresholdValue: 1000000,
        actualValue: 1500000
      });

      const result = await emailService.sendAlert(mockAlert, ['test@example.com']);

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
    });

    it('should skip when no recipients', async () => {
      mockAlert = await ExecutiveAlert.create({
        tenantId: 'test-tenant',
        role: 'cfo',
        severity: 'high',
        metricType: 'dollar_exposure',
        thresholdValue: 1000000,
        actualValue: 1500000
      });

      const result = await emailService.sendAlert(mockAlert, []);

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
    });

    it('should build correct email content', async () => {
      mockAlert = await ExecutiveAlert.create({
        tenantId: 'test-tenant',
        role: 'cfo',
        severity: 'critical',
        metricType: 'dollar_exposure',
        thresholdValue: 1000000,
        actualValue: 1500000,
        contextData: {
          previousValue: 1200000,
          changePercent: 25.0
        }
      });

      const content = emailService._buildEmailContent(mockAlert);

      expect(content).toHaveProperty('subject');
      expect(content).toHaveProperty('html');
      expect(content).toHaveProperty('text');

      expect(content.subject).toContain('CRITICAL');
      expect(content.subject).toContain('CFO');
      expect(content.html).toContain('1500000');
      expect(content.html).toContain('1000000');
      expect(content.html).toContain('500000'); // breach amount
    });

    it('should format values correctly', () => {
      // Currency formatting
      expect(emailService._formatValue(1500000, 'dollar_exposure')).toBe('$1,500,000');

      // Percentage formatting
      expect(emailService._formatValue(0.08, 'mlr_impact')).toBe('8.00%');

      // Number formatting
      expect(emailService._formatValue(75, 'blast_radius')).toBe('75');
    });

    it('should format roles correctly', () => {
      expect(emailService._formatRole('cfo')).toBe('CFO');
      expect(emailService._formatRole('ciso')).toBe('CISO');
      expect(emailService._formatRole('board')).toBe('Board');
    });

    it('should format metric types correctly', () => {
      expect(emailService._formatMetricType('dollar_exposure')).toBe('Dollar Exposure');
      expect(emailService._formatMetricType('blast_radius')).toBe('Blast Radius');
      expect(emailService._formatMetricType('risk_score')).toBe('Risk Score');
    });
  });

  describe('getStats()', () => {
    it('should return service statistics', () => {
      const stats = emailService.getStats();

      expect(stats).toHaveProperty('configured');
      expect(stats).toHaveProperty('fromEmail');
      expect(stats).toHaveProperty('rateLimit');
      expect(stats).toHaveProperty('retryConfig');
    });
  });
});
