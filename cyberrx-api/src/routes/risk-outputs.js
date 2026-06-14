'use strict';

/**
 * routes/risk-outputs — business-impact-weighted risk views over the linkage chain.
 *   GET /api/risk/crown-jewels
 *   GET /api/risk/blast-radius?app_id=
 *   GET /api/risk/process-criticality
 *   GET /api/risk/control-gaps
 *   GET /api/risk/attack-coverage
 */

const express = require('express');
const router = express.Router();
const { optionalJWT } = require('../middleware/auth');
const Risk = require('../services/RiskOutputsService');

function org(req, res) {
  const id = req.orgId || req.headers['x-org-id'] || req.query.org_id;
  if (!id) { res.status(400).json({ error: 'Organization not specified' }); return null; }
  return id;
}
const wrap = (fn) => async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json(await fn(orgId, req)); } catch (e) { res.status(500).json({ error: e.message }); }
};

router.get('/crown-jewels', optionalJWT, wrap(async (orgId) => ({ apps: await Risk.crownJewels(orgId) })));
router.get('/blast-radius', optionalJWT, wrap(async (orgId, req) => {
  if (!req.query.app_id) return { error: 'app_id is required' };
  return Risk.blastRadius(orgId, req.query.app_id);
}));
router.get('/process-criticality', optionalJWT, wrap(async (orgId) => ({ processes: await Risk.processCriticality(orgId) })));
router.get('/control-gaps', optionalJWT, wrap(async (orgId) => ({ gaps: await Risk.controlGaps(orgId) })));
router.get('/attack-coverage', optionalJWT, wrap(async (orgId) => Risk.attackCoverage(orgId)));

module.exports = router;
