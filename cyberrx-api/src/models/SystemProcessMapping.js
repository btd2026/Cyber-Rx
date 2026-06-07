'use strict';

const { query } = require('../utils/db');

/**
 * SystemProcessMapping Model
 *
 * Maps IT systems to business processes
 * Integrates with CMDB for asset discovery
 */
class SystemProcessMapping {
  /**
   * Create a new system-to-process mapping
   * @param {Object} data - Mapping data
   * @param {string} data.id - UUID
   * @param {string} data.organizationId - Organization ID
   * @param {string} data.systemId - System/Asset ID
   * @param {string} data.processId - Process ID
   * @param {string} data.mappingType - 'primary', 'secondary', 'supporting'
   * @param {number} [data.criticalityScore] - Criticality score (0-1)
   * @param {string} [data.coverageStatus] - 'instrumented', 'partial', 'unmapped'
   * @param {Object} [data.metadata] - Additional metadata
   * @returns {Promise<Object>} Created mapping
   */
  static async create(data) {
    const {
      id,
      organizationId,
      systemId,
      processId,
      mappingType,
      criticalityScore = null,
      coverageStatus = 'unmapped',
      metadata = {}
    } = data;

    const result = await query(
      `INSERT INTO system_process_mappings (
        id, organization_id, system_id, process_id, mapping_type,
        criticality_score, coverage_status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (organization_id, system_id, process_id)
      DO UPDATE SET
        mapping_type = EXCLUDED.mapping_type,
        criticality_score = EXCLUDED.criticality_score,
        coverage_status = EXCLUDED.coverage_status,
        metadata = EXCLUDED.metadata
      RETURNING *`,
      [id, organizationId, systemId, processId, mappingType, criticalityScore, coverageStatus, JSON.stringify(metadata)]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Find mapping by ID
   * @param {string} id - Mapping ID
   * @returns {Promise<Object|null>} Mapping or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM system_process_mappings WHERE id = $1',
      [id]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Find all mappings for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of mappings
   */
  static async findByOrganization(organizationId) {
    const result = await query(
      'SELECT * FROM system_process_mappings WHERE organization_id = $1 ORDER BY system_id, process_id',
      [organizationId]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find mappings by system
   * @param {string} organizationId - Organization ID
   * @param {string} systemId - System ID
   * @returns {Promise<Array>} Array of mappings
   */
  static async findBySystem(organizationId, systemId) {
    const result = await query(
      `SELECT * FROM system_process_mappings
       WHERE organization_id = $1 AND system_id = $2
       ORDER BY mapping_type DESC, criticality_score DESC`,
      [organizationId, systemId]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find mappings by process
   * @param {string} organizationId - Organization ID
   * @param {string} processId - Process ID
   * @returns {Promise<Array>} Array of mappings
   */
  static async findByProcess(organizationId, processId) {
    const result = await query(
      `SELECT * FROM system_process_mappings
       WHERE organization_id = $1 AND process_id = $2
       ORDER BY mapping_type DESC, criticality_score DESC`,
      [organizationId, processId]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find primary mappings
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of mappings
   */
  static async findPrimary(organizationId) {
    const result = await query(
      `SELECT * FROM system_process_mappings
       WHERE organization_id = $1 AND mapping_type = 'primary'
       ORDER BY system_id, process_id`,
      [organizationId]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find unmapped systems
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of system IDs
   */
  static async findUnmappedSystems(organizationId) {
    const result = await query(
      `SELECT DISTINCT system_id
       FROM system_process_mappings
       WHERE organization_id = $1 AND coverage_status = 'unmapped'
       ORDER BY system_id`,
      [organizationId]
    );

    return result.map(row => row.system_id);
  }

  /**
   * Find coverage analysis
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Coverage analysis
   */
  static async getCoverageAnalysis(organizationId) {
    const result = await query(
      `SELECT
         COUNT(DISTINCT system_id) AS total_systems,
         COUNT(DISTINCT CASE WHEN coverage_status = 'instrumented' THEN system_id END) AS instrumented_systems,
         COUNT(DISTINCT CASE WHEN coverage_status = 'partial' THEN system_id END) AS partial_systems,
         COUNT(DISTINCT CASE WHEN coverage_status = 'unmapped' THEN system_id END) AS unmapped_systems,
         COUNT(*) AS total_mappings,
         COUNT(CASE WHEN mapping_type = 'primary' THEN 1 END) AS primary_mappings,
         COUNT(CASE WHEN mapping_type = 'secondary' THEN 1 END) AS secondary_mappings,
         COUNT(CASE WHEN mapping_type = 'supporting' THEN 1 END) AS supporting_mappings
       FROM system_process_mappings
       WHERE organization_id = $1`,
      [organizationId]
    );

    const row = result[0];
    return {
      totalSystems: parseInt(row.total_systems || 0),
      instrumentedSystems: parseInt(row.instrumented_systems || 0),
      partialSystems: parseInt(row.partial_systems || 0),
      unmappedSystems: parseInt(row.unmapped_systems || 0),
      coveragePercentage: row.total_systems > 0
        ? (parseInt(row.instrumented_systems || 0) / parseInt(row.total_systems)) * 100
        : 0,
      totalMappings: parseInt(row.total_mappings || 0),
      primaryMappings: parseInt(row.primary_mappings || 0),
      secondaryMappings: parseInt(row.secondary_mappings || 0),
      supportingMappings: parseInt(row.supporting_mappings || 0)
    };
  }

  /**
   * Update mapping
   * @param {string} id - Mapping ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated mapping
   */
  static async update(id, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['mappingType', 'criticalityScore', 'coverageStatus', 'metadata'];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        const dbField = this._camelToSnake(field);
        if (typeof data[field] === 'object') {
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
      `UPDATE system_process_mappings SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Delete mapping
   * @param {string} id - Mapping ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const result = await query('DELETE FROM system_process_mappings WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  /**
   * Delete all mappings for a system
   * @param {string} organizationId - Organization ID
   * @param {string} systemId - System ID
   * @returns {Promise<number>} Number of mappings deleted
   */
  static async deleteBySystem(organizationId, systemId) {
    const result = await query(
      `DELETE FROM system_process_mappings
       WHERE organization_id = $1 AND system_id = $2
       RETURNING id`,
      [organizationId, systemId]
    );
    return result.length;
  }

  /**
   * Delete all mappings for a process
   * @param {string} organizationId - Organization ID
   * @param {string} processId - Process ID
   * @returns {Promise<number>} Number of mappings deleted
   */
  static async deleteByProcess(organizationId, processId) {
    const result = await query(
      `DELETE FROM system_process_mappings
       WHERE organization_id = $1 AND process_id = $2
       RETURNING id`,
      [organizationId, processId]
    );
    return result.length;
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
      systemId: row.system_id,
      processId: row.process_id,
      mappingType: row.mapping_type,
      criticalityScore: row.criticality_score ? parseFloat(row.criticality_score) : null,
      coverageStatus: row.coverage_status,
      metadata: row.metadata || {},
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

module.exports = SystemProcessMapping;
