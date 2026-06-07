'use strict';

const { query } = require('../utils/db');

/**
 * ProcessImpactAnalysis Model
 *
 * Stores blast radius and impact analysis results
 * Integrates with blast radius analyzer from T-MVP-005
 */
class ProcessImpactAnalysis {
  /**
   * Create a new impact analysis
   * @param {Object} data - Analysis data
   * @param {string} data.id - UUID
   * @param {string} data.organizationId - Organization ID
   * @param {string} data.processId - Process ID
   * @param {string} data.scenario - Impact scenario
   * @param {Array} [data.blastRadiusProcesses] - Affected processes
   * @param {Array} [data.blastRadiusSystems] - Affected systems
   * @param {Object} [data.upstreamImpact] - Upstream impact details
   * @param {Object} [data.downstreamImpact] - Downstream impact details
   * @param {number} [data.financialImpact] - Financial impact
   * @param {number} [data.operationalImpactScore] - Operational impact score (0-1)
   * @param {Array} [data.singlePointsOfFailure] - Single points of failure
   * @param {Array} [data.cascadePathways] - Cascade pathways
   * @param {Object} [data.analysisMetadata] - Analysis metadata
   * @returns {Promise<Object>} Created analysis
   */
  static async create(data) {
    const {
      id,
      organizationId,
      processId,
      scenario,
      blastRadiusProcesses = [],
      blastRadiusSystems = [],
      upstreamImpact = {},
      downstreamImpact = {},
      financialImpact = 0,
      operationalImpactScore = 0,
      singlePointsOfFailure = [],
      cascadePathways = [],
      analysisMetadata = {}
    } = data;

    const result = await query(
      `INSERT INTO process_impact_analysis (
        id, organization_id, process_id, scenario, blast_radius_processes,
        blast_radius_systems, upstream_impact, downstream_impact,
        financial_impact, operational_impact_score, single_points_of_failure,
        cascade_pathways, analysis_metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        id, organizationId, processId, scenario,
        JSON.stringify(blastRadiusProcesses),
        JSON.stringify(blastRadiusSystems),
        JSON.stringify(upstreamImpact),
        JSON.stringify(downstreamImpact),
        financialImpact,
        operationalImpactScore,
        JSON.stringify(singlePointsOfFailure),
        JSON.stringify(cascadePathways),
        JSON.stringify(analysisMetadata)
      ]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Find analysis by ID
   * @param {string} id - Analysis ID
   * @returns {Promise<Object|null>} Analysis or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM process_impact_analysis WHERE id = $1',
      [id]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Find analyses by process
   * @param {string} organizationId - Organization ID
   * @param {string} processId - Process ID
   * @returns {Promise<Array>} Array of analyses
   */
  static async findByProcess(organizationId, processId) {
    const result = await query(
      `SELECT * FROM process_impact_analysis
       WHERE organization_id = $1 AND process_id = $2
       ORDER BY created_at DESC`,
      [organizationId, processId]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find analysis by scenario
   * @param {string} organizationId - Organization ID
   * @param {string} scenario - Scenario name
   * @returns {Promise<Array>} Array of analyses
   */
  static async findByScenario(organizationId, scenario) {
    const result = await query(
      `SELECT * FROM process_impact_analysis
       WHERE organization_id = $1 AND scenario = $2
       ORDER BY financial_impact DESC`,
      [organizationId, scenario]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find high-impact analyses
   * @param {string} organizationId - Organization ID
   * @param {number} [threshold=100000] - Financial impact threshold
   * @returns {Promise<Array>} Array of analyses
   */
  static async findHighImpact(organizationId, threshold = 100000) {
    const result = await query(
      `SELECT * FROM process_impact_analysis
       WHERE organization_id = $1 AND financial_impact >= $2
       ORDER BY financial_impact DESC`,
      [organizationId, threshold]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Calculate aggregate impact for organization
   * @param {string} organizationId - Organization ID
   * @param {string} [scenario] - Optional scenario filter
   * @returns {Promise<Object>} Aggregate impact
   */
  static async getAggregateImpact(organizationId, scenario = null) {
    let sql = `SELECT
         COUNT(DISTINCT process_id) AS affected_processes,
         SUM(financial_impact) AS total_financial_impact,
         AVG(operational_impact_score) AS avg_operational_impact,
         MAX(financial_impact) AS max_financial_impact
       FROM process_impact_analysis
       WHERE organization_id = $1`;

    const params = [organizationId];

    if (scenario) {
      sql += ' AND scenario = $2';
      params.push(scenario);
    }

    const result = await query(sql, params);
    const row = result[0];

    return {
      affectedProcesses: parseInt(row.affected_processes || 0),
      totalFinancialImpact: parseFloat(row.total_financial_impact || 0),
      avgOperationalImpact: parseFloat(row.avg_operational_impact || 0),
      maxFinancialImpact: parseFloat(row.max_financial_impact || 0)
    };
  }

  /**
   * Update analysis
   * @param {string} id - Analysis ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated analysis
   */
  static async update(id, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'scenario', 'blastRadiusProcesses', 'blastRadiusSystems',
      'upstreamImpact', 'downstreamImpact', 'financialImpact',
      'operationalImpactScore', 'singlePointsOfFailure',
      'cascadePathways', 'analysisMetadata'
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
      `UPDATE process_impact_analysis SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Delete analysis
   * @param {string} id - Analysis ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const result = await query('DELETE FROM process_impact_analysis WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
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
      processId: row.process_id,
      scenario: row.scenario,
      blastRadiusProcesses: row.blast_radius_processes || [],
      blastRadiusSystems: row.blast_radius_systems || [],
      upstreamImpact: row.upstream_impact || {},
      downstreamImpact: row.downstream_impact || {},
      financialImpact: parseFloat(row.financial_impact),
      operationalImpactScore: parseFloat(row.operational_impact_score),
      singlePointsOfFailure: row.single_points_of_failure || [],
      cascadePathways: row.cascade_pathways || [],
      analysisMetadata: row.analysis_metadata || {},
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

module.exports = ProcessImpactAnalysis;
