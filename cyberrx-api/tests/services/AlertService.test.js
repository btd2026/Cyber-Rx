'use strict';

const AlertService = require('../../src/services/AlertService');
const Alert = require('../../src/models/Alert');
const Vendor = require('../../src/models/Vendor');
const VendorRiskSignal = require('../../src/models/VendorRiskSignal');

describe('AlertService', () => {
  let alertService;
  let mockVendor;
  let mockSignals;

  beforeEach(() => {
    alertService = new AlertService();

    // Mock vendor
    mockVendor = {
      id: 'vendor-123',
      name: 'Test Vendor',
      organizationId: 'org-123',
      securityScore: 75,
      previousRiskScore: 90,
      tier: 'High'
    };

    // Mock signals
    mockSignals = [
      {
        id: 'signal-1',
        vendorId: 'vendor-123',
        organizationId: 'org-123',
        sourceName: 'SecurityScorecard',
        signalCategory: 'External Attack Surface',
        signalName: 'Open Port',
        severity: 'Critical',
        description: 'Critical vulnerability detected',
        observedAt: new Date().toISOString(),
        status: 'active'
      },
      {
        id: 'signal-2',
        vendorId: 'vendor-123',
        organizationId: 'org-123',
        sourceName: 'BitSight',
        signalCategory: 'External Attack Surface',
        signalName: 'Open Port',
        severity: 'High',
        description: 'High severity issue detected',
        observedAt: new Date().toISOString(),
        status: 'active'
      },
      {
        id: 'signal-3',
        vendorId: 'vendor-123',
        organizationId: 'org-123',
        sourceName: 'SecurityScorecard',
        signalCategory: 'Breach/Incident Intelligence',
        signalName: 'Data Breach',
        severity: 'Critical',
        description: 'Breach detected',
        observedAt: new Date().toISOString(),
        status: 'active'
      }
    ];
  });

  describe('sendAlert', () => {
    it('should create and queue an alert', async () => {
      const alertData = {
        organizationId: 'org-123',
        vendorId: 'vendor-123',
        type: 'critical_signal',
        severity: 'Critical',
        message: 'Test alert message',
        data: { test: 'data' }
      };

      // Mock dependencies
      jest.spyOn(Vendor, 'findById').mockResolvedValue(mockVendor);
      jest.spyOn(Alert, 'create').mockResolvedValue({
        id: 'alert-123',
        ...alertData
      });
      jest.spyOn(alertService, 'getPriority').mockReturnValue(1);

      const result = await alertService.sendAlert(alertData);

      expect(result).toBeDefined();
      expect(result.type).toBe('critical_signal');
      expect(result.severity).toBe('Critical');
      expect(Alert.create).toHaveBeenCalled();
    });

    it('should throw error if vendor not found', async () => {
      jest.spyOn(Vendor, 'findById').mockResolvedValue(null);

      await expect(
        alertService.sendAlert({
          organizationId: 'org-123',
          vendorId: 'nonexistent',
          type: 'critical_signal',
          severity: 'Critical',
          message: 'Test'
        })
      ).rejects.toThrow('Vendor not found');
    });
  });

  describe('evaluateRules', () => {
    beforeEach(() => {
      jest.spyOn(Vendor, 'findById').mockResolvedValue(mockVendor);
      jest.spyOn(VendorRiskSignal, 'findActiveByVendor').mockResolvedValue(mockSignals);
      jest.spyOn(alertService, 'sendAlert').mockResolvedValue({ id: 'alert-123' });
    });

    it('should trigger critical signal alert', async () => {
      const result = await alertService.evaluateRules('vendor-123', 'org-123');

      expect(alertService.sendAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'critical_signal',
          severity: 'Critical'
        })
      );
    });

    it('should trigger score increase alert when score increases by >20', async () => {
      const result = await alertService.evaluateRules('vendor-123', 'org-123');

      expect(alertService.sendAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'score_increase',
          severity: 'High'
        })
      );
    });

    it('should trigger grade degradation alert when grade drops', async () => {
      const result = await alertService.evaluateRules('vendor-123', 'org-123');

      // Score went from 90 to 75, grade from A to B
      expect(alertService.sendAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'grade_degradation',
          severity: 'Medium'
        })
      );
    });

    it('should trigger multi-provider confirmation alert', async () => {
      const result = await alertService.evaluateRules('vendor-123', 'org-123');

      expect(alertService.sendAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'multi_provider_confirmed',
          severity: 'High'
        })
      );
    });

    it('should not trigger alerts when conditions not met', async () => {
      // Mock vendor with no score change
      const stableVendor = {
        ...mockVendor,
        securityScore: 90,
        previousRiskScore: 90
      };

      // Mock signals without critical issues
      const lowSeveritySignals = [
        {
          ...mockSignals[0],
          severity: 'Low'
        }
      ];

      jest.spyOn(Vendor, 'findById').mockResolvedValue(stableVendor);
      jest.spyOn(VendorRiskSignal, 'findActiveByVendor').mockResolvedValue(lowSeveritySignals);

      const result = await alertService.evaluateRules('vendor-123', 'org-123');

      // Should not trigger critical_signal, score_increase, or grade_degradation
      expect(alertService.sendAlert).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'critical_signal'
        })
      );
    });
  });

  describe('findConfirmedIssues', () => {
    it('should find issues confirmed by multiple providers', () => {
      const signals = [
        {
          sourceName: 'SecurityScorecard',
          signalCategory: 'External Attack Surface',
          severity: 'High'
        },
        {
          sourceName: 'BitSight',
          signalCategory: 'External Attack Surface',
          severity: 'Medium'
        },
        {
          sourceName: 'SecurityScorecard',
          signalCategory: 'Breach/Incident Intelligence',
          severity: 'Critical'
        }
      ];

      const result = alertService.findConfirmedIssues(signals);

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('External Attack Surface');
      expect(result[0].providers).toContain('SecurityScorecard');
      expect(result[0].providers).toContain('BitSight');
    });

    it('should return empty array when no multi-provider confirmation', () => {
      const signals = [
        {
          sourceName: 'SecurityScorecard',
          signalCategory: 'External Attack Surface',
          severity: 'High'
        }
      ];

      const result = alertService.findConfirmedIssues(signals);

      expect(result).toHaveLength(0);
    });
  });

  describe('getGradeFromScore', () => {
    it('should return correct grades', () => {
      expect(alertService.getGradeFromScore(95)).toBe('A');
      expect(alertService.getGradeFromScore(85)).toBe('B');
      expect(alertService.getGradeFromScore(75)).toBe('C');
      expect(alertService.getGradeFromScore(65)).toBe('D');
      expect(alertService.getGradeFromScore(55)).toBe('F');
    });
  });

  describe('isGradeWorse', () => {
    it('should correctly identify grade degradation', () => {
      expect(alertService.isGradeWorse('B', 'A')).toBe(true);
      expect(alertService.isGradeWorse('C', 'B')).toBe(true);
      expect(alertService.isGradeWorse('D', 'C')).toBe(true);
      expect(alertService.isGradeWorse('F', 'D')).toBe(true);

      expect(alertService.isGradeWorse('A', 'B')).toBe(false);
      expect(alertService.isGradeWorse('B', 'B')).toBe(false);
    });
  });

  describe('getPriority', () => {
    it('should return correct priorities for severities', () => {
      expect(alertService.getPriority('Critical')).toBe(1);
      expect(alertService.getPriority('High')).toBe(5);
      expect(alertService.getPriority('Medium')).toBe(10);
      expect(alertService.getPriority('Low')).toBe(15);
      expect(alertService.getPriority('Info')).toBe(20);
    });
  });

  describe('getSlackBlocks', () => {
    it('should generate Slack blocks for critical signal alert', () => {
      const alert = {
        id: 'alert-123',
        type: 'critical_signal',
        severity: 'Critical',
        vendorName: 'Test Vendor',
        createdAt: new Date(),
        data: {
          vendorId: 'vendor-123',
          signals: [
            {
              sourceName: 'SecurityScorecard',
              description: 'Critical vulnerability'
            }
          ]
        }
      };

      const blocks = alertService.getSlackBlocks(alert);

      expect(blocks).toBeInstanceOf(Array);
      expect(blocks.length).toBeGreaterThan(0);
      expect(blocks[0].type).toBe('header');
    });

    it('should include action buttons', () => {
      const alert = {
        id: 'alert-123',
        type: 'score_increase',
        severity: 'High',
        vendorName: 'Test Vendor',
        createdAt: new Date(),
        data: {
          vendorId: 'vendor-123',
          previous: 70,
          current: 95,
          change: 25
        }
      };

      const blocks = alertService.getSlackBlocks(alert);

      const actionsBlock = blocks.find(b => b.type === 'actions');
      expect(actionsBlock).toBeDefined();
      expect(actionsBlock.elements).toHaveLength(2);
    });
  });

  describe('sendEmail', () => {
    it('should log warning if SendGrid not configured', async () => {
      alertService.sendgrid = null;
      alertService.sendgridApiKey = null;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await alertService.sendEmail({
        id: 'alert-123',
        organizationId: 'org-123'
      });

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle email sending errors', async () => {
      alertService.sendgrid = {
        sendMultiple: jest.fn().mockRejectedValue(new Error('SendGrid API Error'))
      };

      jest.spyOn(Alert, 'updateDeliveryStatus').mockResolvedValue({});

      await expect(
        alertService.sendEmail({
          id: 'alert-123',
          organizationId: 'org-123',
          type: 'critical_signal',
          vendorName: 'Test Vendor',
          severity: 'Critical'
        })
      ).rejects.toThrow('SendGrid API Error');
    });
  });

  describe('sendSlack', () => {
    it('should log warning if webhook not configured', async () => {
      alertService.slackWebhooks = {};

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await alertService.sendSlack({
        id: 'alert-123',
        severity: 'Critical'
      });

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should send Slack message via webhook', async () => {
      const axios = require('axios');
      jest.spyOn(axios, 'post').mockResolvedValue({});

      alertService.slackWebhooks = {
        critical: 'https://hooks.slack.com/services/test'
      };

      jest.spyOn(Alert, 'updateDeliveryStatus').mockResolvedValue({});

      await alertService.sendSlack({
        id: 'alert-123',
        severity: 'Critical',
        type: 'critical_signal',
        vendorName: 'Test Vendor',
        createdAt: new Date(),
        data: { vendorId: 'vendor-123' }
      });

      expect(axios.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/test',
        expect.objectContaining({ blocks: expect.any(Array) })
      );
    });
  });

  describe('createSyncFailureDigest', () => {
    it('should return null if no failures', async () => {
      const result = await alertService.createSyncFailureDigest('org-123', []);

      expect(result).toBeNull();
    });

    it('should create digest alert for failures', async () => {
      const failures = [
        {
          vendor_name: 'Vendor 1',
          vendor_id: 'vendor-1',
          connector_type: 'SecurityScorecard',
          error_message: 'API Error',
          failed_at: new Date()
        }
      ];

      jest.spyOn(Alert, 'create').mockResolvedValue({ id: 'alert-123' });

      const result = await alertService.createSyncFailureDigest('org-123', failures);

      expect(result).toBeDefined();
      expect(Alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sync_failure',
          severity: 'Medium'
        })
      );
    });
  });
});
