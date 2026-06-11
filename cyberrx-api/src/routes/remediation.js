'use strict';

/**
 * Remediation Path API (Papa #12)
 *   GET  /api/remediation/tickets       - tickets opened from findings
 *   POST /api/remediation/sweep         - open tickets for all new findings
 *                                         body: { system: 'demo'|'jira'|'snow' }
 */
const express = require('express');
const router = express.Router();
const RemediationPathService = require('../services/RemediationPathService');
const { optionalJWT } = require('../middleware/auth');
const logger = require('../utils/logger');

function resolveOrg(req, res) {
  const orgId = req.orgId || req.headers['x-org-id'] || req.query.org_id || (req.body && req.body.org_id);
  if (!orgId) { res.status(400).json({ error: 'Organization not specified' }); return null; }
  return orgId;
}

router.get('/tickets', optionalJWT, async (req, res) => {
  const orgId = resolveOrg(req, res);
  if (!orgId) return;
  try { res.json({ tickets: await RemediationPathService.listTickets(orgId) }); }
  catch (err) { logger.error('Remediation tickets error', { error: err.message }); res.status(500).json({ error: err.message }); }
});

router.post('/sweep', optionalJWT, async (req, res) => {
  const orgId = resolveOrg(req, res);
  if (!orgId) return;
  try {
    const system = (req.body && req.body.system) || 'demo';
    res.json(await RemediationPathService.runSweep(orgId, system));
  } catch (err) { logger.error('Remediation sweep error', { error: err.message }); res.status(500).json({ error: err.message }); }
});

module.exports = router;
