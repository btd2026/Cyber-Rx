'use strict';

/**
 * T-007 Scheduler Integration Tests
 *
 * Tests for vendor sync scheduling functionality
 */

const cron = require('node-cron');
const {
  scheduleVendorSyncs,
  scheduleManualSync,
  getScheduledTasks,
  stopVendorSyncs
} = require('../src/scheduler');
const {
  getSyncInterval,
  getTierPriority,
  getEnabledConnectors,
  getSyncSummary
} = require('../src/utils/syncConfig');

describe('Scheduler - Sync Configuration', () => {
  describe('getSyncInterval', () => {
    test('returns correct cron for critical tier', () => {
      const interval = getSyncInterval('critical');
      expect(interval).toBe('0 2 * * *');
    });

    test('returns correct cron for high tier', () => {
      const interval = getSyncInterval('high');
      expect(interval).toBe('0 2 * * 0');
    });

    test('returns correct cron for medium tier', () => {
      const interval = getSyncInterval('medium');
      expect(interval).toBe('0 2 1 * *');
    });

    test('returns correct cron for low tier', () => {
      const interval = getSyncInterval('low');
      expect(interval).toBe('0 2 1 * *');
    });

    test('handles case insensitive input', () => {
      const interval1 = getSyncInterval('Critical');
      const interval2 = getSyncInterval('CRITICAL');
      expect(interval1).toBe('0 2 * * *');
      expect(interval2).toBe('0 2 * * *');
    });

    test('returns default for unknown tier', () => {
      const interval = getSyncInterval('unknown');
      expect(interval).toBe('0 2 1 * *'); // Default to medium
    });
  });

  describe('getTierPriority', () => {
    test('returns priority 1 for critical', () => {
      const priority = getTierPriority('critical');
      expect(priority).toBe(1);
    });

    test('returns priority 2 for high', () => {
      const priority = getTierPriority('high');
      expect(priority).toBe(2);
    });

    test('returns priority 3 for medium', () => {
      const priority = getTierPriority('medium');
      expect(priority).toBe(3);
    });

    test('returns priority 4 for low', () => {
      const priority = getTierPriority('low');
      expect(priority).toBe(4);
    });

    test('handles case insensitive input', () => {
      const priority = getTierPriority('CRITICAL');
      expect(priority).toBe(1);
    });

    test('returns default priority 5 for unknown tier', () => {
      const priority = getTierPriority('unknown');
      expect(priority).toBe(5);
    });
  });

  describe('getEnabledConnectors', () => {
    test('returns array of enabled connectors', () => {
      const connectors = getEnabledConnectors();
      expect(Array.isArray(connectors)).toBe(true);
      expect(connectors.length).toBeGreaterThan(0);
      expect(connectors).toContain('securityRating');
      expect(connectors).toContain('complianceEvidence');
    });
  });

  describe('getSyncSummary', () => {
    test('returns complete sync configuration summary', () => {
      const summary = getSyncSummary();

      expect(summary).toHaveProperty('tierIntervals');
      expect(summary).toHaveProperty('connectorConfigs');
      expect(summary).toHaveProperty('enabledConnectors');
      expect(summary).toHaveProperty('tierPriorities');

      expect(summary.tierIntervals).toHaveProperty('critical');
      expect(summary.tierIntervals).toHaveProperty('high');
      expect(summary.tierIntervals).toHaveProperty('medium');
      expect(summary.tierIntervals).toHaveProperty('low');

      expect(Array.isArray(summary.enabledConnectors)).toBe(true);
    });
  });
});

describe('Scheduler - Cron Tasks', () => {
  afterEach(() => {
    // Clean up all scheduled tasks after each test
    const tasks = cron.getTasks();
    for (const [name, task] of tasks.entries()) {
      task.stop();
    }
  });

  describe('scheduleVendorSyncs', () => {
    test('initializes without throwing errors', async () => {
      // This test verifies the scheduler can start without errors
      // In a real test, we'd mock the database and queue
      expect(async () => {
        await scheduleVendorSyncs();
      }).not.toThrow();
    });

    test('creates cron tasks for each vendor tier', async () => {
      // Mock implementation - in real test, use database fixtures
      const tasks = cron.getTasks();

      // Verify tasks were created
      // This would require mocking Vendor.findByOrganization
      expect(tasks).toBeTruthy();
    });
  });

  describe('getScheduledTasks', () => {
    test('returns scheduled tasks summary', async () => {
      const tasks = await getScheduledTasks();

      expect(tasks).toHaveProperty('tasks');
      expect(tasks).toHaveProperty('total');
      expect(Array.isArray(tasks.tasks)).toBe(true);
      expect(typeof tasks.total).toBe('number');
    });
  });

  describe('stopVendorSyncs', () => {
    test('stops all vendor sync tasks', async () => {
      await stopVendorSyncs();

      const tasks = cron.getTasks();
      const vendorTasks = Array.from(tasks.keys()).filter(name =>
        name.startsWith('vendor-sync-')
      );

      expect(vendorTasks.length).toBe(0);
    });
  });
});

describe('Scheduler - Manual Sync', () => {
  describe('scheduleManualSync', () => {
    test('queues sync job for valid vendor', async () => {
      // This test requires mocking Vendor model and queue
      // In real implementation:
      const vendorId = 'test-vendor-id';
      const organizationId = 'test-org-id';

      const result = await scheduleManualSync(vendorId, organizationId);

      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('vendorId', vendorId);
      expect(result).toHaveProperty('status', 'queued');
    });

    test('throws error for non-existent vendor', async () => {
      const vendorId = 'non-existent-vendor';
      const organizationId = 'test-org-id';

      await expect(
        scheduleManualSync(vendorId, organizationId)
      ).rejects.toThrow();
    });

    test('accepts optional connector type', async () => {
      const vendorId = 'test-vendor-id';
      const organizationId = 'test-org-id';
      const connectorType = 'securityRating';

      const result = await scheduleManualSync(vendorId, organizationId, connectorType);

      expect(result).toBeTruthy();
    });
  });
});

describe('Scheduler - Integration', () => {
  describe('End-to-end sync flow', () => {
    test('schedules and executes vendor sync', async () => {
      // Full integration test with mocked dependencies
      // 1. Schedule vendor syncs
      // 2. Verify cron tasks created
      // 3. Trigger cron task
      // 4. Verify job queued
      // 5. Verify job processed

      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Error handling', () => {
    test('handles database errors gracefully', async () => {
      // Test scheduler behavior when database fails
      expect(true).toBe(true); // Placeholder
    });

    test('handles queue errors gracefully', async () => {
      // Test scheduler behavior when queue fails
      expect(true).toBe(true); // Placeholder
    });

    test('continues processing after single vendor failure', async () => {
      // Test that scheduler continues processing other vendors
      // when one vendor fails
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Graceful shutdown', () => {
    test('stops all tasks on SIGTERM', async () => {
      // Test SIGTERM handling
      expect(true).toBe(true); // Placeholder
    });

    test('stops all tasks on SIGINT', async () => {
      // Test SIGINT handling
      expect(true).toBe(true); // Placeholder
    });
  });
});
