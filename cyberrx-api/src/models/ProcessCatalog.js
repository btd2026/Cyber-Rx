'use strict';

const { query } = require('../utils/db');

/**
 * ProcessCatalog Model
 *
 * Catalog of discovered business processes
 * Supports process discovery and documentation
 */
class ProcessCatalog {
  /**
   * Create a new process catalog entry
   * @param {Object} data - Catalog data
   * @param {string} data.id - UUID
   * @param {string} data.organizationId - Organization ID
   * @param {string} data.processId - Process ID
   * @param {string} data.name - Process name
   * @param {string} [data.description] - Process description
   * @param {string} data.processType - 'core', 'supporting', 'enabling'
   * @param {string} [data.tier] - 'crown_jewel', 'critical', 'important', 'standard'
   * @param {string} [data.category] - Process category
   * @param {Array} [data.subProcesses] - Sub-processes
   * @param {Array} [data.activities] - Activities
   * @param {Array} [data.criticalSystems] - Critical systems
   * @param {Array} [data.dataObjects] - Data objects
   * @param {string} [data.owner] - Process owner
   * @param {string} [data.ownerDepartment] - Owner department
   * @param {number} [data.businessCriticalityScore] - Criticality score (0-1)
   * @param {string} [data.discoveryMethod] - Discovery method
   * @returns {Promise<Object>} Created catalog entry
   */
  static async create(data) {
    const {
      id,
      organizationId,
      processId,
      name,
      description = null,
      processType,
      tier = null,
      category = null,
      subProcesses = [],
      activities = [],
      criticalSystems = [],
      dataObjects = [],
      owner = null,
      ownerDepartment = null,
      businessCriticalityScore = null,
      discoveryMethod = null
    } = data;

    const result = await query(
      `INSERT INTO process_catalog (
        id, organization_id, process_id, name, description, process_type, tier, category,
        sub_processes, activities, critical_systems, data_objects, owner, owner_department,
        business_criticality_score, discovery_method
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (process_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        process_type = EXCLUDED.process_type,
        tier = EXCLUDED.tier,
        category = EXCLUDED.category,
        sub_processes = EXCLUDED.sub_processes,
        activities = EXCLUDED.activities,
        critical_systems = EXCLUDED.critical_systems,
        data_objects = EXCLUDED.data_objects,
        owner = EXCLUDED.owner,
        owner_department = EXCLUDED.owner_department,
        business_criticality_score = EXCLUDED.business_criticality_score,
        updated_at = NOW()
      RETURNING *`,
      [
        id, organizationId, processId, name, description, processType, tier, category,
        JSON.stringify(subProcesses),
        JSON.stringify(activities),
        JSON.stringify(criticalSystems),
        JSON.stringify(dataObjects),
        owner, ownerDepartment, businessCriticalityScore, discoveryMethod
      ]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Find catalog entry by ID
   * @param {string} id - Catalog ID
   * @returns {Promise<Object|null>} Catalog entry or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM process_catalog WHERE id = $1',
      [id]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Find catalog entry by process ID
   * @param {string} processId - Process ID
   * @returns {Promise<Object|null>} Catalog entry or null
   */
  static async findByProcessId(processId) {
    const result = await query(
      'SELECT * FROM process_catalog WHERE process_id = $1',
      [processId]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Find all catalog entries for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} [options] - Query options
   * @param {string} [options.processType] - Filter by process type
   * @param {string} [options.tier] - Filter by tier
   * @param {string} [options.category] - Filter by category
   * @returns {Promise<Array>} Array of catalog entries
   */
  static async findByOrganization(organizationId, options = {}) {
    let sql = 'SELECT * FROM process_catalog WHERE organization_id = $1';
    const params = [organizationId];

    if (options.processType) {
      sql += ' AND process_type = $2';
      params.push(options.processType);
    }

    if (options.tier) {
      sql += ` AND tier = $${params.length + 1}`;
      params.push(options.tier);
    }

    if (options.category) {
      sql += ` AND category = $${params.length + 1}`;
      params.push(options.category);
    }

    sql += ' ORDER BY business_criticality_score DESC, name ASC';

    const result = await query(sql, params);
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find crown jewel processes
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of catalog entries
   */
  static async findCrownJewels(organizationId) {
    const result = await query(
      `SELECT * FROM process_catalog
       WHERE organization_id = $1 AND tier = 'crown_jewel'
       ORDER BY business_criticality_score DESC, name ASC`,
      [organizationId]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find processes by owner
   * @param {string} organizationId - Organization ID
   * @param {string} owner - Process owner
   * @returns {Promise<Array>} Array of catalog entries
   */
  static async findByOwner(organizationId, owner) {
    const result = await query(
      `SELECT * FROM process_catalog
       WHERE organization_id = $1 AND owner = $2
       ORDER BY business_criticality_score DESC, name ASC`,
      [organizationId, owner]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find processes by category
   * @param {string} organizationId - Organization ID
   * @param {string} category - Process category
   * @returns {Promise<Array>} Array of catalog entries
   */
  static async findByCategory(organizationId, category) {
    const result = await query(
      `SELECT * FROM process_catalog
       WHERE organization_id = $1 AND category = $2
       ORDER BY business_criticality_score DESC, name ASC`,
      [organizationId, category]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Search processes by name
   * @param {string} organizationId - Organization ID
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Array of catalog entries
   */
  static async searchByName(organizationId, searchTerm) {
    const result = await query(
      `SELECT * FROM process_catalog
       WHERE organization_id = $1
         AND (name ILIKE $2 OR description ILIKE $2)
       ORDER BY business_criticality_score DESC, name ASC`,
      [organizationId, `%${searchTerm}%`]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Get process categories
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of categories
   */
  static async getCategories(organizationId) {
    const result = await query(
      `SELECT DISTINCT category
       FROM process_catalog
       WHERE organization_id = $1 AND category IS NOT NULL
       ORDER BY category ASC`,
      [organizationId]
    );

    return result.map(row => row.category);
  }

  /**
   * Get process statistics
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Process statistics
   */
  static async getStatistics(organizationId) {
    const result = await query(
      `SELECT
         COUNT(*) AS total_processes,
         COUNT(CASE WHEN tier = 'crown_jewel' THEN 1 END) AS crown_jewels,
         COUNT(CASE WHEN tier = 'critical' THEN 1 END) AS critical_processes,
         COUNT(CASE WHEN process_type = 'core' THEN 1 END) AS core_processes,
         COUNT(CASE WHEN validated_by_business = true THEN 1 END) AS validated_processes,
         AVG(business_criticality_score) AS avg_criticality_score
       FROM process_catalog
       WHERE organization_id = $1`,
      [organizationId]
    );

    const row = result[0];
    return {
      totalProcesses: parseInt(row.total_processes || 0),
      crownJewels: parseInt(row.crown_jewels || 0),
      criticalProcesses: parseInt(row.critical_processes || 0),
      coreProcesses: parseInt(row.core_processes || 0),
      validatedProcesses: parseInt(row.validated_processes || 0),
      avgCriticalityScore: parseFloat(row.avg_criticality_score || 0)
    };
  }

  /**
   * Update catalog entry
   * @param {string} id - Catalog ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated catalog entry
   */
  static async update(id, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'name', 'description', 'processType', 'tier', 'category',
      'subProcesses', 'activities', 'criticalSystems', 'dataObjects',
      'owner', 'ownerDepartment', 'businessCriticalityScore',
      'validatedByBusiness', 'validatedDate'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        const dbField = this._camelToSnake(field);
        if (Array.isArray(data[field]) || typeof data[field] === 'boolean') {
          updates.push(`${dbField} = $${paramCount}`);
          values.push(typeof data[field] === 'boolean' ? data[field] : JSON.stringify(data[field]));
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
      `UPDATE process_catalog SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Validate catalog entry
   * @param {string} id - Catalog ID
   * @returns {Promise<Object>} Updated catalog entry
   */
  static async validate(id) {
    const result = await query(
      `UPDATE process_catalog
       SET validated_by_business = true, validated_date = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Delete catalog entry
   * @param {string} id - Catalog ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const result = await query('DELETE FROM process_catalog WHERE id = $1 RETURNING id', [id]);
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
      name: row.name,
      description: row.description,
      processType: row.process_type,
      tier: row.tier,
      category: row.category,
      subProcesses: row.sub_processes || [],
      activities: row.activities || [],
      criticalSystems: row.critical_systems || [],
      dataObjects: row.data_objects || [],
      owner: row.owner,
      ownerDepartment: row.owner_department,
      businessCriticalityScore: row.business_criticality_score ? parseFloat(row.business_criticality_score) : null,
      discoveryMethod: row.discovery_method,
      discoveryDate: row.discovery_date,
      validatedByBusiness: row.validated_by_business,
      validatedDate: row.validated_date,
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

module.exports = ProcessCatalog;
