'use strict';

const ExecutiveAlert = require('../../models/ExecutiveAlert');
const AlertConfig = require('../../models/AlertConfig');
const logger = require('../../utils/logger');

/**
 * Threshold Breach Detection Service
 *
 * Monitors agent outputs for threshold violations across all agents (CFO, CISO, Board).
 * Supports configurable thresholds, hysteresis to prevent flapping, and cooldown periods.
 */
class ThresholdDetector {
  constructor() {
    // Cooldown tracking: { tenantId_role_metricType: lastAlertTimestamp }
    this.cooldownCache = new Map();

    // Previous values for hysteresis: { tenantId_role_metricType: previousValue }
    this.previousValues = new Map();

    // Config cache: { tenantId: { role_metricType: config } }
    this.configCache = new Map();

    // Cache expiry (5 minutes)
    this.cacheExpiry = 5 * 60 * 1000;
    this.configLastRefresh = 0;

    // Initialize config cache
    this.refreshConfigs();
  }

  /**
   * Refresh config cache from database
   */
  async refreshConfigs() {
    try {
      // Get all tenants with enabled configs
      // For now, we'll load configs on-demand per tenant
      this.configLastRefresh = Date.now();
      logger.info('Threshold detector config cache refreshed');
    } catch (error) {
      logger.error('Failed to refresh config cache', { error: error.message });
    }
  }

  /**
   * Get configs for a tenant (with caching)
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Config lookup map
   */
  async getTenantConfigs(tenantId) {
    const now = Date.now();

    // Check if cache needs refresh
    if (!this.configCache.has(tenantId) ||
        (now - this.configLastRefresh) > this.cacheExpiry) {
      const configs = await AlertConfig.getLookupMap(tenantId);
      this.configCache.set(tenantId, configs);
      this.configLastRefresh = now;
    }

    return this.configCache.get(tenantId) || {};
  }

  /**
   * Evaluate a metric value against thresholds
   * @param {Object} params - Evaluation parameters
   * @param {string} params.tenantId - Tenant ID
   * @param {string} params.role - Executive role
   * @param {string} params.metricType - Metric type
   * @param {number} params.actualValue - Actual metric value
   * @param {Object} [params.context] - Additional context data
   * @returns {Promise<Object|null>} Alert if threshold breached, null otherwise
   */
  async evaluate({ tenantId, role, metricType, actualValue, context = {} }) {
    try {
      // Get configuration for this tenant/role/metric
      const configs = await this.getTenantConfigs(tenantId);
      const configKey = `${role}_${metricType}`;
      const config = configs[configKey];

      // If no config or disabled, skip evaluation
      if (!config || !config.enabled) {
        logger.debug('No config found or disabled', { tenantId, role, metricType });
        return null;
      }

      // Check cooldown period
      const cooldownKey = `${tenantId}_${configKey}`;
      const lastAlertTime = this.cooldownCache.get(cooldownKey);
      const cooldownMs = config.cooldownMinutes * 60 * 1000;

      if (lastAlertTime && (Date.now() - lastAlertTime) < cooldownMs) {
        logger.debug('Alert in cooldown period', { tenantId, role, metricType });
        return null;
      }

      // Get previous value for hysteresis
      const previousValue = this.previousValues.get(cooldownKey) || actualValue;

      // Calculate threshold with hysteresis
      const hysteresisMultiplier = 1 - (config.hysteresisPercent / 100);
      const effectiveThreshold = config.thresholdValue * hysteresisMultiplier;

      // Check if threshold is breached
      const isBreach = this._checkThreshold(
        metricType,
        actualValue,
        effectiveThreshold,
        previousValue
      );

      if (!isBreach) {
        // Update previous value even if no breach
        this.previousValues.set(cooldownKey, actualValue);
        return null;
      }

      // Threshold breached! Create alert
      const alert = await this._createAlert({
        config,
        tenantId,
        actualValue,
        previousValue,
        context
      });

      // Update cooldown cache
      this.cooldownCache.set(cooldownKey, Date.now());

      // Update previous value
      this.previousValues.set(cooldownKey, actualValue);

      logger.info('Threshold breach detected', {
        alertId: alert.alertId,
        tenantId,
        role,
        metricType,
        actualValue,
        threshold: config.thresholdValue
      });

      return alert;
    } catch (error) {
      logger.error('Failed to evaluate threshold', {
        error: error.message,
        tenantId,
        role,
        metricType
      });
      throw error;
    }
  }

  /**
   * Check if threshold is breached with hysteresis
   * @private
   * @param {string} metricType - Metric type
   * @param {number} actualValue - Actual value
   * @param {number} threshold - Threshold value
   * @param {number} previousValue - Previous value
   * @returns {boolean} True if threshold breached
   */
  _checkThreshold(metricType, actualValue, threshold, previousValue) {
    // For metrics where higher is worse (exposure, risk, blast radius)
    const higherIsWorse = [
      'dollar_exposure',
      'blast_radius',
      'risk_score',
      'mlr_impact',
      'stop_loss_exposure',
      'attack_pathway_count',
      'compliance_breach'
    ].includes(metricType);

    if (higherIsWorse) {
      // Breach if current value exceeds threshold
      // AND we're not in hysteresis zone (previous value was also high)
      const currentlyExceeds = actualValue > threshold;
      const previouslyExceeded = previousValue > threshold;

      // Alert if:
      // - Currently exceeds AND either:
      //   - Previous didn't exceed (new breach)
      //   - Current is significantly higher than previous (escalating)
      return currentlyExceeds && (!previouslyExceeded || actualValue > previousValue * 1.1);
    } else {
      // For metrics where lower is worse (grades, scores)
      const currentlyBelow = actualValue < threshold;
      const previouslyBelow = previousValue < threshold;

      return currentlyBelow && (!previouslyBelow || actualValue < previousValue * 0.9);
    }
  }

  /**
   * Create alert from threshold breach
   * @private
   * @param {Object} params - Alert creation parameters
   * @returns {Promise<Object>} Created alert
   */
  async _createAlert({ config, tenantId, actualValue, previousValue, context }) {
    const alertData = {
      tenantId,
      role: config.role,
      severity: config.severity,
      metricType: config.metricType,
      thresholdValue: config.thresholdValue,
      actualValue,
      contextData: {
        previousValue,
        changePercent: previousValue > 0
          ? ((actualValue - previousValue) / previousValue * 100).toFixed(2)
          : null,
        breachAmount: actualValue - config.thresholdValue,
        breachPercent: config.thresholdValue > 0
          ? ((actualValue - config.thresholdValue) / config.thresholdValue * 100).toFixed(2)
          : null,
        ...context
      }
    };

    return await ExecutiveAlert.create(alertData);
  }

  /**
   * Evaluate multiple metrics at once
   * @param {Object[]} metrics - Array of metric evaluations
   * @returns {Promise<Object[]>} Array of triggered alerts
   */
  async evaluateBatch(metrics) {
    const alerts = [];
    const errors = [];

    for (const metric of metrics) {
      try {
        const alert = await this.evaluate(metric);
        if (alert) {
          alerts.push(alert);
        }
      } catch (error) {
        errors.push({
          metric,
          error: error.message
        });
      }
    }

    if (errors.length > 0) {
      logger.warn('Some metric evaluations failed', {
        errorCount: errors.length,
        totalMetrics: metrics.length
      });
    }

    return alerts;
  }

  /**
   * Process agent output and extract metrics
   * @param {Object} agentOutput - Agent output data
   * @returns {Promise<Object[]>} Array of triggered alerts
   */
  async processAgentOutput(agentOutput) {
    const { agentType, tenantId, data } = agentOutput;

    // Extract metrics based on agent type
    const metrics = this._extractMetrics(agentType, tenantId, data);

    // Evaluate all metrics
    return await this.evaluateBatch(metrics);
  }

  /**
   * Extract metrics from agent output
   * @private
   * @param {string} agentType - Agent type
   * @param {string} tenantId - Tenant ID
   * @param {Object} data - Agent output data
   * @returns {Object[]} Array of metric evaluations
   */
  _extractMetrics(agentType, tenantId, data) {
    const metrics = [];

    switch (agentType) {
      case 'cfo':
        // Extract CFO metrics
        if (data.totalExposure !== undefined) {
          metrics.push({
            tenantId,
            role: 'cfo',
            metricType: 'dollar_exposure',
            actualValue: data.totalExposure,
            context: { source: 'cfo_agent', currency: 'USD' }
          });
        }

        if (data.mlrImpact !== undefined) {
          metrics.push({
            tenantId,
            role: 'cfo',
            metricType: 'mlr_impact',
            actualValue: data.mlrImpact,
            context: { source: 'cfo_agent', format: 'percentage' }
          });
        }

        if (data.stopLossExposure !== undefined) {
          metrics.push({
            tenantId,
            role: 'cfo',
            metricType: 'stop_loss_exposure',
            actualValue: data.stopLossExposure,
            context: { source: 'cfo_agent', currency: 'USD' }
          });
        }

        break;

      case 'ciso':
        // Extract CISO metrics
        if (data.blastRadius !== undefined) {
          metrics.push({
            tenantId,
            role: 'ciso',
            metricType: 'blast_radius',
            actualValue: data.blastRadius,
            context: { source: 'ciso_agent', unit: 'systems' }
          });
        }

        if (data.riskScore !== undefined) {
          metrics.push({
            tenantId,
            role: 'ciso',
            metricType: 'risk_score',
            actualValue: data.riskScore,
            context: { source: 'ciso_agent', scale: '0-100' }
          });
        }

        if (data.attackPathwayCount !== undefined) {
          metrics.push({
            tenantId,
            role: 'ciso',
            metricType: 'attack_pathway_count',
            actualValue: data.attackPathwayCount,
            context: { source: 'ciso_agent' }
          });
        }

        break;

      case 'board':
        // Extract Board metrics
        if (data.governanceQuestionsTriggered !== undefined) {
          metrics.push({
            tenantId,
            role: 'board',
            metricType: 'governance',
            actualValue: data.governanceQuestionsTriggered,
            context: { source: 'board_agent', questions: data.triggeredQuestions || [] }
          });
        }

        if (data.crownJewelTier !== undefined) {
          metrics.push({
            tenantId,
            role: 'ciso',
            metricType: 'crown_jewel_tier',
            actualValue: data.crownJewelTier,
            context: { source: 'board_agent', tier: data.crownJewelTier }
          });
        }

        break;

      default:
        logger.warn('Unknown agent type', { agentType });
    }

    return metrics;
  }

  /**
   * Clear cooldown cache (useful for testing)
   * @param {string} [tenantId] - Optional tenant ID to clear
   */
  clearCooldown(tenantId = null) {
    if (tenantId) {
      // Clear all cooldowns for this tenant
      for (const key of this.cooldownCache.keys()) {
        if (key.startsWith(`${tenantId}_`)) {
          this.cooldownCache.delete(key);
        }
      }
    } else {
      // Clear all cooldowns
      this.cooldownCache.clear();
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return {
      cooldownCacheSize: this.cooldownCache.size,
      previousValuesSize: this.previousValues.size,
      configCacheSize: this.configCache.size,
      configLastRefresh: new Date(this.configLastRefresh).toISOString()
    };
  }
}

// Singleton instance
const thresholdDetector = new ThresholdDetector();

module.exports = thresholdDetector;
