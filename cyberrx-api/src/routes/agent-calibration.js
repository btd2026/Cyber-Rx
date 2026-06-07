/**
 * Agent Calibration & Executive Onboarding API Routes
 *
 * REST API endpoints for agent activation, threshold calibration,
 * context configuration, executive onboarding, and first briefing generation.
 *
 * Task: T-PILOT-004
 * Phase: Phase 2 - Pilot Deployment & Customer Onboarding
 */

const express = require('express');
const router = express.Router();

const AgentActivationService = require('../services/agent-calibration/AgentActivationService');
const ThresholdCalibrationService = require('../services/agent-calibration/ThresholdCalibrationService');
const AgentContextConfigurationService = require('../services/agent-calibration/AgentContextConfigurationService');
const ExecutiveOnboardingService = require('../services/agent-calibration/ExecutiveOnboardingService');
const FirstBriefingGenerationService = require('../services/agent-calibration/FirstBriefingGenerationService');

// Initialize services
const agentActivationService = new AgentActivationService();
const thresholdCalibrationService = new ThresholdCalibrationService();
const agentContextConfigurationService = new AgentContextConfigurationService();
const executiveOnboardingService = new ExecutiveOnboardingService();
const firstBriefingGenerationService = new FirstBriefingGenerationService();

// ============================================================================
// Agent Activation Endpoints
// ============================================================================

/**
 * POST /api/agent-calibration/activate
 * Activate all agents for organization
 */
router.post('/activate', async (req, res) => {
  try {
    const { organizationId } = req.body;
    const config = req.body.config || {};

    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId is required' });
    }

    const results = await agentActivationService.activateAgents(organizationId, config);

    res.json({
      success: results.status === 'success',
      data: results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/agent-calibration/activate/:agentId
 * Activate single agent
 */
router.post('/activate/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { organizationId } = req.body;
    const config = req.body.config || {};

    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId is required' });
    }

    const result = await agentActivationService.activateAgent(agentId, organizationId, config);

    res.json({
      success: result.status === 'activated',
      data: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/agent-calibration/deactivate/:agentId
 * Deactivate agent
 */
router.post('/deactivate/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { organizationId } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId is required' });
    }

    const result = await agentActivationService.deactivateAgent(agentId, organizationId);

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Threshold Calibration Endpoints
// ============================================================================

/**
 * POST /api/agent-calibration/calibrate
 * Run calibration cycle
 */
router.post('/calibrate', async (req, res) => {
  try {
    const { organizationId } = req.body;
    const config = req.body.config || {};

    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId is required' });
    }

    const results = await thresholdCalibrationService.runCalibration(organizationId, config);

    res.json({
      success: results.finalStatus === 'success',
      data: results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/agent-calibration/calibration/:organizationId/feedback
 * Submit customer feedback on calibration
 */
router.post('/calibration/:organizationId/feedback', async (req, res) => {
  try {
    const { organizationId } = req.params;
    const feedback = req.body;

    const result = await thresholdCalibrationService.submitCustomerFeedback(organizationId, feedback);

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agent-calibration/calibration/:organizationId/history
 * Get calibration history
 */
router.get('/calibration/:organizationId/history', async (req, res) => {
  try {
    const { organizationId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const history = await thresholdCalibrationService.getCalibrationHistory(organizationId, limit);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Agent Context Configuration Endpoints
// ============================================================================

/**
 * POST /api/agent-calibration/configure-contexts
 * Configure agent contexts
 */
router.post('/configure-contexts', async (req, res) => {
  try {
    const { organizationId } = req.body;
    const config = req.body.config || {};

    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId is required' });
    }

    const results = await agentContextConfigurationService.configureAgentContexts(organizationId, config);

    res.json({
      success: results.summary.configured > 0,
      data: results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agent-calibration/contexts/:agentId/:organizationId
 * Get agent context
 */
router.get('/contexts/:agentId/:organizationId', async (req, res) => {
  try {
    const { agentId, organizationId } = req.params;

    const result = await agentContextConfigurationService.getAgentContext(agentId, organizationId);

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Executive Onboarding Endpoints
// ============================================================================

/**
 * POST /api/agent-calibration/onboard-executive
 * Onboard executive
 */
router.post('/onboard-executive', async (req, res) => {
  try {
    const { organizationId, ...executiveData } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId is required' });
    }

    const result = await executiveOnboardingService.onboardExecutive(organizationId, executiveData);

    res.json({
      success: result.status === 'onboarded',
      data: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/agent-calibration/onboarding/:userId/complete-task
 * Complete onboarding task
 */
router.post('/onboarding/:userId/complete-task', async (req, res) => {
  try {
    const { userId } = req.params;
    const { taskId } = req.body;

    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    const result = await executiveOnboardingService.completeOnboardingTask(userId, taskId);

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agent-calibration/onboarding/:userId/status
 * Get onboarding status
 */
router.get('/onboarding/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await executiveOnboardingService.getOnboardingStatus(userId);

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agent-calibration/onboarding/:organizationId/summary
 * Get onboarding summary for organization
 */
router.get('/onboarding/:organizationId/summary', async (req, res) => {
  try {
    const { organizationId } = req.params;

    const result = await executiveOnboardingService.getOnboardingSummary(organizationId);

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// First Briefing Generation Endpoints
// ============================================================================

/**
 * POST /api/agent-calibration/first-briefing
 * Generate first live briefing
 */
router.post('/first-briefing', async (req, res) => {
  try {
    const { organizationId } = req.body;
    const config = req.body.config || {};

    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId is required' });
    }

    const result = await firstBriefingGenerationService.generateFirstBriefing(organizationId, config);

    res.json({
      success: result.status === 'generated',
      data: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/agent-calibration/briefing-feedback
 * Capture executive feedback on briefing
 */
router.post('/briefing-feedback', async (req, res) => {
  try {
    const { organizationId, ...feedback } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId is required' });
    }

    const result = await firstBriefingGenerationService.captureFeedback(organizationId, feedback);

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Health Check
// ============================================================================

/**
 * GET /api/agent-calibration/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'agent-calibration',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
