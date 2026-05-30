'use strict';

const { query } = require('../utils/db');

/**
 * FinancialImpact Model
 *
 * Represents financial impact analysis for risks
 * CFO model - tracks breach costs, fines, and net exposure
 */
class FinancialImpact {
  /**
   * Create or update financial impact for a risk
   * @param {Object} data - Financial impact data
   * @param {string} data.id - UUID
   * @param {string} data.riskId - Risk ID
   * @param {string} data.organizationId - Organization ID
   * @param {string} [data.scenarioId] - Scenario ID
   * @param {number} [data.breachResponseCost] - Breach response cost
   * @param {number} [data.regulatoryFine] - Regulatory fine
   * @param {number} [data.businessInterruption] - Business interruption loss
   * @param {number} [data.fraudLoss] - Fraud loss
   * @param {number} [data.reputationalLoss] - Reputational loss
   * @param {number} [data.legalCost] - Legal cost
   * @param {number} [data.recoveryCost] - Recovery cost
   * @param {number} [data.totalGross] - Total gross exposure
   * @param {number} [data.insuranceCoverage] - Insurance coverage
   * @param {number} [data.netExposure] - Net exposure after insurance
   * @returns {Promise<Object>} Created/updated financial impact
   */
  static async create(data) {
    const {
      id,
      riskId,
      organizationId,
      scenarioId = null,
      breachResponseCost = 0,
      regulatoryFine = 0,
      businessInterruption = 0,
      fraudLoss = 0,
      reputationalLoss = 0,
      legalCost = 0,
      recoveryCost = 0,
      totalGross = null,
      insuranceCoverage = 0,
      netExposure = null
    } = data;

    // Calculate totals if not provided
    const calculatedGross = totalGross !== null ? totalGross :
      breachResponseCost + regulatoryFine + businessInterruption +
      fraudLoss + reputationalLoss + legalCost + recoveryCost;

    const calculatedNet = netExposure !== null ? netExposure : calculatedGross - insuranceCoverage;

    const result = await query(
      `INSERT INTO financial_impacts (
        id, risk_id, organization_id, scenario_id,
        breach_response_cost, regulatory_fine, business_interruption, fraud_loss,
        reputational_loss, legal_cost, recovery_cost,
        total_gross, insurance_coverage, net_exposure
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (risk_id) DO UPDATE SET
        scenario_id = EXCLUDED.scenario_id,
        breach_response_cost = EXCLUDED.breach_response_cost,
        regulatory_fine = EXCLUDED.regulatory_fine,
        business_interruption = EXCLUDED.business_interruption,
        fraud_loss = EXCLUDED.fraud_loss,
        reputational_loss = EXCLUDED.reputational_loss,
        legal_cost = EXCLUDED.legal_cost,
        recovery_cost = EXCLUDED.recovery_cost,
        total_gross = EXCLUDED.total_gross,
        insurance_coverage = EXCLUDED.insurance_coverage,
        net_exposure = EXCLUDED.net_exposure,
        updated_at = NOW()
      RETURNING *`,
      [
        id, riskId, organizationId, scenarioId,
        breachResponseCost, regulatoryFine, businessInterruption, fraudLoss,
        reputationalLoss, legalCost, recoveryCost,
        calculatedGross, insuranceCoverage, calculatedNet
      ]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Find financial impact by risk ID
   * @param {string} riskId - Risk ID
   * @returns {Promise<Object|null>} Financial impact or null
   */
  static async findByRiskId(riskId) {
    const result = await query(
      'SELECT * FROM financial_impacts WHERE risk_id = $1',
      [riskId]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Find financial impact by ID
   * @param {string} id - Financial impact ID
   * @returns {Promise<Object|null>} Financial impact or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM financial_impacts WHERE id = $1',
      [id]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Delete financial impact
   * @param {string} id - Financial impact ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const result = await query('DELETE FROM financial_impacts WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  /**
   * Get organization's total financial exposure
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Total exposure summary
   */
  static async getTotalExposure(organizationId) {
    const result = await query(
      `SELECT
         COUNT(*) as risk_count,
         COALESCE(SUM(net_exposure), 0) as total_net_exposure,
         COALESCE(SUM(total_gross), 0) as total_gross_exposure,
         COALESCE(SUM(regulatory_fine), 0) as total_regulatory_fines,
         COALESCE(SUM(breach_response_cost), 0) as total_breach_costs
       FROM financial_impacts
       WHERE organization_id = $1`,
      [organizationId]
    );

    const row = result[0];
    return {
      riskCount: parseInt(row.risk_count),
      totalNetExposure: parseFloat(row.total_net_exposure),
      totalGrossExposure: parseFloat(row.total_gross_exposure),
      totalRegulatoryFines: parseFloat(row.total_regulatory_fines),
      totalBreachCosts: parseFloat(row.total_breach_costs)
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
      riskId: row.risk_id,
      organizationId: row.organization_id,
      scenarioId: row.scenario_id,
      breachResponseCost: row.breach_response_cost,
      regulatoryFine: row.regulatory_fine,
      businessInterruption: row.business_interruption,
      fraudLoss: row.fraud_loss,
      reputationalLoss: row.reputational_loss,
      legalCost: row.legal_cost,
      recoveryCost: row.recovery_cost,
      totalGross: row.total_gross,
      insuranceCoverage: row.insurance_coverage,
      netExposure: row.net_exposure,
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

module.exports = FinancialImpact;
