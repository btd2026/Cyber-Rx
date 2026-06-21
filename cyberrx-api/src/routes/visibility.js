'use strict';

/**
 * routes/visibility — visibility confidence (how complete our own data is).
 * Consumed by Current State and used to caveat outputs.
 *   GET  /api/visibility            class-level coverage + per-asset summary
 *   GET  /api/visibility/assets     per-asset data-completeness scores
 *   POST /api/visibility/recompute  persist per-asset scores onto the substrate
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const Visibility = require('../services/VisibilityService');

const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId || (req.body && req.body.org_id);

router.get('/', optionalJWT, demoOrg, async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await Visibility.assess(orgId)); } catch (e) { res.status(500).json({ error: 'Unable to assess visibility.' }); }
});

router.get('/assets', optionalJWT, demoOrg, async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await Visibility.perAsset(orgId)); } catch (e) { res.status(500).json({ error: 'Unable to assess per-asset visibility.' }); }
});

router.post('/recompute', optionalJWT, demoOrg, async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await Visibility.recompute(orgId)); } catch (e) { res.status(500).json({ error: 'Unable to recompute visibility.' }); }
});

module.exports = router;
