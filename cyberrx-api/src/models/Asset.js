'use strict';

const { query } = require('../utils/db');

/**
 * Asset Model
 *
 * Represents infrastructure assets (servers, endpoints, databases, cloud resources, APIs, apps)
 * Critical gap filled - links business processes to infrastructure
 */
class Asset {
  /**
   * Create a new asset
   * @param {Object} data - Asset data
   * @param {string} data.id - UUID
   * @param {string} data.name - Asset name
   * @param {string} data.type - Asset type: 'server', 'endpoint', 'database', 'cloud', 'API', 'app'
   * @param {string} data.organizationId - Organization ID
   * @param {string} [data.hostname] - Hostname or IP address
   * @param {string} [data.ipAddress] - IP address
   * @param {string} [data.owner] - Asset owner
   * @param {string} [data.description] - Asset description
   * @param {string[]} [data.businessProcessIds] - Business process IDs
   * @param {string[]} [data.applicationIds] - Application IDs
   * @param {string[]} [data.dataClassification] - Data classifications: 'PHI', 'PII', 'PCI', 'Financial', 'Legal', 'Confidential'
   * @param {string} [data.cloudProvider] - Cloud provider if applicable
   * @param {string} [data.location] - Physical or cloud location
   * @returns {Promise<Object>} Created asset
   */
  static async create(data) {
    const {
      id,
      name,
      type,
      organizationId,
      hostname = null,
      ipAddress = null,
      owner = null,
      description = null,
      businessProcessIds = [],
      applicationIds = [],
      dataClassification = [],
      cloudProvider = null,
      location = null
    } = data;

    const result = await query(
      `INSERT INTO assets (
        id, name, type, organization_id, hostname, ip_address, owner, description,
        business_process_ids, application_ids, data_classification, cloud_provider, location
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        id, name, type, organizationId, hostname, ipAddress, owner, description,
        JSON.stringify(businessProcessIds),
        JSON.stringify(applicationIds),
        JSON.stringify(dataClassification),
        cloudProvider, location
      ]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Find asset by ID
   * @param {string} id - Asset ID
   * @returns {Promise<Object|null>} Asset or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM assets WHERE id = $1',
      [id]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Find all assets for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} [options] - Query options
   * @param {string} [options.type] - Filter by type
   * @returns {Promise<Array>} Array of assets
   */
  static async findByOrganization(organizationId, options = {}) {
    let sql = 'SELECT * FROM assets WHERE organization_id = $1';
    const params = [organizationId];

    if (options.type) {
      sql += ' AND type = $2';
      params.push(options.type);
    }

    sql += ' ORDER BY type ASC, name ASC';

    const result = await query(sql, params);
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Update asset
   * @param {string} id - Asset ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated asset
   */
  static async update(id, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'name', 'type', 'hostname', 'ipAddress', 'owner', 'description',
      'businessProcessIds', 'applicationIds', 'dataClassification',
      'cloudProvider', 'location'
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
      `UPDATE assets SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Delete asset
   * @param {string} id - Asset ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const result = await query('DELETE FROM assets WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  /**
   * Find assets by business process ID
   * @param {string} businessProcessId - Business process ID
   * @returns {Promise<Array>} Array of assets
   */
  static async findByBusinessProcessId(businessProcessId) {
    const result = await query(
      "SELECT * FROM assets WHERE business_process_ids @> $1::jsonb",
      [JSON.stringify([businessProcessId])]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find assets by application ID
   * @param {string} applicationId - Application ID
   * @returns {Promise<Array>} Array of assets
   */
  static async findByApplicationId(applicationId) {
    const result = await query(
      "SELECT * FROM assets WHERE application_ids @> $1::jsonb",
      [JSON.stringify([applicationId])]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find assets by data classification
   * @param {string} classification - Data classification (e.g., 'PHI')
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of assets
   */
  static async findByDataClassification(classification, organizationId) {
    const result = await query(
      `SELECT * FROM assets
       WHERE organization_id = $1
       AND data_classification @> $2::jsonb
       ORDER BY name ASC`,
      [organizationId, JSON.stringify([classification])]
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
      organizationId: row.organization_id,
      hostname: row.hostname,
      ipAddress: row.ip_address,
      owner: row.owner,
      description: row.description,
      businessProcessIds: row.business_process_ids || [],
      applicationIds: row.application_ids || [],
      dataClassification: row.data_classification || [],
      cloudProvider: row.cloud_provider,
      location: row.location,
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

module.exports = Asset;
