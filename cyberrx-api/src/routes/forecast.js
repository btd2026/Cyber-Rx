'use strict';

/**
 * routes/forecast — the self-scoring forecast ledger.
 *   GET  /api/forecast/accuracy      Brier score + calibration over resolved predictions
 *   GET  /api/forecast/predictions   the recorded predictions
 *   POST /api/forecast/snapshot      capture today's decision cards as predictions
 *   POST /api/forecast/reconcile     resolve elapsed predictions vs. incidents
 *   POST /api/forecast/incident      record an actual outcome
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const Forecast = require('../services/ForecastService');

const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId || (req.body && req.body.org_id);
const need = (req, res) => { const o = orgOf(req); if (!o) res.status(400).json({ error: 'Organization required.' }); return o; };

router.get('/accuracy', optionalJWT, demoOrg, async (req, res) => {
  const orgId = need(req, res); if (!orgId) return;
  try { res.json(await Forecast.accuracy(orgId)); } catch (e) { res.status(500).json({ error: 'Unable to compute forecast accuracy.' }); }
});

router.get('/predictions', optionalJWT, demoOrg, async (req, res) => {
  const orgId = need(req, res); if (!orgId) return;
  try { res.json({ predictions: await Forecast.predictions(orgId, Number(req.query.limit) || 100) }); }
  catch (e) { res.status(500).json({ error: 'Unable to load predictions.' }); }
});

router.post('/snapshot', optionalJWT, demoOrg, async (req, res) => {
  const orgId = need(req, res); if (!orgId) return;
  try { res.json(await Forecast.snapshot(orgId, req.body || {})); } catch (e) { res.status(500).json({ error: 'Unable to snapshot predictions.' }); }
});

router.post('/reconcile', optionalJWT, demoOrg, async (req, res) => {
  const orgId = need(req, res); if (!orgId) return;
  try { res.json(await Forecast.reconcile(orgId, req.body || {})); } catch (e) { res.status(500).json({ error: 'Unable to reconcile predictions.' }); }
});

router.post('/incident', optionalJWT, demoOrg, async (req, res) => {
  const orgId = need(req, res); if (!orgId) return;
  try { res.json(await Forecast.recordIncident(orgId, req.body || {})); } catch (e) { res.status(500).json({ error: 'Unable to record incident.' }); }
});

module.exports = router;
