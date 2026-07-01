'use strict';

/**
 * routes/crown-jewels — Crown-Jewels analysis engine API (Stages 1-10).
 */

const express = require('express');
const router = express.Router();
const Analysis = require('../services/crownjewels/AnalysisRunService');
const CrownJewelEngine = require('../services/crownjewels/CrownJewelEngine');
const AnalystQueue = require('../services/assessment/AnalystQueueService');
const { optionalJWT, requireAdmin } = require('../middleware/auth');

function ids(req) {
  return {
    orgId: req.orgId || req.query.org_id || (req.body && req.body.org_id) || req.headers['x-org-id'] || '',
    userId: req.userId || null,
    accountId: (req.user && req.user.accountId) || null,
  };
}
const orgOf = (req) => ids(req).orgId;

// Initiate an analysis run (quota-gated, BEFORE any embedding/LLM/batch work).
router.post('/analyze', optionalJWT, async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  const mode = (req.body && req.body.mode) === 'delta' ? 'delta' : 'full';
  try {
    const out = await Analysis.runGuardedAnalysis(ids(req), { mode, actor: req.userId || orgId }, async ({ runId, meter }) => {
      return CrownJewelEngine.runPipeline(orgId, { runId, meter });
    });
    const quota = await Analysis.usage(ids(req));
    res.json({ run_id: out.runId, mode: out.mode, usage: out.usage, result: out.result, quota });
  } catch (e) {
    if (e && e.code === 'ANALYSIS_CAP_REACHED') return res.status(429).json({ error: e.message, code: e.code, used: e.used, limit: e.limit, reset_date: e.resetDate });
    res.status(500).json({ error: e.message });
  }
});

// Crown-jewel summary for the cockpit (material exposure, crown jewels, counts).
// Computed from the org's real inventory; { empty:true } when none ingested yet.
router.get('/summary', optionalJWT, async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  try { const out = await CrownJewelEngine.run(orgId); res.json({ org_id: orgId, generated_at: out.generated_at, empty: !!out.empty, ...out.summary }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Full process -> asset -> risk -> control GraphModel for the visualization.
router.get('/graph', optionalJWT, async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  try { const out = await CrownJewelEngine.run(orgId); res.json({ org_id: orgId, generated_at: out.generated_at, empty: !!out.empty, ...out.graph }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Remaining full-rebuild cap — FREE.
router.get('/quota', optionalJWT, async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  try { res.json(await Analysis.usage(ids(req))); } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin overrides (logged actor + reason).
router.post('/quota/grant', requireAdmin, async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  try { const actor = (req.user && req.user.userId) || req.headers['x-admin-actor'] || 'admin'; res.json(await Analysis.adminGrant(ids(req), { extra: parseInt(req.body && req.body.extra, 10), actor, reason: req.body && req.body.reason })); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
router.post('/quota/reset', requireAdmin, async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  try { const actor = (req.user && req.user.userId) || req.headers['x-admin-actor'] || 'admin'; res.json(await Analysis.adminReset(ids(req), { actor, reason: req.body && req.body.reason })); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// Review queue — items needing human confirmation/override from the analysis.
router.get('/review', optionalJWT, async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  try {
    const status = req.query.status || 'open';
    const items = await AnalystQueue.list(orgId, { status, scanId: req.query.run_id });
    res.json({ org_id: orgId, status, items });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/review/:id/resolve', optionalJWT, async (req, res) => {
  try {
    const actor = req.userId || req.headers['x-admin-actor'] || 'analyst';
    const result = await AnalystQueue.resolve(req.params.id, {
      action: req.body.action,
      actor,
      reason: req.body.reason,
      resolution: req.body.resolution,
    });
    res.json(result);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;
