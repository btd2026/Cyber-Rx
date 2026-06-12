'use strict';
const express = require('express');
const router = express.Router();
const CisoPostureService = require('../services/CisoPostureService');
const AiControlsService = require('../services/AiControlsService');
const CisoDashboardService = require('../services/CisoDashboardService');
const { optionalJWT } = require('../middleware/auth');
const logger = require('../utils/logger');

function org(req, res) { const id = req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId; if (!id) { res.status(400).json({ error: 'Organization not specified' }); return null; } return id; }

router.get('/posture', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json(await CisoPostureService.getPosture(orgId)); }
  catch (err) { logger.error('CISO posture error', { error: err.message }); res.status(500).json({ error: 'Failed to compute posture', message: err.message }); }
});

// AI security controls — how well AI-coding / GenAI controls are operating.
router.get('/ai-controls', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json(await AiControlsService.getAiControls(orgId)); }
  catch (err) { logger.error('AI controls error', { error: err.message }); res.status(500).json({ error: 'Failed to compute AI controls', message: err.message }); }
});

// Dedicated CISO Security Posture Dashboard (CISO persona only): weighted
// posture, domain health, control-risk ranking, thresholds, action queue,
// process protection, attack pathways, readiness, investments, hidden risk,
// and a decision-ready executive answer for each of the 15 CISO questions.
router.get('/dashboard', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json(await CisoDashboardService.getDashboard(orgId)); }
  catch (err) { logger.error('CISO dashboard error', { error: err.message }); res.status(500).json({ error: 'Failed to build CISO dashboard', message: err.message }); }
});
module.exports = router;
