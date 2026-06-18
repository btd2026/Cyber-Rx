'use strict';

/**
 * routes/visibility — per-asset-class visibility confidence (how complete our
 * own data is). Consumed by Current State and used to caveat outputs.
 *   GET /api/visibility
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const Visibility = require('../services/VisibilityService');

const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id;

router.get('/', optionalJWT, demoOrg, async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await Visibility.assess(orgId)); } catch (e) { res.status(500).json({ error: 'Unable to assess visibility.' }); }
});

module.exports = router;
