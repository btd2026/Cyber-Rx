'use strict';

const { query } = require('../utils/db');

/**
 * ProcessDependency Model
 *
 * Stores upstream/downstream dependencies between processes
 * Supports dependency chain traversal and criticality scoring
 */
class ProcessDependency {
  /**
   * Create a new process dependency
   * @param {Object} data - Dependency data
   * @param {string} data.id - UUID
   * @param {string} data.organizationId - Organization ID
   * @param {string} data.sourceProcessId - Source process ID
   * @param {string} data.targetProcessId - Target process ID
   * @param {string} data.dependencyType - 'depends_on', 'enables', 'triggers', 'impacts'
   * @param {string} [data.criticality] - 'critical', 'high', 'medium', 'low'
   * @param {Object} [data.metadata] - Additional metadata
   * @returns {Promise<Object>} Created dependency
   */
  static async create(data) {
    const {
      id,
      organizationId,
      sourceProcessId,
      targetProcessId,
      dependencyType,
      criticality = null,
      metadata = {}
    } = data;

    const result = await query(
      `INSERT INTO process_dependencies (
        id, organization_id, source_process_id, target_process_id,
        dependency_type, criticality, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (organization_id, source_process_id, target_process_id, dependency_type)
      DO UPDATE SET criticality = EXCLUDED.criticality, metadata = EXCLUDED.metadata
      RETURNING *`,
      [id, organizationId, sourceProcessId, targetProcessId, dependencyType, criticality, JSON.stringify(metadata)]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Find dependency by ID
   * @param {string} id - Dependency ID
   * @returns {Promise<Object|null>} Dependency or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM process_dependencies WHERE id = $1',
      [id]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Find all dependencies for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of dependencies
   */
  static async findByOrganization(organizationId) {
    const result = await query(
      'SELECT * FROM process_dependencies WHERE organization_id = $1 ORDER BY source_process_id, target_process_id',
      [organizationId]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find downstream dependencies for a process
   * @param {string} organizationId - Organization ID
   * @param {string} processId - Process ID
   * @param {number} [maxDepth=10] - Maximum traversal depth
   * @returns {Promise<Array>} Array of downstream process IDs
   */
  static async findDownstream(organizationId, processId, maxDepth = 10) {
    const result = await query(
      'SELECT get_downstream_dependencies($1, $2, $3) AS downstream',
      [organizationId, processId, maxDepth]
    );

    return result[0]?.downstream || [];
  }

  /**
   * Find upstream dependencies for a process
   * @param {string} organizationId - Organization ID
   * @param {string} processId - Process ID
   * @param {number} [maxDepth=10] - Maximum traversal depth
   * @returns {Promise<Array>} Array of upstream process IDs
   */
  static async findUpstream(organizationId, processId, maxDepth = 10) {
    const result = await query(
      'SELECT get_upstream_dependencies($1, $2, $3) AS upstream',
      [organizationId, processId, maxDepth]
    );

    return result[0]?.upstream || [];
  }

  /**
   * Find direct downstream dependencies (1 hop)
   * @param {string} organizationId - Organization ID
   * @param {string} processId - Process ID
   * @returns {Promise<Array>} Array of dependencies
   */
  static async findDirectDownstream(organizationId, processId) {
    const result = await query(
      `SELECT * FROM process_dependencies
       WHERE organization_id = $1 AND source_process_id = $2
       ORDER BY dependency_type, target_process_id`,
      [organizationId, processId]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find direct upstream dependencies (1 hop)
   * @param {string} organizationId - Organization ID
   * @param {string} processId - Process ID
   * @returns {Promise<Array>} Array of dependencies
   */
  static async findDirectUpstream(organizationId, processId) {
    const result = await query(
      `SELECT * FROM process_dependencies
       WHERE organization_id = $1 AND target_process_id = $2
       ORDER BY dependency_type, source_process_id`,
      [organizationId, processId]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find dependencies by type
   * @param {string} organizationId - Organization ID
   * @param {string} dependencyType - Dependency type
   * @returns {Promise<Array>} Array of dependencies
   */
  static async findByType(organizationId, dependencyType) {
    const result = await query(
      `SELECT * FROM process_dependencies
       WHERE organization_id = $1 AND dependency_type = $2
       ORDER BY source_process_id, target_process_id`,
      [organizationId, dependencyType]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find single points of failure
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of single points of failure
   */
  static async findSinglePointsOfFailure(organizationId) {
    const result = await query(
      `SELECT
         pd.source_process_id AS process_id,
         COUNT(*) AS dependent_process_count,
         jsonb_agg(DISTINCT pd.target_process_id) AS dependent_processes
       FROM process_dependencies pd
       WHERE pd.organization_id = $1
         AND pd.dependency_type = 'depends_on'
         AND pd.criticality IN ('critical', 'high')
       GROUP BY pd.source_process_id
       HAVING COUNT(*) >= 3
       ORDER BY dependent_process_count DESC`,
      [organizationId]
    );

    return result.map(row => ({
      processId: row.process_id,
      dependentProcessCount: parseInt(row.dependent_process_count),
      dependentProcesses: row.dependent_processes
    }));
  }

  /**
   * Update dependency
   * @param {string} id - Dependency ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated dependency
   */
  static async update(id, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['dependencyType', 'criticality', 'metadata'];

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
      `UPDATE process_dependencies SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Delete dependency
   * @param {string} id - Dependency ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const result = await query('DELETE FROM process_dependencies WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  /**
   * Delete all dependencies for a process
   * @param {string} organizationId - Organization ID
   * @param {string} processId - Process ID
   * @returns {Promise<number>} Number of dependencies deleted
   */
  static async deleteByProcess(organizationId, processId) {
    const result = await query(
      `DELETE FROM process_dependencies
       WHERE organization_id = $1
         AND (source_process_id = $2 OR target_process_id = $2)
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
      sourceProcessId: row.source_process_id,
      targetProcessId: row.target_process_id,
      dependencyType: row.dependency_type,
      criticality: row.criticality,
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

module.exports = ProcessDependency;
