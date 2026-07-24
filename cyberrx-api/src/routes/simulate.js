'use strict';

/**
 * routes/simulate — counterfactual "what-if" over the decision graph.
 *   POST /api/simulate/what-if          { fix:[cardIds], accept:[cardIds] } → portfolio delta
 *   GET  /api/simulate/collapse/:cardId  which compound chains collapse if this card is fixed
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const Sim = require('../services/SimulationService');

const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId || (req.body && req.body.org_id);

router.post('/what-if', optionalJWT, demoOrg, async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await Sim.whatIf(orgId, req.body || {})); } catch (e) { res.status(500).json({ error: 'Unable to run the simulation.' }); }
});

router.get('/collapse/:cardId', optionalJWT, demoOrg, async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await Sim.collapseAnalysis(orgId, req.params.cardId)); }
  catch (e) {
    if (e.code === 'CARD_NOT_FOUND') return res.status(404).json({ error: e.message });
    res.status(500).json({ error: 'Unable to analyze chain collapse.' });
  }
});

module.exports = router;
