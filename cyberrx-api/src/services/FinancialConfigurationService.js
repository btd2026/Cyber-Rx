/**
 * FinancialConfigurationService
 *
 * Orchestrates all financial parameter configuration including:
 * - MLR target configuration
 * - Stop-loss parameters
 * - Reserve positions
 * - Premium revenue mappings
 * - Risk appetite thresholds
 * - Alert thresholds
 * - Scenario analysis
 * - Parameter validation
 *
 * @author Senior Backend Engineer
 * @date 2025-06-06
 */

const FinancialParameters = require('../models/FinancialParameters');
const MLRTargetConfiguration = require('../models/MLRTargetConfiguration');

class FinancialConfigurationService {
  /**
   * Initialize service with database connection
   * @param {Object} db - Database connection
   */
  constructor(db) {
    this.db = db;
  }

  // ============================================================================
  // MLR Target Configuration Methods
  // ============================================================================

  /**
   * Create MLR target configuration
   * @param {Object} data - MLR target data
   * @returns {Promise<Object>} Created configuration
   */
  async createMLRTarget(data) {
    // Validate data
    const validation = MLRTargetConfiguration.validateData(data);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Create configuration
    const config = await MLRTargetConfiguration.create(data, this.db);

    // Validate CMS compliance
    await MLRTargetConfiguration.validateCMSCompliance(config.id, this.db);

    return config;
  }

  /**
   * Get MLR targets by organization
   * @param {string} organization_id - Organization ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} MLR targets
   */
  async getMLRTargets(organization_id, filters = {}) {
    return MLRTargetConfiguration.findByOrganization(organization_id, this.db, filters);
  }

  /**
   * Get latest active MLR target
   * @param {string} organization_id - Organization ID
   * @param {string} market_segment - Market segment
   * @returns {Promise<Object>} MLR target
   */
  async getLatestMLRTarget(organization_id, market_segment) {
    return MLRTargetConfiguration.findLatestActive(organization_id, market_segment, this.db);
  }

  /**
   * Update MLR target configuration
   * @param {string} id - Configuration ID
   * @param {Object} data - Data to update
   * @returns {Promise<Object>} Updated configuration
   */
  async updateMLRTarget(id, data) {
    const updated = await MLRTargetConfiguration.update(id, data, this.db);

    // Re-validate CMS compliance
    await MLRTargetConfiguration.validateCMSCompliance(id, this.db);

    return updated;
  }

  /**
   * Check MLR breach
   * @param {string} organization_id - Organization ID
   * @param {string} market_segment - Market segment
   * @param {number} current_mlr - Current MLR percentage
   * @returns {Promise<Object>} Breach status
   */
  async checkMLRBreach(organization_id, market_segment, current_mlr) {
    const config = await this.getLatestMLRTarget(organization_id, market_segment);
    if (!config) {
      throw new Error('No MLR target configuration found');
    }

    return MLRTargetConfiguration.checkBreach(config.id, current_mlr, this.db);
  }

  /**
   * Calculate MLR impact from exposure
   * @param {string} organization_id - Organization ID
   * @param {string} market_segment - Market segment
   * @param {number} exposure - Dollar exposure
   * @returns {Promise<number>} MLR impact percentage
   */
  async calculateMLRImpact(organization_id, market_segment, exposure) {
    const config = await this.getLatestMLRTarget(organization_id, market_segment);
    if (!config) {
      throw new Error('No MLR target configuration found');
    }

    return MLRTargetConfiguration.calculateMLRImpact(config.id, exposure, this.db);
  }

  // ============================================================================
  // Stop-Loss Configuration Methods
  // ============================================================================

  /**
   * Create stop-loss parameters
   * @param {Object} data - Stop-loss data
   * @returns {Promise<Object>} Created configuration
   */
  async createStopLossParameters(data) {
    const id = uuidv4();

    // Create financial parameter
    const financialParam = await FinancialParameters.create({
      organization_id: data.organization_id,
      parameter_type: 'stop_loss',
      parameter_name: `Stop-Loss - ${data.line_of_business} - ${data.policy_number}`,
      parameter_value: {
        line_of_business: data.line_of_business,
        carrier: data.carrier_name,
        policy_number: data.policy_number
      },
      version: 1,
      status: 'draft',
      metadata: data.metadata || {}
    }, this.db);

    // Create stop-loss parameters
    const query = `
      INSERT INTO stop_loss_parameters (
        id, organization_id, financial_parameter_id, line_of_business,
        specific_attachment_point, specific_deductible, aggregate_attachment_point,
        aggregate_deductible, aggregate_limit, per_occurrence_limit,
        current_aggregate_position, carrier_name, carrier_contact_email,
        policy_number, policy_effective_date, policy_expiry_date,
        reinsurance_treaty, laser_items, exhaustion_scenarios,
        contract_document_reference
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;

    const values = [
      id,
      data.organization_id,
      financialParam.id,
      data.line_of_business,
      data.specific_attachment_point,
      data.specific_deductible || 0,
      data.aggregate_attachment_point,
      data.aggregate_deductible || 0,
      data.aggregate_limit,
      data.per_occurrence_limit,
      data.current_aggregate_position || 0,
      data.carrier_name,
      data.carrier_contact_email,
      data.policy_number,
      data.policy_effective_date,
      data.policy_expiry_date,
      JSON.stringify(data.reinsurance_treaty || {}),
      JSON.stringify(data.laser_items || []),
      JSON.stringify(data.exhaustion_scenarios || []),
      data.contract_document_reference
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get stop-loss parameters by organization
   * @param {string} organization_id - Organization ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Stop-loss parameters
   */
  async getStopLossParameters(organization_id, filters = {}) {
    const conditions = ['organization_id = $1'];
    const values = [organization_id];
    let paramCount = 1;

    if (filters.line_of_business) {
      paramCount++;
      conditions.push(`line_of_business = $${paramCount}`);
      values.push(filters.line_of_business);
    }

    if (filters.carrier_name) {
      paramCount++;
      conditions.push(`carrier_name = $${paramCount}`);
      values.push(filters.carrier_name);
    }

    const query = `
      SELECT * FROM stop_loss_parameters
      WHERE ${conditions.join(' AND ')}
      ORDER BY policy_expiry_date DESC
    `;

    const result = await this.db.query(query, values);
    return result.rows;
  }

  /**
   * Calculate stop-loss remaining capacity
   * @param {string} id - Stop-loss parameter ID
   * @param {number} exposure - New exposure amount
   * @returns {Promise<number>} Remaining capacity
   */
  async calculateStopLossCapacity(id, exposure) {
    const query = `
      SELECT calculate_stoploss_capacity(aggregate_limit, current_aggregate_position, $2) as capacity
      FROM stop_loss_parameters
      WHERE id = $1
    `;

    const result = await this.db.query(query, [id, exposure]);
    return result.rows[0].capacity;
  }

  // ============================================================================
  // Reserve Positions Methods
  // ============================================================================

  /**
   * Create reserve position
   * @param {Object} data - Reserve position data
   * @returns {Promise<Object>} Created reserve position
   */
  async createReservePosition(data) {
    const id = uuidv4();

    // Create financial parameter
    const financialParam = await FinancialParameters.create({
      organization_id: data.organization_id,
      parameter_type: 'reserve',
      parameter_name: `Reserve - ${data.line_of_business} - ${data.reserve_type}`,
      parameter_value: {
        line_of_business: data.line_of_business,
        reserve_type: data.reserve_type,
        reserve_balance: data.reserve_balance
      },
      version: 1,
      status: 'draft',
      metadata: data.metadata || {}
    }, this.db);

    // Create reserve position
    const query = `
      INSERT INTO reserve_positions (
        id, organization_id, financial_parameter_id, line_of_business,
        reserve_type, reserve_balance, reserve_at_risk, reserve_depletion_rate,
        adequacy_percentage, actuarial_assumptions, reserve_impact_model,
        validation_date, validated_by_actuary
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      id,
      data.organization_id,
      financialParam.id,
      data.line_of_business,
      data.reserve_type,
      data.reserve_balance,
      data.reserve_at_risk || 0,
      data.reserve_depletion_rate || 0,
      data.adequacy_percentage || 100.0,
      JSON.stringify(data.actuarial_assumptions || {}),
      JSON.stringify(data.reserve_impact_model || {}),
      data.validation_date,
      data.validated_by_actuary
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get reserve positions by organization
   * @param {string} organization_id - Organization ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Reserve positions
   */
  async getReservePositions(organization_id, filters = {}) {
    const conditions = ['organization_id = $1'];
    const values = [organization_id];
    let paramCount = 1;

    if (filters.line_of_business) {
      paramCount++;
      conditions.push(`line_of_business = $${paramCount}`);
      values.push(filters.line_of_business);
    }

    if (filters.reserve_type) {
      paramCount++;
      conditions.push(`reserve_type = $${paramCount}`);
      values.push(filters.reserve_type);
    }

    const query = `
      SELECT * FROM reserve_positions
      WHERE ${conditions.join(' AND ')}
      ORDER BY validation_date DESC
    `;

    const result = await this.db.query(query, values);
    return result.rows;
  }

  /**
   * Validate reserve adequacy
   * @param {string} id - Reserve position ID
   * @returns {Promise<boolean>} Adequacy status
   */
  async validateReserveAdequacy(id) {
    const query = `
      SELECT validate_reserve_adequacy(reserve_balance, reserve_at_risk, adequacy_percentage) as adequate
      FROM reserve_positions
      WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);
    return result.rows[0].adequate;
  }

  // ============================================================================
  // Premium Revenue Mapping Methods
  // ============================================================================

  /**
   * Create premium revenue mapping
   * @param {Object} data - Revenue mapping data
   * @returns {Promise<Object>} Created mapping
   */
  async createPremiumRevenueMapping(data) {
    const id = uuidv4();

    // Create financial parameter
    const financialParam = await FinancialParameters.create({
      organization_id: data.organization_id,
      parameter_type: 'premium_revenue',
      parameter_name: `Premium Revenue - ${data.business_process_id} - ${data.line_of_business}`,
      parameter_value: {
        business_process_id: data.business_process_id,
        line_of_business: data.line_of_business,
        state_code: data.state_code,
        annual_premium_revenue: data.annual_premium_revenue
      },
      version: 1,
      status: 'draft',
      metadata: data.metadata || {}
    }, this.db);

    // Create revenue mapping
    const query = `
      INSERT INTO premium_revenue_mappings (
        id, organization_id, financial_parameter_id, business_process_id,
        line_of_business, state_code, monthly_premium_revenue, quarterly_premium_revenue,
        annual_premium_revenue, member_count, premium_per_member_month,
        revenue_at_risk_percentage, revenue_at_risk_amount, seasonality_factor,
        revenue_trend, gl_account_reference
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      id,
      data.organization_id,
      financialParam.id,
      data.business_process_id,
      data.line_of_business,
      data.state_code,
      data.monthly_premium_revenue || 0,
      data.quarterly_premium_revenue || 0,
      data.annual_premium_revenue,
      data.member_count || 0,
      data.premium_per_member_month || 0,
      data.revenue_at_risk_percentage || 0,
      data.revenue_at_risk_amount || 0,
      data.seasonality_factor || 1.0,
      data.revenue_trend,
      data.gl_account_reference
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get premium revenue mappings by organization
   * @param {string} organization_id - Organization ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Revenue mappings
   */
  async getPremiumRevenueMappings(organization_id, filters = {}) {
    const conditions = ['organization_id = $1'];
    const values = [organization_id];
    let paramCount = 1;

    if (filters.business_process_id) {
      paramCount++;
      conditions.push(`business_process_id = $${paramCount}`);
      values.push(filters.business_process_id);
    }

    if (filters.line_of_business) {
      paramCount++;
      conditions.push(`line_of_business = $${paramCount}`);
      values.push(filters.line_of_business);
    }

    if (filters.state_code) {
      paramCount++;
      conditions.push(`state_code = $${paramCount}`);
      values.push(filters.state_code);
    }

    const query = `
      SELECT * FROM premium_revenue_mappings
      WHERE ${conditions.join(' AND ')}
      ORDER BY annual_premium_revenue DESC
    `;

    const result = await this.db.query(query, values);
    return result.rows;
  }

  /**
   * Calculate revenue at risk
   * @param {string} id - Revenue mapping ID
   * @returns {Promise<number>} Revenue at risk
   */
  async calculateRevenueAtRisk(id) {
    const query = `
      SELECT calculate_revenue_at_risk(annual_premium_revenue, revenue_at_risk_percentage) as revenue_at_risk
      FROM premium_revenue_mappings
      WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);
    return result.rows[0].revenue_at_risk;
  }

  // ============================================================================
  // Risk Appetite Threshold Methods
  // ============================================================================

  /**
   * Create risk appetite threshold
   * @param {Object} data - Threshold data
   * @returns {Promise<Object>} Created threshold
   */
  async createRiskAppetiteThreshold(data) {
    const id = uuidv4();

    // Create financial parameter
    const financialParam = await FinancialParameters.create({
      organization_id: data.organization_id,
      parameter_type: 'risk_appetite',
      parameter_name: `Risk Appetite - ${data.threshold_level} - ${data.threshold_category}`,
      parameter_value: {
        threshold_level: data.threshold_level,
        threshold_category: data.threshold_category,
        threshold_metric: data.threshold_metric,
        threshold_value: data.threshold_value
      },
      version: 1,
      status: 'draft',
      metadata: data.metadata || {}
    }, this.db);

    // Create threshold
    const query = `
      INSERT INTO risk_appetite_thresholds (
        id, organization_id, financial_parameter_id, threshold_level,
        threshold_category, threshold_metric, threshold_value, threshold_unit,
        warning_threshold_percentage, critical_threshold_percentage,
        escalation_trigger, notification_recipients, approval_document_reference,
        approved_by_board, approved_date, review_frequency, next_review_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const values = [
      id,
      data.organization_id,
      financialParam.id,
      data.threshold_level,
      data.threshold_category,
      data.threshold_metric,
      data.threshold_value,
      data.threshold_unit,
      data.warning_threshold_percentage || 80.0,
      data.critical_threshold_percentage || 90.0,
      data.escalation_trigger,
      JSON.stringify(data.notification_recipients || []),
      data.approval_document_reference,
      data.approved_by_board,
      data.approved_date,
      data.review_frequency,
      data.next_review_date
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get risk appetite thresholds by organization
   * @param {string} organization_id - Organization ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Thresholds
   */
  async getRiskAppetiteThresholds(organization_id, filters = {}) {
    const conditions = ['organization_id = $1'];
    const values = [organization_id];
    let paramCount = 1;

    if (filters.threshold_level) {
      paramCount++;
      conditions.push(`threshold_level = $${paramCount}`);
      values.push(filters.threshold_level);
    }

    if (filters.threshold_category) {
      paramCount++;
      conditions.push(`threshold_category = $${paramCount}`);
      values.push(filters.threshold_category);
    }

    const query = `
      SELECT * FROM risk_appetite_thresholds
      WHERE ${conditions.join(' AND ')}
      ORDER BY threshold_level, threshold_category, threshold_metric
    `;

    const result = await this.db.query(query, values);
    return result.rows;
  }

  /**
   * Check if threshold is breached
   * @param {string} id - Threshold ID
   * @param {number} current_value - Current value
   * @returns {Promise<Object>} Breach status
   */
  async checkThresholdBreach(id, current_value) {
    const query = `
      SELECT
        check_threshold_breach($2, threshold_value, '>') as breached,
        threshold_value,
        threshold_metric,
        threshold_unit,
        warning_threshold_percentage,
        critical_threshold_percentage
      FROM risk_appetite_thresholds
      WHERE id = $1
    `;

    const result = await this.db.query(query, [id, current_value]);
    const row = result.rows[0];

    if (!row) {
      throw new Error('Threshold not found');
    }

    const warningLevel = row.threshold_value * (row.warning_threshold_percentage / 100);
    const criticalLevel = row.threshold_value * (row.critical_threshold_percentage / 100);

    let severity = 'none';
    if (row.breached) {
      if (current_value >= criticalLevel) {
        severity = 'critical';
      } else if (current_value >= warningLevel) {
        severity = 'warning';
      } else {
        severity = 'info';
      }
    }

    return {
      breached: row.breached,
      severity,
      current_value,
      threshold_value: row.threshold_value,
      threshold_metric: row.threshold_metric,
      threshold_unit: row.threshold_unit,
      warning_level: warningLevel,
      critical_level: criticalLevel,
      variance_percentage: ((current_value - row.threshold_value) / row.threshold_value) * 100
    };
  }

  // ============================================================================
  // Alert Threshold Configuration Methods
  // ============================================================================

  /**
   * Create alert threshold configuration
   * @param {Object} data - Alert threshold data
   * @returns {Promise<Object>} Created configuration
   */
  async createAlertThreshold(data) {
    const id = uuidv4();

    // Create financial parameter
    const financialParam = await FinancialParameters.create({
      organization_id: data.organization_id,
      parameter_type: 'alert_threshold',
      parameter_name: `Alert Threshold - ${data.alert_type} - ${data.alert_severity}`,
      parameter_value: {
        alert_type: data.alert_type,
        alert_severity: data.alert_severity,
        threshold_value: data.alert_threshold_value
      },
      version: 1,
      status: 'draft',
      metadata: data.metadata || {}
    }, this.db);

    // Create alert threshold
    const query = `
      INSERT INTO alert_threshold_configurations (
        id, organization_id, financial_parameter_id, alert_type, alert_condition,
        alert_threshold_value, alert_severity, comparison_operator,
        hysteresis_percentage, cooldown_period_minutes, notification_channels,
        escalation_rules, suppression_rules, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const values = [
      id,
      data.organization_id,
      financialParam.id,
      data.alert_type,
      JSON.stringify(data.alert_condition),
      data.alert_threshold_value,
      data.alert_severity,
      data.comparison_operator,
      data.hysteresis_percentage || 5.0,
      data.cooldown_period_minutes || 60,
      JSON.stringify(data.notification_channels || []),
      JSON.stringify(data.escalation_rules || []),
      JSON.stringify(data.suppression_rules || []),
      data.is_active !== false
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get alert threshold configurations by organization
   * @param {string} organization_id - Organization ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Alert thresholds
   */
  async getAlertThresholds(organization_id, filters = {}) {
    const conditions = ['organization_id = $1'];
    const values = [organization_id];
    let paramCount = 1;

    if (filters.alert_type) {
      paramCount++;
      conditions.push(`alert_type = $${paramCount}`);
      values.push(filters.alert_type);
    }

    if (filters.alert_severity) {
      paramCount++;
      conditions.push(`alert_severity = $${paramCount}`);
      values.push(filters.alert_severity);
    }

    if (filters.is_active !== undefined) {
      paramCount++;
      conditions.push(`is_active = $${paramCount}`);
      values.push(filters.is_active);
    }

    const query = `
      SELECT * FROM alert_threshold_configurations
      WHERE ${conditions.join(' AND ')}
      ORDER BY alert_type, alert_severity
    `;

    const result = await this.db.query(query, values);
    return result.rows;
  }

  // ============================================================================
  // Scenario Analysis Methods
  // ============================================================================

  /**
   * Create scenario analysis configuration
   * @param {Object} data - Scenario data
   * @returns {Promise<Object>} Created scenario
   */
  async createScenarioConfiguration(data) {
    const id = uuidv4();

    // Create financial parameter
    const financialParam = await FinancialParameters.create({
      organization_id: data.organization_id,
      parameter_type: 'scenario',
      parameter_name: `Scenario - ${data.scenario_name}`,
      parameter_value: {
        scenario_name: data.scenario_name,
        scenario_type: data.scenario_type
      },
      version: 1,
      status: 'draft',
      metadata: data.metadata || {}
    }, this.db);

    // Create scenario configuration
    const query = `
      INSERT INTO scenario_analysis_configurations (
        id, organization_id, financial_parameter_id, scenario_name, scenario_type,
        scenario_description, impact_parameters, financial_assumptions,
        probability_distribution, monte_carlo_iterations, sensitivity_variables,
        stress_test_factors, output_metrics, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const values = [
      id,
      data.organization_id,
      financialParam.id,
      data.scenario_name,
      data.scenario_type,
      data.scenario_description,
      JSON.stringify(data.impact_parameters),
      JSON.stringify(data.financial_assumptions),
      data.probability_distribution || 'uniform',
      data.monte_carlo_iterations || 10000,
      JSON.stringify(data.sensitivity_variables || []),
      JSON.stringify(data.stress_test_factors || []),
      JSON.stringify(data.output_metrics || []),
      data.created_by
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get scenario configurations by organization
   * @param {string} organization_id - Organization ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Scenario configurations
   */
  async getScenarioConfigurations(organization_id, filters = {}) {
    const conditions = ['organization_id = $1'];
    const values = [organization_id];
    let paramCount = 1;

    if (filters.scenario_type) {
      paramCount++;
      conditions.push(`scenario_type = $${paramCount}`);
      values.push(filters.scenario_type);
    }

    const query = `
      SELECT * FROM scenario_analysis_configurations
      WHERE ${conditions.join(' AND ')}
      ORDER BY scenario_name
    `;

    const result = await this.db.query(query, values);
    return result.rows;
  }

  // ============================================================================
  // Parameter Validation Methods
  // ============================================================================

  /**
   * Validate parameter
   * @param {string} financial_parameter_id - Parameter ID
   * @param {string} validation_type - Validation type
   * @param {Object} validation_details - Validation details
   * @param {string} validated_by - Validator
   * @returns {Promise<Object>} Validation record
   */
  async validateParameter(financial_parameter_id, validation_type, validation_details, validated_by) {
    const id = uuidv4();

    const validation_status = validation_details.passed ? 'passed' : 'failed';
    const validation_score = validation_details.score || null;

    const query = `
      INSERT INTO parameter_validation_records (
        id, organization_id, financial_parameter_id, validation_type,
        validation_status, validation_score, validation_details,
        validation_errors, validation_warnings, compared_to_baseline,
        baseline_variance_percentage, validated_by
      ) VALUES (
        $1, (SELECT organization_id FROM financial_parameters WHERE id = $2),
        $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      ) RETURNING *
    `;

    const values = [
      id,
      financial_parameter_id,
      validation_type,
      validation_status,
      validation_score,
      JSON.stringify(validation_details),
      JSON.stringify(validation_details.errors || []),
      JSON.stringify(validation_details.warnings || []),
      validation_details.compared_to_baseline || false,
      validation_details.baseline_variance_percentage,
      validated_by
    ];

    const result = await this.db.query(query, values);

    // Update parameter status based on validation
    if (validation_status === 'passed') {
      await FinancialParameters.validate(financial_parameter_id, 'validated', validated_by, this.db);
    } else {
      await FinancialParameters.validate(financial_parameter_id, 'failed', validated_by, this.db);
    }

    return result.rows[0];
  }

  /**
   * Get validation records for parameter
   * @param {string} financial_parameter_id - Parameter ID
   * @returns {Promise<Array>} Validation records
   */
  async getValidationRecords(financial_parameter_id) {
    const query = `
      SELECT * FROM parameter_validation_records
      WHERE financial_parameter_id = $1
      ORDER BY validated_at DESC
    `;

    const result = await this.db.query(query, [financial_parameter_id]);
    return result.rows;
  }

  // ============================================================================
  // Workflow and Approval Methods
  // ============================================================================

  /**
   * Submit parameter for approval
   * @param {string} financial_parameter_id - Parameter ID
   * @param {string} submitted_by - Submitter
   * @param {string} change_description - Change description
   * @returns {Promise<Object>} Workflow record
   */
  async submitForApproval(financial_parameter_id, submitted_by, change_description) {
    const id = uuidv4();

    // Update parameter status
    await FinancialParameters.submitForApproval(financial_parameter_id, this.db);

    // Create workflow record
    const query = `
      INSERT INTO parameter_approval_workflow (
        id, organization_id, financial_parameter_id, workflow_status,
        submitted_by, change_impact_assessment
      ) VALUES (
        $1, (SELECT organization_id FROM financial_parameters WHERE id = $2),
        $2, 'pending', $3, $4
      ) RETURNING *
    `;

    const result = await this.db.query(query, [id, financial_parameter_id, submitted_by, JSON.stringify({})]);
    return result.rows[0];
  }

  /**
   * Approve parameter
   * @param {string} workflow_id - Workflow ID
   * @param {string} approved_by - Approver
   * @param {string} review_comments - Review comments
   * @returns {Promise<Object>} Updated workflow
   */
  async approveParameter(workflow_id, approved_by, review_comments) {
    // Get workflow
    const workflowQuery = 'SELECT * FROM parameter_approval_workflow WHERE id = $1';
    const workflowResult = await this.db.query(workflowQuery, [workflow_id]);
    const workflow = workflowResult.rows[0];

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Update workflow
    const updateQuery = `
      UPDATE parameter_approval_workflow
      SET workflow_status = 'approved', reviewed_by = $2, reviewed_at = NOW(),
          review_comments = $3, approved_by = $2, approved_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query(updateQuery, [workflow_id, approved_by, review_comments]);

    // Approve parameter
    await FinancialParameters.approve(workflow.financial_parameter_id, approved_by, this.db);

    return result.rows[0];
  }

  /**
   * Reject parameter
   * @param {string} workflow_id - Workflow ID
   * @param {string} approved_by - Approver
   * @param {string} rejection_reason - Rejection reason
   * @returns {Promise<Object>} Updated workflow
   */
  async rejectParameter(workflow_id, approved_by, rejection_reason) {
    // Get workflow
    const workflowQuery = 'SELECT * FROM parameter_approval_workflow WHERE id = $1';
    const workflowResult = await this.db.query(workflowQuery, [workflow_id]);
    const workflow = workflowResult.rows[0];

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Update workflow
    const updateQuery = `
      UPDATE parameter_approval_workflow
      SET workflow_status = 'rejected', reviewed_by = $2, reviewed_at = NOW(),
          review_comments = $3, rejection_reason = $3
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query(updateQuery, [workflow_id, approved_by, rejection_reason]);

    // Reject parameter
    await FinancialParameters.reject(workflow.financial_parameter_id, approved_by, rejection_reason, this.db);

    return result.rows[0];
  }

  // ============================================================================
  // Summary and Statistics Methods
  // ============================================================================

  /**
   * Get financial parameters summary
   * @param {string} organization_id - Organization ID
   * @returns {Promise<Object>} Summary
   */
  async getSummary(organization_id) {
    const stats = await FinancialParameters.getStatistics(organization_id, this.db);

    // Get MLR targets count
    const mlrQuery = 'SELECT COUNT(*) as count FROM mlr_target_configurations WHERE organization_id = $1';
    const mlrResult = await this.db.query(mlrQuery, [organization_id]);
    stats.mlr_targets = parseInt(mlrResult.rows[0].count);

    // Get stop-loss count
    const slQuery = 'SELECT COUNT(*) as count FROM stop_loss_parameters WHERE organization_id = $1';
    const slResult = await this.db.query(slQuery, [organization_id]);
    stats.stop_loss_parameters = parseInt(slResult.rows[0].count);

    // Get reserve positions count
    const rpQuery = 'SELECT COUNT(*) as count FROM reserve_positions WHERE organization_id = $1';
    const rpResult = await this.db.query(rpQuery, [organization_id]);
    stats.reserve_positions = parseInt(rpResult.rows[0].count);

    // Get premium revenue mappings count
    const prQuery = 'SELECT COUNT(*) as count FROM premium_revenue_mappings WHERE organization_id = $1';
    const prResult = await this.db.query(prQuery, [organization_id]);
    stats.premium_revenue_mappings = parseInt(prResult.rows[0].count);

    // Get risk appetite thresholds count
    const raQuery = 'SELECT COUNT(*) as count FROM risk_appetite_thresholds WHERE organization_id = $1';
    const raResult = await this.db.query(raQuery, [organization_id]);
    stats.risk_appetite_thresholds = parseInt(raResult.rows[0].count);

    // Get alert thresholds count
    const atQuery = 'SELECT COUNT(*) as count FROM alert_threshold_configurations WHERE organization_id = $1 AND is_active = true';
    const atResult = await this.db.query(atQuery, [organization_id]);
    stats.active_alert_thresholds = parseInt(atResult.rows[0].count);

    // Get scenario configurations count
    const scQuery = 'SELECT COUNT(*) as count FROM scenario_analysis_configurations WHERE organization_id = $1';
    const scResult = await this.db.query(scQuery, [organization_id]);
    stats.scenario_configurations = parseInt(scResult.rows[0].count);

    // Get validation records count
    const vrQuery = 'SELECT COUNT(*) as count FROM parameter_validation_records WHERE organization_id = $1';
    const vrResult = await this.db.query(vrQuery, [organization_id]);
    stats.validation_records = parseInt(vrResult.rows[0].count);

    return stats;
  }
}

module.exports = FinancialConfigurationService;
