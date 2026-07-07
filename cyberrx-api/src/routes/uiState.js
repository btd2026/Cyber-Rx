'use strict';

/**
 * routes/ui-state — per-org cockpit "resume where you left off" state, so a user
 * lands on their last seat/tab/view on any device.
 *   GET /api/ui-state   the org's saved navigation state ({} if none)
 *   PUT /api/ui-state   merge-save a partial state (seat / tabs / view)
 *
 * Navigation-only, low-sensitivity — accepts the same optional-auth + demo-org
 * resolution as the rest of the read surface, so it works for the demo/unauth
 * cockpit as well as authenticated tenants.
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const logger = require('../utils/logger');
const Ui = require('../services/UiStateService');

const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId;

router.get('/', optionalJWT, demoOrg, async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await Ui.get(orgId)); }
  catch (e) { res.status(500).json({ error: 'Unable to load UI state.' }); }
});

router.put('/', optionalJWT, demoOrg, express.json({ limit: '16kb' }), async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await Ui.set(orgId, req.body || {})); }
  catch (e) { logger.warn('ui state write failed', { error: e.message }); res.status(500).json({ error: 'Unable to save UI state.' }); }
});

module.exports = router;
