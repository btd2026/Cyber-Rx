/**
 * MLRTargetConfiguration Model
 *
 * Model for managing MLR (Medical Loss Ratio) target configurations
 * per market segment and tax year.
 *
 * @author Senior Backend Engineer
 * @date 2025-06-06
 */

const { v4: uuidv4 } = require('uuid');
const FinancialParameters = require('./FinancialParameters');

class MLRTargetConfiguration {
  /**
   * Create MLR target configuration
   * @param {Object} data - MLR target data
   * @param {Object} db - Database connection
   * @returns {Promise<Object>} Created configuration
   */
  static async create(data, db) {
    const id = uuidv4();

    // First create the financial parameter
    const financialParam = await FinancialParameters.create({
      organization_id: data.organization_id,
      parameter_type: 'mlr_target',
      parameter_name: `MLR Target - ${data.market_segment} - ${data.tax_year}`,
      parameter_value: {
        target_percentage: data.mlr_target_percentage,
        market_segment: data.market_segment,
        tax_year: data.tax_year
      },
      version: 1,
      status: 'draft',
      metadata: data.metadata || {}
    }, db);

    // Now create the MLR target configuration
    const query = `
      INSERT INTO mlr_target_configurations (
        id, organization_id, financial_parameter_id, market_segment,
        mlr_target_percentage, cms_minimum_percentage, premium_revenue_baseline,
        claims_cost_baseline, quality_supplement_amount, rebate_threshold_percentage,
        mlr_impact_threshold_percentage, tax_year, reporting_quarter,
        methodology, assumptions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const values = [
      id,
      data.organization_id,
      financialParam.id,
      data.market_segment,
      data.mlr_target_percentage,
      data.cms_minimum_percentage || 85.0,
      data.premium_revenue_baseline,
      data.claims_cost_baseline,
      data.quality_supplement_amount || 0,
      data.rebate_threshold_percentage || 80.0,
      data.mlr_impact_threshold_percentage || 2.0,
      data.tax_year,
      data.reporting_quarter || 'annual',
      data.methodology,
      JSON.stringify(data.assumptions || [])
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Find MLR target by ID
   * @param {string} id - Configuration ID
   * @param {Object} db - Database connection
   * @returns {Promise<Object>} Configuration
   */
  static async findById(id, db) {
    const query = 'SELECT * FROM mlr_target_configurations WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Find MLR targets by organization
   * @param {string} organization_id - Organization ID
   * @param {Object} db - Database connection
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of configurations
   */
  static async findByOrganization(organization_id, db, filters = {}) {
    const conditions = ['organization_id = $1'];
    const values = [organization_id];
    let paramCount = 1;

    if (filters.market_segment) {
      paramCount++;
      conditions.push(`market_segment = $${paramCount}`);
      values.push(filters.market_segment);
    }

    if (filters.tax_year) {
      paramCount++;
      conditions.push(`tax_year = $${paramCount}`);
      values.push(filters.tax_year);
    }

    if (filters.reporting_quarter) {
      paramCount++;
      conditions.push(`reporting_quarter = $${paramCount}`);
      values.push(filters.reporting_quarter);
    }

    if (filters.validation_status) {
      paramCount++;
      conditions.push(`validation_status = $${paramCount}`);
      values.push(filters.validation_status);
    }

    const query = `
      SELECT * FROM mlr_target_configurations
      WHERE ${conditions.join(' AND ')}
      ORDER BY tax_year DESC, market_segment, reporting_quarter
    `;

    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Find latest active MLR target
   * @param {string} organization_id - Organization ID
   * @param {string} market_segment - Market segment
   * @param {Object} db - Database connection
   * @returns {Promise<Object>} Configuration
   */
  static async findLatestActive(organization_id, market_segment, db) {
    const query = `
      SELECT mtc.* FROM mlr_target_configurations mtc
      JOIN financial_parameters fp ON mtc.financial_parameter_id = fp.id
      WHERE mtc.organization_id = $1
        AND mtc.market_segment = $2
        AND fp.status = 'active'
        AND (fp.effective_date IS NULL OR fp.effective_date <= NOW())
        AND (fp.expiry_date IS NULL OR fp.expiry_date > NOW())
      ORDER BY mtc.tax_year DESC, mtc.reporting_quarter DESC
      LIMIT 1
    `;

    const result = await db.query(query, [organization_id, market_segment]);
    return result.rows[0];
  }

  /**
   * Update MLR target configuration
   * @param {string} id - Configuration ID
   * @param {Object} data - Data to update
   * @param {Object} db - Database connection
   * @returns {Promise<Object>} Updated configuration
   */
  static async update(id, data, db) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const updatableFields = [
      'mlr_target_percentage', 'cms_minimum_percentage', 'premium_revenue_baseline',
      'claims_cost_baseline', 'quality_supplement_amount', 'rebate_threshold_percentage',
      'mlr_impact_threshold_percentage', 'methodology', 'assumptions',
      'validation_status', 'validated_by', 'validated_at'
    ];

    updatableFields.forEach(field => {
      if (data[field] !== undefined) {
        paramCount++;
        fields.push(`${field} = $${paramCount}`);
        if (field === 'assumptions') {
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
      UPDATE mlr_target_configurations
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount + 1}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete MLR target configuration
   * @param {string} id - Configuration ID
   * @param {Object} db - Database connection
   * @returns {Promise<boolean>} Success
   */
  static async delete(id, db) {
    const query = 'DELETE FROM mlr_target_configurations WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Validate MLR target against CMS requirements
   * @param {string} id - Configuration ID
   * @param {Object} db - Database connection
   * @returns {Promise<Object>} Validation result
   */
  static async validateCMSCompliance(id, db) {
    const config = await this.findById(id, db);
    if (!config) {
      throw new Error('Configuration not found');
    }

    const query = 'SELECT check_mlr_compliance($1, $2) as compliant';
    const result = await db.query(query, [config.mlr_target_percentage, config.market_segment]);
    const compliant = result.rows[0].compliant;

    return this.update(id, {
      validation_status: compliant ? 'validated' : 'failed',
      validated_at: new Date()
    }, db);
  }

  /**
   * Calculate MLR impact from exposure
   * @param {string} id - Configuration ID
   * @param {number} exposure - Dollar exposure
   * @param {Object} db - Database connection
   * @returns {Promise<number>} MLR impact percentage
   */
  static async calculateMLRImpact(id, exposure, db) {
    const config = await this.findById(id, db);
    if (!config) {
      throw new Error('Configuration not found');
    }

    const query = 'SELECT calculate_mlr_impact_from_exposure($1, $2) as mlr_impact';
    const result = await db.query(query, [exposure, config.premium_revenue_baseline]);
    return result.rows[0].mlr_impact;
  }

  /**
   * Check if MLR target is breached
   * @param {string} id - Configuration ID
   * @param {number} current_mlr - Current MLR percentage
   * @param {Object} db - Database connection
   * @returns {Promise<Object>} Breach status
   */
  static async checkBreach(id, current_mlr, db) {
    const config = await this.findById(id, db);
    if (!config) {
      throw new Error('Configuration not found');
    }

    const threshold = config.mlr_target_percentage + config.mlr_impact_threshold_percentage;
    const breached = current_mlr > threshold;

    return {
      breached,
      current_mlr,
      target: config.mlr_target_percentage,
      threshold,
      variance: current_mlr - config.mlr_target_percentage
    };
  }

  /**
   * Get MLR targets summary
   * @param {string} organization_id - Organization ID
   * @param {number} tax_year - Tax year
   * @param {Object} db - Database connection
   * @returns {Promise<Object>} Summary
   */
  static async getSummary(organization_id, tax_year, db) {
    const query = `
      SELECT
        market_segment,
        COUNT(*) as config_count,
        AVG(mlr_target_percentage) as avg_target,
        AVG(premium_revenue_baseline) as avg_premium,
        AVG(claims_cost_baseline) as avg_claims,
        SUM(CASE WHEN validation_status = 'validated' THEN 1 ELSE 0 END) as validated_count
      FROM mlr_target_configurations
      WHERE organization_id = $1 AND tax_year = $2
      GROUP BY market_segment
      ORDER BY market_segment
    `;

    const result = await db.query(query, [organization_id, tax_year]);
    return result.rows;
  }

  /**
   * Validate MLR configuration data
   * @param {Object} data - Configuration data
   * @returns {Object} Validation result
   */
  static validateData(data) {
    const errors = [];
    const warnings = [];

    // Required fields
    if (!data.organization_id) errors.push('organization_id is required');
    if (!data.market_segment) errors.push('market_segment is required');
    if (!data.mlr_target_percentage) errors.push('mlr_target_percentage is required');
    if (!data.premium_revenue_baseline) errors.push('premium_revenue_baseline is required');
    if (!data.claims_cost_baseline) errors.push('claims_cost_baseline is required');
    if (!data.tax_year) errors.push('tax_year is required');

    // Valid ranges
    if (data.mlr_target_percentage && (data.mlr_target_percentage < 0 || data.mlr_target_percentage > 100)) {
      errors.push('mlr_target_percentage must be between 0 and 100');
    }

    if (data.cms_minimum_percentage && (data.cms_minimum_percentage < 0 || data.cms_minimum_percentage > 100)) {
      errors.push('cms_minimum_percentage must be between 0 and 100');
    }

    if (data.premium_revenue_baseline && data.premium_revenue_baseline < 0) {
      errors.push('premium_revenue_baseline must be non-negative');
    }

    if (data.claims_cost_baseline && data.claims_cost_baseline < 0) {
      errors.push('claims_cost_baseline must be non-negative');
    }

    // Logical consistency
    if (data.mlr_target_percentage && data.cms_minimum_percentage) {
      if (data.mlr_target_percentage < data.cms_minimum_percentage) {
        warnings.push('MLR target is below CMS minimum, may not be compliant');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

module.exports = MLRTargetConfiguration;
