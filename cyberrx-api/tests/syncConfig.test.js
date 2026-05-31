'use strict';

/**
 * T-007 Sync Configuration Unit Tests
 *
 * Pure unit tests for sync configuration (no database required)
 */

const {
  SYNC_INTERVALS,
  CONNECTOR_SYNC_CONFIG,
  TIER_PRIORITY,
  getSyncInterval,
  getConnectorConfig,
  isConnectorEnabled,
  getTierPriority,
  getEnabledConnectors,
  isValidCron,
  getSyncSummary,
  calculateSyncCost
} = require('../src/utils/syncConfig');

describe('Sync Configuration - Intervals', () => {
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
      expect(getSyncInterval('Critical')).toBe('0 2 * * *');
      expect(getSyncInterval('CRITICAL')).toBe('0 2 * * *');
      expect(getSyncInterval('High')).toBe('0 2 * * 0');
    });

    test('returns default for unknown tier', () => {
      const interval = getSyncInterval('unknown');
      expect(interval).toBe('0 2 1 * *'); // Default to medium
    });
  });

  describe('SYNC_INTERVALS constant', () => {
    test('has all required tiers', () => {
      expect(SYNC_INTERVALS).toHaveProperty('critical');
      expect(SYNC_INTERVALS).toHaveProperty('high');
      expect(SYNC_INTERVALS).toHaveProperty('medium');
      expect(SYNC_INTERVALS).toHaveProperty('low');
    });

    test('has valid cron expressions', () => {
      Object.values(SYNC_INTERVALS).forEach(interval => {
        expect(isValidCron(interval)).toBe(true);
      });
    });
  });
});

describe('Sync Configuration - Priority', () => {
  describe('getTierPriority', () => {
    test('returns priority 1 for critical', () => {
      expect(getTierPriority('critical')).toBe(1);
    });

    test('returns priority 2 for high', () => {
      expect(getTierPriority('high')).toBe(2);
    });

    test('returns priority 3 for medium', () => {
      expect(getTierPriority('medium')).toBe(3);
    });

    test('returns priority 4 for low', () => {
      expect(getTierPriority('low')).toBe(4);
    });

    test('handles case insensitive input', () => {
      expect(getTierPriority('CRITICAL')).toBe(1);
      expect(getTierPriority('High')).toBe(2);
    });

    test('returns default priority 5 for unknown tier', () => {
      expect(getTierPriority('unknown')).toBe(5);
    });
  });

  describe('TIER_PRIORITY constant', () => {
    test('has all required tiers', () => {
      expect(TIER_PRIORITY).toHaveProperty('critical');
      expect(TIER_PRIORITY).toHaveProperty('high');
      expect(TIER_PRIORITY).toHaveProperty('medium');
      expect(TIER_PRIORITY).toHaveProperty('low');
    });

    test('priorities are sequential', () => {
      expect(TIER_PRIORITY.critical).toBeLessThan(TIER_PRIORITY.high);
      expect(TIER_PRIORITY.high).toBeLessThan(TIER_PRIORITY.medium);
      expect(TIER_PRIORITY.medium).toBeLessThan(TIER_PRIORITY.low);
    });
  });
});

describe('Sync Configuration - Connectors', () => {
  describe('getConnectorConfig', () => {
    test('returns config for valid connector', () => {
      const config = getConnectorConfig('securityRating');
      expect(config).toBeTruthy();
      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('defaultInterval');
      expect(config).toHaveProperty('priority');
    });

    test('returns null for invalid connector', () => {
      const config = getConnectorConfig('invalidConnector');
      expect(config).toBeNull();
    });

    test('securityRating config is daily with priority 1', () => {
      const config = getConnectorConfig('securityRating');
      expect(config.defaultInterval).toBe('0 2 * * *');
      expect(config.priority).toBe(1);
      expect(config.enabled).toBe(true);
    });

    test('questionnaire config is weekly with priority 3', () => {
      const config = getConnectorConfig('questionnaire');
      expect(config.defaultInterval).toBe('0 2 * * 0');
      expect(config.priority).toBe(3);
      expect(config.enabled).toBe(true);
    });
  });

  describe('isConnectorEnabled', () => {
    test('returns true for enabled connectors', () => {
      expect(isConnectorEnabled('securityRating')).toBe(true);
      expect(isConnectorEnabled('complianceEvidence')).toBe(true);
      expect(isConnectorEnabled('questionnaire')).toBe(true);
    });

    test('returns false for disabled connectors', () => {
      expect(isConnectorEnabled('invalidConnector')).toBe(false);
    });
  });

  describe('getEnabledConnectors', () => {
    test('returns array of enabled connectors', () => {
      const connectors = getEnabledConnectors();
      expect(Array.isArray(connectors)).toBe(true);
      expect(connectors.length).toBeGreaterThan(0);
    });

    test('includes all expected connectors', () => {
      const connectors = getEnabledConnectors();
      expect(connectors).toContain('securityRating');
      expect(connectors).toContain('complianceEvidence');
      expect(connectors).toContain('questionnaire');
      expect(connectors).toContain('assetInventory');
      expect(connectors).toContain('businessImpact');
    });

    test('only returns enabled connectors', () => {
      const connectors = getEnabledConnectors();
      connectors.forEach(connector => {
        const config = getConnectorConfig(connector);
        expect(config.enabled).toBe(true);
      });
    });
  });

  describe('CONNECTOR_SYNC_CONFIG constant', () => {
    test('has all required connectors', () => {
      expect(CONNECTOR_SYNC_CONFIG).toHaveProperty('securityRating');
      expect(CONNECTOR_SYNC_CONFIG).toHaveProperty('questionnaire');
      expect(CONNECTOR_SYNC_CONFIG).toHaveProperty('complianceEvidence');
      expect(CONNECTOR_SYNC_CONFIG).toHaveProperty('assetInventory');
      expect(CONNECTOR_SYNC_CONFIG).toHaveProperty('businessImpact');
    });

    test('all connector configs have required fields', () => {
      Object.values(CONNECTOR_SYNC_CONFIG).forEach(config => {
        expect(config).toHaveProperty('enabled');
        expect(config).toHaveProperty('defaultInterval');
        expect(config).toHaveProperty('priority');
      });
    });
  });
});

describe('Sync Configuration - Utilities', () => {
  describe('isValidCron', () => {
    test('validates correct cron expressions', () => {
      expect(isValidCron('0 2 * * *')).toBe(true); // Daily
      expect(isValidCron('0 2 * * 0')).toBe(true); // Weekly
      expect(isValidCron('0 2 1 * *')).toBe(true); // Monthly
      expect(isValidCron('*/5 * * * *')).toBe(true); // Every 5 minutes
      expect(isValidCron('0 0 12 * * *')).toBe(true); // Daily at noon (6-part)
    });

    test('rejects invalid cron expressions', () => {
      expect(isValidCron('invalid')).toBe(false);
      expect(isValidCron('0 2 *')).toBe(false); // Too few parts
      expect(isValidCron('0 2 * * * *')).toBe(false); // Too many parts
      expect(isValidCron('')).toBe(false);
    });
  });

  describe('getSyncSummary', () => {
    test('returns complete sync configuration summary', () => {
      const summary = getSyncSummary();

      expect(summary).toHaveProperty('tierIntervals');
      expect(summary).toHaveProperty('connectorConfigs');
      expect(summary).toHaveProperty('enabledConnectors');
      expect(summary).toHaveProperty('tierPriorities');
    });

    test('summary contains correct data', () => {
      const summary = getSyncSummary();

      expect(summary.tierIntervals).toEqual(SYNC_INTERVALS);
      expect(summary.connectorConfigs).toEqual(CONNECTOR_SYNC_CONFIG);
      expect(summary.enabledConnectors).toEqual(getEnabledConnectors());
      expect(summary.tierPriorities).toEqual(TIER_PRIORITY);
    });
  });

  describe('calculateSyncCost', () => {
    test('calculates cost for critical vendor', () => {
      const cost = calculateSyncCost('critical', 'securityRating');
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThanOrEqual(10);
    });

    test('calculates cost for low vendor', () => {
      const cost = calculateSyncCost('low', 'businessImpact');
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThanOrEqual(10);
    });

    test('higher priority (lower number) increases cost', () => {
      const criticalCost = calculateSyncCost('critical', 'securityRating');
      const lowCost = calculateSyncCost('low', 'businessImpact');
      expect(criticalCost).toBeLessThan(lowCost);
    });

    test('handles unknown connector type', () => {
      const cost = calculateSyncCost('medium', 'unknown');
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThanOrEqual(10);
    });
  });
});

describe('Sync Configuration - Edge Cases', () => {
  test('handles null and undefined inputs gracefully', () => {
    expect(() => getSyncInterval(null)).not.toThrow();
    expect(() => getTierPriority(undefined)).not.toThrow();
    expect(() => calculateSyncCost('critical', null)).not.toThrow();
  });

  test('handles empty string inputs', () => {
    const interval = getSyncInterval('');
    expect(interval).toBe('0 2 1 * *'); // Default to medium
  });

  test('handles special characters in tier names', () => {
    expect(() => getSyncInterval('Critical-V2')).not.toThrow();
    expect(() => getTierPriority('High_2')).not.toThrow();
  });
});

describe('Sync Configuration - Integration', () => {
  test('all tier intervals are valid cron expressions', () => {
    Object.values(SYNC_INTERVALS).forEach(interval => {
      expect(isValidCron(interval)).toBe(true);
    });
  });

  test('all connector intervals are valid cron expressions', () => {
    Object.values(CONNECTOR_SYNC_CONFIG).forEach(config => {
      expect(isValidCron(config.defaultInterval)).toBe(true);
    });
  });

  test('sync summary is complete and accurate', () => {
    const summary = getSyncSummary();

    // Verify all tiers are present
    Object.keys(SYNC_INTERVALS).forEach(tier => {
      expect(summary.tierIntervals).toHaveProperty(tier);
    });

    // Verify all connectors are present
    Object.keys(CONNECTOR_SYNC_CONFIG).forEach(connector => {
      expect(summary.connectorConfigs).toHaveProperty(connector);
    });

    // Verify all enabled connectors are in the list
    summary.enabledConnectors.forEach(connector => {
      expect(summary.connectorConfigs[connector].enabled).toBe(true);
    });
  });
});
