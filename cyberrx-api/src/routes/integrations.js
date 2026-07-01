'use strict';

/**
 * routes/integrations — read-only security-tool connectors that feed live signals.
 *   GET    /api/integrations                 catalog + per-connector status
 *   POST   /api/integrations/:key/connect    { ...creds } → validate, vault, sync
 *   POST   /api/integrations/:key/sync       re-pull signals on demand
 *   DELETE /api/integrations/:key            disconnect (clears creds, marks stale)
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const logger = require('../utils/logger');
const Integrations = require('../services/IntegrationService');

router.use(optionalJWT, demoOrg);
const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId || (req.body && req.body.org_id);

router.get('/', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json({ connectors: await Integrations.listForOrg(orgId) }); }
  catch (e) { logger.warn('integrations list failed', { error: e.message }); res.status(500).json({ error: 'Unable to load integrations.' }); }
});

// Current live signal values from the org's connected tools (empty until connected).
router.get('/signals', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json({ org_id: orgId, signals: await Integrations.signalsForOrg(orgId) }); }
  catch (e) { logger.warn('signals list failed', { error: e.message }); res.status(500).json({ error: 'Unable to load signals.' }); }
});

router.post('/:key/connect', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try {
    const result = await Integrations.connect(orgId, req.params.key, req.body || {});
    res.json({ ...result, connectors: await Integrations.listForOrg(orgId) });
  } catch (e) { logger.warn('connect failed', { key: req.params.key, error: e.message }); res.status(502).json({ error: e.message || 'Connection failed.' }); }
});

router.post('/:key/sync', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try {
    const result = await Integrations.sync(orgId, req.params.key);
    res.json({ ...result, connectors: await Integrations.listForOrg(orgId) });
  } catch (e) { logger.warn('sync failed', { key: req.params.key, error: e.message }); res.status(502).json({ error: e.message || 'Sync failed.' }); }
});

router.delete('/:key', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try {
    await Integrations.disconnect(orgId, req.params.key);
    res.json({ connectors: await Integrations.listForOrg(orgId) });
  } catch (e) { res.status(500).json({ error: 'Unable to disconnect.' }); }
});

module.exports = router;
