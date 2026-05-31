'use strict';

const { query } = require('../utils/db');

/**
 * Vendor Model
 *
 * Represents third-party vendors and their risk profiles
 * Links vendors to business processes and tracks contract information
 */
class Vendor {
  /**
   * Create a new vendor
   * @param {Object} data - Vendor data
   * @param {string} data.id - UUID
   * @param {string} data.name - Vendor name
   * @param {string} data.tier - Vendor tier: 'Critical', 'High', 'Medium', 'Low'
   * @param {string} data.organizationId - Organization ID
   * @param {string} [data.riskRating] - Risk rating: 'Critical', 'High', 'Medium', 'Low', 'Info'
   * @param {string} [data.category] - Vendor category
   * @param {string[]} [data.businessProcessIds] - Business process IDs
   * @param {number} [data.contractValue] - Contract value
   * @param {string} [data.contractExpiry] - Contract expiry date
   * @param {string} [data.description] - Vendor description
   * @param {string} [data.contactEmail] - Contact email
   * @param {string} [data.contactPhone] - Contact phone
   * @param {string} [data.website] - Vendor website
   * @param {string[]} [data.dataAccess] - Data types accessed
   * @param {number} [data.securityScore] - Security score (0-100)
   * @param {number} [data.complianceScore] - Compliance score (0-100)
   * @returns {Promise<Object>} Created vendor
   */
  static async create(data) {
    const {
      id,
      name,
      tier,
      organizationId,
      riskRating = null,
      category = null,
      businessProcessIds = [],
      contractValue = null,
      contractExpiry = null,
      description = null,
      contactEmail = null,
      contactPhone = null,
      website = null,
      dataAccess = [],
      securityScore = null,
      complianceScore = null
    } = data;

    const result = await query(
      `INSERT INTO vendors (
        id, name, tier, organization_id, risk_rating, category,
        business_process_ids, contract_value, contract_expiry, description,
        contact_email, contact_phone, website, data_access,
        security_score, compliance_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        id, name, tier, organizationId, riskRating, category,
        JSON.stringify(businessProcessIds),
        contractValue,
        contractExpiry,
        description,
        contactEmail,
        contactPhone,
        website,
        JSON.stringify(dataAccess),
        securityScore,
        complianceScore
      ]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Find vendor by ID
   * @param {string} id - Vendor ID
   * @returns {Promise<Object|null>} Vendor or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM vendors WHERE id = $1',
      [id]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Find all vendors for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} [options] - Query options
   * @param {string} [options.tier] - Filter by tier
   * @param {string} [options.riskRating] - Filter by risk rating
   * @param {string} [options.category] - Filter by category
   * @returns {Promise<Array>} Array of vendors
   */
  static async findByOrganization(organizationId, options = {}) {
    let sql = 'SELECT * FROM vendors WHERE organization_id = $1';
    const params = [organizationId];
    let paramCount = 2;

    if (options.tier) {
      sql += ` AND tier = $${paramCount}`;
      params.push(options.tier);
      paramCount++;
    }

    if (options.riskRating) {
      sql += ` AND risk_rating = $${paramCount}`;
      params.push(options.riskRating);
      paramCount++;
    }

    if (options.category) {
      sql += ` AND category = $${paramCount}`;
      params.push(options.category);
      paramCount++;
    }

    sql += ' ORDER BY tier ASC, risk_rating DESC, name ASC';

    const result = await query(sql, params);
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find vendors by tier
   * @param {string} tier - Vendor tier
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of vendors
   */
  static async findByTier(tier, organizationId) {
    const result = await query(
      `SELECT * FROM vendors
       WHERE organization_id = $1 AND tier = $2
       ORDER BY risk_rating DESC, name ASC`,
      [organizationId, tier]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find vendors by risk rating
   * @param {string} riskRating - Risk rating
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of vendors
   */
  static async findByRiskRating(riskRating, organizationId) {
    const result = await query(
      `SELECT * FROM vendors
       WHERE organization_id = $1 AND risk_rating = $2
       ORDER BY tier ASC, name ASC`,
      [organizationId, riskRating]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find vendors by category
   * @param {string} category - Vendor category
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of vendors
   */
  static async findByCategory(category, organizationId) {
    const result = await query(
      `SELECT * FROM vendors
       WHERE organization_id = $1 AND category = $2
       ORDER BY tier ASC, name ASC`,
      [organizationId, category]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find vendors with expiring contracts
   * @param {string} organizationId - Organization ID
   * @param {number} days - Days until expiry
   * @returns {Promise<Array>} Array of vendors
   */
  static async findExpiringContracts(organizationId, days = 90) {
    const result = await query(
      `SELECT * FROM vendors
       WHERE organization_id = $1
       AND contract_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + $2::INTEGER
       ORDER BY contract_expiry ASC`,
      [organizationId, days]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find vendors by business process ID
   * @param {string} businessProcessId - Business process ID
   * @returns {Promise<Array>} Array of vendors
   */
  static async findByBusinessProcessId(businessProcessId) {
    const result = await query(
      "SELECT * FROM vendors WHERE business_process_ids @> $1::jsonb",
      [JSON.stringify([businessProcessId])]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Update vendor
   * @param {string} id - Vendor ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated vendor
   */
  static async update(id, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'name', 'tier', 'riskRating', 'category',
      'businessProcessIds', 'contractValue', 'contractExpiry',
      'description', 'contactEmail', 'contactPhone', 'website',
      'dataAccess', 'securityScore', 'complianceScore', 'lastAssessedAt'
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
      `UPDATE vendors SET ${updates.join(', ')}, last_assessed_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Delete vendor
   * @param {string} id - Vendor ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const result = await query('DELETE FROM vendors WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  /**
   * Get vendor risk summary
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Risk summary
   */
  static async getRiskSummary(organizationId) {
    const result = await query(
      `SELECT
        tier,
        risk_rating,
        COUNT(*) as count,
        SUM(contract_value) as total_contract_value
       FROM vendors
       WHERE organization_id = $1
       GROUP BY tier, risk_rating
       ORDER BY tier ASC, risk_rating DESC`,
      [organizationId]
    );

    return result.reduce((summary, row) => {
      const tier = row.tier || 'Unknown';
      const rating = row.risk_rating || 'Unrated';

      if (!summary[tier]) {
        summary[tier] = {};
      }

      summary[tier][rating] = {
        count: parseInt(row.count),
        totalContractValue: parseFloat(row.total_contract_value) || 0
      };

      return summary;
    }, {});
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
      organizationId: row.organization_id,
      riskRating: row.risk_rating,
      category: row.category,
      businessProcessIds: row.business_process_ids || [],
      contractValue: row.contract_value ? parseFloat(row.contract_value) : null,
      contractExpiry: row.contract_expiry,
      description: row.description,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      website: row.website,
      dataAccess: row.data_access || [],
      securityScore: row.security_score,
      complianceScore: row.compliance_score,
      lastAssessedAt: row.last_assessed_at,
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

module.exports = Vendor;
