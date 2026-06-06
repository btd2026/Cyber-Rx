'use strict';

/**
 * Alerting System Load Tests
 *
 * Performance tests for high-volume alert scenarios
 */

describe('Alerting System Load Tests', () => {
  let thresholdDetector;
  let mockTenantId;

  beforeAll(() => {
    jest.resetModules();
    thresholdDetector = require('../ThresholdDetector');
    mockTenantId = 'load-test-tenant';
  });

  describe('Burst Alert Generation', () => {
    it('should handle 100 alerts in burst', async () => {
      const ExecutiveAlert = require('../../models/ExecutiveAlert');
      const AlertConfig = require('../../models/AlertConfig');

      // Create config
      await AlertConfig.create({
        tenantId: mockTenantId,
        role: 'cfo',
        metricType: 'dollar_exposure',
        thresholdValue: 1000000,
        severity: 'high',
        enabled: true,
        cooldownMinutes: 0 // Disable cooldown for load test
      });

      const startTime = Date.now();

      // Generate 100 alerts
      const alerts = [];
      for (let i = 0; i < 100; i++) {
        const alert = await thresholdDetector.evaluate({
          tenantId: mockTenantId,
          role: 'cfo',
          metricType: 'dollar_exposure',
          actualValue: 1000000 + (i * 100000)
        });

        if (alert) {
          alerts.push(alert);
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(alerts.length).toBe(100);
      expect(duration).toBeLessThan(10000); // Should complete in < 10 seconds

      console.log(`Generated 100 alerts in ${duration}ms (${duration / 100}ms per alert)`);

      // Verify all alerts persisted
      const storedAlerts = await ExecutiveAlert.findByTenant(mockTenantId, {
        limit: 200
      });

      expect(storedAlerts.length).toBeGreaterThanOrEqual(100);
    });

    it('should handle 1000 alert batch evaluation', async () => {
      const AlertConfig = require('../../models/AlertConfig');

      // Create multiple configs
      await AlertConfig.create({
        tenantId: mockTenantId,
        role: 'cfo',
        metricType: 'dollar_exposure',
        thresholdValue: 1000000,
        severity: 'high',
        enabled: true,
        cooldownMinutes: 0
      });

      await AlertConfig.create({
        tenantId: mockTenantId,
        role: 'ciso',
        metricType: 'blast_radius',
        thresholdValue: 50,
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 0
      });

      // Generate 1000 metrics
      const metrics = [];
      for (let i = 0; i < 1000; i++) {
        metrics.push({
          tenantId: mockTenantId,
          role: i % 2 === 0 ? 'cfo' : 'ciso',
          metricType: i % 2 === 0 ? 'dollar_exposure' : 'blast_radius',
          actualValue: i % 2 === 0 ? 1500000 : 75
        });
      }

      const startTime = Date.now();

      const alerts = await thresholdDetector.evaluateBatch(metrics);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(alerts.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(30000); // Should complete in < 30 seconds

      console.log(`Evaluated 1000 metrics in ${duration}ms (${duration / 1000}ms per metric)`);
    });
  });

  describe('Database Query Performance', () => {
    it('should query 1000 alerts efficiently', async () => {
      const ExecutiveAlert = require('../../models/ExecutiveAlert');

      const startTime = Date.now();

      const alerts = await ExecutiveAlert.findByTenant(mockTenantId, {
        limit: 1000
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(alerts).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should query in < 5 seconds

      console.log(`Queried ${alerts.length} alerts in ${duration}ms`);
    });

    it('should aggregate statistics efficiently', async () => {
      const ExecutiveAlert = require('../../models/ExecutiveAlert');

      const startTime = Date.now();

      const stats = await ExecutiveAlert.getStatistics(mockTenantId, 30);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(stats).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should aggregate in < 5 seconds

      console.log(`Aggregated statistics in ${duration}ms`);
    });
  });

  describe('Concurrent Alert Operations', () => {
    it('should handle concurrent alert creation', async () => {
      const ExecutiveAlert = require('../../models/ExecutiveAlert');

      const startTime = Date.now();

      // Create 50 alerts concurrently
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          ExecutiveAlert.create({
            tenantId: mockTenantId,
            role: 'cfo',
            severity: 'high',
            metricType: 'dollar_exposure',
            thresholdValue: 1000000,
            actualValue: 1500000 + (i * 10000)
          })
        );
      }

      const alerts = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(alerts).toHaveLength(50);
      expect(duration).toBeLessThan(10000); // Should complete in < 10 seconds

      console.log(`Created 50 concurrent alerts in ${duration}ms`);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during batch processing', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Process multiple batches
      for (let i = 0; i < 10; i++) {
        const metrics = [];
        for (let j = 0; j < 100; j++) {
          metrics.push({
            tenantId: mockTenantId,
            role: 'cfo',
            metricType: 'dollar_exposure',
            actualValue: 1500000
          });
        }

        await thresholdDetector.evaluateBatch(metrics);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (< 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });
});
