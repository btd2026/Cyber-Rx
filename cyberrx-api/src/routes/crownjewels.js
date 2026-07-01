'use strict';

/**
 * routes/crown-jewels — Crown-Jewels analysis engine API.
 * Stage 1: the analysis entrypoint behind the run cost-ceiling gate. The
 * downstream pipeline (ingest -> resolve -> map -> score -> graph) is stubbed
 * here and filled in by Stages 2-10.
 */

const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const Asset = require('../models/Asset');
const BusinessProcess = require('../models/BusinessProcess');
const Analysis = require('../services/crownjewels/AnalysisRunService');
const CrownJewelEngine = require('../services/crownjewels/CrownJewelEngine');
const IngestMapper = require('../services/crownjewels/IngestMapper');
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
    const out = await Analysis.runGuardedAnalysis(ids(req), { mode, actor: req.userId || orgId }, async (/* { runId, meter } */) => {
      // Stage 1: downstream pipeline stubbed. Stages 2-10 implement ingest ->
      // entity resolution -> dependency mapping -> criticality -> risk ->
      // control mapping -> graph assembly. The meter will accrue per-stage cost.
      return { stub: true, message: 'analysis pipeline not yet implemented (Stage 1 gate only)' };
    });
    const quota = await Analysis.usage(ids(req));
    res.json({ run_id: out.runId, mode: out.mode, usage: out.usage, result: out.result, quota });
  } catch (e) {
    if (e && e.code === 'ANALYSIS_CAP_REACHED') return res.status(429).json({ error: e.message, code: e.code, used: e.used, limit: e.limit, reset_date: e.resetDate });
    res.status(500).json({ error: e.message });
  }
});

// Ingest onboarding uploads (process list + app/CMDB inventory) into the org's
// canonical inventory so the engine scores REAL data. Idempotent per org.
router.post('/ingest', optionalJWT, async (req, res) => {
  const b = req.body || {};
  if (!b.org_name && !b.org_id) return res.status(400).json({ error: 'org_name or org_id is required' });
  try {
    const { org, processes, assets } = IngestMapper.mapOnboarding(b);
    await db.query('INSERT INTO orgs (id, name) VALUES ($1,$2) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name', [org.id, org.name]);
    await db.query('DELETE FROM assets WHERE organization_id=$1', [org.id]).catch(() => {});
    await db.query('DELETE FROM business_processes WHERE organization_id=$1', [org.id]).catch(() => {});
    for (const p of processes) { try { await BusinessProcess.create(p); } catch (e) { /* skip a bad row */ } }
    for (const a of assets) { try { await Asset.create(a); } catch (e) { /* skip a bad row */ } }
    res.json({ org_id: org.id, org_name: org.name, counts: { processes: processes.length, assets: assets.length } });
  } catch (e) { res.status(500).json({ error: e.message }); }
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

module.exports = router;
