'use strict';

/**
 * routes/crosswalk — assisted app→process and process→capability crosswalk.
 *   GET  /api/crosswalk/app-process/suggestions
 *   POST /api/crosswalk/app-process/confirm        { applicationId, processId }
 *   GET  /api/crosswalk/process-capability/suggestions
 *   POST /api/crosswalk/process-capability/confirm  { processId, capabilityId }
 *   GET  /api/crosswalk/status
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { optionalJWT } = require('../middleware/auth');
const Crosswalk = require('../crosswalk/CrosswalkService');

function org(req, res) {
  const id = req.orgId || req.headers['x-org-id'] || req.query.org_id || (req.body && req.body.org_id);
  if (!id) { res.status(400).json({ error: 'Organization not specified' }); return null; }
  return id;
}

router.get('/app-process/suggestions', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json({ items: await Crosswalk.suggestAppProcess(orgId) }); }
  catch (e) { logger.warn('app-process suggest failed', { error: e.message }); res.status(500).json({ error: e.message }); }
});

router.post('/app-process/confirm', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  const b = req.body || {};
  if (!b.applicationId || !b.processId) return res.status(400).json({ error: 'applicationId and processId are required' });
  try { res.json(await Crosswalk.confirmAppProcess(orgId, b.applicationId, b.processId, b.confirmedBy)); }
  catch (e) { logger.warn('app-process confirm failed', { error: e.message }); res.status(500).json({ error: e.message }); }
});

router.get('/process-capability/suggestions', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json({ items: await Crosswalk.suggestProcessCapability(orgId) }); }
  catch (e) { logger.warn('process-capability suggest failed', { error: e.message }); res.status(500).json({ error: e.message }); }
});

router.post('/process-capability/confirm', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  const b = req.body || {};
  if (!b.processId || !b.capabilityId) return res.status(400).json({ error: 'processId and capabilityId are required' });
  try { res.json(await Crosswalk.confirmProcessCapability(orgId, b.processId, b.capabilityId, b.confirmedBy)); }
  catch (e) { logger.warn('process-capability confirm failed', { error: e.message }); res.status(500).json({ error: e.message }); }
});

router.get('/status', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json(await Crosswalk.status(orgId)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
