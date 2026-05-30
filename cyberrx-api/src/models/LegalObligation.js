'use strict';

const { query } = require('../utils/db');

/**
 * LegalObligation Model
 *
 * Represents legal and regulatory obligations (HIPAA, CMS, State, NAIC, Contract)
 * CLO model - enables notification timeline and penalty tracking
 */
class LegalObligation {
  /**
   * Create a new legal obligation
   * @param {Object} data - Legal obligation data
   * @param {string} data.id - UUID
   * @param {string} data.name - Obligation name
   * @param {string} data.source - Source: 'HIPAA', 'CMS', 'State', 'NAIC', 'Contract'
   * @param {string} data.organizationId - Organization ID
   * @param {string} [data.citation] - Legal citation/reference
   * @param {string} [data.notificationTimeline] - Notification timeline (e.g., '60 days', '24 hours')
   * @param {string[]} [data.applicability] - Applicable scenarios/process IDs
   * @param {string[]} [data.penalties] - Associated penalties
   * @param {string} [data.description] - Obligation description
   * @param {number} [data.maxPenaltyAmount] - Maximum penalty amount
   * @param {string} [data.jurisdiction] - Jurisdiction (Federal, State code, etc.)
   * @returns {Promise<Object>} Created legal obligation
   */
  static async create(data) {
    const {
      id,
      name,
      source,
      organizationId,
      citation = null,
      notificationTimeline = null,
      applicability = [],
      penalties = [],
      description = null,
      maxPenaltyAmount = null,
      jurisdiction = null
    } = data;

    const result = await query(
      `INSERT INTO legal_obligations (
        id, name, source, organization_id, citation, notification_timeline,
        applicability, penalties, description, max_penalty_amount, jurisdiction
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        id, name, source, organizationId, citation, notificationTimeline,
        JSON.stringify(applicability),
        JSON.stringify(penalties),
        description, maxPenaltyAmount, jurisdiction
      ]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Find legal obligation by ID
   * @param {string} id - Legal obligation ID
   * @returns {Promise<Object|null>} Legal obligation or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM legal_obligations WHERE id = $1',
      [id]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Find all legal obligations for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} [options] - Query options
   * @param {string} [options.source] - Filter by source
   * @returns {Promise<Array>} Array of legal obligations
   */
  static async findByOrganization(organizationId, options = {}) {
    let sql = 'SELECT * FROM legal_obligations WHERE organization_id = $1';
    const params = [organizationId];

    if (options.source) {
      sql += ' AND source = $2';
      params.push(options.source);
    }

    sql += ' ORDER BY source ASC, name ASC';

    const result = await query(sql, params);
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Update legal obligation
   * @param {string} id - Legal obligation ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated legal obligation
   */
  static async update(id, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'name', 'source', 'citation', 'notificationTimeline',
      'applicability', 'penalties', 'description',
      'maxPenaltyAmount', 'jurisdiction'
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
      `UPDATE legal_obligations SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Delete legal obligation
   * @param {string} id - Legal obligation ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const result = await query('DELETE FROM legal_obligations WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  /**
   * Find legal obligations by threat scenario ID
   * @param {string} threatScenarioId - Threat scenario ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of legal obligations
   */
  static async findByThreatScenarioId(threatScenarioId, organizationId) {
    const result = await query(
      `SELECT * FROM legal_obligations
       WHERE organization_id = $1
       AND applicability @> $2::jsonb`,
      [organizationId, JSON.stringify([threatScenarioId])]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find legal obligations by source
   * @param {string} source - Source (e.g., 'HIPAA', 'CMS')
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of legal obligations
   */
  static async findBySource(source, organizationId) {
    const result = await query(
      `SELECT * FROM legal_obligations
       WHERE organization_id = $1 AND source = $2
       ORDER BY name ASC`,
      [organizationId, source]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Get obligations with urgent notification requirements
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of urgent obligations
   */
  static async getUrgentObligations(organizationId) {
    const result = await query(
      `SELECT * FROM legal_obligations
       WHERE organization_id = $1
       AND (notification_timeline LIKE '%hour%' OR notification_timeline LIKE '%24%')
       ORDER BY notification_timeline ASC`,
      [organizationId]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Get HIPAA obligations
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of HIPAA obligations
   */
  static async getHIPAAObligations(organizationId) {
    return this.findBySource('HIPAA', organizationId);
  }

  /**
   * Get state-specific obligations
   * @param {string} stateCode - State code (e.g., 'CA', 'NY')
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of state obligations
   */
  static async getStateObligations(stateCode, organizationId) {
    const result = await query(
      `SELECT * FROM legal_obligations
       WHERE organization_id = $1
       AND source = 'State'
       AND (jurisdiction = $2 OR citation LIKE $3)
       ORDER BY name ASC`,
      [organizationId, stateCode, `%${stateCode}%`]
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
      source: row.source,
      organizationId: row.organization_id,
      citation: row.citation,
      notificationTimeline: row.notification_timeline,
      applicability: row.applicability || [],
      penalties: row.penalties || [],
      description: row.description,
      maxPenaltyAmount: row.max_penalty_amount,
      jurisdiction: row.jurisdiction,
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

module.exports = LegalObligation;
