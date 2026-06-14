'use strict';

/**
 * routes/audit — audit-ready control lineage (CLO).
 *   GET /api/audit/summary
 *   GET /api/audit/lineage?framework_id=
 */

const express = require('express');
const router = express.Router();
const { optionalJWT } = require('../middleware/auth');
const Audit = require('../services/AuditLineageService');

function org(req, res) {
  const id = req.orgId || req.headers['x-org-id'] || req.query.org_id;
  if (!id) { res.status(400).json({ error: 'Organization not specified' }); return null; }
  return id;
}

router.get('/summary', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json(await Audit.summary(orgId)); } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/lineage', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json({ lineage: await Audit.lineage(orgId, req.query.framework_id) }); } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
