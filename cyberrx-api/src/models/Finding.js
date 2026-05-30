'use strict';

const { query } = require('../utils/db');

/**
 * Finding Model
 *
 * Represents security findings with correlation linkage to risks,
 * assets, applications, and business processes
 * Supports repeat detection
 */
class Finding {
  // Valid severities
  static VALID_SEVERITIES = ['Critical', 'High', 'Medium', 'Low', 'Info'];

  // Valid statuses
  static VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed', 'false_positive', 'risk_accepted'];

  /**
   * Create a new finding
   * @param {Object} data - Finding data
   * @param {string} data.id - UUID
   * @param {string} data.title - Finding title
   * @param {string} [data.description] - Finding description
   * @param {string} data.severity - Severity
   * @param {string} data.status - Status
   * @param {string} data.organizationId - Organization ID
   * @param {Date|string} data.discoveredDate - When discovered
   * @param {string} [data.riskId] - Related risk ID
   * @param {string} [data.assetId] - Related asset ID
   * @param {string} [data.applicationId] - Related application ID
   * @param {string} [data.businessProcessId] - Related business process ID
   * @param {boolean} [data.isRepeat] - Whether this is a repeat finding
   * @param {string} [data.originalFindingId] - Original finding ID if repeat
   * @param {number} [data.repeatCount] - Number of times this finding has repeated
   * @param {string} [data.remediationPlan] - Remediation plan
   * @param {Date|string} [data.targetDate] - Target resolution date
   * @param {string} [data.owner] - Finding owner
   * @param {string} [data.source] - Source of finding (scanner, manual, etc.)
   * @param {string} [data.sourceRef] - Source reference ID
   * @param {string} [data.tool] - Tool that generated finding
   * @param {Object} [data.metadata] - Additional metadata
   * @returns {Promise<Object>} Created finding
   */
  static async create(data) {
    const {
      id,
      title,
      description = null,
      severity,
      status,
      organizationId,
      discoveredDate,
      riskId = null,
      assetId = null,
      applicationId = null,
      businessProcessId = null,
      isRepeat = false,
      originalFindingId = null,
      repeatCount = 0,
      remediationPlan = null,
      targetDate = null,
      owner = null,
      source = null,
      sourceRef = null,
      tool = null,
      metadata = null
    } = data;

    // Validate
    if (!this.VALID_SEVERITIES.includes(severity)) {
      throw new Error(`Invalid severity: ${severity}`);
    }
    if (!this.VALID_STATUSES.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    const result = await query(
      `INSERT INTO findings (
        id, title, description, severity, status, organization_id,
        discovered_date, risk_id, asset_id, application_id, business_process_id,
        is_repeat, original_finding_id, repeat_count,
        remediation_plan, target_date, owner,
        source, source_ref, tool, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        id, title, description, severity, status, organizationId,
        discoveredDate, riskId, assetId, applicationId, businessProcessId,
        isRepeat, originalFindingId, repeatCount,
        remediationPlan, targetDate, owner,
        source, sourceRef, tool,
        metadata ? JSON.stringify(metadata) : null
      ]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Find finding by ID
   * @param {string} id - Finding ID
   * @returns {Promise<Object|null>} Finding or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM findings WHERE id = $1',
      [id]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Find all findings for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} [options] - Query options
   * @param {string} [options.severity] - Filter by severity
   * @param {string} [options.status] - Filter by status
   * @param {string} [options.assetId] - Filter by asset ID
   * @param {string} [options.businessProcessId] - Filter by business process ID
   * @param {boolean} [options.isRepeat] - Filter by repeat status
   * @returns {Promise<Array>} Array of findings
   */
  static async findByOrganization(organizationId, options = {}) {
    let sql = 'SELECT * FROM findings WHERE organization_id = $1';
    const params = [organizationId];
    let paramCount = 2;

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

    if (options.assetId) {
      sql += ` AND asset_id = $${paramCount}`;
      params.push(options.assetId);
      paramCount++;
    }

    if (options.businessProcessId) {
      sql += ` AND business_process_id = $${paramCount}`;
      params.push(options.businessProcessId);
      paramCount++;
    }

    if (options.isRepeat !== undefined) {
      sql += ` AND is_repeat = $${paramCount}`;
      params.push(options.isRepeat);
      paramCount++;
    }

    sql += ' ORDER BY severity DESC, discovered_date DESC';

    const result = await query(sql, params);
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Update finding
   * @param {string} id - Finding ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated finding
   */
  static async update(id, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'title', 'description', 'severity', 'status', 'discoveredDate',
      'riskId', 'assetId', 'applicationId', 'businessProcessId',
      'isRepeat', 'originalFindingId', 'repeatCount',
      'remediationPlan', 'targetDate', 'owner',
      'source', 'sourceRef', 'tool', 'metadata'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        const dbField = this._camelToSnake(field);
        if (field === 'metadata' && data[field] !== null) {
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
      `UPDATE findings SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Delete finding
   * @param {string} id - Finding ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const result = await query('DELETE FROM findings WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  /**
   * Find findings by risk ID
   * @param {string} riskId - Risk ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of findings
   */
  static async findByRiskId(riskId, organizationId) {
    const result = await query(
      `SELECT * FROM findings
       WHERE organization_id = $1 AND risk_id = $2
       ORDER BY discovered_date DESC`,
      [organizationId, riskId]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find findings by asset ID
   * @param {string} assetId - Asset ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of findings
   */
  static async findByAssetId(assetId, organizationId) {
    const result = await query(
      `SELECT * FROM findings
       WHERE organization_id = $1 AND asset_id = $2
       ORDER BY discovered_date DESC`,
      [organizationId, assetId]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find findings by business process ID
   * @param {string} businessProcessId - Business process ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of findings
   */
  static async findByBusinessProcessId(businessProcessId, organizationId) {
    const result = await query(
      `SELECT * FROM findings
       WHERE organization_id = $1 AND business_process_id = $2
       ORDER BY discovered_date DESC`,
      [organizationId, businessProcessId]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find repeat findings
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of repeat findings
   */
  static async findRepeats(organizationId) {
    const result = await query(
      `SELECT * FROM findings
       WHERE organization_id = $1 AND is_repeat = true
       ORDER BY repeat_count DESC, discovered_date DESC`,
      [organizationId]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Check for existing similar finding (for repeat detection)
   * @param {Object} params - Finding parameters to check
   * @param {string} params.organizationId - Organization ID
   * @param {string} params.title - Finding title
   * @param {string} [params.assetId] - Asset ID
   * @param {string} [params.tool] - Tool name
   * @returns {Promise<Object|null>} Similar finding or null
   */
  static async findSimilar({ organizationId, title, assetId, tool }) {
    let sql = `
      SELECT * FROM findings
      WHERE organization_id = $1
      AND title % $2
      AND status NOT IN ('closed', 'resolved', 'false_positive', 'risk_accepted')
    `;
    const params = [organizationId, title];
    let paramCount = 3;

    if (assetId) {
      sql += ` AND asset_id = $${paramCount}`;
      params.push(assetId);
      paramCount++;
    }

    if (tool) {
      sql += ` AND tool = $${paramCount}`;
      params.push(tool);
      paramCount++;
    }

    sql += ' ORDER BY discovered_date DESC LIMIT 5';

    const result = await query(sql, params);
    return result.length > 0 ? result.map(row => this._transformFromDb(row)) : null;
  }

  /**
   * Update finding as repeat
   * @param {string} id - Finding ID
   * @param {string} originalFindingId - Original finding ID
   * @returns {Promise<Object>} Updated finding
   */
  static async markAsRepeat(id, originalFindingId) {
    // First, increment repeat count on original
    await query(
      `UPDATE findings SET repeat_count = COALESCE(repeat_count, 0) + 1 WHERE id = $1`,
      [originalFindingId]
    );

    // Then mark current as repeat
    const result = await query(
      `UPDATE findings
       SET is_repeat = true, original_finding_id = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, originalFindingId]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Get finding statistics
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Statistics
   */
  static async getStatistics(organizationId) {
    const result = await query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE severity = 'Critical') as critical_count,
         COUNT(*) FILTER (WHERE severity = 'High') as high_count,
         COUNT(*) FILTER (WHERE severity = 'Medium') as medium_count,
         COUNT(*) FILTER (WHERE severity = 'Low') as low_count,
         COUNT(*) FILTER (WHERE is_repeat = true) as repeat_count,
         COUNT(*) FILTER (WHERE status = 'open') as open_count,
         COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count
       FROM findings
       WHERE organization_id = $1`,
      [organizationId]
    );

    const stats = result[0];
    return {
      total: parseInt(stats.total),
      criticalCount: parseInt(stats.critical_count),
      highCount: parseInt(stats.high_count),
      mediumCount: parseInt(stats.medium_count),
      lowCount: parseInt(stats.low_count),
      repeatCount: parseInt(stats.repeat_count),
      openCount: parseInt(stats.open_count),
      resolvedCount: parseInt(stats.resolved_count)
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
      title: row.title,
      description: row.description,
      severity: row.severity,
      status: row.status,
      organizationId: row.organization_id,
      discoveredDate: row.discovered_date,
      riskId: row.risk_id,
      assetId: row.asset_id,
      applicationId: row.application_id,
      businessProcessId: row.business_process_id,
      isRepeat: row.is_repeat,
      originalFindingId: row.original_finding_id,
      repeatCount: row.repeat_count,
      remediationPlan: row.remediation_plan,
      targetDate: row.target_date,
      owner: row.owner,
      source: row.source,
      sourceRef: row.source_ref,
      tool: row.tool,
      metadata: row.metadata,
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

module.exports = Finding;
