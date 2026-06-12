'use strict';
const express = require('express');
const router = express.Router();
const CisoPostureService = require('../services/CisoPostureService');
const { optionalJWT } = require('../middleware/auth');
const logger = require('../utils/logger');

router.get('/posture', optionalJWT, async (req, res) => {
  const orgId = req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId;
  if (!orgId) return res.status(400).json({ error: 'Organization not specified' });
  try { res.json(await CisoPostureService.getPosture(orgId)); }
  catch (err) { logger.error('CISO posture error', { error: err.message }); res.status(500).json({ error: 'Failed to compute posture', message: err.message }); }
});
module.exports = router;
