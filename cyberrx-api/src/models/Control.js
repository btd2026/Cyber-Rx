'use strict';

const db = require('../utils/db');

/**
 * Control Entity
 *
 * Represents a security control from frameworks like NIST CSF 2.0, HIPAA
 * Tracks implementation status, effectiveness, and testing evidence
 */
class Control {
  /**
   * Create a new control
   * @param {Object} data - Control data
   * @returns {Promise<Object>} Created control
   */
  static async create(data) {
    const {
      id,
      organizationId,
      controlId,
      framework,
      title,
      description = null,
      implementationStatus = 'None',
      effectivenessScore = null,
      owner = null,
      ownerDepartment = null,
      relatedRiskIds = [],
      relatedFindingIds = [],
      lastTestedDate = null,
      nextReviewDate = null,
      testEvidence = [],
      controlType = 'Preventive',
      tier = 'Tier 2'
    } = data;

    const now = new Date();
    const query = `
      INSERT INTO controls (
        id, organization_id, control_id, framework, title, description,
        implementation_status, effectiveness_score, owner, owner_department,
        related_risk_ids, related_finding_ids, last_tested_date, next_review_date,
        test_evidence, control_type, tier, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `;

    const values = [
      id || `ctrl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      organizationId,
      controlId,
      framework,
      title,
      description,
      implementationStatus,
      effectivenessScore,
      owner,
      ownerDepartment,
      JSON.stringify(relatedRiskIds),
      JSON.stringify(relatedFindingIds),
      lastTestedDate,
      nextReviewDate,
      JSON.stringify(testEvidence),
      controlType,
      tier,
      now,
      now
    ];

    try {
      const result = await db.pool.query(query, values);
      return this._mapFromDb(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to create control: ${error.message}`);
    }
  }

  /**
   * Find control by ID
   * @param {string} id - Control ID
   * @returns {Promise<Object|null>} Control or null
   */
  static async findById(id) {
    const query = 'SELECT * FROM controls WHERE id = $1';
    try {
      const result = await db.pool.query(query, [id]);
      return result.rows.length > 0 ? this._mapFromDb(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to find control: ${error.message}`);
    }
  }

  /**
   * Find all controls for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} filters - Optional filters (framework, effectiveness, status)
   * @returns {Promise<Array>} Array of controls
   */
  static async findByOrganization(organizationId, filters = {}) {
    const conditions = ['organization_id = $1'];
    const values = [organizationId];
    let paramIndex = 2;

    if (filters.framework) {
      conditions.push(`framework = $${paramIndex++}`);
      values.push(filters.framework);
    }

    if (filters.minEffectiveness !== undefined) {
      conditions.push(`effectiveness_score <= $${paramIndex++}`);
      values.push(filters.minEffectiveness);
    }

    if (filters.implementationStatus) {
      conditions.push(`implementation_status = $${paramIndex++}`);
      values.push(filters.implementationStatus);
    }

    if (filters.tier) {
      conditions.push(`tier = $${paramIndex++}`);
      values.push(filters.tier);
    }

    const query = `
      SELECT * FROM controls
      WHERE ${conditions.join(' AND ')}
      ORDER BY effectiveness_score ASC NULLS LAST, created_at DESC
    `;

    try {
      const result = await db.pool.query(query, values);
      return result.rows.map(row => this._mapFromDb(row));
    } catch (error) {
      throw new Error(`Failed to find controls: ${error.message}`);
    }
  }

  /**
   * Find controls by framework
   * @param {string} organizationId - Organization ID
   * @param {string} framework - Framework name
   * @returns {Promise<Array>} Array of controls
   */
  static async findByFramework(organizationId, framework) {
    return this.findByOrganization(organizationId, { framework });
  }

  /**
   * Find low-effectiveness controls
   * @param {string} organizationId - Organization ID
   * @param {number} threshold - Maximum effectiveness score (default 60)
   * @returns {Promise<Array>} Array of controls
   */
  static async findLowEffectiveness(organizationId, threshold = 60) {
    return this.findByOrganization(organizationId, { minEffectiveness: threshold });
  }

  /**
   * Update control
   * @param {string} id - Control ID
   * @param {Object} data - Data to update
   * @returns {Promise<Object>} Updated control
   */
  static async update(id, data) {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'title', 'description', 'implementationStatus', 'effectivenessScore',
      'owner', 'ownerDepartment', 'lastTestedDate', 'nextReviewDate',
      'controlType', 'tier'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        const dbField = this._camelToSnake(field);
        updates.push(`${dbField} = $${paramIndex++}`);
        values.push(data[field]);
      }
    }

    // Handle array fields separately
    if (data.relatedRiskIds !== undefined) {
      updates.push(`related_risk_ids = $${paramIndex++}`);
      values.push(JSON.stringify(data.relatedRiskIds));
    }

    if (data.relatedFindingIds !== undefined) {
      updates.push(`related_finding_ids = $${paramIndex++}`);
      values.push(JSON.stringify(data.relatedFindingIds));
    }

    if (data.testEvidence !== undefined) {
      updates.push(`test_evidence = $${paramIndex++}`);
      values.push(JSON.stringify(data.testEvidence));
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());
    values.push(id);

    const query = `
      UPDATE controls
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await db.pool.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('Control not found');
      }
      return this._mapFromDb(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to update control: ${error.message}`);
    }
  }

  /**
   * Delete control
   * @param {string} id - Control ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const query = 'DELETE FROM controls WHERE id = $1 RETURNING id';
    try {
      const result = await db.pool.query(query, [id]);
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Failed to delete control: ${error.message}`);
    }
  }

  /**
   * Record test results for a control
   * @param {string} id - Control ID
   * @param {Object} testData - Test data (result, testedBy, evidenceIds)
   * @returns {Promise<Object>} Updated control
   */
  static async recordTest(id, testData) {
    const { result, testedBy, evidenceIds = [], notes = null } = testData;
    const now = new Date();

    const control = await this.findById(id);
    if (!control) {
      throw new Error('Control not found');
    }

    // Update effectiveness based on test result
    let newScore = control.effectivenessScore;
    if (result === 'pass') {
      newScore = Math.min((control.effectivenessScore || 50) + 10, 100);
    } else if (result === 'fail') {
      newScore = Math.max((control.effectivenessScore || 50) - 20, 0);
    }

    return this.update(id, {
      effectivenessScore: newScore,
      lastTestedDate: now,
      testEvidence: [...(control.testEvidence || []), {
        date: now,
        result,
        testedBy,
        evidenceIds,
        notes
      }]
    });
  }

  /**
   * Get control statistics for organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Statistics
   */
  static async getStatistics(organizationId) {
    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE implementation_status = 'Implemented') as implemented,
        COUNT(*) FILTER (WHERE implementation_status = 'Partial') as partial,
        COUNT(*) FILTER (WHERE implementation_status = 'Planned') as planned,
        COUNT(*) FILTER (WHERE implementation_status = 'None') as none,
        AVG(effectiveness_score) as avg_effectiveness,
        COUNT(*) FILTER (WHERE effectiveness_score < 60) as critical_count,
        COUNT(*) FILTER (WHERE tier = 'Tier 1') as tier1_count,
        COUNT(*) FILTER (WHERE tier = 'Tier 2') as tier2_count,
        COUNT(*) FILTER (WHERE tier = 'Tier 3') as tier3_count
      FROM controls
      WHERE organization_id = $1
    `;

    try {
      const result = await db.pool.query(query, [organizationId]);
      const row = result.rows[0];
      return {
        total: parseInt(row.total),
        implemented: parseInt(row.implemented),
        partial: parseInt(row.partial),
        planned: parseInt(row.planned),
        none: parseInt(row.none),
        avgEffectiveness: row.avg_effectiveness ? parseFloat(row.avg_effectiveness) : null,
        criticalCount: parseInt(row.critical_count),
        tier1Count: parseInt(row.tier1_count),
        tier2Count: parseInt(row.tier2_count),
        tier3Count: parseInt(row.tier3_count)
      };
    } catch (error) {
      throw new Error(`Failed to get control statistics: ${error.message}`);
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
      controlId: row.control_id,
      framework: row.framework,
      title: row.title,
      description: row.description,
      implementationStatus: row.implementation_status,
      effectivenessScore: row.effectiveness_score,
      owner: row.owner,
      ownerDepartment: row.owner_department,
      relatedRiskIds: row.related_risk_ids || [],
      relatedFindingIds: row.related_finding_ids || [],
      lastTestedDate: row.last_tested_date,
      nextReviewDate: row.next_review_date,
      testEvidence: row.test_evidence || [],
      controlType: row.control_type,
      tier: row.tier,
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

module.exports = Control;
