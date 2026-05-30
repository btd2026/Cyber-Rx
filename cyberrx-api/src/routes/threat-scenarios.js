'use strict';
const express = require('express');
const router = express.Router();
const { ThreatScenario } = require('../models');
const { authenticateJWT } = require('../middleware/auth');

/**
 * Threat Scenarios API Routes
 *
 * CRUD operations for threat scenario entities
 * All routes are authenticated and org-scoped
 */

// Generate UUID helper
function generateId() {
  return `ts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * POST /api/threat-scenarios - Create a new threat scenario
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const {
      name,
      type,
      probability,
      impactLevel,
      description,
      mitreTechnique,
      exploitedRisks,
      mitreTactic,
      mitigationStrategy
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Threat scenario name is required' });
    }
    const validTypes = ['ransomware', 'phishing', 'insider', 'supply_chain', 'misconfig'];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ error: `Type must be one of: ${validTypes.join(', ')}` });
    }
    if (probability !== undefined && (probability < 0 || probability > 100)) {
      return res.status(400).json({ error: 'Probability must be between 0 and 100' });
    }

    const id = generateId();
    const organizationId = req.orgId;

    const threatScenario = await ThreatScenario.create({
      id,
      name: name.trim(),
      type,
      organizationId,
      probability,
      impactLevel,
      description,
      mitreTechnique: mitreTechnique || [],
      exploitedRisks: exploitedRisks || [],
      mitreTactic,
      mitigationStrategy
    });

    res.status(201).json(threatScenario);
  } catch (err) {
    console.error('Create threat scenario error:', err.message);
    res.status(500).json({ error: 'Failed to create threat scenario', message: err.message });
  }
});

/**
 * GET /api/threat-scenarios - List all threat scenarios for the org
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const organizationId = req.orgId;
    const { type, withRiskAnalysis } = req.query;

    if (withRiskAnalysis === 'true') {
      const scenarios = await ThreatScenario.getWithRiskAnalysis(organizationId);
      return res.json({
        organizationId,
        count: scenarios.length,
        data: scenarios
      });
    }

    const scenarios = await ThreatScenario.findByOrganization(organizationId, { type });

    res.json({
      organizationId,
      count: scenarios.length,
      data: scenarios
    });
  } catch (err) {
    console.error('List threat scenarios error:', err.message);
    res.status(500).json({ error: 'Failed to list threat scenarios' });
  }
});

/**
 * GET /api/threat-scenarios/high-probability - Get high-probability threats
 */
router.get('/high-probability', authenticateJWT, async (req, res) => {
  try {
    const organizationId = req.orgId;
    const { minProbability } = req.query;

    const minProb = minProbability ? parseInt(minProbability, 10) : 70;

    const threats = await ThreatScenario.getHighProbabilityThreats(organizationId, minProb);

    res.json({
      organizationId,
      minProbability: minProb,
      count: threats.length,
      data: threats
    });
  } catch (err) {
    console.error('Get high-probability threats error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve high-probability threats' });
  }
});

/**
 * GET /api/threat-scenarios/:id - Get a specific threat scenario
 */
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const scenario = await ThreatScenario.findById(id);

    if (!scenario) {
      return res.status(404).json({ error: 'Threat scenario not found', id });
    }

    // Verify org access
    if (scenario.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this threat scenario' });
    }

    res.json(scenario);
  } catch (err) {
    console.error('Get threat scenario error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve threat scenario' });
  }
});

/**
 * PUT /api/threat-scenarios/:id - Update a threat scenario
 */
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      probability,
      impactLevel,
      description,
      mitreTechnique,
      exploitedRisks,
      mitreTactic,
      mitigationStrategy
    } = req.body;

    // Verify ownership first
    const existing = await ThreatScenario.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Threat scenario not found', id });
    }
    if (existing.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this threat scenario' });
    }

    const updated = await ThreatScenario.update(id, {
      name,
      type,
      probability,
      impactLevel,
      description,
      mitreTechnique,
      exploitedRisks,
      mitreTactic,
      mitigationStrategy
    });

    res.json(updated);
  } catch (err) {
    console.error('Update threat scenario error:', err.message);
    res.status(500).json({ error: 'Failed to update threat scenario' });
  }
});

/**
 * DELETE /api/threat-scenarios/:id - Delete a threat scenario
 */
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership first
    const existing = await ThreatScenario.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Threat scenario not found', id });
    }
    if (existing.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this threat scenario' });
    }

    await ThreatScenario.delete(id);

    res.json({ message: 'Threat scenario deleted successfully', id });
  } catch (err) {
    console.error('Delete threat scenario error:', err.message);
    res.status(500).json({ error: 'Failed to delete threat scenario' });
  }
});

module.exports = router;
