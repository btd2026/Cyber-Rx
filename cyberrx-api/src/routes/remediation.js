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
const RiskAcceptanceService = require('../services/RiskAcceptanceService');
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

// Single-finding ticket — open (or fetch) a ticket for one attack-path finding.
router.post('/ticket', optionalJWT, async (req, res) => {
  const orgId = resolveOrg(req, res);
  if (!orgId) return;
  try {
    const b = req.body || {};
    if (!b.sourceRef || !b.title) return res.status(400).json({ error: 'sourceRef and title are required' });
    res.json(await RemediationPathService.ticketOne(orgId, b));
  } catch (err) { logger.error('Remediation ticketOne error', { error: err.message }); res.status(500).json({ error: err.message }); }
});

router.get('/ticket', optionalJWT, async (req, res) => {
  const orgId = resolveOrg(req, res);
  if (!orgId) return;
  try { res.json({ ticket: await RemediationPathService.getTicketByRef(orgId, req.query.sourceRef) }); }
  catch (err) { logger.error('Remediation getTicket error', { error: err.message }); res.status(500).json({ error: err.message }); }
});

// Refresh a ticket's status from the ticketing system (CISO can call anytime).
router.post('/ticket/refresh', optionalJWT, async (req, res) => {
  const orgId = resolveOrg(req, res);
  if (!orgId) return;
  try {
    const sourceRef = (req.body && req.body.sourceRef) || req.query.sourceRef;
    if (!sourceRef) return res.status(400).json({ error: 'sourceRef is required' });
    res.json({ ticket: await RemediationPathService.refreshStatus(orgId, sourceRef) });
  } catch (err) { logger.error('Remediation refresh error', { error: err.message }); res.status(500).json({ error: err.message }); }
});

// ----- Risk acceptance — the CISO's documented "accept as-is" decision -----
router.post('/risk-acceptance', optionalJWT, async (req, res) => {
  const orgId = resolveOrg(req, res);
  if (!orgId) return;
  try {
    res.json({ acceptance: await RiskAcceptanceService.accept(orgId, req.body || {}) });
  } catch (err) {
    const code = /required/.test(err.message) ? 400 : 500;
    logger.error('Risk acceptance error', { error: err.message });
    res.status(code).json({ error: err.message });
  }
});

router.get('/risk-acceptance', optionalJWT, async (req, res) => {
  const orgId = resolveOrg(req, res);
  if (!orgId) return;
  try { res.json({ acceptance: await RiskAcceptanceService.getByRef(orgId, req.query.sourceRef) }); }
  catch (err) { logger.error('Risk acceptance get error', { error: err.message }); res.status(500).json({ error: err.message }); }
});

router.post('/risk-acceptance/revoke', optionalJWT, async (req, res) => {
  const orgId = resolveOrg(req, res);
  if (!orgId) return;
  try {
    const sourceRef = (req.body && req.body.sourceRef) || req.query.sourceRef;
    if (!sourceRef) return res.status(400).json({ error: 'sourceRef is required' });
    res.json({ acceptance: await RiskAcceptanceService.revoke(orgId, sourceRef) });
  } catch (err) { logger.error('Risk acceptance revoke error', { error: err.message }); res.status(500).json({ error: err.message }); }
});

module.exports = router;
