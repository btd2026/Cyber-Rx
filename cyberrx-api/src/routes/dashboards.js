'use strict';

/**
 * routes/dashboards — DELTA Board / CLO / CRO oversight tiles (additive).
 *   GET /api/dashboards/:role   role ∈ {board, clo, cro}
 * Returns gated, adapter-backed tiles for the three new views. Same optional-auth +
 * demo-org posture as the rest of the read surface.
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const logger = require('../utils/logger');
const Delta = require('../services/DeltaDashboardService');

const ROLES = new Set(['board', 'clo', 'cro', 'ceo', 'cfo', 'coo', 'cio', 'cto', 'ciso']);
const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId;

router.get('/:role', optionalJWT, demoOrg, async (req, res) => {
  const role = String(req.params.role || '').toLowerCase();
  if (!ROLES.has(role)) return res.status(404).json({ error: 'Unknown dashboard role: ' + role });
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await Delta.build(role, orgId)); }
  catch (e) { logger.warn('delta dashboard failed', { role, error: e.message }); res.status(500).json({ error: 'Unable to load dashboard.' }); }
});

module.exports = router;
