'use strict';

/**
 * VendorAlert Model Tests
 *
 * Tests for vendor alert storage, querying, and management
 */

const VendorAlert = require('../../src/models/VendorAlert');

describe('VendorAlert Model', () => {
  // Test data
  const testOrgId = 1;
  const testVendorId = 1;
  const testUserId = 1;

  describe('CRUD Operations', () => {
    test('should create a new alert', async () => {
      const alertData = {
        organizationId: testOrgId,
        vendorId: testVendorId,
        alertType: 'critical_signal',
        severity: 'Critical',
        message: 'Critical ransomware signal detected',
        data: {
          signals: ['ransomware', 'c2_infrastructure'],
          confidence: 95
        }
      };

      const alert = await VendorAlert.create(alertData);

      expect(alert).toBeDefined();
      expect(alert.id).toBeDefined();
      expect(alert.organizationId).toBe(testOrgId);
      expect(alert.vendorId).toBe(testVendorId);
      expect(alert.alertType).toBe('critical_signal');
      expect(alert.severity).toBe('Critical');
      expect(alert.message).toBe('Critical ransomware signal detected');
      expect(alert.data.confidence).toBe(95);
      expect(alert.deliveryStatus).toBe('pending');
      expect(alert.sentAt).toBeNull();
      expect(alert.acknowledgedAt).toBeNull();
    });

    test('should create alert without vendor ID', async () => {
      const alertData = {
        organizationId: testOrgId,
        alertType: 'sync_failure',
        severity: 'High',
        message: 'Sync failed for multiple vendors',
        data: {
          vendors: ['vendor-1', 'vendor-2'],
          error: 'connection_timeout'
        }
      };

      const alert = await VendorAlert.create(alertData);

      expect(alert.vendorId).toBeNull();
      expect(alert.alertType).toBe('sync_failure');
    });

    test('should find alert by ID', async () => {
      const created = await VendorAlert.create({
        organizationId: testOrgId,
        vendorId: testVendorId,
        alertType: 'score_increase',
        severity: 'Medium',
        message: 'Security score increased by 15 points',
        data: { oldScore: 65, newScore: 80 }
      });

      const found = await VendorAlert.findById(created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.message).toBe('Security score increased by 15 points');
    });

    test('should return null when finding non-existent alert', async () => {
      const found = await VendorAlert.findById(99999);
      expect(found).toBeNull();
    });

    test('should update alert delivery status', async () => {
      const alert = await VendorAlert.create({
        organizationId: testOrgId,
        vendorId: testVendorId,
        alertType: 'grade_degradation',
        severity: 'High',
        message: 'Vendor grade degraded from A to B',
        data: { oldGrade: 'A', newGrade: 'B' }
      });

      const sentAt = new Date();
      const updated = await VendorAlert.updateDeliveryStatus(alert.id, 'sent', sentAt);

      expect(updated.deliveryStatus).toBe('sent');
      expect(updated.sentAt).toISOString().toBe(sentAt.toISOString());
    });

    test('should acknowledge alert', async () => {
      const alert = await VendorAlert.create({
        organizationId: testOrgId,
        vendorId: testVendorId,
        alertType: 'multi_provider_confirmed',
        severity: 'Critical',
        message: 'Multiple providers confirmed breach',
        data: { providers: ['crowdstrike', 'mandiant'] }
      });

      const acknowledged = await VendorAlert.acknowledge(alert.id, testUserId);

      expect(acknowledged.acknowledgedAt).toBeDefined();
      expect(acknowledged.data.acknowledgedBy).toBe(testUserId);
    });

    test('should update alert data', async () => {
      const alert = await VendorAlert.create({
        organizationId: testOrgId,
        vendorId: testVendorId,
        alertType: 'critical_signal',
        severity: 'Critical',
        message: 'Initial message',
        data: { initial: true }
      });

      const updated = await VendorAlert.update(alert.id, {
        message: 'Updated message',
        data: { updated: true, additional: 'info' }
      });

      expect(updated.message).toBe('Updated message');
      expect(updated.data.updated).toBe(true);
      expect(updated.data.additional).toBe('info');
    });

    test('should delete alert', async () => {
      const alert = await VendorAlert.create({
        organizationId: testOrgId,
        vendorId: testVendorId,
        alertType: 'sync_failure',
        severity: 'Low',
        message: 'Sync failed, will retry',
        data: {}
      });

      const deleted = await VendorAlert.delete(alert.id);

      expect(deleted).toBe(true);

      const found = await VendorAlert.findById(alert.id);
      expect(found).toBeNull();
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Create test alerts
      await VendorAlert.create({
        organizationId: testOrgId,
        vendorId: testVendorId,
        alertType: 'critical_signal',
        severity: 'Critical',
        message: 'Critical alert 1',
        data: {}
      });

      await VendorAlert.create({
        organizationId: testOrgId,
        vendorId: testVendorId,
        alertType: 'score_increase',
        severity: 'Medium',
        message: 'Score increased',
        data: {}
      });

      await VendorAlert.create({
        organizationId: testOrgId,
        vendorId: testVendorId,
        alertType: 'grade_degradation',
        severity: 'High',
        message: 'Grade degraded',
        data: {}
      });

      await VendorAlert.create({
        organizationId: testOrgId,
        vendorId: testVendorId,
        alertType: 'sync_failure',
        severity: 'Low',
        message: 'Sync failed',
        data: {}
      });
    });

    test('should find all alerts for organization', async () => {
      const alerts = await VendorAlert.findByOrganization(testOrgId);

      expect(alerts).toBeDefined();
      expect(alerts.length).toBeGreaterThanOrEqual(4);
      expect(alerts[0].organizationId).toBe(testOrgId);
    });

    test('should filter alerts by severity', async () => {
      const criticalAlerts = await VendorAlert.findByOrganization(testOrgId, {
        severity: 'Critical'
      });

      expect(criticalAlerts.length).toBe(1);
      expect(criticalAlerts[0].severity).toBe('Critical');
    });

    test('should filter alerts by alert type', async () => {
      const syncFailures = await VendorAlert.findByOrganization(testOrgId, {
        alertType: 'sync_failure'
      });

      expect(syncFailures.length).toBe(1);
      expect(syncFailures[0].alertType).toBe('sync_failure');
    });

    test('should filter alerts by delivery status', async () => {
      const pending = await VendorAlert.findByOrganization(testOrgId, {
        deliveryStatus: 'pending'
      });

      expect(pending.length).toBeGreaterThanOrEqual(4);
      expect(pending.every(a => a.deliveryStatus === 'pending')).toBe(true);
    });

    test('should filter alerts by vendor', async () => {
      const vendorAlerts = await VendorAlert.findByOrganization(testOrgId, {
        vendorId: testVendorId
      });

      expect(vendorAlerts.length).toBeGreaterThanOrEqual(4);
      expect(vendorAlerts.every(a => a.vendorId === testVendorId)).toBe(true);
    });

    test('should paginate results', async () => {
      const page1 = await VendorAlert.findByOrganization(testOrgId, {
        limit: 2,
        offset: 0
      });

      const page2 = await VendorAlert.findByOrganization(testOrgId, {
        limit: 2,
        offset: 2
      });

      expect(page1.length).toBe(2);
      expect(page2.length).toBe(2);
      expect(page1[0].id).not.toBe(page2[0].id);
    });

    test('should find alerts by severity', async () => {
      const highAlerts = await VendorAlert.findBySeverity('High', testOrgId);

      expect(highAlerts.length).toBe(1);
      expect(highAlerts[0].severity).toBe('High');
    });

    test('should find alerts by alert type', async () => {
      const criticalSignals = await VendorAlert.findByType('critical_signal', testOrgId);

      expect(criticalSignals.length).toBe(1);
      expect(criticalSignals[0].alertType).toBe('critical_signal');
    });

    test('should find alerts by vendor', async () => {
      const vendorAlerts = await VendorAlert.findByVendor(testVendorId);

      expect(vendorAlerts.length).toBeGreaterThanOrEqual(4);
      expect(vendorAlerts.every(a => a.vendorId === testVendorId)).toBe(true);
    });

    test('should find pending alerts', async () => {
      const pending = await VendorAlert.findPending();

      expect(pending.length).toBeGreaterThan(0);
      expect(pending.every(a => a.deliveryStatus === 'pending')).toBe(true);
    });
  });

  describe('Statistics and Aggregation', () => {
    beforeEach(async () => {
      await VendorAlert.create({
        organizationId: testOrgId,
        vendorId: testVendorId,
        alertType: 'critical_signal',
        severity: 'Critical',
        message: 'Critical',
        data: {}
      });

      await VendorAlert.create({
        organizationId: testOrgId,
        vendorId: testVendorId,
        alertType: 'score_increase',
        severity: 'High',
        message: 'High',
        data: {}
      });

      await VendorAlert.create({
        organizationId: testOrgId,
        vendorId: testVendorId,
        alertType: 'grade_degradation',
        severity: 'High',
        message: 'High 2',
        data: {}
      });

      await VendorAlert.create({
        organizationId: testOrgId,
        vendorId: testVendorId,
        alertType: 'sync_failure',
        severity: 'Medium',
        message: 'Medium',
        data: {}
      });

      await VendorAlert.create({
        organizationId: testOrgId,
        vendorId: testVendorId,
        alertType: 'sync_failure',
        severity: 'Low',
        message: 'Low',
        data: {}
      });

      await VendorAlert.create({
        organizationId: testOrgId,
        vendorId: testVendorId,
        alertType: 'sync_failure',
        severity: 'Info',
        message: 'Info',
        data: {}
      });
    });

    test('should get alert statistics', async () => {
      const stats = await VendorAlert.getStats(testOrgId, 30);

      expect(stats.total).toBe(6);
      expect(stats.critical).toBe(1);
      expect(stats.high).toBe(2);
      expect(stats.medium).toBe(1);
      expect(stats.low).toBe(1);
      expect(stats.info).toBe(1);
    });

    test('should get recent alerts with vendor names', async () => {
      const alerts = await VendorAlert.getRecentWithVendors(testOrgId, 10, 0);

      expect(alerts).toBeDefined();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0]).toHaveProperty('id');
      expect(alerts[0]).toHaveProperty('alertType');
      expect(alerts[0]).toHaveProperty('severity');
      expect(alerts[0]).toHaveProperty('vendorName');
    });
  });

  describe('Constraints and Validation', () => {
    test('should accept valid alert types', async () => {
      const validTypes = [
        'critical_signal',
        'score_increase',
        'grade_degradation',
        'sync_failure',
        'multi_provider_confirmed'
      ];

      for (const type of validTypes) {
        const alert = await VendorAlert.create({
          organizationId: testOrgId,
          vendorId: testVendorId,
          alertType: type,
          severity: 'Medium',
          message: `Test alert for ${type}`,
          data: {}
        });
        expect(alert.alertType).toBe(type);
      }
    });

    test('should accept valid severity levels', async () => {
      const validSeverities = ['Critical', 'High', 'Medium', 'Low', 'Info'];

      for (const severity of validSeverities) {
        const alert = await VendorAlert.create({
          organizationId: testOrgId,
          vendorId: testVendorId,
          alertType: 'critical_signal',
          severity,
          message: `Test alert for ${severity}`,
          data: {}
        });
        expect(alert.severity).toBe(severity);
      }
    });

    test('should accept valid delivery statuses', async () => {
      const alert = await VendorAlert.create({
        organizationId: testOrgId,
        vendorId: testVendorId,
        alertType: 'critical_signal',
        severity: 'Critical',
        message: 'Test',
        data: {}
      });

      const validStatuses = ['pending', 'sent', 'failed'];

      for (const status of validStatuses) {
        const updated = await VendorAlert.updateDeliveryStatus(alert.id, status);
        expect(updated.deliveryStatus).toBe(status);
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty data object', async () => {
      const alert = await VendorAlert.create({
        organizationId: testOrgId,
        vendorId: testVendorId,
        alertType: 'sync_failure',
        severity: 'Low',
        message: 'Test',
        data: {}
      });

      expect(alert.data).toBeDefined();
      expect(Object.keys(alert.data).length).toBe(0);
    });

    test('should handle complex data objects', async () => {
      const complexData = {
        signals: ['ransomware', 'phishing', 'data_breach'],
        confidence: 95,
        sources: [
          { name: 'CrowdStrike', severity: 'Critical', timestamp: '2025-01-31T10:00:00Z' },
          { name: 'Mandiant', severity: 'High', timestamp: '2025-01-31T10:05:00Z' }
        ],
        affectedSystems: ['email', 'file_sharing', 'vpn'],
        recommendations: ['isolate_system', 'rotate_credentials', 'review_logs']
      };

      const alert = await VendorAlert.create({
        organizationId: testOrgId,
        vendorId: testVendorId,
        alertType: 'multi_provider_confirmed',
        severity: 'Critical',
        message: 'Multiple threats confirmed',
        data: complexData
      });

      expect(alert.data.sources.length).toBe(2);
      expect(alert.data.affectedSystems.length).toBe(3);
    });

    test('should handle long messages', async () => {
      const longMessage = 'A'.repeat(5000);

      const alert = await VendorAlert.create({
        organizationId: testOrgId,
        vendorId: testVendorId,
        alertType: 'sync_failure',
        severity: 'Medium',
        message: longMessage,
        data: {}
      });

      expect(alert.message.length).toBe(5000);
    });

    test('should handle null vendor ID', async () => {
      const alert = await VendorAlert.create({
        organizationId: testOrgId,
        vendorId: null,
        alertType: 'sync_failure',
        severity: 'Medium',
        message: 'System-level alert',
        data: {}
      });

      expect(alert.vendorId).toBeNull();
    });
  });

  describe('Performance', () => {
    test('should handle multiple concurrent creates', async () => {
      const promises = [];
      const count = 100;

      for (let i = 0; i < count; i++) {
        promises.push(
          VendorAlert.create({
            organizationId: testOrgId,
            vendorId: testVendorId,
            alertType: 'sync_failure',
            severity: 'Low',
            message: `Concurrent alert ${i}`,
            data: { index: i }
          })
        );
      }

      const alerts = await Promise.all(promises);

      expect(alerts.length).toBe(count);
      expect(alerts.every(a => a.id)).toBe(true);
    });

    test('should query with indexes efficiently', async () => {
      // Create test data
      for (let i = 0; i < 50; i++) {
        await VendorAlert.create({
          organizationId: testOrgId,
          vendorId: testVendorId,
          alertType: ['critical_signal', 'score_increase', 'grade_degradation'][i % 3],
          severity: ['Critical', 'High', 'Medium', 'Low'][i % 4],
          message: `Performance test ${i}`,
          data: { index: i }
        });
      }

      const startTime = Date.now();
      const alerts = await VendorAlert.findByOrganization(testOrgId, {
        severity: 'High',
        limit: 20
      });
      const duration = Date.now() - startTime;

      expect(alerts.length).toBeLessThanOrEqual(20);
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });
});
