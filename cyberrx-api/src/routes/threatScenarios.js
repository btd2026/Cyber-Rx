'use strict';

const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const ThreatScenarioService = require('../domains/security/services/ThreatScenarioService');
const ThreatScenarioController = require('../domains/security/controllers/ThreatScenarioController');
const { ThreatScenario, DataObject, Risk, Control } = require('../models');

/**
 * Threat Scenarios API Routes
 *
 * CRUD operations for threat modeling
 * All routes are authenticated and org-scoped
 */

// Initialize service and controller
const threatScenarioService = new ThreatScenarioService(
  { ThreatScenario, DataObject, Risk, Control },
  console
);
const threatScenarioController = new ThreatScenarioController(threatScenarioService);

/**
 * GET /api/threat-scenarios
 * Get all threat scenarios with optional filters
 * Query params: type, businessProcessId, minProbability
 */
router.get('/', authenticateJWT, (req, res) => {
  threatScenarioController.getThreatScenarios(req, res);
});

/**
 * GET /api/threat-scenarios/:id
 * Get single threat scenario by ID
 */
router.get('/:id', authenticateJWT, (req, res) => {
  threatScenarioController.getThreatScenarioById(req, res);
});

/**
 * POST /api/threat-scenarios
 * Create new threat scenario
 * Body: { name, type, probability?, impactLevel?, description?, mitreTechnique[], exploitedRisks[], mitreTactic?, mitigationStrategy?, controlEffectiveness? }
 */
router.post('/', authenticateJWT, (req, res) => {
  threatScenarioController.createThreatScenario(req, res);
});

/**
 * PUT /api/threat-scenarios/:id
 * Update threat scenario
 */
router.put('/:id', authenticateJWT, (req, res) => {
  threatScenarioController.updateThreatScenario(req, res);
});

/**
 * DELETE /api/threat-scenarios/:id
 * Delete threat scenario
 */
router.delete('/:id', authenticateJWT, (req, res) => {
  threatScenarioController.deleteThreatScenario(req, res);
});

/**
 * GET /api/threat-scenarios/risk-analysis
 * Get threat scenarios with risk analysis
 */
router.get('/risk-analysis', authenticateJWT, (req, res) => {
  threatScenarioController.getThreatScenariosWithRiskAnalysis(req, res);
});

/**
 * GET /api/threat-scenarios/high-probability
 * Get high-probability threat scenarios
 * Query params: minProbability (default 70)
 */
router.get('/high-probability', authenticateJWT, (req, res) => {
  threatScenarioController.getHighProbabilityThreats(req, res);
});

/**
 * GET /api/threat-scenarios/mitre/technique/:techniqueId
 * Get threat scenarios by MITRE technique
 */
router.get('/mitre/technique/:techniqueId', authenticateJWT, (req, res) => {
  threatScenarioController.getThreatScenariosByMitreTechnique(req, res);
});

/**
 * GET /api/threat-scenarios/dashboard
 * Get threat dashboard summary
 */
router.get('/dashboard', authenticateJWT, (req, res) => {
  threatScenarioController.getThreatDashboard(req, res);
});

/**
 * GET /api/threat-scenarios/top
 * Get top threats by risk score
 * Query params: limit (default 10)
 */
router.get('/top', authenticateJWT, (req, res) => {
  threatScenarioController.getTopThreats(req, res);
});

/**
 * GET /api/threat-scenarios/mitre/search
 * Search MITRE ATT&CK techniques
 * Query params: q (search query)
 */
router.get('/mitre/search', authenticateJWT, (req, res) => {
  threatScenarioController.searchMitreTechniques(req, res);
});

/**
 * GET /api/threat-scenarios/mitre/tactic/:tactic
 * Get MITRE ATT&CK tactic details
 */
router.get('/mitre/tactic/:tactic', authenticateJWT, (req, res) => {
  threatScenarioController.getMitreTacticDetails(req, res);
});

/**
 * GET /api/threat-scenarios/mitre/technique-details/:techniqueId
 * Get MITRE ATT&CK technique details
 */
router.get('/mitre/technique-details/:techniqueId', authenticateJWT, (req, res) => {
  threatScenarioController.getMitreTechniqueDetails(req, res);
});

/**
 * GET /api/threat-scenarios/mitre/tactics
 * Get all MITRE ATT&CK tactics
 */
router.get('/mitre/tactics', authenticateJWT, (req, res) => {
  threatScenarioController.getMitreTactics(req, res);
});

module.exports = router;
