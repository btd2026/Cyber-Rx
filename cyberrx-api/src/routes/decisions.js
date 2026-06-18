'use strict';

/**
 * routes/decisions — the decision spine: one shared event/DecisionCard rendered
 * per role, with a decision/evidence ledger.
 *   GET  /api/decisions?role=CFO      shared decision cards, projected to a role lens
 *   POST /api/decisions/:id/decision  record a decision (+ rationale → ledger)
 *   GET  /api/decisions/ledger        the decision & evidence ledger
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const logger = require('../utils/logger');
const Engine = require('../services/DecisionEngineService');

router.use(optionalJWT, demoOrg);
const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId || (req.body && req.body.org_id);

router.get('/', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await Engine.list(orgId, req.query.role)); }
  catch (e) { logger.warn('decisions list failed', { error: e.message }); res.status(500).json({ error: 'Unable to build the decision queue.' }); }
});

router.get('/ledger', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json({ ledger: await Engine.ledger(orgId) }); }
  catch (e) { res.status(500).json({ error: 'Unable to load the decision ledger.' }); }
});

router.post('/:id/decision', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  const b = req.body || {};
  if (!b.action) return res.status(400).json({ error: 'action is required.' });
  try { res.json(await Engine.record(orgId, req.params.id, b)); }
  catch (e) {
    if (e.code === 'RATIONALE_REQUIRED') return res.status(422).json({ error: e.message });
    logger.warn('decision record failed', { error: e.message }); res.status(500).json({ error: 'Unable to record the decision.' });
  }
});

module.exports = router;
