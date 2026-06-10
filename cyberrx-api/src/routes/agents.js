'use strict';

/**
 * Executive AI Agent API
 * ----------------------
 * Exposes the CyberRX agent layer: continuous, role-specific executive briefs.
 *
 *   GET  /api/agents/status              - agent layer status (AI live? roles)
 *   GET  /api/agents/briefs              - latest briefs for all six personas
 *   GET  /api/agents/briefs/:role        - latest brief for one persona (?refresh=1 to regenerate)
 *   POST /api/agents/refresh             - regenerate all briefs now
 *   POST /api/agents/refresh/:role       - regenerate one persona's brief now
 *
 * All routes are authenticated and org-scoped (req.orgId from JWT).
 */

const express = require('express');
const router = express.Router();
const ExecutiveAgentService = require('../services/ExecutiveAgentService');
const { authenticateJWT } = require('../middleware/auth');
const logger = require('../utils/logger');

router.get('/status', authenticateJWT, async (req, res) => {
  res.json({
    aiEnabled: ExecutiveAgentService.aiEnabled(),
    model: ExecutiveAgentService.aiEnabled() ? (process.env.ANTHROPIC_MODEL || 'claude-opus-4-8') : null,
    mode: ExecutiveAgentService.aiEnabled() ? 'ai' : 'deterministic',
    roles: ExecutiveAgentService.ROLE_KEYS.map((role) => ({
      role,
      question: ExecutiveAgentService.ROLES[role].question,
      deliverable: ExecutiveAgentService.ROLES[role].deliverable,
    })),
  });
});

router.get('/briefs', authenticateJWT, async (req, res) => {
  try {
    const refresh = req.query.refresh === '1' || req.query.refresh === 'true';
    const briefs = await ExecutiveAgentService.getAllBriefs(req.orgId, { refresh });
    res.json({ briefs, aiEnabled: ExecutiveAgentService.aiEnabled() });
  } catch (err) {
    logger.error('Get executive briefs error', { error: err.message });
    res.status(500).json({ error: 'Failed to load executive briefs', message: err.message });
  }
});

router.get('/briefs/:role', authenticateJWT, async (req, res) => {
  try {
    const role = req.params.role;
    if (!ExecutiveAgentService.isValidRole(role)) {
      return res.status(400).json({ error: 'Invalid role', validRoles: ExecutiveAgentService.ROLE_KEYS });
    }
    const refresh = req.query.refresh === '1' || req.query.refresh === 'true';
    const brief = await ExecutiveAgentService.getBrief(role, req.orgId, { refresh });
    res.json(brief);
  } catch (err) {
    logger.error('Get executive brief error', { error: err.message });
    res.status(500).json({ error: 'Failed to load executive brief', message: err.message });
  }
});

router.post('/refresh', authenticateJWT, async (req, res) => {
  try {
    const briefs = await ExecutiveAgentService.generateAll(req.orgId);
    res.json({ refreshed: briefs.length, briefs, aiEnabled: ExecutiveAgentService.aiEnabled() });
  } catch (err) {
    logger.error('Refresh executive briefs error', { error: err.message });
    res.status(500).json({ error: 'Failed to refresh executive briefs', message: err.message });
  }
});

router.post('/refresh/:role', authenticateJWT, async (req, res) => {
  try {
    const role = req.params.role;
    if (!ExecutiveAgentService.isValidRole(role)) {
      return res.status(400).json({ error: 'Invalid role', validRoles: ExecutiveAgentService.ROLE_KEYS });
    }
    const brief = await ExecutiveAgentService.generateBrief(role, req.orgId);
    res.json(brief);
  } catch (err) {
    logger.error('Refresh executive brief error', { error: err.message });
    res.status(500).json({ error: 'Failed to refresh executive brief', message: err.message });
  }
});

module.exports = router;
