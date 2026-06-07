/**
 * Financial Parameters API Routes
 *
 * REST API endpoints for managing financial parameters including:
 * - MLR target configurations
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

const express = require('express');
const router = express.Router();
const FinancialConfigurationService = require('../services/FinancialConfigurationService');
const authenticateToken = require('../middleware/auth');

/**
 * Middleware to initialize service with database connection
 */
router.use((req, res, next) => {
  req.financialService = new FinancialConfigurationService(req.db);
  next();
});

// ============================================================================
// MLR Target Configuration Endpoints
// ============================================================================

/**
 * POST /api/financial-parameters/mlr-targets
 * Create MLR target configuration
 */
router.post('/mlr-targets', authenticateToken, async (req, res) => {
  try {
    const config = await req.financialService.createMLRTarget(req.body);
    res.status(201).json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/financial-parameters/mlr-targets
 * Get MLR targets by organization
 */
router.get('/mlr-targets', authenticateToken, async (req, res) => {
  try {
    const { organization_id } = req.user;
    const filters = {
      market_segment: req.query.market_segment,
      tax_year: req.query.tax_year ? parseInt(req.query.tax_year) : undefined,
      reporting_quarter: req.query.reporting_quarter,
      validation_status: req.query.validation_status
    };

    const targets = await req.financialService.getMLRTargets(organization_id, filters);
    res.json({
      success: true,
      data: targets,
      count: targets.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/financial-parameters/mlr-targets/:id
 * Get MLR target by ID
 */
router.get('/mlr-targets/:id', authenticateToken, async (req, res) => {
  try {
    const { organization_id } = req.user;
    const service = require('../services/FinancialConfigurationService');
    const MLRTargetConfiguration = require('../models/MLRTargetConfiguration');

    const config = await MLRTargetConfiguration.findById(req.params.id, req.db);

    if (!config || config.organization_id !== organization_id) {
      return res.status(404).json({
        success: false,
        error: 'MLR target not found'
      });
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/financial-parameters/mlr-targets/:id
 * Update MLR target configuration
 */
router.put('/mlr-targets/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await req.financialService.updateMLRTarget(req.params.id, req.body);
    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/financial-parameters/mlr-targets/check-breach
 * Check MLR breach
 */
router.get('/mlr-targets/check-breach', authenticateToken, async (req, res) => {
  try {
    const { organization_id } = req.user;
    const { market_segment, current_mlr } = req.query;

    if (!market_segment || !current_mlr) {
      return res.status(400).json({
        success: false,
        error: 'market_segment and current_mlr are required'
      });
    }

    const breachStatus = await req.financialService.checkMLRBreach(
      organization_id,
      market_segment,
      parseFloat(current_mlr)
    );

    res.json({
      success: true,
      data: breachStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// Stop-Loss Parameters Endpoints
// ============================================================================

/**
 * POST /api/financial-parameters/stop-loss
 * Create stop-loss parameters
 */
router.post('/stop-loss', authenticateToken, async (req, res) => {
  try {
    const config = await req.financialService.createStopLossParameters(req.body);
    res.status(201).json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/financial-parameters/stop-loss
 * Get stop-loss parameters by organization
 */
router.get('/stop-loss', authenticateToken, async (req, res) => {
  try {
    const { organization_id } = req.user;
    const filters = {
      line_of_business: req.query.line_of_business,
      carrier_name: req.query.carrier_name
    };

    const params = await req.financialService.getStopLossParameters(organization_id, filters);
    res.json({
      success: true,
      data: params,
      count: params.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/financial-parameters/stop-loss/:id/capacity
 * Calculate stop-loss remaining capacity
 */
router.get('/stop-loss/:id/capacity', authenticateToken, async (req, res) => {
  try {
    const { exposure } = req.query;
    const capacity = await req.financialService.calculateStopLossCapacity(
      req.params.id,
      parseFloat(exposure) || 0
    );

    res.json({
      success: true,
      data: { capacity, exposure }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// Reserve Positions Endpoints
// ============================================================================

/**
 * POST /api/financial-parameters/reserves
 * Create reserve position
 */
router.post('/reserves', authenticateToken, async (req, res) => {
  try {
    const position = await req.financialService.createReservePosition(req.body);
    res.status(201).json({
      success: true,
      data: position
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/financial-parameters/reserves
 * Get reserve positions by organization
 */
router.get('/reserves', authenticateToken, async (req, res) => {
  try {
    const { organization_id } = req.user;
    const filters = {
      line_of_business: req.query.line_of_business,
      reserve_type: req.query.reserve_type
    };

    const positions = await req.financialService.getReservePositions(organization_id, filters);
    res.json({
      success: true,
      data: positions,
      count: positions.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/financial-parameters/reserves/:id/adequacy
 * Validate reserve adequacy
 */
router.get('/reserves/:id/adequacy', authenticateToken, async (req, res) => {
  try {
    const adequate = await req.financialService.validateReserveAdequacy(req.params.id);

    res.json({
      success: true,
      data: { adequate, id: req.params.id }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// Premium Revenue Mappings Endpoints
// ============================================================================

/**
 * POST /api/financial-parameters/premium-revenue
 * Create premium revenue mapping
 */
router.post('/premium-revenue', authenticateToken, async (req, res) => {
  try {
    const mapping = await req.financialService.createPremiumRevenueMapping(req.body);
    res.status(201).json({
      success: true,
      data: mapping
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/financial-parameters/premium-revenue
 * Get premium revenue mappings by organization
 */
router.get('/premium-revenue', authenticateToken, async (req, res) => {
  try {
    const { organization_id } = req.user;
    const filters = {
      business_process_id: req.query.business_process_id,
      line_of_business: req.query.line_of_business,
      state_code: req.query.state_code
    };

    const mappings = await req.financialService.getPremiumRevenueMappings(organization_id, filters);
    res.json({
      success: true,
      data: mappings,
      count: mappings.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/financial-parameters/premium-revenue/:id/risk
 * Calculate revenue at risk
 */
router.get('/premium-revenue/:id/risk', authenticateToken, async (req, res) => {
  try {
    const revenueAtRisk = await req.financialService.calculateRevenueAtRisk(req.params.id);

    res.json({
      success: true,
      data: { revenue_at_risk: revenueAtRisk, id: req.params.id }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// Risk Appetite Thresholds Endpoints
// ============================================================================

/**
 * POST /api/financial-parameters/risk-appetite
 * Create risk appetite threshold
 */
router.post('/risk-appetite', authenticateToken, async (req, res) => {
  try {
    const threshold = await req.financialService.createRiskAppetiteThreshold(req.body);
    res.status(201).json({
      success: true,
      data: threshold
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/financial-parameters/risk-appetite
 * Get risk appetite thresholds by organization
 */
router.get('/risk-appetite', authenticateToken, async (req, res) => {
  try {
    const { organization_id } = req.user;
    const filters = {
      threshold_level: req.query.threshold_level,
      threshold_category: req.query.threshold_category
    };

    const thresholds = await req.financialService.getRiskAppetiteThresholds(organization_id, filters);
    res.json({
      success: true,
      data: thresholds,
      count: thresholds.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/financial-parameters/risk-appetite/:id/check
 * Check if threshold is breached
 */
router.get('/risk-appetite/:id/check', authenticateToken, async (req, res) => {
  try {
    const { current_value } = req.query;
    const breachStatus = await req.financialService.checkThresholdBreach(
      req.params.id,
      parseFloat(current_value)
    );

    res.json({
      success: true,
      data: breachStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// Alert Threshold Configurations Endpoints
// ============================================================================

/**
 * POST /api/financial-parameters/alert-thresholds
 * Create alert threshold configuration
 */
router.post('/alert-thresholds', authenticateToken, async (req, res) => {
  try {
    const config = await req.financialService.createAlertThreshold(req.body);
    res.status(201).json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/financial-parameters/alert-thresholds
 * Get alert threshold configurations by organization
 */
router.get('/alert-thresholds', authenticateToken, async (req, res) => {
  try {
    const { organization_id } = req.user;
    const filters = {
      alert_type: req.query.alert_type,
      alert_severity: req.query.alert_severity,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined
    };

    const configs = await req.financialService.getAlertThresholds(organization_id, filters);
    res.json({
      success: true,
      data: configs,
      count: configs.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// Scenario Analysis Endpoints
// ============================================================================

/**
 * POST /api/financial-parameters/scenarios
 * Create scenario analysis configuration
 */
router.post('/scenarios', authenticateToken, async (req, res) => {
  try {
    const scenario = await req.financialService.createScenarioConfiguration(req.body);
    res.status(201).json({
      success: true,
      data: scenario
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/financial-parameters/scenarios
 * Get scenario configurations by organization
 */
router.get('/scenarios', authenticateToken, async (req, res) => {
  try {
    const { organization_id } = req.user;
    const filters = {
      scenario_type: req.query.scenario_type
    };

    const scenarios = await req.financialService.getScenarioConfigurations(organization_id, filters);
    res.json({
      success: true,
      data: scenarios,
      count: scenarios.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// Parameter Validation Endpoints
// ============================================================================

/**
 * POST /api/financial-parameters/:id/validate
 * Validate parameter
 */
router.post('/:id/validate', authenticateToken, async (req, res) => {
  try {
    const { validation_type, validation_details } = req.body;
    const { user_id } = req.user;

    const record = await req.financialService.validateParameter(
      req.params.id,
      validation_type,
      validation_details,
      user_id
    );

    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/financial-parameters/:id/validation-records
 * Get validation records for parameter
 */
router.get('/:id/validation-records', authenticateToken, async (req, res) => {
  try {
    const records = await req.financialService.getValidationRecords(req.params.id);

    res.json({
      success: true,
      data: records,
      count: records.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// Workflow and Approval Endpoints
// ============================================================================

/**
 * POST /api/financial-parameters/:id/submit
 * Submit parameter for approval
 */
router.post('/:id/submit', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.user;
    const { change_description } = req.body;

    const workflow = await req.financialService.submitForApproval(
      req.params.id,
      user_id,
      change_description
    );

    res.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/financial-parameters/workflows/:id/approve
 * Approve parameter
 */
router.post('/workflows/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.user;
    const { review_comments } = req.body;

    const workflow = await req.financialService.approveParameter(
      req.params.id,
      user_id,
      review_comments
    );

    res.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/financial-parameters/workflows/:id/reject
 * Reject parameter
 */
router.post('/workflows/:id/reject', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.user;
    const { rejection_reason } = req.body;

    const workflow = await req.financialService.rejectParameter(
      req.params.id,
      user_id,
      rejection_reason
    );

    res.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// Summary and Statistics Endpoints
// ============================================================================

/**
 * GET /api/financial-parameters/summary
 * Get financial parameters summary
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { organization_id } = req.user;
    const summary = await req.financialService.getSummary(organization_id);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
