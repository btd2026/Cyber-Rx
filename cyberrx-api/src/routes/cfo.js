'use strict';

/**
 * routes/cfo — business-weighted cyber exposure (CFO).
 *   GET /api/cfo/exposure   net/gross/insurance + exposure allocated to crown-jewel apps + assessment score
 */

const express = require('express');
const router = express.Router();
const { optionalJWT } = require('../middleware/auth');
const Cfo = require('../services/CfoQuantService');

function org(req, res) {
  const id = req.orgId || req.headers['x-org-id'] || req.query.org_id;
  if (!id) { res.status(400).json({ error: 'Organization not specified' }); return null; }
  return id;
}

router.get('/exposure', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json(await Cfo.roiSummary(orgId)); } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
