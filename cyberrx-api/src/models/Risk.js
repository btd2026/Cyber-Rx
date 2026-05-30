'use strict';

const { query } = require('../utils/db');

/**
 * Risk Model
 *
 * Represents security risks with correlation linkage to business processes,
 * data objects, threat scenarios, financial impact, legal obligations, and owners
 */
class Risk {
  // Valid severities
  static VALID_SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];

  // Valid statuses
  static VALID_STATUSES = ['open', 'mitigating', 'accepted', 'closed'];

  /**
   * Create a new risk
   * @param {Object} data - Risk data
   * @param {string} data.id - UUID
   * @param {string} data.title - Risk title
   * @param {string} data.severity - Severity: Critical, High, Medium, Low
   * @param {string} data.status - Status: open, mitigating, accepted, closed
   * @param {string} data.organizationId - Organization ID
   * @param {string} [data.findingId] - Related finding ID
   * @param {string} [data.assetId] - Related asset ID
   * @param {string} [data.applicationId] - Related application ID
   * @param {string} [data.vendorId] - Related vendor ID
   * @param {string[]} [data.businessProcessIds] - Business process IDs
   * @param {string[]} [data.dataObjectIds] - Data object IDs
   * @param {string} [data.threatScenarioId] - Threat scenario ID
   * @param {string[]} [data.frameworkMappings] - Framework mappings (NIST, HIPAA, CIS)
   * @param {number} [data.financialExposure] - Financial exposure amount
   * @param {number} [data.costToRemediate] - Cost to remediate
   * @param {string[]} [data.legalObligationIds] - Legal obligation IDs
   * @param {string} [data.regulatoryCitation] - Regulatory citation
   * @param {string} [data.executiveOwner] - Executive owner (role or user ID)
   * @param {string} [data.remediationOwner] - Remediation owner
   * @param {string} [data.evidenceOwner] - Evidence owner
   * @param {string} [data.auditEvidenceRequired] - Audit evidence requirements
   * @param {string[]} [data.auditTestIds] - Audit test IDs
   * @param {string} [data.description] - Risk description
   * @param {string} [data.likelihood] - Likelihood score
   * @returns {Promise<Object>} Created risk
   */
  static async create(data) {
    const {
      id,
      title,
      severity,
      status,
      organizationId,
      findingId = null,
      assetId = null,
      applicationId = null,
      vendorId = null,
      businessProcessIds = [],
      dataObjectIds = [],
      threatScenarioId = null,
      frameworkMappings = [],
      financialExposure = null,
      costToRemediate = null,
      legalObligationIds = [],
      regulatoryCitation = null,
      executiveOwner = null,
      remediationOwner = null,
      evidenceOwner = null,
      auditEvidenceRequired = null,
      auditTestIds = [],
      description = null,
      likelihood = null
    } = data;

    // Validate
    if (!this.VALID_SEVERITIES.includes(severity)) {
      throw new Error(`Invalid severity: ${severity}`);
    }
    if (!this.VALID_STATUSES.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    const result = await query(
      `INSERT INTO risks (
        id, title, severity, status, organization_id,
        finding_id, asset_id, application_id, vendor_id,
        business_process_ids, data_object_ids, threat_scenario_id,
        framework_mappings, financial_exposure, cost_to_remediate,
        legal_obligation_ids, regulatory_citation,
        executive_owner, remediation_owner, evidence_owner,
        audit_evidence_required, audit_test_ids,
        description, likelihood
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING *`,
      [
        id, title, severity, status, organizationId,
        findingId, assetId, applicationId, vendorId,
        JSON.stringify(businessProcessIds),
        JSON.stringify(dataObjectIds),
        threatScenarioId,
        JSON.stringify(frameworkMappings),
        financialExposure,
        costToRemediate,
        JSON.stringify(legalObligationIds),
        regulatoryCitation,
        executiveOwner,
        remediationOwner,
        evidenceOwner,
        auditEvidenceRequired,
        JSON.stringify(auditTestIds),
        description,
        likelihood
      ]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Find risk by ID
   * @param {string} id - Risk ID
   * @returns {Promise<Object|null>} Risk or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM risks WHERE id = $1',
      [id]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Find all risks for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} [options] - Query options
   * @param {string} [options.severity] - Filter by severity
   * @param {string} [options.status] - Filter by status
   * @param {string} [options.businessProcessId] - Filter by business process ID
   * @returns {Promise<Array>} Array of risks
   */
  static async findByOrganization(organizationId, options = {}) {
    let sql = 'SELECT * FROM risks WHERE organization_id = $1';
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

    sql += ' ORDER BY severity DESC, created_at DESC';

    const result = await query(sql, params);
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Update risk
   * @param {string} id - Risk ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated risk
   */
  static async update(id, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'title', 'severity', 'status', 'findingId', 'assetId',
      'applicationId', 'vendorId', 'businessProcessIds', 'dataObjectIds',
      'threatScenarioId', 'frameworkMappings', 'financialExposure',
      'costToRemediate', 'legalObligationIds', 'regulatoryCitation',
      'executiveOwner', 'remediationOwner', 'evidenceOwner',
      'auditEvidenceRequired', 'auditTestIds', 'description', 'likelihood'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        const dbField = this._camelToSnake(field);
        if (Array.isArray(data[field])) {
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
      `UPDATE risks SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Delete risk
   * @param {string} id - Risk ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const result = await query('DELETE FROM risks WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  /**
   * Find risks by business process ID
   * @param {string} businessProcessId - Business process ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of risks
   */
  static async findByBusinessProcessId(businessProcessId, organizationId) {
    const result = await query(
      `SELECT * FROM risks
       WHERE organization_id = $1
       AND business_process_ids @> $2::jsonb
       ORDER BY severity DESC, created_at DESC`,
      [organizationId, JSON.stringify([businessProcessId])]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find risks by asset ID
   * @param {string} assetId - Asset ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of risks
   */
  static async findByAssetId(assetId, organizationId) {
    const result = await query(
      `SELECT * FROM risks
       WHERE organization_id = $1 AND asset_id = $2
       ORDER BY severity DESC, created_at DESC`,
      [organizationId, assetId]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find risks by threat scenario ID
   * @param {string} threatScenarioId - Threat scenario ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of risks
   */
  static async findByThreatScenarioId(threatScenarioId, organizationId) {
    const result = await query(
      `SELECT * FROM risks
       WHERE organization_id = $1 AND threat_scenario_id = $2
       ORDER BY severity DESC, created_at DESC`,
      [organizationId, threatScenarioId]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find risks by legal obligation
   * @param {string} legalObligationId - Legal obligation ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of risks
   */
  static async findByLegalObligationId(legalObligationId, organizationId) {
    const result = await query(
      `SELECT * FROM risks
       WHERE organization_id = $1
       AND legal_obligation_ids @> $2::jsonb
       ORDER BY severity DESC, created_at DESC`,
      [organizationId, JSON.stringify([legalObligationId])]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Get risks with high financial exposure
   * @param {string} organizationId - Organization ID
   * @param {number} [minExposure] - Minimum exposure (default 100000)
   * @returns {Promise<Array>} Array of risks
   */
  static async getHighFinancialExposure(organizationId, minExposure = 100000) {
    const result = await query(
      `SELECT * FROM risks
       WHERE organization_id = $1
       AND COALESCE(financial_exposure, 0) >= $2
       ORDER BY financial_exposure DESC NULLS LAST, severity DESC`,
      [organizationId, minExposure]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Get risks by executive owner
   * @param {string} executiveOwner - Executive owner ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of risks
   */
  static async findByExecutiveOwner(executiveOwner, organizationId) {
    const result = await query(
      `SELECT * FROM risks
       WHERE organization_id = $1 AND executive_owner = $2
       ORDER BY severity DESC, created_at DESC`,
      [organizationId, executiveOwner]
    );
    return result.map(row => this._transformFromDb(row));
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
      severity: row.severity,
      status: row.status,
      organizationId: row.organization_id,
      findingId: row.finding_id,
      assetId: row.asset_id,
      applicationId: row.application_id,
      vendorId: row.vendor_id,
      businessProcessIds: row.business_process_ids || [],
      dataObjectIds: row.data_object_ids || [],
      threatScenarioId: row.threat_scenario_id,
      frameworkMappings: row.framework_mappings || [],
      financialExposure: row.financial_exposure,
      costToRemediate: row.cost_to_remediate,
      legalObligationIds: row.legal_obligation_ids || [],
      regulatoryCitation: row.regulatory_citation,
      executiveOwner: row.executive_owner,
      remediationOwner: row.remediation_owner,
      evidenceOwner: row.evidence_owner,
      auditEvidenceRequired: row.audit_evidence_required,
      auditTestIds: row.audit_test_ids || [],
      description: row.description,
      likelihood: row.likelihood,
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

module.exports = Risk;
