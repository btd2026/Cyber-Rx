'use strict';

const { query } = require('../utils/db');

/**
 * ProcessFinancialValue Model
 *
 * Stores financial values per process for impact calculation
 * Aligns with T-MVP-006 Financial Modeling Engine
 */
class ProcessFinancialValue {
  /**
   * Create new financial values for a process
   * @param {Object} data - Financial value data
   * @param {string} data.id - UUID
   * @param {string} data.organizationId - Organization ID
   * @param {string} data.processId - Process ID
   * @param {number} [data.annualPremiumRevenue] - Annual premium revenue
   * @param {number} [data.mlrImpactPercentage] - MLR impact percentage
   * @param {number} [data.stopLossExposure] - Stop-loss exposure
   * @param {number} [data.reservesAtRisk] - Reserves at risk
   * @param {number} [data.regulatoryFinePotential] - Regulatory fine potential
   * @param {number} [data.downtimeCostPerDay] - Downtime cost per day
   * @param {number} [data.downtimeCostPerHour] - Downtime cost per hour
   * @param {number} [data.dataBreachCost] - Data breach cost
   * @param {number} [data.customerImpactCost] - Customer impact cost
   * @param {number} [data.revenueAtRisk] - Revenue at risk
   * @param {string} [data.methodology] - Methodology used
   * @param {Array} [data.assumptions] - Assumptions made
   * @param {number} [data.confidenceScore] - Confidence score (0-1)
   * @returns {Promise<Object>} Created financial values
   */
  static async create(data) {
    const {
      id,
      organizationId,
      processId,
      annualPremiumRevenue = 0,
      mlrImpactPercentage = 0,
      stopLossExposure = 0,
      reservesAtRisk = 0,
      regulatoryFinePotential = 0,
      downtimeCostPerDay = 0,
      downtimeCostPerHour = 0,
      dataBreachCost = 0,
      customerImpactCost = 0,
      revenueAtRisk = 0,
      methodology = null,
      assumptions = [],
      confidenceScore = null
    } = data;

    const result = await query(
      `INSERT INTO process_financial_values (
        id, organization_id, process_id, annual_premium_revenue, mlr_impact_percentage,
        stop_loss_exposure, reserves_at_risk, regulatory_fine_potential,
        downtime_cost_per_day, downtime_cost_per_hour, data_breach_cost,
        customer_impact_cost, revenue_at_risk, methodology, assumptions, confidence_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (organization_id, process_id)
      DO UPDATE SET
        annual_premium_revenue = EXCLUDED.annual_premium_revenue,
        mlr_impact_percentage = EXCLUDED.mlr_impact_percentage,
        stop_loss_exposure = EXCLUDED.stop_loss_exposure,
        reserves_at_risk = EXCLUDED.reserves_at_risk,
        regulatory_fine_potential = EXCLUDED.regulatory_fine_potential,
        downtime_cost_per_day = EXCLUDED.downtime_cost_per_day,
        downtime_cost_per_hour = EXCLUDED.downtime_cost_per_hour,
        data_breach_cost = EXCLUDED.data_breach_cost,
        customer_impact_cost = EXCLUDED.customer_impact_cost,
        revenue_at_risk = EXCLUDED.revenue_at_risk,
        methodology = EXCLUDED.methodology,
        assumptions = EXCLUDED.assumptions,
        confidence_score = EXCLUDED.confidence_score
      RETURNING *`,
      [
        id, organizationId, processId, annualPremiumRevenue, mlrImpactPercentage,
        stopLossExposure, reservesAtRisk, regulatoryFinePotential,
        downtimeCostPerDay, downtimeCostPerHour, dataBreachCost,
        customerImpactCost, revenueAtRisk, methodology, JSON.stringify(assumptions), confidenceScore
      ]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Find financial values by ID
   * @param {string} id - Financial value ID
   * @returns {Promise<Object|null>} Financial values or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM process_financial_values WHERE id = $1',
      [id]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Find financial values by process
   * @param {string} organizationId - Organization ID
   * @param {string} processId - Process ID
   * @returns {Promise<Object|null>} Financial values or null
   */
  static async findByProcess(organizationId, processId) {
    const result = await query(
      'SELECT * FROM process_financial_values WHERE organization_id = $1 AND process_id = $2',
      [organizationId, processId]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Find all financial values for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of financial values
   */
  static async findByOrganization(organizationId) {
    const result = await query(
      'SELECT * FROM process_financial_values WHERE organization_id = $1 ORDER BY annual_premium_revenue DESC',
      [organizationId]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Calculate total financial exposure for organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Total financial exposure
   */
  static async calculateTotalExposure(organizationId) {
    const result = await query(
      `SELECT
         SUM(annual_premium_revenue) AS total_premium_revenue,
         SUM(stop_loss_exposure) AS total_stop_loss_exposure,
         SUM(reserves_at_risk) AS total_reserves_at_risk,
         SUM(regulatory_fine_potential) AS total_regulatory_fine_potential,
         SUM(downtime_cost_per_day) AS total_downtime_cost_per_day,
         SUM(revenue_at_risk) AS total_revenue_at_risk,
         AVG(confidence_score) AS avg_confidence_score
       FROM process_financial_values
       WHERE organization_id = $1`,
      [organizationId]
    );

    const row = result[0];
    return {
      totalPremiumRevenue: parseFloat(row.total_premium_revenue || 0),
      totalStopLossExposure: parseFloat(row.total_stop_loss_exposure || 0),
      totalReservesAtRisk: parseFloat(row.total_reserves_at_risk || 0),
      totalRegulatoryFinePotential: parseFloat(row.total_regulatory_fine_potential || 0),
      totalDowntimeCostPerDay: parseFloat(row.total_downtime_cost_per_day || 0),
      totalRevenueAtRisk: parseFloat(row.total_revenue_at_risk || 0),
      avgConfidenceScore: parseFloat(row.avg_confidence_score || 0)
    };
  }

  /**
   * Find high-value processes
   * @param {string} organizationId - Organization ID
   * @param {number} [threshold=1000000] - Revenue threshold
   * @returns {Promise<Array>} Array of financial values
   */
  static async findHighValueProcesses(organizationId, threshold = 1000000) {
    const result = await query(
      `SELECT * FROM process_financial_values
       WHERE organization_id = $1
         AND (annual_premium_revenue >= $2 OR revenue_at_risk >= $2)
       ORDER BY annual_premium_revenue DESC, revenue_at_risk DESC`,
      [organizationId, threshold]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find processes with low confidence scores
   * @param {string} organizationId - Organization ID
   * @param {number} [maxScore=0.7] - Maximum confidence score
   * @returns {Promise<Array>} Array of financial values
   */
  static async findLowConfidence(organizationId, maxScore = 0.7) {
    const result = await query(
      `SELECT * FROM process_financial_values
       WHERE organization_id = $1
         AND confidence_score < $2
       ORDER BY confidence_score ASC`,
      [organizationId, maxScore]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Update financial values
   * @param {string} id - Financial value ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated financial values
   */
  static async update(id, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'annualPremiumRevenue', 'mlrImpactPercentage', 'stopLossExposure', 'reservesAtRisk',
      'regulatoryFinePotential', 'downtimeCostPerDay', 'downtimeCostPerHour',
      'dataBreachCost', 'customerImpactCost', 'revenueAtRisk',
      'methodology', 'assumptions', 'confidenceScore', 'validatedBy', 'validatedAt'
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
      `UPDATE process_financial_values SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Validate financial values
   * @param {string} id - Financial value ID
   * @param {string} validatedBy - User who validated
   * @returns {Promise<Object>} Updated financial values
   */
  static async validate(id, validatedBy) {
    const result = await query(
      `UPDATE process_financial_values
       SET validated_by = $2, validated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, validatedBy]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Delete financial values
   * @param {string} id - Financial value ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const result = await query('DELETE FROM process_financial_values WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
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
      processId: row.process_id,
      annualPremiumRevenue: parseFloat(row.annual_premium_revenue),
      mlrImpactPercentage: parseFloat(row.mlr_impact_percentage),
      stopLossExposure: parseFloat(row.stop_loss_exposure),
      reservesAtRisk: parseFloat(row.reserves_at_risk),
      regulatoryFinePotential: parseFloat(row.regulatory_fine_potential),
      downtimeCostPerDay: parseFloat(row.downtime_cost_per_day),
      downtimeCostPerHour: parseFloat(row.downtime_cost_per_hour),
      dataBreachCost: parseFloat(row.data_breach_cost),
      customerImpactCost: parseFloat(row.customer_impact_cost),
      revenueAtRisk: parseFloat(row.revenue_at_risk),
      methodology: row.methodology,
      assumptions: row.assumptions || [],
      confidenceScore: row.confidence_score ? parseFloat(row.confidence_score) : null,
      validatedBy: row.validated_by,
      validatedAt: row.validated_at,
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

module.exports = ProcessFinancialValue;
