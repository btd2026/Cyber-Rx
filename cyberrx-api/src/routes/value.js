'use strict';

/**
 * routes/value — the buyer-facing "value realized" rollup (renewal justification).
 *   GET /api/value   decisions governed, exposure treated, blind spots, coverage,
 *                    ledger integrity, materiality — all traced to real activity.
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(optionalJWT, demoOrg);
const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId;

router.get('/', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await require('../services/PlatformValueService').summary(orgId)); }
  catch (e) { logger.warn('value summary failed', { error: e.message }); res.status(500).json({ error: 'Unable to compute value summary.' }); }
});

module.exports = router;
