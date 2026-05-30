'use strict';

const { query } = require('../utils/db');

/**
 * ThreatScenario Model
 *
 * Represents threat scenarios (ransomware, phishing, insider, supply chain, misconfig)
 * Critical gap filled - enables threat-to-risk-to-regulatory mapping
 */
class ThreatScenario {
  /**
   * Create a new threat scenario
   * @param {Object} data - Threat scenario data
   * @param {string} data.id - UUID
   * @param {string} data.name - Threat scenario name
   * @param {string} data.type - Threat type: 'ransomware', 'phishing', 'insider', 'supply_chain', 'misconfig'
   * @param {string} data.organizationId - Organization ID
   * @param {number} [data.probability] - Probability score (0-100)
   * @param {string} [data.impactLevel] - Impact level: 'Critical', 'High', 'Medium', 'Low'
   * @param {string} [data.description] - Threat description
   * @param {string[]} [data.mitreTechnique] - MITRE ATT&CK technique IDs (e.g., ['T1486'])
   * @param {string[]} [data.exploitedRisks] - Risk IDs where this threat applies
   * @param {string} [data.mitreTactic] - MITRE ATT&CK tactic
   * @param {string} [data.mitigationStrategy] - Recommended mitigation strategy
   * @returns {Promise<Object>} Created threat scenario
   */
  static async create(data) {
    const {
      id,
      name,
      type,
      organizationId,
      probability = null,
      impactLevel = null,
      description = null,
      mitreTechnique = [],
      exploitedRisks = [],
      mitreTactic = null,
      mitigationStrategy = null
    } = data;

    const result = await query(
      `INSERT INTO threat_scenarios (
        id, name, type, organization_id, probability, impact_level, description,
        mitre_technique, exploited_risks, mitre_tactic, mitigation_strategy
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        id, name, type, organizationId, probability, impactLevel, description,
        JSON.stringify(mitreTechnique),
        JSON.stringify(exploitedRisks),
        mitreTactic, mitigationStrategy
      ]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Find threat scenario by ID
   * @param {string} id - Threat scenario ID
   * @returns {Promise<Object|null>} Threat scenario or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM threat_scenarios WHERE id = $1',
      [id]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Find all threat scenarios for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} [options] - Query options
   * @param {string} [options.type] - Filter by threat type
   * @returns {Promise<Array>} Array of threat scenarios
   */
  static async findByOrganization(organizationId, options = {}) {
    let sql = 'SELECT * FROM threat_scenarios WHERE organization_id = $1';
    const params = [organizationId];

    if (options.type) {
      sql += ' AND type = $2';
      params.push(options.type);
    }

    sql += ' ORDER BY probability DESC NULLS LAST, impact_level DESC, name ASC';

    const result = await query(sql, params);
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Update threat scenario
   * @param {string} id - Threat scenario ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated threat scenario
   */
  static async update(id, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'name', 'type', 'probability', 'impactLevel', 'description',
      'mitreTechnique', 'exploitedRisks', 'mitreTactic', 'mitigationStrategy'
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
      `UPDATE threat_scenarios SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Delete threat scenario
   * @param {string} id - Threat scenario ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const result = await query('DELETE FROM threat_scenarios WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  /**
   * Find threat scenarios by risk ID
   * @param {string} riskId - Risk ID
   * @returns {Promise<Array>} Array of threat scenarios
   */
  static async findByRiskId(riskId) {
    const result = await query(
      "SELECT * FROM threat_scenarios WHERE exploited_risks @> $1::jsonb",
      [JSON.stringify([riskId])]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Get high-probability threat scenarios
   * @param {string} organizationId - Organization ID
   * @param {number} [minProbability] - Minimum probability (default 70)
   * @returns {Promise<Array>} Array of high-probability threat scenarios
   */
  static async getHighProbabilityThreats(organizationId, minProbability = 70) {
    const result = await query(
      `SELECT * FROM threat_scenarios
       WHERE organization_id = $1
       AND probability >= $2
       ORDER BY probability DESC, impact_level DESC`,
      [organizationId, minProbability]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find by MITRE technique
   * @param {string} techniqueId - MITRE technique ID (e.g., 'T1486')
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of threat scenarios
   */
  static async findByMitreTechnique(techniqueId, organizationId) {
    const result = await query(
      `SELECT * FROM threat_scenarios
       WHERE organization_id = $1
       AND mitre_technique @> $2::jsonb`,
      [organizationId, JSON.stringify([techniqueId])]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Get threat scenarios with risk analysis
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of threat scenarios with calculated risk scores
   */
  static async getWithRiskAnalysis(organizationId) {
    const result = await query(
      `SELECT
         id, name, type, probability, impact_level, description,
         mitre_technique, exploited_risks, mitre_tactic, mitigation_strategy,
         CASE
           WHEN probability IS NOT NULL AND impact_level IS NOT NULL THEN
             CASE impact_level
               WHEN 'Critical' THEN probability * 1.5
               WHEN 'High' THEN probability * 1.2
               WHEN 'Medium' THEN probability
               WHEN 'Low' THEN probability * 0.7
             END
           ELSE NULL
         END as calculated_risk_score
       FROM threat_scenarios
       WHERE organization_id = $1
       ORDER BY calculated_risk_score DESC NULLS LAST, probability DESC`,
      [organizationId]
    );

    return result.map(row => ({
      ...this._transformFromDb(row),
      calculatedRiskScore: row.calculated_risk_score
    }));
  }

  /**
   * Transform database row to camelCase model
   * @private
   */
  static _transformFromDb(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      organizationId: row.organization_id,
      probability: row.probability,
      impactLevel: row.impact_level,
      description: row.description,
      mitreTechnique: row.mitre_technique || [],
      exploitedRisks: row.exploited_risks || [],
      mitreTactic: row.mitre_tactic,
      mitigationStrategy: row.mitigation_strategy,
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

module.exports = ThreatScenario;
