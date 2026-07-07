'use strict';

/**
 * routes/readiness — per-role input→widget readiness for the cockpit's gating and
 * for onboarding's "connecting X unlocks N widgets" (Build Brief §4).
 *
 *   GET /api/readiness?role=ciso   → { role, widgets[], inputs[], readinessPct }
 *
 * Same optional-auth + demo-org resolution as the rest of the read surface.
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const logger = require('../utils/logger');
const Catalog = require('../services/InputCatalogService');

const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId;

router.get('/', optionalJWT, demoOrg, async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  const role = String(req.query.role || 'ciso').toLowerCase();
  if (!Catalog.WIDGETS[role]) return res.status(400).json({ error: 'Unknown role: ' + role });
  try { res.json(await Catalog.readiness(orgId, role)); }
  catch (e) { logger.warn('readiness failed', { error: e.message }); res.status(500).json({ error: 'Unable to load readiness.' }); }
});

module.exports = router;
