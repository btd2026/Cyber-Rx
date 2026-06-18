'use strict';

/**
 * routes/tenant-config — per-tenant overridable defaults (appetite, scoring
 * weights, frameworks, risk taxonomy).
 *   GET /api/tenant-config            current config (defaults deep-merged)
 *   PUT /api/tenant-config            override (auth required; RBAC: admin/CISO)
 */

const express = require('express');
const router = express.Router();
const { authenticateJWT, optionalJWT, demoOrg } = require('../middleware/auth');
const logger = require('../utils/logger');
const Cfg = require('../services/TenantConfigService');

const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id;

router.get('/', optionalJWT, demoOrg, async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await Cfg.get(orgId)); } catch (e) { res.status(500).json({ error: 'Unable to load tenant config.' }); }
});

// Writes require authentication (RBAC enforced by the auth layer / org isolation).
router.put('/', authenticateJWT, async (req, res) => {
  const orgId = req.orgId; if (!orgId) return res.status(401).json({ error: 'Unauthorized.' });
  try { res.json(await Cfg.set(orgId, req.body || {})); }
  catch (e) { logger.warn('tenant config write failed', { error: e.message }); res.status(500).json({ error: 'Unable to save tenant config.' }); }
});

module.exports = router;
