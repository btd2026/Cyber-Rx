'use strict';

const { query } = require('../utils/db');

/**
 * ExecutiveOwner Model
 *
 * Represents executive ownership and governance (CIO, CISO, CFO, CRO, CLO, Audit)
 * Enables accountability tracking across processes, controls, and risks
 */
class ExecutiveOwner {
  // Valid executive roles
  static VALID_ROLES = ['CIO', 'CISO', 'CFO', 'CRO', 'CLO', 'Audit', 'CTO', 'COO', 'CEO'];

  /**
   * Create a new executive owner
   * @param {Object} data - Executive owner data
   * @param {string} data.id - UUID
   * @param {string} data.roleId - Executive role: 'CIO', 'CISO', 'CFO', 'CRO', 'CLO', 'Audit'
   * @param {string} data.userId - User ID (reference to users table)
   * @param {string} data.organizationId - Organization ID
   * @param {string[]} [data.scopeProcesses] - Business process IDs owned
   * @param {string[]} [data.scopeControls] - Control IDs owned
   * @param {string[]} [data.scopeRisks] - Risk IDs owned
   * @param {string} [data.name] - Executive name (denormalized for performance)
   * @param {string} [data.email] - Executive email
   * @param {string} [data.title] - Executive title
   * @returns {Promise<Object>} Created executive owner
   */
  static async create(data) {
    const {
      id,
      roleId,
      userId,
      organizationId,
      scopeProcesses = [],
      scopeControls = [],
      scopeRisks = [],
      name = null,
      email = null,
      title = null
    } = data;

    // Validate role
    if (!this.VALID_ROLES.includes(roleId)) {
      throw new Error(`Invalid role ID: ${roleId}. Must be one of: ${this.VALID_ROLES.join(', ')}`);
    }

    const result = await query(
      `INSERT INTO executive_owners (
        id, role_id, user_id, organization_id,
        scope_processes, scope_controls, scope_risks,
        name, email, title
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id, roleId, userId, organizationId,
        JSON.stringify(scopeProcesses),
        JSON.stringify(scopeControls),
        JSON.stringify(scopeRisks),
        name, email, title
      ]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Find executive owner by ID
   * @param {string} id - Executive owner ID
   * @returns {Promise<Object|null>} Executive owner or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM executive_owners WHERE id = $1',
      [id]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Find executive owner by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Executive owner or null
   */
  static async findByUserId(userId) {
    const result = await query(
      'SELECT * FROM executive_owners WHERE user_id = $1',
      [userId]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Find all executive owners for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} [options] - Query options
   * @param {string} [options.roleId] - Filter by role
   * @returns {Promise<Array>} Array of executive owners
   */
  static async findByOrganization(organizationId, options = {}) {
    let sql = 'SELECT * FROM executive_owners WHERE organization_id = $1';
    const params = [organizationId];

    if (options.roleId) {
      sql += ' AND role_id = $2';
      params.push(options.roleId);
    }

    sql += ' ORDER BY role_id ASC, name ASC';

    const result = await query(sql, params);
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find executive owner by role
   * @param {string} roleId - Role ID (e.g., 'CISO')
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object|null>} Executive owner or null
   */
  static async findByRole(roleId, organizationId) {
    const result = await query(
      'SELECT * FROM executive_owners WHERE role_id = $1 AND organization_id = $2',
      [roleId, organizationId]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Update executive owner
   * @param {string} id - Executive owner ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated executive owner
   */
  static async update(id, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'roleId', 'userId', 'name', 'email', 'title',
      'scopeProcesses', 'scopeControls', 'scopeRisks'
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
      `UPDATE executive_owners SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Delete executive owner
   * @param {string} id - Executive owner ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const result = await query('DELETE FROM executive_owners WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  /**
   * Add scope to executive owner
   * @param {string} id - Executive owner ID
   * @param {string} scopeType - 'processes', 'controls', or 'risks'
   * @param {string} scopeId - ID to add to scope
   * @returns {Promise<Object>} Updated executive owner
   */
  static async addScope(id, scopeType, scopeId) {
    const fieldMap = {
      processes: 'scope_processes',
      controls: 'scope_controls',
      risks: 'scope_risks'
    };

    const dbField = fieldMap[scopeType];
    if (!dbField) {
      throw new Error(`Invalid scope type: ${scopeType}`);
    }

    const result = await query(
      `UPDATE executive_owners
       SET ${dbField} = COALESCE(${dbField}, '[]'::jsonb) || $1::jsonb
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify([scopeId]), id]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Remove scope from executive owner
   * @param {string} id - Executive owner ID
   * @param {string} scopeType - 'processes', 'controls', or 'risks'
   * @param {string} scopeId - ID to remove from scope
   * @returns {Promise<Object>} Updated executive owner
   */
  static async removeScope(id, scopeType, scopeId) {
    const fieldMap = {
      processes: 'scope_processes',
      controls: 'scope_controls',
      risks: 'scope_risks'
    };

    const dbField = fieldMap[scopeType];
    if (!dbField) {
      throw new Error(`Invalid scope type: ${scopeType}`);
    }

    const result = await query(
      `UPDATE executive_owners
       SET ${dbField} = COALESCE(${dbField}, '[]'::jsonb) - $1
       WHERE id = $2
       RETURNING *`,
      [scopeId, id]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Find owners by business process ID
   * @param {string} businessProcessId - Business process ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of executive owners
   */
  static async findByBusinessProcessId(businessProcessId, organizationId) {
    const result = await query(
      `SELECT * FROM executive_owners
       WHERE organization_id = $1
       AND scope_processes @> $2::jsonb
       ORDER BY role_id ASC`,
      [organizationId, JSON.stringify([businessProcessId])]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find owners by risk ID
   * @param {string} riskId - Risk ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of executive owners
   */
  static async findByRiskId(riskId, organizationId) {
    const result = await query(
      `SELECT * FROM executive_owners
       WHERE organization_id = $1
       AND scope_risks @> $2::jsonb
       ORDER BY role_id ASC`,
      [organizationId, JSON.stringify([riskId])]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Get organization's executive roster
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Executive roster grouped by role
   */
  static async getExecutiveRoster(organizationId) {
    const result = await query(
      `SELECT * FROM executive_owners
       WHERE organization_id = $1
       ORDER BY role_id ASC`,
      [organizationId]
    );

    const roster = {};
    for (const row of result) {
      const transformed = this._transformFromDb(row);
      if (!roster[transformed.roleId]) {
        roster[transformed.roleId] = [];
      }
      roster[transformed.roleId].push(transformed);
    }

    return roster;
  }

  /**
   * Transform database row to camelCase model
   * @private
   */
  static _transformFromDb(row) {
    if (!row) return null;
    return {
      id: row.id,
      roleId: row.role_id,
      userId: row.user_id,
      organizationId: row.organization_id,
      scopeProcesses: row.scope_processes || [],
      scopeControls: row.scope_controls || [],
      scopeRisks: row.scope_risks || [],
      name: row.name,
      email: row.email,
      title: row.title,
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

module.exports = ExecutiveOwner;
