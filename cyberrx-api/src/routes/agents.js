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
 * Org scoping: uses the JWT org when present, otherwise falls back to the
 * X-Org-Id header or org_id query param (the platform's demo/localStorage
 * posture, consistent with the rest of the dashboards).
 */

const express = require('express');
const router = express.Router();
const ExecutiveAgentService = require('../services/ExecutiveAgentService');
const { optionalJWT } = require('../middleware/auth');
const logger = require('../utils/logger');

// Resolve the organization for the request. Returns null (and sends 400) when
// no org can be determined.
function resolveOrg(req, res) {
  const orgId =
    req.orgId ||
    req.headers['x-org-id'] ||
    req.query.org_id ||
    req.query.orgId;
  if (!orgId) {
    res.status(400).json({ error: 'Organization not specified', message: 'Provide a JWT, X-Org-Id header, or org_id query parameter.' });
    return null;
  }
  return orgId;
}

router.get('/status', optionalJWT, async (req, res) => {
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

router.get('/briefs', optionalJWT, async (req, res) => {
  const orgId = resolveOrg(req, res);
  if (!orgId) return;
  try {
    const refresh = req.query.refresh === '1' || req.query.refresh === 'true';
    const briefs = await ExecutiveAgentService.getAllBriefs(orgId, { refresh });
    res.json({ briefs, aiEnabled: ExecutiveAgentService.aiEnabled() });
  } catch (err) {
    logger.error('Get executive briefs error', { error: err.message });
    res.status(500).json({ error: 'Failed to load executive briefs', message: err.message });
  }
});

router.get('/briefs/:role', optionalJWT, async (req, res) => {
  const orgId = resolveOrg(req, res);
  if (!orgId) return;
  try {
    const role = req.params.role;
    if (!ExecutiveAgentService.isValidRole(role)) {
      return res.status(400).json({ error: 'Invalid role', validRoles: ExecutiveAgentService.ROLE_KEYS });
    }
    const refresh = req.query.refresh === '1' || req.query.refresh === 'true';
    const brief = await ExecutiveAgentService.getBrief(role, orgId, { refresh });
    res.json(brief);
  } catch (err) {
    logger.error('Get executive brief error', { error: err.message });
    res.status(500).json({ error: 'Failed to load executive brief', message: err.message });
  }
});

router.post('/refresh', optionalJWT, async (req, res) => {
  const orgId = resolveOrg(req, res);
  if (!orgId) return;
  try {
    const briefs = await ExecutiveAgentService.generateAll(orgId);
    res.json({ refreshed: briefs.length, briefs, aiEnabled: ExecutiveAgentService.aiEnabled() });
  } catch (err) {
    logger.error('Refresh executive briefs error', { error: err.message });
    res.status(500).json({ error: 'Failed to refresh executive briefs', message: err.message });
  }
});

// Suggested questions the executive can ask their agent.
router.get('/questions/:role', optionalJWT, async (req, res) => {
  const role = req.params.role;
  if (!ExecutiveAgentService.isValidRole(role)) {
    return res.status(400).json({ error: 'Invalid role', validRoles: ExecutiveAgentService.ROLE_KEYS });
  }
  res.json({
    role,
    question: ExecutiveAgentService.ROLES[role].question,
    deliverable: ExecutiveAgentService.ROLES[role].deliverable,
    questions: ExecutiveAgentService.getSuggestedQuestions(role),
  });
});

// Role "Current State" — the 5 key questions for a seat with live answers + severity.
router.get('/key-questions/:role', optionalJWT, async (req, res) => {
  const orgId = resolveOrg(req, res);
  if (!orgId) return;
  const role = req.params.role;
  if (!ExecutiveAgentService.isValidRole(role)) {
    return res.status(400).json({ error: 'Invalid role', validRoles: ExecutiveAgentService.ROLE_KEYS });
  }
  try {
    res.json(await ExecutiveAgentService.getKeyQuestions(role, orgId));
  } catch (err) {
    logger.error('Agent key-questions error', { error: err.message });
    res.status(500).json({ error: 'Failed to load key questions', message: err.message });
  }
});

// Interactive Q&A: the executive asks a question; the agent returns a summary
// plus the relevant supporting details, grounded in live org data.
router.post('/ask/:role', optionalJWT, async (req, res) => {
  const orgId = resolveOrg(req, res);
  if (!orgId) return;
  try {
    const role = req.params.role;
    if (!ExecutiveAgentService.isValidRole(role)) {
      return res.status(400).json({ error: 'Invalid role', validRoles: ExecutiveAgentService.ROLE_KEYS });
    }
    const question = req.body && req.body.question;
    if (!question || !String(question).trim()) {
      return res.status(400).json({ error: 'question is required' });
    }
    const answer = await ExecutiveAgentService.answerQuestion(role, orgId, question);
    res.json({ ...answer, aiEnabled: ExecutiveAgentService.aiEnabled() });
  } catch (err) {
    logger.error('Agent ask error', { error: err.message });
    res.status(500).json({ error: 'Failed to answer question', message: err.message });
  }
});

router.post('/refresh/:role', optionalJWT, async (req, res) => {
  const orgId = resolveOrg(req, res);
  if (!orgId) return;
  try {
    const role = req.params.role;
    if (!ExecutiveAgentService.isValidRole(role)) {
      return res.status(400).json({ error: 'Invalid role', validRoles: ExecutiveAgentService.ROLE_KEYS });
    }
    const brief = await ExecutiveAgentService.generateBrief(role, orgId);
    res.json(brief);
  } catch (err) {
    logger.error('Refresh executive brief error', { error: err.message });
    res.status(500).json({ error: 'Failed to refresh executive brief', message: err.message });
  }
});

module.exports = router;
