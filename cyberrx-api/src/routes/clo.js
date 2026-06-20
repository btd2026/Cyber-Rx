'use strict';

/**
 * routes/clo — the CLO / General Counsel lens (legal altitude over the shared spine).
 *   GET /api/clo/obligations     obligation posture (industry overlay + clocks)
 *   GET /api/clo/triggers        trigger map & materiality over the shared events
 *   GET /api/clo/defensibility   the shared ledger as a legal artifact
 *   GET /api/clo/portfolio       regulatory & litigation portfolio
 *
 * Triggers attach to the SHARED events; the CLO trigger and the CISO technical
 * event are the same event.
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(optionalJWT, demoOrg);
const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId;
const svc = (n) => require(`../services/${n}`);
const { prov } = require('../utils/provenance');
async function viewProv(orgId, label) {
  try { const c = await svc('ExecDashboardService').loadCtx(orgId); return prov(c.isDemo ? 'demo' : 'derived', label); }
  catch (_) { return prov('modeled', label); }
}

router.get('/obligations', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { const d = await svc('CloObligationService').getPosture(orgId); d.provenance = await viewProv(orgId, 'Obligation posture'); res.json(d); }
  catch (e) { logger.warn('clo obligations failed', { error: e.message }); res.status(500).json({ error: 'Unable to build obligation posture.' }); }
});

router.get('/triggers', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { const d = await svc('CloTriggerService').getTriggers(orgId); d.provenance = await viewProv(orgId, 'Trigger map & materiality'); res.json(d); }
  catch (e) { logger.warn('clo triggers failed', { error: e.message }); res.status(500).json({ error: 'Unable to build trigger map.' }); }
});

router.get('/defensibility', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { const d = await svc('CloDefensibilityService').getDefensibility(orgId); d.provenance = await viewProv(orgId, 'Defensibility & evidence'); res.json(d); }
  catch (e) { logger.warn('clo defensibility failed', { error: e.message }); res.status(500).json({ error: 'Unable to build defensibility view.' }); }
});

router.get('/portfolio', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { const d = await svc('CloPortfolioService').getPortfolio(orgId); d.provenance = await viewProv(orgId, 'Regulatory & litigation'); res.json(d); }
  catch (e) { logger.warn('clo portfolio failed', { error: e.message }); res.status(500).json({ error: 'Unable to build legal portfolio.' }); }
});

module.exports = router;
