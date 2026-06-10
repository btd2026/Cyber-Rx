'use strict';

const db = require('../utils/db');

/**
 * RemediationTask Entity
 *
 * Tracks remediation work from security findings and risks
 * Links findings to actionable work with owners, deadlines, and verification
 */
class RemediationTask {
  /**
   * Create a new remediation task
   * @param {Object} data - Task data
   * @returns {Promise<Object>} Created task
   */
  static async create(data) {
    const {
      id,
      organizationId,
      title,
      description = null,
      sourceFindingId = null,
      sourceRiskId = null,
      relatedControlId = null,
      assignedTo = null,
      assignedTeam = null,
      priority = 'Medium',
      status = 'Pending',
      targetDate = null,
      completedDate = null,
      estimatedCost = null,
      actualCost = null,
      evidenceAttachments = [],
      verificationStatus = null,
      blockerReason = null
    } = data;

    const now = new Date();
    const query = `
      INSERT INTO remediation_tasks (
        id, organization_id, title, description, source_finding_id, source_risk_id,
        related_control_id, assigned_to, assigned_team, priority, status,
        target_date, completed_date, estimated_cost, actual_cost,
        evidence_attachments, verification_status, blocker_reason,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;

    const values = [
      id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      organizationId,
      title,
      description,
      sourceFindingId,
      sourceRiskId,
      relatedControlId,
      assignedTo,
      assignedTeam,
      priority,
      status,
      targetDate,
      completedDate,
      estimatedCost,
      actualCost,
      JSON.stringify(evidenceAttachments),
      verificationStatus,
      blockerReason,
      now,
      now
    ];

    try {
      const result = await db.pool.query(query, values);
      return this._mapFromDb(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to create remediation task: ${error.message}`);
    }
  }

  /**
   * Find task by ID
   * @param {string} id - Task ID
   * @returns {Promise<Object|null>} Task or null
   */
  static async findById(id) {
    const query = 'SELECT * FROM remediation_tasks WHERE id = $1';
    try {
      const result = await db.pool.query(query, [id]);
      return result.rows.length > 0 ? this._mapFromDb(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to find task: ${error.message}`);
    }
  }

  /**
   * Find all tasks for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} filters - Optional filters (status, assignedTo, priority)
   * @returns {Promise<Array>} Array of tasks
   */
  static async findByOrganization(organizationId, filters = {}) {
    const conditions = ['organization_id = $1'];
    const values = [organizationId];
    let paramIndex = 2;

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }

    if (filters.assignedTo) {
      conditions.push(`assigned_to = $${paramIndex++}`);
      values.push(filters.assignedTo);
    }

    if (filters.priority) {
      conditions.push(`priority = $${paramIndex++}`);
      values.push(filters.priority);
    }

    if (filters.overdue === true) {
      conditions.push(`target_date < NOW() AND status NOT IN ('Completed', 'Verified', 'Cancelled')`);
    }

    const query = `
      SELECT * FROM remediation_tasks
      WHERE ${conditions.join(' AND ')}
      ORDER BY
        CASE priority
          WHEN 'Critical' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low' THEN 4
        END,
        target_date ASC NULLS LAST,
        created_at DESC
    `;

    try {
      const result = await db.pool.query(query, values);
      return result.rows.map(row => this._mapFromDb(row));
    } catch (error) {
      throw new Error(`Failed to find tasks: ${error.message}`);
    }
  }

  /**
   * Find tasks assigned to a user
   * @param {string} organizationId - Organization ID
   * @param {string} assignedTo - User ID or email
   * @returns {Promise<Array>} Array of tasks
   */
  static async findByAssignedTo(organizationId, assignedTo) {
    return this.findByOrganization(organizationId, { assignedTo });
  }

  /**
   * Find overdue tasks
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of overdue tasks
   */
  static async findOverdue(organizationId) {
    return this.findByOrganization(organizationId, { overdue: true });
  }

  /**
   * Find tasks from a finding
   * @param {string} findingId - Finding ID
   * @returns {Promise<Array>} Array of tasks
   */
  static async findByFinding(findingId) {
    const query = 'SELECT * FROM remediation_tasks WHERE source_finding_id = $1 ORDER BY created_at DESC';
    try {
      const result = await db.pool.query(query, [findingId]);
      return result.rows.map(row => this._mapFromDb(row));
    } catch (error) {
      throw new Error(`Failed to find tasks for finding: ${error.message}`);
    }
  }

  /**
   * Find tasks from a risk
   * @param {string} riskId - Risk ID
   * @returns {Promise<Array>} Array of tasks
   */
  static async findByRisk(riskId) {
    const query = 'SELECT * FROM remediation_tasks WHERE source_risk_id = $1 ORDER BY created_at DESC';
    try {
      const result = await db.pool.query(query, [riskId]);
      return result.rows.map(row => this._mapFromDb(row));
    } catch (error) {
      throw new Error(`Failed to find tasks for risk: ${error.message}`);
    }
  }

  /**
   * Update task
   * @param {string} id - Task ID
   * @param {Object} data - Data to update
   * @returns {Promise<Object>} Updated task
   */
  static async update(id, data) {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'title', 'description', 'assignedTo', 'assignedTeam', 'priority', 'status',
      'targetDate', 'completedDate', 'estimatedCost', 'actualCost',
      'verificationStatus', 'blockerReason'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        const dbField = this._camelToSnake(field);
        updates.push(`${dbField} = $${paramIndex++}`);
        values.push(data[field]);
      }
    }

    // Handle array fields separately
    if (data.evidenceAttachments !== undefined) {
      updates.push(`evidence_attachments = $${paramIndex++}`);
      values.push(JSON.stringify(data.evidenceAttachments));
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());
    values.push(id);

    const query = `
      UPDATE remediation_tasks
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await db.pool.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('Task not found');
      }
      return this._mapFromDb(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to update task: ${error.message}`);
    }
  }

  /**
   * Mark task as complete
   * @param {string} id - Task ID
   * @param {Object} completionData - Completion data (actualCost, notes)
   * @returns {Promise<Object>} Updated task
   */
  static async markComplete(id, completionData = {}) {
    const { actualCost = null, notes = null } = completionData;
    return this.update(id, {
      status: 'Completed',
      completedDate: new Date(),
      actualCost,
      verificationStatus: 'Pending'
    });
  }

  /**
   * Verify task completion
   * @param {string} id - Task ID
   * @param {Object} verificationData - Verification data (verified, verifiedBy, notes)
   * @returns {Promise<Object>} Updated task
   */
  static async verify(id, verificationData) {
    const { verified = true, verifiedBy, notes = null } = verificationData;
    return this.update(id, {
      status: verified ? 'Verified' : 'In Progress',
      verificationStatus: verified ? 'Verified' : 'Rejected',
      ...(notes && { blockerReason: notes })
    });
  }

  /**
   * Delete task
   * @param {string} id - Task ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const query = 'DELETE FROM remediation_tasks WHERE id = $1 RETURNING id';
    try {
      const result = await db.pool.query(query, [id]);
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Failed to delete task: ${error.message}`);
    }
  }

  /**
   * Get task statistics for organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Statistics
   */
  static async getStatistics(organizationId) {
    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'Pending') as pending,
        COUNT(*) FILTER (WHERE status = 'In Progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'Completed') as completed,
        COUNT(*) FILTER (WHERE status = 'Verified') as verified,
        COUNT(*) FILTER (WHERE status = 'Cancelled') as cancelled,
        COUNT(*) FILTER (WHERE target_date < NOW() AND status NOT IN ('Completed', 'Verified', 'Cancelled')) as overdue,
        SUM(estimated_cost) as total_estimated_cost,
        SUM(actual_cost) as total_actual_cost,
        COUNT(*) FILTER (WHERE priority = 'Critical') as critical_count,
        COUNT(*) FILTER (WHERE priority = 'High') as high_count
      FROM remediation_tasks
      WHERE organization_id = $1
    `;

    try {
      const result = await db.pool.query(query, [organizationId]);
      const row = result.rows[0];
      return {
        total: parseInt(row.total),
        pending: parseInt(row.pending),
        inProgress: parseInt(row.in_progress),
        completed: parseInt(row.completed),
        verified: parseInt(row.verified),
        cancelled: parseInt(row.cancelled),
        overdue: parseInt(row.overdue),
        totalEstimatedCost: row.total_estimated_cost ? parseFloat(row.total_estimated_cost) : 0,
        totalActualCost: row.total_actual_cost ? parseFloat(row.total_actual_cost) : 0,
        criticalCount: parseInt(row.critical_count),
        highCount: parseInt(row.high_count)
      };
    } catch (error) {
      throw new Error(`Failed to get task statistics: ${error.message}`);
    }
  }

  /**
   * Map database row to application model
   * @private
   */
  static _mapFromDb(row) {
    if (!row) return null;
    return {
      id: row.id,
      organizationId: row.organization_id,
      title: row.title,
      description: row.description,
      sourceFindingId: row.source_finding_id,
      sourceRiskId: row.source_risk_id,
      relatedControlId: row.related_control_id,
      assignedTo: row.assigned_to,
      assignedTeam: row.assigned_team,
      priority: row.priority,
      status: row.status,
      targetDate: row.target_date,
      completedDate: row.completed_date,
      estimatedCost: row.estimated_cost,
      actualCost: row.actual_cost,
      evidenceAttachments: row.evidence_attachments || [],
      verificationStatus: row.verification_status,
      blockerReason: row.blocker_reason,
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

module.exports = RemediationTask;
