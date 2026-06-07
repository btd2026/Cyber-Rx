'use strict';

const { query } = require('../utils/db');

/**
 * ProcessValidationWorkflow Model
 *
 * Tracks customer validation workflow status
 * Manages sign-off process with stakeholders
 */
class ProcessValidationWorkflow {
  /**
   * Create a new validation workflow
   * @param {Object} data - Workflow data
   * @param {string} data.id - UUID
   * @param {string} data.organizationId - Organization ID
   * @param {string} [data.graphId] - Graph ID
   * @param {string} data.validationType - 'structure', 'financial', 'dependencies', 'complete'
   * @param {string} data.stakeholder - Stakeholder name
   * @param {string} data.stakeholderRole - Stakeholder role
   * @param {string} [data.comments] - Comments
   * @param {Array} [data.changeRequests] - Change requests
   * @returns {Promise<Object>} Created workflow
   */
  static async create(data) {
    const {
      id,
      organizationId,
      graphId = null,
      validationType,
      stakeholder,
      stakeholderRole,
      comments = null,
      changeRequests = []
    } = data;

    const result = await query(
      `INSERT INTO process_validation_workflow (
        id, organization_id, graph_id, validation_type, status,
        stakeholder, stakeholder_role, comments, change_requests
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [id, organizationId, graphId, validationType, 'pending', stakeholder, stakeholderRole, comments, JSON.stringify(changeRequests)]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Find workflow by ID
   * @param {string} id - Workflow ID
   * @returns {Promise<Object|null>} Workflow or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM process_validation_workflow WHERE id = $1',
      [id]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Find workflows by organization
   * @param {string} organizationId - Organization ID
   * @param {Object} [options] - Query options
   * @param {string} [options.validationType] - Filter by validation type
   * @param {string} [options.status] - Filter by status
   * @returns {Promise<Array>} Array of workflows
   */
  static async findByOrganization(organizationId, options = {}) {
    let sql = 'SELECT * FROM process_validation_workflow WHERE organization_id = $1';
    const params = [organizationId];

    if (options.validationType) {
      sql += ' AND validation_type = $2';
      params.push(options.validationType);
    }

    if (options.status) {
      sql += ` AND status = $${params.length + 1}`;
      params.push(options.status);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find workflows by graph
   * @param {string} graphId - Graph ID
   * @returns {Promise<Array>} Array of workflows
   */
  static async findByGraph(graphId) {
    const result = await query(
      `SELECT * FROM process_validation_workflow
       WHERE graph_id = $1
       ORDER BY validation_type, created_at DESC`,
      [graphId]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find pending workflows
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of workflows
   */
  static async findPending(organizationId) {
    const result = await query(
      `SELECT * FROM process_validation_workflow
       WHERE organization_id = $1 AND status = 'pending'
       ORDER BY created_at ASC`,
      [organizationId]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Update workflow status
   * @param {string} id - Workflow ID
   * @param {string} status - New status
   * @param {string} [comments] - Comments
   * @param {Array} [changeRequests] - Change requests
   * @returns {Promise<Object>} Updated workflow
   */
  static async updateStatus(id, status, comments = null, changeRequests = null) {
    const values = [id, status];
    let sql = 'UPDATE process_validation_workflow SET status = $2, reviewed_at = NOW()';

    if (comments !== null) {
      sql += ', comments = $3';
      values.push(comments);
    }

    if (changeRequests !== null) {
      sql += `, change_requests = $${values.length + 1}`;
      values.push(JSON.stringify(changeRequests));
    }

    sql += ` WHERE id = $1 RETURNING *`;

    const result = await query(sql, values);
    return this._transformFromDb(result[0]);
  }

  /**
   * Approve workflow
   * @param {string} id - Workflow ID
   * @param {string} [comments] - Approval comments
   * @returns {Promise<Object>} Updated workflow
   */
  static async approve(id, comments = null) {
    return this.updateStatus(id, 'approved', comments);
  }

  /**
   * Reject workflow
   * @param {string} id - Workflow ID
   * @param {string} [comments] - Rejection reason
   * @param {Array} [changeRequests] - Change requests
   * @returns {Promise<Object>} Updated workflow
   */
  static async reject(id, comments = null, changeRequests = null) {
    return this.updateStatus(id, 'rejected', comments, changeRequests);
  }

  /**
   * Request changes
   * @param {string} id - Workflow ID
   * @param {string} comments - Comments
   * @param {Array} changeRequests - Change requests
   * @returns {Promise<Object>} Updated workflow
   */
  static async requestChanges(id, comments, changeRequests) {
    return this.updateStatus(id, 'changes_requested', comments, changeRequests);
  }

  /**
   * Start workflow
   * @param {string} id - Workflow ID
   * @returns {Promise<Object>} Updated workflow
   */
  static async start(id) {
    const result = await query(
      `UPDATE process_validation_workflow
       SET status = 'in_progress'
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Check if all validations complete for graph
   * @param {string} graphId - Graph ID
   * @returns {Promise<Object>} Validation status
   */
  static async checkGraphValidationStatus(graphId) {
    const result = await query(
      `SELECT
         validation_type,
         status,
         COUNT(*) AS count
       FROM process_validation_workflow
       WHERE graph_id = $1
       GROUP BY validation_type, status`,
      [graphId]
    );

    const status = {
      structure: { pending: 0, inProgress: 0, approved: 0, rejected: 0, changesRequested: 0 },
      financial: { pending: 0, inProgress: 0, approved: 0, rejected: 0, changesRequested: 0 },
      dependencies: { pending: 0, inProgress: 0, approved: 0, rejected: 0, changesRequested: 0 },
      complete: { pending: 0, inProgress: 0, approved: 0, rejected: 0, changesRequested: 0 }
    };

    result.forEach(row => {
      const type = row.validation_type;
      const state = row.status === 'changes_requested' ? 'changesRequested' : row.status;
      if (status[type]) {
        status[type][state] = parseInt(row.count);
      }
    });

    const allApproved = Object.values(status).every(type => type.approved > 0 && type.pending === 0 && type.inProgress === 0);
    const hasRejection = Object.values(status).some(type => type.rejected > 0);
    const hasChangesRequested = Object.values(status).some(type => type.changesRequested > 0);

    return {
      status,
      allApproved,
      hasRejection,
      hasChangesRequested,
      readyForLock: allApproved && !hasRejection && !hasChangesRequested
    };
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
      graphId: row.graph_id,
      validationType: row.validation_type,
      status: row.status,
      stakeholder: row.stakeholder,
      stakeholderRole: row.stakeholder_role,
      comments: row.comments,
      changeRequests: row.change_requests || [],
      reviewedAt: row.reviewed_at,
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

module.exports = ProcessValidationWorkflow;
