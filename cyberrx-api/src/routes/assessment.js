'use strict';

/**
 * routes/assessment — unified assessment engine.
 *   POST /api/assessment/run                 merge automated + document evidence
 *   GET  /api/assessment/results?framework_id=
 *   GET  /api/assessment/rollup?framework_id=
 *   PUT  /api/assessment/review              { frameworkId, requirementId, status?, score?, gap?, recommendation? }
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { optionalJWT } = require('../middleware/auth');
const Engine = require('../services/AssessmentEngine');

function org(req, res) {
  const id = req.orgId || req.headers['x-org-id'] || req.query.org_id || (req.body && req.body.org_id);
  if (!id) { res.status(400).json({ error: 'Organization not specified' }); return null; }
  return id;
}

router.post('/run', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json(await Engine.run(orgId)); }
  catch (e) { logger.warn('assessment run failed', { error: e.message }); res.status(500).json({ error: e.message }); }
});

router.get('/results', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json({ results: await Engine.listResults(orgId, req.query.framework_id) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/rollup', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json({ frameworks: await Engine.rollup(orgId, req.query.framework_id) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/review', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  const b = req.body || {};
  if (!b.frameworkId || !b.requirementId) return res.status(400).json({ error: 'frameworkId and requirementId are required' });
  try { res.json(await Engine.review(orgId, b.frameworkId, b.requirementId, b)); }
  catch (e) { logger.warn('assessment review failed', { error: e.message }); res.status(500).json({ error: e.message }); }
});

module.exports = router;
