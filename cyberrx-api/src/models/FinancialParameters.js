/**
 * FinancialParameters Model
 *
 * Model for managing financial parameters including MLR targets, stop-loss parameters,
 * reserve positions, premium revenue mappings, risk appetite thresholds, alert thresholds,
 * scenario analysis, and parameter validation records.
 *
 * @author Senior Backend Engineer
 * @date 2025-06-06
 */

const { v4: uuidv4 } = require('uuid');

class FinancialParameters {
  /**
   * Create a new financial parameter
   * @param {Object} data - Parameter data
   * @param {Object} db - Database connection
   * @returns {Promise<Object>} Created parameter
   */
  static async create(data, db) {
    const id = uuidv4();
    const {
      organization_id,
      parameter_type,
      parameter_name,
      parameter_value,
      version = 1,
      status = 'draft',
      effective_date,
      expiry_date,
      approved_by,
      approved_at,
      change_description,
      metadata = {}
    } = data;

    const query = `
      INSERT INTO financial_parameters (
        id, organization_id, parameter_type, parameter_name, parameter_value,
        version, status, effective_date, expiry_date, approved_by, approved_at,
        change_description, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      id, organization_id, parameter_type, parameter_name, JSON.stringify(parameter_value),
      version, status, effective_date, expiry_date, approved_by, approved_at,
      change_description, JSON.stringify(metadata)
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Find financial parameter by ID
   * @param {string} id - Parameter ID
   * @param {Object} db - Database connection
   * @returns {Promise<Object>} Parameter
   */
  static async findById(id, db) {
    const query = 'SELECT * FROM financial_parameters WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Find financial parameters by organization
   * @param {string} organization_id - Organization ID
   * @param {Object} db - Database connection
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of parameters
   */
  static async findByOrganization(organization_id, db, filters = {}) {
    const conditions = ['organization_id = $1'];
    const values = [organization_id];
    let paramCount = 1;

    if (filters.parameter_type) {
      paramCount++;
      conditions.push(`parameter_type = $${paramCount}`);
      values.push(filters.parameter_type);
    }

    if (filters.status) {
      paramCount++;
      conditions.push(`status = $${paramCount}`);
      values.push(filters.status);
    }

    if (filters.effective_date) {
      paramCount++;
      conditions.push(`effective_date <= $${paramCount}`);
      values.push(filters.effective_date);
    }

    if (filters.current_only) {
      paramCount++;
      conditions.push(`(expiry_date IS NULL OR expiry_date > $${paramCount})`);
      values.push(new Date().toISOString());
    }

    const query = `
      SELECT * FROM financial_parameters
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Find parameters by type
   * @param {string} organization_id - Organization ID
   * @param {string} parameter_type - Parameter type
   * @param {Object} db - Database connection
   * @returns {Promise<Array>} Array of parameters
   */
  static async findByType(organization_id, parameter_type, db) {
    const query = `
      SELECT * FROM financial_parameters
      WHERE organization_id = $1 AND parameter_type = $2
      ORDER BY version DESC, created_at DESC
    `;
    const result = await db.query(query, [organization_id, parameter_type]);
    return result.rows;
  }

  /**
   * Find latest active parameter by name
   * @param {string} organization_id - Organization ID
   * @param {string} parameter_type - Parameter type
   * @param {string} parameter_name - Parameter name
   * @param {Object} db - Database connection
   * @returns {Promise<Object>} Parameter
   */
  static async findLatestActive(organization_id, parameter_type, parameter_name, db) {
    const query = `
      SELECT * FROM financial_parameters
      WHERE organization_id = $1
        AND parameter_type = $2
        AND parameter_name = $3
        AND status = 'active'
        AND (effective_date IS NULL OR effective_date <= NOW())
        AND (expiry_date IS NULL OR expiry_date > NOW())
      ORDER BY version DESC
      LIMIT 1
    `;
    const result = await db.query(query, [organization_id, parameter_type, parameter_name]);
    return result.rows[0];
  }

  /**
   * Update financial parameter
   * @param {string} id - Parameter ID
   * @param {Object} data - Data to update
   * @param {Object} db - Database connection
   * @returns {Promise<Object>} Updated parameter
   */
  static async update(id, data, db) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const updatableFields = [
      'parameter_value', 'version', 'status', 'effective_date', 'expiry_date',
      'approved_by', 'approved_at', 'change_description', 'metadata'
    ];

    updatableFields.forEach(field => {
      if (data[field] !== undefined) {
        paramCount++;
        fields.push(`${field} = $${paramCount}`);
        if (field === 'parameter_value' || field === 'metadata') {
          values.push(JSON.stringify(data[field]));
        } else {
          values.push(data[field]);
        }
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const query = `
      UPDATE financial_parameters
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount + 1}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Create new version of parameter
   * @param {string} id - Original parameter ID
   * @param {Object} data - New version data
   * @param {Object} db - Database connection
   * @returns {Promise<Object>} New parameter version
   */
  static async createVersion(id, data, db) {
    const original = await this.findById(id, db);
    if (!original) {
      throw new Error('Original parameter not found');
    }

    const newVersion = original.version + 1;
    return this.create({
      ...original,
      ...data,
      id: undefined, // Generate new ID
      version: newVersion,
      status: 'draft'
    }, db);
  }

  /**
   * Delete financial parameter
   * @param {string} id - Parameter ID
   * @param {Object} db - Database connection
   * @returns {Promise<boolean>} Success
   */
  static async delete(id, db) {
    const query = 'DELETE FROM financial_parameters WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Validate parameter
   * @param {string} id - Parameter ID
   * @param {string} validation_status - Validation status
   * @param {string} validated_by - Validator
   * @param {Object} db - Database connection
   * @returns {Promise<Object>} Updated parameter
   */
  static async validate(id, validation_status, validated_by, db) {
    return this.update(id, {
      status: validation_status === 'passed' ? 'approved' : 'rejected',
      validated_by,
      validated_at: new Date()
    }, db);
  }

  /**
   * Submit parameter for approval
   * @param {string} id - Parameter ID
   * @param {Object} db - Database connection
   * @returns {Promise<Object>} Updated parameter
   */
  static async submitForApproval(id, db) {
    return this.update(id, { status: 'pending_approval' }, db);
  }

  /**
   * Approve parameter
   * @param {string} id - Parameter ID
   * @param {string} approved_by - Approver
   * @param {Object} db - Database connection
   * @returns {Promise<Object>} Updated parameter
   */
  static async approve(id, approved_by, db) {
    const data = {
      status: 'approved',
      approved_by,
      approved_at: new Date()
    };

    // Set effective date to now if not set
    const current = await this.findById(id, db);
    if (!current.effective_date) {
      data.effective_date = new Date();
    }

    return this.update(id, data, db);
  }

  /**
   * Reject parameter
   * @param {string} id - Parameter ID
   * @param {string} approved_by - Approver
   * @param {string} rejection_reason - Rejection reason
   * @param {Object} db - Database connection
   * @returns {Promise<Object>} Updated parameter
   */
  static async reject(id, approved_by, rejection_reason, db) {
    const updated = await this.update(id, {
      status: 'rejected',
      approved_by,
      approved_at: new Date()
    }, db);

    // Update change description with rejection reason
    await this.update(id, {
      change_description: rejection_reason
    }, db);

    return updated;
  }

  /**
   * Activate parameter
   * @param {string} id - Parameter ID
   * @param {Object} db - Database connection
   * @returns {Promise<Object>} Updated parameter
   */
  static async activate(id, db) {
    return this.update(id, { status: 'active' }, db);
  }

  /**
   * Deprecate parameter
   * @param {string} id - Parameter ID
   * @param {Object} db - Database connection
   * @returns {Promise<Object>} Updated parameter
   */
  static async deprecate(id, db) {
    return this.update(id, {
      status: 'deprecated',
      expiry_date: new Date()
    }, db);
  }

  /**
   * Get parameter statistics
   * @param {string} organization_id - Organization ID
   * @param {Object} db - Database connection
   * @returns {Promise<Object>} Statistics
   */
  static async getStatistics(organization_id, db) {
    const query = `
      SELECT
        parameter_type,
        status,
        COUNT(*) as count
      FROM financial_parameters
      WHERE organization_id = $1
      GROUP BY parameter_type, status
      ORDER BY parameter_type, status
    `;

    const result = await db.query(query, [organization_id]);

    const stats = {
      by_type: {},
      by_status: {},
      total: 0
    };

    result.rows.forEach(row => {
      if (!stats.by_type[row.parameter_type]) {
        stats.by_type[row.parameter_type] = {};
      }
      stats.by_type[row.parameter_type][row.status] = parseInt(row.count);

      if (!stats.by_status[row.status]) {
        stats.by_status[row.status] = 0;
      }
      stats.by_status[row.status] += parseInt(row.count);

      stats.total += parseInt(row.count);
    });

    return stats;
  }

  /**
   * Get parameter history
   * @param {string} organization_id - Organization ID
   * @param {string} parameter_type - Parameter type
   * @param {string} parameter_name - Parameter name
   * @param {Object} db - Database connection
   * @returns {Promise<Array>} Parameter versions
   */
  static async getHistory(organization_id, parameter_type, parameter_name, db) {
    const query = `
      SELECT * FROM financial_parameters
      WHERE organization_id = $1
        AND parameter_type = $2
        AND parameter_name = $3
      ORDER BY version DESC
    `;

    const result = await db.query(query, [organization_id, parameter_type, parameter_name]);
    return result.rows;
  }

  /**
   * Bulk create parameters
   * @param {Array} parameters - Array of parameter data
   * @param {Object} db - Database connection
   * @returns {Promise<Array>} Created parameters
   */
  static async bulkCreate(parameters, db) {
    const created = [];
    for (const param of parameters) {
      const createdParam = await this.create(param, db);
      created.push(createdParam);
    }
    return created;
  }

  /**
   * Search parameters
   * @param {string} organization_id - Organization ID
   * @param {string} searchTerm - Search term
   * @param {Object} db - Database connection
   * @returns {Promise<Array>} Matching parameters
   */
  static async search(organization_id, searchTerm, db) {
    const query = `
      SELECT * FROM financial_parameters
      WHERE organization_id = $1
        AND (parameter_name ILIKE $2 OR change_description ILIKE $2)
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [organization_id, `%${searchTerm}%`]);
    return result.rows;
  }
}

module.exports = FinancialParameters;
