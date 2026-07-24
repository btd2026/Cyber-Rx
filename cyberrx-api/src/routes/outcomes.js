'use strict';

/**
 * routes/outcomes — the cross-tenant outcome data network.
 *   GET  /api/outcomes/insights?scenarioType=Ransomware   peer base rate + best control
 *   POST /api/outcomes/contribute                          contribute anonymized outcomes (consent-gated)
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const Net = require('../services/OutcomeNetworkService');

const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId || (req.body && req.body.org_id);

router.get('/insights', optionalJWT, demoOrg, async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await Net.insightsFor(orgId, { scenarioType: req.query.scenarioType })); }
  catch (e) { res.status(500).json({ error: 'Unable to load peer insights.' }); }
});

router.post('/contribute', optionalJWT, demoOrg, async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await Net.contribute(orgId, req.body || {})); }
  catch (e) { res.status(500).json({ error: 'Unable to contribute outcomes.' }); }
});

module.exports = router;
