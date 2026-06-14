'use strict';

/**
 * routes/resolution — entity resolution / dedupe (CIO).
 *   GET  /api/resolution/applications/duplicates
 *   POST /api/resolution/applications/merge   { survivorId, duplicateIds[] }
 */

const express = require('express');
const router = express.Router();
const { optionalJWT } = require('../middleware/auth');
const Resolver = require('../services/ResolverService');

function org(req, res) {
  const id = req.orgId || req.headers['x-org-id'] || req.query.org_id || (req.body && req.body.org_id);
  if (!id) { res.status(400).json({ error: 'Organization not specified' }); return null; }
  return id;
}

router.get('/applications/duplicates', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json({ groups: await Resolver.findDuplicateApplications(orgId) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/applications/merge', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  const b = req.body || {};
  if (!b.survivorId || !Array.isArray(b.duplicateIds)) return res.status(400).json({ error: 'survivorId and duplicateIds[] are required' });
  try { res.json(await Resolver.mergeApplications(orgId, b.survivorId, b.duplicateIds)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
