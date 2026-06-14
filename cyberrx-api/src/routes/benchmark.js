'use strict';

/**
 * routes/benchmark — Phase 7 scaffold (flag-gated, consent-bounded).
 *   GET  /api/benchmark/consent
 *   POST /api/benchmark/consent            { consented, scope }
 *   GET  /api/benchmark/capabilities       anonymized peer capability data (k-anon)
 *   GET  /api/benchmark/shared-dependencies shared dependency assessments for this tenant
 *
 * All endpoints 404 unless CROSS_TENANT_BENCHMARKING=true.
 */

const express = require('express');
const router = express.Router();
const { optionalJWT } = require('../middleware/auth');
const Bench = require('../services/BenchmarkService');

function org(req, res) {
  const id = req.orgId || req.headers['x-org-id'] || req.query.org_id || (req.body && req.body.org_id);
  if (!id) { res.status(400).json({ error: 'Organization not specified' }); return null; }
  return id;
}
// Gate the whole router behind the feature flag.
router.use((req, res, next) => { if (!Bench.isEnabled()) return res.status(404).json({ error: 'cross-tenant benchmarking is disabled' }); next(); });

router.get('/consent', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json(await Bench.getConsent(orgId)); } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/consent', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  const b = req.body || {};
  try { res.json(await Bench.setConsent(orgId, b.consented, b.scope)); } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/capabilities', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json(await Bench.capabilityBenchmark(orgId)); } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/shared-dependencies', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json(await Bench.sharedDependencyBenchmark(orgId)); } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
