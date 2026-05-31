'use strict';

/**
 * Sync Configuration Utility
 *
 * Defines sync intervals and configurations for vendor tiers and connectors
 * Maps vendor tiers to appropriate sync frequencies using cron expressions
 */

/**
 * Sync interval mappings based on vendor tier
 * Each tier has a recommended sync frequency using cron syntax
 *
 * Cron format: minute hour day month weekday
 * - Daily: Every day at 2 AM
 * - Weekly: Every Sunday at 2 AM
 * - Monthly: 1st of every month at 2 AM
 */
const SYNC_INTERVALS = {
  // Critical vendors: Daily sync at 2 AM
  critical: '0 2 * * *',

  // High vendors: Weekly sync (Sunday 2 AM)
  high: '0 2 * * 0',

  // Medium vendors: Monthly sync (1st at 2 AM)
  medium: '0 2 1 * *',

  // Low vendors: Monthly sync (1st at 2 AM)
  low: '0 2 1 * *'
};

/**
 * Connector-specific sync configurations
 * Override default tier-based intervals with connector-specific settings
 */
const CONNECTOR_SYNC_CONFIG = {
  // Security Rating connectors - daily sync for all tiers
  securityRating: {
    enabled: true,
    defaultInterval: '0 2 * * *', // Daily
    priority: 1 // Highest priority
  },

  // Questionnaire connectors - weekly sync
  questionnaire: {
    enabled: true,
    defaultInterval: '0 2 * * 0', // Weekly
    priority: 3
  },

  // Compliance Evidence connectors - daily sync
  complianceEvidence: {
    enabled: true,
    defaultInterval: '0 2 * * *', // Daily
    priority: 2
  },

  // Asset Inventory connectors - weekly sync
  assetInventory: {
    enabled: true,
    defaultInterval: '0 2 * * 0', // Weekly
    priority: 4
  },

  // Business Impact connectors - monthly sync
  businessImpact: {
    enabled: true,
    defaultInterval: '0 2 1 * *', // Monthly
    priority: 5
  }
};

/**
 * Tier priority mapping for job queue
 * Lower number = higher priority
 */
const TIER_PRIORITY = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4
};

/**
 * Get sync interval for a vendor tier
 * @param {string} tier - Vendor tier
 * @returns {string} Cron expression
 */
function getSyncInterval(tier) {
  const normalizedTier = tier.toLowerCase();
  return SYNC_INTERVALS[normalizedTier] || SYNC_INTERVALS.medium;
}

/**
 * Get sync configuration for a connector type
 * @param {string} connectorType - Connector type
 * @returns {Object|null} Connector configuration
 */
function getConnectorConfig(connectorType) {
  return CONNECTOR_SYNC_CONFIG[connectorType] || null;
}

/**
 * Check if a connector is enabled for sync
 * @param {string} connectorType - Connector type
 * @returns {boolean} True if enabled
 */
function isConnectorEnabled(connectorType) {
  const config = getConnectorConfig(connectorType);
  return config ? config.enabled : false;
}

/**
 * Get priority for a vendor tier
 * @param {string} tier - Vendor tier
 * @returns {number} Priority (1-10, 1=highest)
 */
function getTierPriority(tier) {
  const normalizedTier = tier.toLowerCase();
  return TIER_PRIORITY[normalizedTier] || 5;
}

/**
 * Get all enabled connectors
 * @returns {Array<string>} Array of enabled connector types
 */
function getEnabledConnectors() {
  return Object.entries(CONNECTOR_SYNC_CONFIG)
    .filter(([_, config]) => config.enabled)
    .map(([type, _]) => type);
}

/**
 * Validate cron expression
 * @param {string} cronExpression - Cron expression to validate
 * @returns {boolean} True if valid
 */
function isValidCron(cronExpression) {
  // Basic validation: 5 parts separated by spaces
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  // Each part should be valid cron syntax
  // This is a simplified check - for production use a proper cron validator
  const cronPattern = /^(\*|\d+(-\d+)?(,\d+(-\d+)?)*|\/\d+)$/;

  return parts.every(part => cronPattern.test(part));
}

/**
 * Get next sync time for a given cron expression
 * @param {string} cronExpression - Cron expression
 * @returns {Date} Next scheduled sync time
 */
function getNextSyncTime(cronExpression) {
  // This is a placeholder - in production use a proper cron parser
  // For now, return a reasonable estimate
  const now = new Date();
  const next = new Date(now);

  const parts = cronExpression.split(/\s+/);
  const hour = parseInt(parts[1]) || 2;

  // If it's already past the scheduled time today, schedule for tomorrow
  if (now.getHours() >= hour) {
    next.setDate(next.getDate() + 1);
  }

  next.setHours(hour, 0, 0, 0);

  return next;
}

/**
 * Get sync schedule summary
 * @returns {Object} Summary of sync configurations
 */
function getSyncSummary() {
  return {
    tierIntervals: SYNC_INTERVALS,
    connectorConfigs: CONNECTOR_SYNC_CONFIG,
    enabledConnectors: getEnabledConnectors(),
    tierPriorities: TIER_PRIORITY
  };
}

/**
 * Calculate sync cost (estimate of resources needed)
 * @param {string} tier - Vendor tier
 * @param {string} connectorType - Connector type
 * @returns {number} Cost score (1-10)
 */
function calculateSyncCost(tier, connectorType) {
  const tierScore = getTierPriority(tier);
  const connectorConfig = getConnectorConfig(connectorType);
  const connectorScore = connectorConfig ? connectorConfig.priority : 5;

  // Lower score = higher priority = more critical
  // Cost is inverse of priority
  return Math.min(10, (tierScore + connectorScore) / 2);
}

module.exports = {
  SYNC_INTERVALS,
  CONNECTOR_SYNC_CONFIG,
  TIER_PRIORITY,
  getSyncInterval,
  getConnectorConfig,
  isConnectorEnabled,
  getTierPriority,
  getEnabledConnectors,
  isValidCron,
  getNextSyncTime,
  getSyncSummary,
  calculateSyncCost
};
