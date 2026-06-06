'use strict';

const ExecutiveAlert = require('../../models/ExecutiveAlert');
const AlertConfig = require('../../models/AlertConfig');

/**
 * Threshold Detector Unit Tests
 */

describe('ThresholdDetector', () => {
  let thresholdDetector;
  let mockTenantId;

  beforeEach(() => {
    // Reset detector state
    jest.resetModules();
    thresholdDetector = require('../ThresholdDetector');
    mockTenantId = 'test-tenant-' + Date.now();
  });

  describe('evaluate()', () => {
    it('should detect threshold breach when actual exceeds threshold', async () => {
      // Create config
      await AlertConfig.create({
        tenantId: mockTenantId,
        role: 'cfo',
        metricType: 'dollar_exposure',
        thresholdValue: 1000000,
        severity: 'high',
        enabled: true,
        cooldownMinutes: 0,
        hysteresisPercent: 10
      });

      const alert = await thresholdDetector.evaluate({
        tenantId: mockTenantId,
        role: 'cfo',
        metricType: 'dollar_exposure',
        actualValue: 1500000,
        context: { source: 'test' }
      });

      expect(alert).not.toBeNull();
      expect(alert.role).toBe('cfo');
      expect(alert.metricType).toBe('dollar_exposure');
      expect(alert.actualValue).toBe(1500000);
      expect(alert.thresholdValue).toBe(1000000);
    });

    it('should not alert when value below threshold', async () => {
      await AlertConfig.create({
        tenantId: mockTenantId,
        role: 'cfo',
        metricType: 'dollar_exposure',
        thresholdValue: 1000000,
        severity: 'high',
        enabled: true,
        cooldownMinutes: 0
      });

      const alert = await thresholdDetector.evaluate({
        tenantId: mockTenantId,
        role: 'cfo',
        metricType: 'dollar_exposure',
        actualValue: 500000
      });

      expect(alert).toBeNull();
    });

    it('should respect cooldown period', async () => {
      await AlertConfig.create({
        tenantId: mockTenantId,
        role: 'cfo',
        metricType: 'dollar_exposure',
        thresholdValue: 1000000,
        severity: 'high',
        enabled: true,
        cooldownMinutes: 60
      });

      // First alert
      const alert1 = await thresholdDetector.evaluate({
        tenantId: mockTenantId,
        role: 'cfo',
        metricType: 'dollar_exposure',
        actualValue: 1500000
      });

      expect(alert1).not.toBeNull();

      // Second alert within cooldown - should be blocked
      const alert2 = await thresholdDetector.evaluate({
        tenantId: mockTenantId,
        role: 'cfo',
        metricType: 'dollar_exposure',
        actualValue: 2000000
      });

      expect(alert2).toBeNull();
    });

    it('should apply hysteresis to prevent flapping', async () => {
      await AlertConfig.create({
        tenantId: mockTenantId,
        role: 'ciso',
        metricType: 'risk_score',
        thresholdValue: 70,
        severity: 'high',
        enabled: true,
        cooldownMinutes: 0,
        hysteresisPercent: 10
      });

      // First alert at 75
      const alert1 = await thresholdDetector.evaluate({
        tenantId: mockTenantId,
        role: 'ciso',
        metricType: 'risk_score',
        actualValue: 75
      });

      expect(alert1).not.toBeNull();

      // Value drops to 72 (still above 63 hysteresis threshold)
      // Should not alert because we're in hysteresis zone
      const alert2 = await thresholdDetector.evaluate({
        tenantId: mockTenantId,
        role: 'ciso',
        metricType: 'risk_score',
        actualValue: 72
      });

      expect(alert2).toBeNull();

      // Value drops to 60 (below hysteresis threshold)
      // Then goes back to 71 - should alert again
      thresholdDetector.previousValues.set(`${mockTenantId}_ciso_risk_score`, 60);

      const alert3 = await thresholdDetector.evaluate({
        tenantId: mockTenantId,
        role: 'ciso',
        metricType: 'risk_score',
        actualValue: 71
      });

      expect(alert3).not.toBeNull();
    });

    it('should skip evaluation when config is disabled', async () => {
      await AlertConfig.create({
        tenantId: mockTenantId,
        role: 'cfo',
        metricType: 'dollar_exposure',
        thresholdValue: 1000000,
        severity: 'high',
        enabled: false
      });

      const alert = await thresholdDetector.evaluate({
        tenantId: mockTenantId,
        role: 'cfo',
        metricType: 'dollar_exposure',
        actualValue: 1500000
      });

      expect(alert).toBeNull();
    });

    it('should skip evaluation when config not found', async () => {
      const alert = await thresholdDetector.evaluate({
        tenantId: mockTenantId,
        role: 'cfo',
        metricType: 'dollar_exposure',
        actualValue: 1500000
      });

      expect(alert).toBeNull();
    });
  });

  describe('evaluateBatch()', () => {
    it('should evaluate multiple metrics', async () => {
      await AlertConfig.create({
        tenantId: mockTenantId,
        role: 'cfo',
        metricType: 'dollar_exposure',
        thresholdValue: 1000000,
        severity: 'high',
        enabled: true
      });

      await AlertConfig.create({
        tenantId: mockTenantId,
        role: 'ciso',
        metricType: 'blast_radius',
        thresholdValue: 50,
        severity: 'critical',
        enabled: true
      });

      const metrics = [
        {
          tenantId: mockTenantId,
          role: 'cfo',
          metricType: 'dollar_exposure',
          actualValue: 1500000
        },
        {
          tenantId: mockTenantId,
          role: 'ciso',
          metricType: 'blast_radius',
          actualValue: 75
        },
        {
          tenantId: mockTenantId,
          role: 'cfo',
          metricType: 'dollar_exposure',
          actualValue: 500000
        }
      ];

      const alerts = await thresholdDetector.evaluateBatch(metrics);

      expect(alerts).toHaveLength(2); // 2 breaches
    });
  });

  describe('processAgentOutput()', () => {
    it('should extract metrics from CFO agent output', async () => {
      await AlertConfig.create({
        tenantId: mockTenantId,
        role: 'cfo',
        metricType: 'dollar_exposure',
        thresholdValue: 1000000,
        severity: 'high',
        enabled: true
      });

      const agentOutput = {
        agentType: 'cfo',
        tenantId: mockTenantId,
        data: {
          totalExposure: 1500000,
          mlrImpact: 0.08,
          stopLossExposure: 500000
        }
      };

      const alerts = await thresholdDetector.processAgentOutput(agentOutput);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].metricType).toBe('dollar_exposure');
    });

    it('should extract metrics from CISO agent output', async () => {
      await AlertConfig.create({
        tenantId: mockTenantId,
        role: 'ciso',
        metricType: 'blast_radius',
        thresholdValue: 50,
        severity: 'critical',
        enabled: true
      });

      const agentOutput = {
        agentType: 'ciso',
        tenantId: mockTenantId,
        data: {
          blastRadius: 75,
          riskScore: 85,
          attackPathwayCount: 8
        }
      };

      const alerts = await thresholdDetector.processAgentOutput(agentOutput);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].metricType).toBe('blast_radius');
    });

    it('should extract metrics from Board agent output', async () => {
      await AlertConfig.create({
        tenantId: mockTenantId,
        role: 'board',
        metricType: 'governance',
        thresholdValue: 1,
        severity: 'critical',
        enabled: true
      });

      const agentOutput = {
        agentType: 'board',
        tenantId: mockTenantId,
        data: {
          governanceQuestionsTriggered: 2,
          triggeredQuestions: ['Q1', 'Q2']
        }
      };

      const alerts = await thresholdDetector.processAgentOutput(agentOutput);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].metricType).toBe('governance');
    });
  });

  describe('getCacheStats()', () => {
    it('should return cache statistics', () => {
      const stats = thresholdDetector.getCacheStats();

      expect(stats).toHaveProperty('cooldownCacheSize');
      expect(stats).toHaveProperty('previousValuesSize');
      expect(stats).toHaveProperty('configCacheSize');
      expect(stats).toHaveProperty('configLastRefresh');
    });
  });

  describe('clearCooldown()', () => {
    it('should clear cooldown for specific tenant', async () => {
      await AlertConfig.create({
        tenantId: mockTenantId,
        role: 'cfo',
        metricType: 'dollar_exposure',
        thresholdValue: 1000000,
        severity: 'high',
        enabled: true,
        cooldownMinutes: 60
      });

      // First alert
      const alert1 = await thresholdDetector.evaluate({
        tenantId: mockTenantId,
        role: 'cfo',
        metricType: 'dollar_exposure',
        actualValue: 1500000
      });

      expect(alert1).not.toBeNull();

      // Clear cooldown
      thresholdDetector.clearCooldown(mockTenantId);

      // Second alert should work now
      const alert2 = await thresholdDetector.evaluate({
        tenantId: mockTenantId,
        role: 'cfo',
        metricType: 'dollar_exposure',
        actualValue: 2000000
      });

      expect(alert2).not.toBeNull();
    });
  });
});
