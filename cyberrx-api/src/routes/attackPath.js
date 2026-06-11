'use strict';

/**
 * CISO Attack-Path API
 *   GET /api/attack-path  - layered process→app→device→network→threat graph
 */
const express = require('express');
const router = express.Router();
const AttackPathService = require('../services/AttackPathService');
const { optionalJWT } = require('../middleware/auth');
const logger = require('../utils/logger');

router.get('/', optionalJWT, async (req, res) => {
  const orgId = req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId;
  if (!orgId) return res.status(400).json({ error: 'Organization not specified' });
  try {
    res.json(await AttackPathService.buildGraph(orgId));
  } catch (err) {
    logger.error('Attack-path build error', { error: err.message });
    res.status(500).json({ error: 'Failed to build attack path', message: err.message });
  }
});

module.exports = router;
