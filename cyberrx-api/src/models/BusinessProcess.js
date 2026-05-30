'use strict';

const { query } = require('../utils/db');

/**
 * BusinessProcess Model
 *
 * Aligns with Crown Jewels - Tier 1 Primary and Tier 2 Strategic business processes
 * Represents critical business processes that must be protected
 */
class BusinessProcess {
  /**
   * Create a new business process
   * @param {Object} data - Business process data
   * @param {string} data.id - UUID
   * @param {string} data.name - Process name
   * @param {string} data.tier - 'Primary' or 'Strategic'
   * @param {string} data.criticality - 'Critical', 'High', 'Medium', 'Low'
   * @param {string} data.owner - Executive role (e.g., 'CIO', 'CISO')
   * @param {string} data.organizationId - Organization ID
   * @param {string[]} [data.supportedBySystems] - Array of system IDs
   * @param {string[]} [data.createsDataObjects] - Array of data object IDs
   * @param {string[]} [data.governedByControls] - Array of control IDs
   * @param {string} [data.description] - Process description
   * @returns {Promise<Object>} Created business process
   */
  static async create(data) {
    const {
      id,
      name,
      tier,
      criticality,
      owner,
      organizationId,
      description = null,
      supportedBySystems = [],
      createsDataObjects = [],
      governedByControls = []
    } = data;

    const result = await query(
      `INSERT INTO business_processes (
        id, name, tier, criticality, owner, organization_id, description,
        supported_by_systems, creates_data_objects, governed_by_controls
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id,
        name,
        tier,
        criticality,
        owner,
        organizationId,
        description,
        JSON.stringify(supportedBySystems),
        JSON.stringify(createsDataObjects),
        JSON.stringify(governedByControls)
      ]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Find business process by ID
   * @param {string} id - Business process ID
   * @returns {Promise<Object|null>} Business process or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM business_processes WHERE id = $1',
      [id]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Find all business processes for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} [options] - Query options
   * @param {string} [options.tier] - Filter by tier
   * @returns {Promise<Array>} Array of business processes
   */
  static async findByOrganization(organizationId, options = {}) {
    let sql = 'SELECT * FROM business_processes WHERE organization_id = $1';
    const params = [organizationId];

    if (options.tier) {
      sql += ' AND tier = $2';
      params.push(options.tier);
    }

    sql += ' ORDER BY criticality DESC, name ASC';

    const result = await query(sql, params);
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Update business process
   * @param {string} id - Business process ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated business process
   */
  static async update(id, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'name', 'tier', 'criticality', 'owner', 'description',
      'supportedBySystems', 'createsDataObjects', 'governedByControls'
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
      `UPDATE business_processes SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Delete business process
   * @param {string} id - Business process ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const result = await query('DELETE FROM business_processes WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  /**
   * Find business processes by asset ID
   * @param {string} assetId - Asset ID
   * @returns {Promise<Array>} Array of business processes
   */
  static async findByAssetId(assetId) {
    const result = await query(
      "SELECT * FROM business_processes WHERE supported_by_systems @> $1::jsonb",
      [JSON.stringify([assetId])]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find business processes by data object ID
   * @param {string} dataObjectId - Data object ID
   * @returns {Promise<Array>} Array of business processes
   */
  static async findByDataObjectId(dataObjectId) {
    const result = await query(
      "SELECT * FROM business_processes WHERE creates_data_objects @> $1::jsonb",
      [JSON.stringify([dataObjectId])]
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
      name: row.name,
      tier: row.tier,
      criticality: row.criticality,
      owner: row.owner,
      organizationId: row.organization_id,
      description: row.description,
      supportedBySystems: row.supported_by_systems || [],
      createsDataObjects: row.creates_data_objects || [],
      governedByControls: row.governed_by_controls || [],
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

module.exports = BusinessProcess;
