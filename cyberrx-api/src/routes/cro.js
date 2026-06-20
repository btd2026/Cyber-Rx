'use strict';

/**
 * routes/cro — the CRO lens (enterprise risk altitude over the shared spine).
 *   GET /api/cro/position       enterprise risk position + appetite bands
 *   GET /api/cro/exposures      cyber KRIs vs appetite + top shared exposures
 *   GET /api/cro/aggregation    concentration + correlated failures + matrix
 *   GET /api/cro/treatment      mitigate/transfer/accept portfolio + ROI
 *   GET /api/cro/appetite       current central appetite (tenant config)
 *   PUT /api/cro/appetite       AUTHOR the central appetite (propagates to all lenses)
 *
 * Appetite is the centrally-owned model: authored here, stored in tenant config,
 * read by the decision spine and every other lens.
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(optionalJWT, demoOrg);
const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId || (req.body && req.body.org_id);

function svc(name) { return require(`../services/${name}`); }
const { prov } = require('../utils/provenance');

// Per-view provenance: 'derived' (computed from the org's own data) or 'demo'
// (industry-shaped sample) — honest origin for each CRO sub-tab.
async function viewProv(orgId, label) {
  try { const c = await svc('ExecDashboardService').loadCtx(orgId); return prov(c.isDemo ? 'demo' : 'derived', label); }
  catch (_) { return prov('modeled', label); }
}

router.get('/position', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { const d = await svc('CroPortfolioService').getPosition(orgId); d.provenance = await viewProv(orgId, 'Enterprise risk position'); res.json(d); }
  catch (e) { logger.warn('cro position failed', { error: e.message }); res.status(500).json({ error: 'Unable to build enterprise risk position.' }); }
});

router.get('/exposures', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { const d = await svc('CroExposuresService').getExposures(orgId); d.provenance = await viewProv(orgId, 'KRIs vs appetite'); res.json(d); }
  catch (e) { logger.warn('cro exposures failed', { error: e.message }); res.status(500).json({ error: 'Unable to build exposures.' }); }
});

router.get('/aggregation', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { const d = await svc('CroAggregationService').getAggregation(orgId); d.provenance = await viewProv(orgId, 'Aggregation & correlation'); res.json(d); }
  catch (e) { logger.warn('cro aggregation failed', { error: e.message }); res.status(500).json({ error: 'Unable to build aggregation view.' }); }
});

router.get('/treatment', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { const d = await svc('CroTreatmentService').getTreatment(orgId); d.provenance = await viewProv(orgId, 'Treatment portfolio'); res.json(d); }
  catch (e) { logger.warn('cro treatment failed', { error: e.message }); res.status(500).json({ error: 'Unable to build treatment portfolio.' }); }
});

// ---- central appetite authoring (propagates to every lens) -----------------
router.get('/appetite', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { const cfg = await svc('TenantConfigService').get(orgId); res.json({ appetite: cfg.config.appetite, defaults: cfg.defaults.appetite, overridden: cfg.overridden.includes('appetite') }); }
  catch (e) { res.status(500).json({ error: 'Unable to load appetite.' }); }
});

router.put('/appetite', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  const appetite = (req.body && req.body.appetite) || req.body;
  if (!appetite || typeof appetite !== 'object') return res.status(400).json({ error: 'appetite object required.' });
  try {
    // Authoring is RBAC'd to the CRO/admin in production; the patch deep-merges
    // into the shared tenant config so every lens reads the new appetite.
    const out = await svc('TenantConfigService').set(orgId, { appetite });
    res.json({ appetite: out.config.appetite, overridden: out.overridden.includes('appetite') });
  } catch (e) { logger.warn('cro appetite write failed', { error: e.message }); res.status(500).json({ error: 'Unable to save appetite.' }); }
});

module.exports = router;
