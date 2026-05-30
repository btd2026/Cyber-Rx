'use strict';

const { query } = require('../utils/db');

/**
 * VendorRiskSignal Model
 *
 * Represents continuous monitoring signals collected from external vendor risk services.
 * Supports 12 connector types with signal correlation and risk scoring.
 */
class VendorRiskSignal {
  // Valid severities
  static VALID_SEVERITIES = ['Critical', 'High', 'Medium', 'Low', 'Info'];

  // Valid statuses
  static VALID_STATUSES = ['active', 'mitigated', 'false_positive', 'under_review'];

  // Valid source types
  static VALID_SOURCE_TYPES = ['api', 'webhook', 'file_upload', 'manual', 'web_scrape'];

  // Valid signal categories
  static VALID_SIGNAL_CATEGORIES = [
    'External Attack Surface',
    'Breach/Incident Intelligence',
    'Dark Web/Credential Exposure',
    'Regulatory Breach Disclosure',
    'Compliance Evidence',
    'Questionnaire/Attestation',
    'Fourth-Party Risk',
    'Policy Drift',
    'Business Criticality'
  ];

  /**
   * Create a new vendor risk signal
   * @param {Object} data - Signal data
   * @param {string} data.id - UUID
   * @param {string} data.organizationId - Organization ID
   * @param {string} data.vendorId - Vendor ID
   * @param {string} data.vendorName - Vendor name
   * @param {string} data.sourceName - Source name (e.g., SecurityScorecard, BitSight)
   * @param {string} data.sourceType - Source type: api, webhook, file_upload, manual, web_scrape
   * @param {string} data.signalCategory - Signal category
   * @param {string} data.signalName - Signal name/title
   * @param {string} data.severity - Severity: Critical, High, Medium, Low, Info
   * @param {number} [data.confidence] - Confidence score (0-100)
   * @param {Date} data.observedAt - When signal was observed
   * @param {string} [data.status] - Status: active, mitigated, false_positive, under_review
   * @param {string} [data.evidenceUrl] - URL to evidence
   * @param {string} [data.description] - Signal description
   * @param {string} [data.recommendedAction] - Recommended remediation action
   * @param {string[]} [data.mappedFrameworks] - Mapped compliance frameworks
   * @param {string[]} [data.mappedPolicies] - Mapped internal policies
   * @param {Object} [data.rawData] - Raw data from source
   * @returns {Promise<Object>} Created signal
   */
  static async create(data) {
    const {
      id,
      organizationId,
      vendorId,
      vendorName,
      sourceName,
      sourceType,
      signalCategory,
      signalName,
      severity,
      confidence = null,
      observedAt,
      status = 'active',
      evidenceUrl = null,
      description = null,
      recommendedAction = null,
      mappedFrameworks = [],
      mappedPolicies = [],
      rawData = {}
    } = data;

    // Validate
    if (!this.VALID_SEVERITIES.includes(severity)) {
      throw new Error(`Invalid severity: ${severity}`);
    }
    if (!this.VALID_STATUSES.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    if (!this.VALID_SOURCE_TYPES.includes(sourceType)) {
      throw new Error(`Invalid source type: ${sourceType}`);
    }
    if (!this.VALID_SIGNAL_CATEGORIES.includes(signalCategory)) {
      throw new Error(`Invalid signal category: ${signalCategory}`);
    }
    if (confidence !== null && (confidence < 0 || confidence > 100)) {
      throw new Error(`Invalid confidence: ${confidence}. Must be 0-100`);
    }

    const result = await query(
      `INSERT INTO vendor_risk_signals (
        id, organization_id, vendor_id, vendor_name,
        source_name, source_type, signal_category, signal_name,
        severity, confidence, observed_at, status,
        evidence_url, description, recommended_action,
        mapped_frameworks, mapped_policies, raw_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        id, organizationId, vendorId, vendorName,
        sourceName, sourceType, signalCategory, signalName,
        severity, confidence, observedAt, status,
        evidenceUrl, description, recommendedAction,
        JSON.stringify(mappedFrameworks),
        JSON.stringify(mappedPolicies),
        JSON.stringify(rawData)
      ]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Find signal by ID
   * @param {string} id - Signal ID
   * @returns {Promise<Object|null>} Signal or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM vendor_risk_signals WHERE id = $1',
      [id]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Find all signals for a vendor
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of signals
   */
  static async findByVendor(vendorId, organizationId) {
    const result = await query(
      `SELECT * FROM vendor_risk_signals
       WHERE organization_id = $1 AND vendor_id = $2
       ORDER BY observed_at DESC`,
      [organizationId, vendorId]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find all signals for an organization with optional filters
   * @param {string} organizationId - Organization ID
   * @param {Object} [options] - Query options
   * @param {string} [options.vendorId] - Filter by vendor ID
   * @param {string} [options.sourceName] - Filter by source name
   * @param {string} [options.signalCategory] - Filter by signal category
   * @param {string} [options.severity] - Filter by severity
   * @param {string} [options.status] - Filter by status
   * @param {number} [options.limit] - Limit results
   * @returns {Promise<Array>} Array of signals
   */
  static async findByOrganization(organizationId, options = {}) {
    let sql = 'SELECT * FROM vendor_risk_signals WHERE organization_id = $1';
    const params = [organizationId];
    let paramCount = 2;

    if (options.vendorId) {
      sql += ` AND vendor_id = $${paramCount}`;
      params.push(options.vendorId);
      paramCount++;
    }

    if (options.sourceName) {
      sql += ` AND source_name = $${paramCount}`;
      params.push(options.sourceName);
      paramCount++;
    }

    if (options.signalCategory) {
      sql += ` AND signal_category = $${paramCount}`;
      params.push(options.signalCategory);
      paramCount++;
    }

    if (options.severity) {
      sql += ` AND severity = $${paramCount}`;
      params.push(options.severity);
      paramCount++;
    }

    if (options.status) {
      sql += ` AND status = $${paramCount}`;
      params.push(options.status);
      paramCount++;
    }

    sql += ' ORDER BY observed_at DESC';

    if (options.limit) {
      sql += ` LIMIT $${paramCount}`;
      params.push(options.limit);
    }

    const result = await query(sql, params);
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find signals by source name
   * @param {string} sourceName - Source name (e.g., SecurityScorecard)
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of signals
   */
  static async findBySource(sourceName, organizationId) {
    const result = await query(
      `SELECT * FROM vendor_risk_signals
       WHERE organization_id = $1 AND source_name = $2
       ORDER BY observed_at DESC`,
      [organizationId, sourceName]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find active unmitigated signals for a vendor
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of active signals
   */
  static async findActiveByVendor(vendorId, organizationId) {
    const result = await query(
      `SELECT * FROM vendor_risk_signals
       WHERE organization_id = $1
       AND vendor_id = $2
       AND status = 'active'
       ORDER BY severity DESC, observed_at DESC`,
      [organizationId, vendorId]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Update signal
   * @param {string} id - Signal ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated signal
   */
  static async update(id, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'vendorName', 'sourceName', 'sourceType', 'signalCategory',
      'signalName', 'severity', 'confidence', 'observedAt', 'status',
      'evidenceUrl', 'description', 'recommendedAction',
      'mappedFrameworks', 'mappedPolicies', 'rawData'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        const dbField = this._camelToSnake(field);
        if (Array.isArray(data[field]) || typeof data[field] === 'object') {
          updates.push(`${dbField} = $${paramCount}`);
          values.push(JSON.stringify(data[field]));
        } else {
          updates.push(`${dbField} = $${paramCount}`);
          values.push(data[field]);
        }
        paramCount++;
      }
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const result = await query(
      `UPDATE vendor_risk_signals SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Delete signal
   * @param {string} id - Signal ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const result = await query('DELETE FROM vendor_risk_signals WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  /**
   * Get signal category summary for organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of category summaries
   */
  static async getSignalCategories(organizationId) {
    const result = await query(
      `SELECT
        signal_category,
        COUNT(*) as total_signals,
        COUNT(*) FILTER (WHERE severity = 'Critical') as critical_count,
        COUNT(*) FILTER (WHERE severity = 'High') as high_count,
        COUNT(*) FILTER (WHERE status = 'active') as active_count
       FROM vendor_risk_signals
       WHERE organization_id = $1
       GROUP BY signal_category
       ORDER BY critical_count DESC, high_count DESC`,
      [organizationId]
    );

    return result.map(row => ({
      category: row.signal_category,
      totalSignals: parseInt(row.total_signals),
      criticalCount: parseInt(row.critical_count),
      highCount: parseInt(row.high_count),
      activeCount: parseInt(row.active_count)
    }));
  }

  /**
   * Get aggregated vendor signal summary
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Vendor signal summary
   */
  static async getVendorSignalSummary(vendorId, organizationId) {
    const result = await query(
      `SELECT
        COUNT(*) as total_signals,
        COUNT(*) FILTER (WHERE severity = 'Critical') as critical_count,
        COUNT(*) FILTER (WHERE severity = 'High') as high_count,
        COUNT(*) FILTER (WHERE severity = 'Medium') as medium_count,
        COUNT(*) FILTER (WHERE severity = 'Low') as low_count,
        COUNT(*) FILTER (WHERE status = 'active') as active_count,
        COUNT(*) FILTER (WHERE status = 'mitigated') as mitigated_count,
        MAX(observed_at) as latest_signal
       FROM vendor_risk_signals
       WHERE organization_id = $1 AND vendor_id = $2`,
      [organizationId, vendorId]
    );

    const row = result[0];
    return {
      totalSignals: parseInt(row.total_signals),
      criticalCount: parseInt(row.critical_count),
      highCount: parseInt(row.high_count),
      mediumCount: parseInt(row.medium_count),
      lowCount: parseInt(row.low_count),
      activeCount: parseInt(row.active_count),
      mitigatedCount: parseInt(row.mitigated_count),
      latestSignal: row.latest_signal
    };
  }

  /**
   * Transform database row to camelCase model
   * @private
   */
  static _transformFromDb(row) {
    if (!row) return null;
    return {
      id: row.id,
      organizationId: row.organization_id,
      vendorId: row.vendor_id,
      vendorName: row.vendor_name,
      sourceName: row.source_name,
      sourceType: row.source_type,
      signalCategory: row.signal_category,
      signalName: row.signal_name,
      severity: row.severity,
      confidence: row.confidence,
      observedAt: row.observed_at,
      status: row.status,
      evidenceUrl: row.evidence_url,
      description: row.description,
      recommendedAction: row.recommended_action,
      mappedFrameworks: row.mapped_frameworks || [],
      mappedPolicies: row.mapped_policies || [],
      rawData: row.raw_data || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Convert camelCase to snake_case
   * @private
   */
  static _camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

module.exports = VendorRiskSignal;
