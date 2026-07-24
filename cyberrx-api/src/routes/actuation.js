'use strict';

/**
 * routes/actuation — closed-loop execution + verification of a decision option.
 *   POST /api/actuation             actuate a card's option (dispatch + ledger)
 *   POST /api/actuation/:id/verify  re-read telemetry, confirm residual-risk drop
 *   GET  /api/actuation             the actuation log
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const logger = require('../utils/logger');
const Actuation = require('../services/ActuationService');

const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId || (req.body && req.body.org_id);

router.get('/', optionalJWT, demoOrg, async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json({ actuations: await Actuation.list(orgId, Number(req.query.limit) || 100) }); }
  catch (e) { res.status(500).json({ error: 'Unable to load actuations.' }); }
});

router.post('/', optionalJWT, demoOrg, async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  const b = req.body || {};
  if (!b.cardId) return res.status(400).json({ error: 'cardId is required.' });
  try { res.json(await Actuation.actuate(orgId, b.cardId, b.optionId, { actor: b.actor, role: b.role })); }
  catch (e) {
    if (e.code === 'CARD_NOT_FOUND' || e.code === 'NOT_ACTUABLE') return res.status(422).json({ error: e.message });
    logger.warn('actuate failed', { error: e.message }); res.status(500).json({ error: 'Unable to actuate the decision.' });
  }
});

router.post('/:id/verify', optionalJWT, demoOrg, async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await Actuation.verify(orgId, req.params.id, req.body || {})); }
  catch (e) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ error: e.message });
    res.status(500).json({ error: 'Unable to verify the actuation.' });
  }
});

module.exports = router;
