'use strict';

const crypto = require('crypto');
const { query } = require('../utils/db');

// Generate UUID v4
const uuidv4 = () => crypto.randomUUID();

/**
 * Alert Configuration Model
 *
 * Manages per-tenant, per-role, per-metric alert threshold configurations.
 * Supports multiple notification channels, escalation rules, and hysteresis.
 */
class AlertConfig {
  // Valid roles
  static VALID_ROLES = ['cfo', 'ciso', 'croe', 'clo', 'cio', 'board'];

  // Valid severities
  static VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'];

  // Valid metric types
  static VALID_METRIC_TYPES = [
    'dollar_exposure',
    'blast_radius',
    'risk_score',
    'governance',
    'mlr_impact',
    'stop_loss_exposure',
    'attack_pathway_count',
    'crown_jewel_tier',
    'compliance_breach'
  ];

  // Valid notification channels
  static VALID_CHANNELS = ['email', 'slack', 'teams', 'websocket'];

  /**
   * Create a new alert configuration
   * @param {Object} data - Config data
   * @param {string} [data.configId] - UUID (optional)
   * @param {string} data.tenantId - Tenant ID
   * @param {string} data.role - Executive role
   * @param {string} data.metricType - Metric type
   * @param {number} data.thresholdValue - Threshold value
   * @param {string} data.severity - Alert severity
   * @param {boolean} [data.enabled] - Whether config is enabled
   * @param {number} [data.cooldownMinutes] - Cooldown period in minutes
   * @param {number} [data.hysteresisPercent] - Hysteresis percentage
   * @param {string[]} [data.notificationChannels] - Notification channels
   * @param {string[]} [data.emailRecipients] - Email recipients
   * @param {Object} [data.slackChannels] - Slack channel mappings
   * @param {Object} [data.teamsWebhooks] - Teams webhook URLs
   * @param {Object} [data.escalationRules] - Escalation rules
   * @returns {Promise<Object>} Created config
   */
  static async create(data) {
    const {
      configId = uuidv4(),
      tenantId,
      role,
      metricType,
      thresholdValue,
      severity,
      enabled = true,
      cooldownMinutes = 60,
      hysteresisPercent = 10.0,
      notificationChannels = ['email', 'slack'],
      emailRecipients = [],
      slackChannels = {},
      teamsWebhooks = {},
      escalationRules = {}
    } = data;

    // Validate
    if (!this.VALID_ROLES.includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }

    if (!this.VALID_METRIC_TYPES.includes(metricType)) {
      throw new Error(`Invalid metric type: ${metricType}`);
    }

    if (!this.VALID_SEVERITIES.includes(severity)) {
      throw new Error(`Invalid severity: ${severity}`);
    }

    // Validate notification channels
    const invalidChannels = notificationChannels.filter(c => !this.VALID_CHANNELS.includes(c));
    if (invalidChannels.length > 0) {
      throw new Error(`Invalid channels: ${invalidChannels.join(', ')}`);
    }

    const result = await query(
      `INSERT INTO alert_configs (
        config_id, tenant_id, role, metric_type, threshold_value, severity,
        enabled, cooldown_minutes, hysteresis_percent, notification_channels,
        email_recipients, slack_channels, teams_webhooks, escalation_rules
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (tenant_id, role, metric_type)
      DO UPDATE SET
        threshold_value = EXCLUDED.threshold_value,
        severity = EXCLUDED.severity,
        enabled = EXCLUDED.enabled,
        cooldown_minutes = EXCLUDED.cooldown_minutes,
        hysteresis_percent = EXCLUDED.hysteresis_percent,
        notification_channels = EXCLUDED.notification_channels,
        email_recipients = EXCLUDED.email_recipients,
        slack_channels = EXCLUDED.slack_channels,
        teams_webhooks = EXCLUDED.teams_webhooks,
        escalation_rules = EXCLUDED.escalation_rules,
        updated_at = NOW()
      RETURNING *`,
      [
        configId,
        tenantId,
        role,
        metricType,
        thresholdValue,
        severity,
        enabled,
        cooldownMinutes,
        hysteresisPercent,
        JSON.stringify(notificationChannels),
        JSON.stringify(emailRecipients),
        JSON.stringify(slackChannels),
        JSON.stringify(teamsWebhooks),
        JSON.stringify(escalationRules)
      ]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Find config by ID
   * @param {string} configId - Config ID
   * @returns {Promise<Object|null>} Config or null
   */
  static async findById(configId) {
    const result = await query(
      'SELECT * FROM alert_configs WHERE config_id = $1',
      [configId]
    );

    if (result.length === 0) {
      return null;
    }

    return this._transformFromDb(result[0]);
  }

  /**
   * Find configs by tenant
   * @param {string} tenantId - Tenant ID
   * @param {Object} [filters] - Optional filters
   * @returns {Promise<Object[]>} Array of configs
   */
  static async findByTenant(tenantId, filters = {}) {
    const conditions = ['tenant_id = $1'];
    const params = [tenantId];
    let paramIndex = 2;

    if (filters.role) {
      conditions.push(`role = $${paramIndex++}`);
      params.push(filters.role);
    }

    if (filters.metricType) {
      conditions.push(`metric_type = $${paramIndex++}`);
      params.push(filters.metricType);
    }

    if (filters.enabled !== undefined) {
      conditions.push(`enabled = $${paramIndex++}`);
      params.push(filters.enabled);
    }

    const whereClause = conditions.join(' AND ');

    const result = await query(
      `SELECT * FROM alert_configs WHERE ${whereClause} ORDER BY role, metric_type`,
      params
    );

    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find config by tenant, role, and metric type
   * @param {string} tenantId - Tenant ID
   * @param {string} role - Role
   * @param {string} metricType - Metric type
   * @returns {Promise<Object|null>} Config or null
   */
  static async findByUniqueKey(tenantId, role, metricType) {
    const result = await query(
      `SELECT * FROM alert_configs
       WHERE tenant_id = $1 AND role = $2 AND metric_type = $3`,
      [tenantId, role, metricType]
    );

    if (result.length === 0) {
      return null;
    }

    return this._transformFromDb(result[0]);
  }

  /**
   * Find enabled configs for a tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object[]>} Array of enabled configs
   */
  static async findEnabled(tenantId) {
    const result = await query(
      `SELECT * FROM alert_configs
       WHERE tenant_id = $1 AND enabled = true
       ORDER BY role, metric_type`,
      [tenantId]
    );

    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find configs by role
   * @param {string} tenantId - Tenant ID
   * @param {string} role - Role
   * @returns {Promise<Object[]>} Array of configs
   */
  static async findByRole(tenantId, role) {
    return this.findByTenant(tenantId, { role });
  }

  /**
   * Update config
   * @param {string} configId - Config ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated config
   */
  static async update(configId, updates) {
    const allowedFields = [
      'thresholdValue',
      'severity',
      'enabled',
      'cooldownMinutes',
      'hysteresisPercent',
      'notificationChannels',
      'emailRecipients',
      'slackChannels',
      'teamsWebhooks',
      'escalationRules'
    ];

    const setClauses = [];
    const params = [configId];
    let paramIndex = 2;

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields.includes(key)) {
        continue;
      }

      const dbField = this._camelToSnake(key);
      if (['notificationChannels', 'emailRecipients'].includes(key)) {
        setClauses.push(`${dbField} = $${paramIndex++}::jsonb`);
        params.push(JSON.stringify(value));
      } else if (['slackChannels', 'teamsWebhooks', 'escalationRules'].includes(key)) {
        setClauses.push(`${dbField} = $${paramIndex++}::jsonb`);
        params.push(JSON.stringify(value));
      } else {
        setClauses.push(`${dbField} = $${paramIndex++}`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) {
      throw new Error('No valid fields to update');
    }

    const result = await query(
      `UPDATE alert_configs
       SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE config_id = $1
       RETURNING *`,
      params
    );

    if (result.length === 0) {
      throw new Error('Config not found');
    }

    return this._transformFromDb(result[0]);
  }

  /**
   * Delete config
   * @param {string} configId - Config ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(configId) {
    const result = await query(
      'DELETE FROM alert_configs WHERE config_id = $1 RETURNING config_id',
      [configId]
    );

    return result.length > 0;
  }

  /**
   * Create default configs for a new tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object[]>} Array of created configs
   */
  static async createDefaultsForTenant(tenantId) {
    const defaults = [
      // CFO Defaults
      {
        tenantId,
        role: 'cfo',
        metricType: 'dollar_exposure',
        thresholdValue: 1000000,
        severity: 'high',
        cooldownMinutes: 60,
        hysteresisPercent: 10.0,
        notificationChannels: ['email', 'slack', 'teams']
      },
      {
        tenantId,
        role: 'cfo',
        metricType: 'mlr_impact',
        thresholdValue: 0.05,
        severity: 'high',
        cooldownMinutes: 120,
        hysteresisPercent: 5.0,
        notificationChannels: ['email', 'slack']
      },
      // CISO Defaults
      {
        tenantId,
        role: 'ciso',
        metricType: 'blast_radius',
        thresholdValue: 50,
        severity: 'critical',
        cooldownMinutes: 30,
        hysteresisPercent: 15.0,
        notificationChannels: ['email', 'slack', 'teams']
      },
      {
        tenantId,
        role: 'ciso',
        metricType: 'risk_score',
        thresholdValue: 70,
        severity: 'high',
        cooldownMinutes: 60,
        hysteresisPercent: 10.0,
        notificationChannels: ['email', 'slack']
      },
      {
        tenantId,
        role: 'ciso',
        metricType: 'attack_pathway_count',
        thresholdValue: 5,
        severity: 'high',
        cooldownMinutes: 120,
        hysteresisPercent: 20.0,
        notificationChannels: ['email', 'slack']
      },
      // Board Defaults
      {
        tenantId,
        role: 'board',
        metricType: 'governance',
        thresholdValue: 1,
        severity: 'critical',
        cooldownMinutes: 240,
        hysteresisPercent: 0.0,
        notificationChannels: ['email', 'teams']
      }
    ];

    const configs = [];
    for (const config of defaults) {
      try {
        const created = await this.create(config);
        configs.push(created);
      } catch (error) {
        // Log but continue creating other configs
        console.error(`Failed to create default config: ${error.message}`);
      }
    }

    return configs;
  }

  /**
   * Get all configs as a map for quick lookup
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Map of configs keyed by role_metricType
   */
  static async getLookupMap(tenantId) {
    const configs = await this.findByTenant(tenantId);
    const map = {};

    for (const config of configs) {
      if (!config.enabled) continue;
      const key = `${config.role}_${config.metricType}`;
      map[key] = config;
    }

    return map;
  }

  /**
   * Transform database row to application format
   * @private
   * @param {Object} row - Database row
   * @returns {Object} Transformed config
   */
  static _transformFromDb(row) {
    if (!row) return null;

    return {
      configId: row.config_id,
      tenantId: row.tenant_id,
      role: row.role,
      metricType: row.metric_type,
      thresholdValue: parseFloat(row.threshold_value),
      severity: row.severity,
      enabled: row.enabled,
      cooldownMinutes: row.cooldown_minutes,
      hysteresisPercent: parseFloat(row.hysteresis_percent),
      notificationChannels: row.notification_channels,
      emailRecipients: row.email_recipients,
      slackChannels: row.slack_channels,
      teamsWebhooks: row.teams_webhooks,
      escalationRules: row.escalation_rules,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Convert camelCase to snake_case
   * @private
   * @param {string} str - camelCase string
   * @returns {string} snake_case string
   */
  static _camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

module.exports = AlertConfig;
