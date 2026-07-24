'use strict';

/**
 * routes/operators — standing autonomous role-operators.
 *   POST /api/operators/tick            run all six operators + a forecast heartbeat
 *   POST /api/operators/tick/:role      run one role's operator
 *   GET  /api/operators/runs            recent operator runs
 *   GET  /api/operators/mandate/:role   the role's autonomy mandate
 *   PUT  /api/operators/mandate/:role   update a role's mandate (autonomy, cost cap)
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const Ops = require('../services/AgentOperatorService');

const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId || (req.body && req.body.org_id);
const need = (req, res) => { const o = orgOf(req); if (!o) res.status(400).json({ error: 'Organization required.' }); return o; };

router.post('/tick', optionalJWT, demoOrg, async (req, res) => {
  const orgId = need(req, res); if (!orgId) return;
  try { res.json(await Ops.tickAll(orgId, req.body || {})); } catch (e) { res.status(500).json({ error: 'Unable to run operators.' }); }
});

router.post('/tick/:role', optionalJWT, demoOrg, async (req, res) => {
  const orgId = need(req, res); if (!orgId) return;
  try { res.json(await Ops.tick(orgId, req.params.role, req.body || {})); } catch (e) { res.status(500).json({ error: 'Unable to run operator.' }); }
});

router.get('/runs', optionalJWT, demoOrg, async (req, res) => {
  const orgId = need(req, res); if (!orgId) return;
  try { res.json({ runs: await Ops.runs(orgId, Number(req.query.limit) || 50) }); } catch (e) { res.status(500).json({ error: 'Unable to load runs.' }); }
});

router.get('/mandate/:role', optionalJWT, demoOrg, async (req, res) => {
  const orgId = need(req, res); if (!orgId) return;
  try { res.json(await Ops.getMandate(orgId, req.params.role)); } catch (e) { res.status(500).json({ error: 'Unable to load mandate.' }); }
});

router.put('/mandate/:role', optionalJWT, demoOrg, async (req, res) => {
  const orgId = need(req, res); if (!orgId) return;
  try { res.json(await Ops.setMandate(orgId, req.params.role, req.body || {})); } catch (e) { res.status(500).json({ error: 'Unable to save mandate.' }); }
});

module.exports = router;
