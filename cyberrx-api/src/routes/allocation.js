'use strict';

/**
 * routes/allocation — capital allocation for security spend.
 *   GET  /api/allocation/optimize?budget=5000000   ROI-ranked funded set + efficient frontier
 *   POST /api/allocation/optimize                   same, budget in the body
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const Alloc = require('../services/AllocationService');

const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId || (req.body && req.body.org_id);

async function handle(req, res) {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  const budget = req.body && req.body.budget != null ? req.body.budget : req.query.budget;
  try { res.json(await Alloc.optimize(orgId, { budget: budget != null ? Number(budget) : undefined })); }
  catch (e) { res.status(500).json({ error: 'Unable to compute the allocation.' }); }
}

router.get('/optimize', optionalJWT, demoOrg, handle);
router.post('/optimize', optionalJWT, demoOrg, handle);

module.exports = router;
