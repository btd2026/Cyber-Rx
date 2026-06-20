'use strict';

/**
 * routes/business-context — org self-authoring of the business context that every
 * lens computes against: crown jewels, the primary sensitive-data descriptor,
 * risk appetite, SEC materiality threshold, and revenue. Authored values replace
 * the inferred crown jewel and propagate via the shared tenant config.
 *   GET /api/business-context     current (merged) context + defaults/overridden
 *   PUT /api/business-context     author it (deep-merged into tenant config)
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const logger = require('../utils/logger');
const Cfg = require('../services/TenantConfigService');

router.use(optionalJWT, demoOrg);
const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId || (req.body && req.body.org_id);

router.get('/', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try {
    const cfg = await Cfg.get(orgId);
    res.json({
      businessContext: cfg.config.businessContext,
      appetite: cfg.config.appetite,
      materialityThresholdUSD: cfg.config.materialityThresholdUSD,
      defaults: { businessContext: cfg.defaults.businessContext, appetite: cfg.defaults.appetite },
      overridden: cfg.overridden,
    });
  } catch (e) { logger.warn('business-context get failed', { error: e.message }); res.status(500).json({ error: 'Unable to load business context.' }); }
});

router.put('/', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  const b = req.body || {};
  const patch = {};
  if (b.businessContext && typeof b.businessContext === 'object') patch.businessContext = b.businessContext;
  if (b.appetite && typeof b.appetite === 'object') patch.appetite = b.appetite;
  if (b.materialityThresholdUSD !== undefined) patch.materialityThresholdUSD = b.materialityThresholdUSD === null ? null : Number(b.materialityThresholdUSD);
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'Nothing to update.' });
  try {
    const out = await Cfg.set(orgId, patch);
    res.json({ businessContext: out.config.businessContext, appetite: out.config.appetite, materialityThresholdUSD: out.config.materialityThresholdUSD, overridden: out.overridden });
  } catch (e) { logger.warn('business-context write failed', { error: e.message }); res.status(500).json({ error: 'Unable to save business context.' }); }
});

module.exports = router;
