'use strict';

const { query } = require('../utils/db');

/**
 * DataObject Model
 *
 * Represents classified data objects (PHI, PII, PCI, Financial, Legal, Confidential)
 * Enables data classification and regulatory compliance tracking
 */
class DataObject {
  /**
   * Create a new data object
   * @param {Object} data - Data object data
   * @param {string} data.id - UUID
   * @param {string} data.name - Data object name
   * @param {string} data.type - Data type: 'PHI', 'PII', 'PCI', 'Financial', 'Legal', 'Confidential'
   * @param {string} data.sensitivity - Sensitivity level: 'Critical', 'High', 'Medium', 'Low'
   * @param {string} data.organizationId - Organization ID
   * @param {number} [data.recordCount] - Estimated record count
   * @param {string} [data.description] - Data object description
   * @param {string[]} [data.residesInSystems] - System/asset IDs where data resides
   * @param {string[]} [data.accessedByApps] - Application IDs that access this data
   * @param {string[]} [data.protectedByControls] - Control IDs protecting this data
   * @param {string} [data.retentionPeriod] - Data retention period
   * @param {string} [data.dataOwner] - Data owner role/person
   * @returns {Promise<Object>} Created data object
   */
  static async create(data) {
    const {
      id,
      name,
      type,
      sensitivity,
      organizationId,
      recordCount = null,
      description = null,
      residesInSystems = [],
      accessedByApps = [],
      protectedByControls = [],
      retentionPeriod = null,
      dataOwner = null
    } = data;

    const result = await query(
      `INSERT INTO data_objects (
        id, name, type, sensitivity, organization_id, record_count, description,
        resides_in_systems, accessed_by_apps, protected_by_controls,
        retention_period, data_owner
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        id, name, type, sensitivity, organizationId, recordCount, description,
        JSON.stringify(residesInSystems),
        JSON.stringify(accessedByApps),
        JSON.stringify(protectedByControls),
        retentionPeriod, dataOwner
      ]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Find data object by ID
   * @param {string} id - Data object ID
   * @returns {Promise<Object|null>} Data object or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM data_objects WHERE id = $1',
      [id]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Find all data objects for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} [options] - Query options
   * @param {string} [options.type] - Filter by data type
   * @param {string} [options.sensitivity] - Filter by sensitivity
   * @returns {Promise<Array>} Array of data objects
   */
  static async findByOrganization(organizationId, options = {}) {
    let sql = 'SELECT * FROM data_objects WHERE organization_id = $1';
    const params = [organizationId];

    if (options.type) {
      sql += ' AND type = $2';
      params.push(options.type);
    }

    if (options.sensitivity) {
      sql += options.type ? ' AND sensitivity = $3' : ' AND sensitivity = $2';
      params.push(options.sensitivity);
    }

    sql += ' ORDER BY sensitivity DESC, type ASC, name ASC';

    const result = await query(sql, params);
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Update data object
   * @param {string} id - Data object ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated data object
   */
  static async update(id, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'name', 'type', 'sensitivity', 'recordCount', 'description',
      'residesInSystems', 'accessedByApps', 'protectedByControls',
      'retentionPeriod', 'dataOwner'
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
      `UPDATE data_objects SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Delete data object
   * @param {string} id - Data object ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const result = await query('DELETE FROM data_objects WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  /**
   * Find data objects by asset/system ID
   * @param {string} assetId - Asset/system ID
   * @returns {Promise<Array>} Array of data objects
   */
  static async findByAssetId(assetId) {
    const result = await query(
      "SELECT * FROM data_objects WHERE resides_in_systems @> $1::jsonb",
      [JSON.stringify([assetId])]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find data objects by application ID
   * @param {string} applicationId - Application ID
   * @returns {Promise<Array>} Array of data objects
   */
  static async findByApplicationId(applicationId) {
    const result = await query(
      "SELECT * FROM data_objects WHERE accessed_by_apps @> $1::jsonb",
      [JSON.stringify([applicationId])]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find data objects by control ID
   * @param {string} controlId - Control ID
   * @returns {Promise<Array>} Array of data objects
   */
  static async findByControlId(controlId) {
    const result = await query(
      "SELECT * FROM data_objects WHERE protected_by_controls @> $1::jsonb",
      [JSON.stringify([controlId])]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Get high-value data objects (PHI/PII with Critical/High sensitivity)
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of high-value data objects
   */
  static async getHighValueDataObjects(organizationId) {
    const result = await query(
      `SELECT * FROM data_objects
       WHERE organization_id = $1
       AND type IN ('PHI', 'PII', 'PCI')
       AND sensitivity IN ('Critical', 'High')
       ORDER BY sensitivity DESC, record_count DESC NULLS LAST`,
      [organizationId]
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
      type: row.type,
      sensitivity: row.sensitivity,
      organizationId: row.organization_id,
      recordCount: row.record_count,
      description: row.description,
      residesInSystems: row.resides_in_systems || [],
      accessedByApps: row.accessed_by_apps || [],
      protectedByControls: row.protected_by_controls || [],
      retentionPeriod: row.retention_period,
      dataOwner: row.data_owner,
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

module.exports = DataObject;
