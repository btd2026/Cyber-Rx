'use strict';

/**
 * routes/crown-jewels — Crown-Jewels analysis engine API (Stages 1-10).
 */

const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const logger = require('../utils/logger');
const Analysis = require('../services/crownjewels/AnalysisRunService');
const CrownJewelEngine = require('../services/crownjewels/CrownJewelEngine');
const IngestMapper = require('../services/crownjewels/IngestMapper');
const Asset = require('../models/Asset');
const BusinessProcess = require('../models/BusinessProcess');
const Risk = require('../models/Risk');
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

// Ingest an onboarding inventory (process list + app/CMDB export) into the
// canonical org / business_processes / assets tables the engine scores.
// Deterministic + idempotent: re-ingesting an org replaces its prior inventory.
// FREE (no embedding/LLM) — persistence only; scoring happens on read via /summary.
router.post('/ingest', optionalJWT, async (req, res) => {
  const b = req.body || {};
  const orgName = String(b.org_name || b.org || '').trim();
  const orgId = ids(req).orgId || b.org_id || (orgName ? `org_${IngestMapper.slug(orgName)}` : '');
  if (!orgId) return res.status(400).json({ error: 'org_name or org_id is required' });
  const processes = Array.isArray(b.processes) ? b.processes : [];
  const apps = Array.isArray(b.apps) ? b.apps : [];
  const risks = Array.isArray(b.risks) ? b.risks : [];
  if (!processes.length && !apps.length) return res.status(400).json({ error: 'processes and/or apps are required' });

  let step = 'map';
  try {
    const mapped = IngestMapper.mapOnboarding({ org_id: orgId, org_name: orgName || orgId, processes, apps });

    // Ensure the org row exists so the FK on business_processes/assets is satisfied.
    step = 'upsert_org';
    await db.query(
      `INSERT INTO orgs (id, name, type, setup_json, created_at)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [mapped.org.id, mapped.org.name, '', '{}']);

    // Idempotent replace: clear the org's prior inventory, then insert the mapped rows.
    step = 'clear_inventory';
    await db.query('DELETE FROM assets WHERE organization_id = $1', [mapped.org.id]);
    await db.query('DELETE FROM business_processes WHERE organization_id = $1', [mapped.org.id]);

    step = 'insert_processes';
    for (const p of mapped.processes) {
      await BusinessProcess.create({
        id: p.id, name: p.name, tier: p.tier, criticality: p.criticality,
        owner: p.owner || '—', organizationId: mapped.org.id,
      });
    }
    step = 'insert_assets';
    for (const a of mapped.assets) {
      await Asset.create({
        id: a.id, name: a.name, type: a.type, organizationId: mapped.org.id,
        businessProcessIds: a.businessProcessIds || [], dataClassification: a.dataClassification || [],
        description: a.description || null,
      });
    }

    // Optional risk register — quantified open risks linked to assets/processes by
    // NAME (callers don't know generated ids). Unlocks the material-exposure $ figure.
    step = 'insert_risks';
    let risksInserted = 0;
    if (risks.length) {
      await db.query('DELETE FROM risks WHERE organization_id = $1', [mapped.org.id]);
      const norm = (s) => String(s || '').trim().toLowerCase();
      const assetByName = {}; mapped.assets.forEach((a) => { assetByName[norm(a.name)] = a.id; });
      const procByName = {}; mapped.processes.forEach((p) => { procByName[norm(p.name)] = p.id; });
      const SEV = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
      const STAT = { open: 'open', mitigating: 'mitigating', accepted: 'accepted', closed: 'closed' };
      const money = (v) => { const n = Number(String(v == null ? '' : v).replace(/[^0-9.]/g, '')); return Number.isFinite(n) && n > 0 ? n : null; };
      for (let i = 0; i < risks.length; i++) {
        const r = risks[i] || {};
        const title = String(r.title || r.name || '').trim();
        if (!title) continue;
        const assetId = r.asset ? (assetByName[norm(r.asset)] || null) : null;
        const procNames = r.processes || (r.process ? [r.process] : []);
        const bpIds = (Array.isArray(procNames) ? procNames : []).map((n) => procByName[norm(n)]).filter(Boolean);
        await Risk.create({
          id: `${mapped.org.id}_R${i + 1}`, title,
          severity: SEV[norm(r.severity)] || 'High',
          status: STAT[norm(r.status)] || 'open',
          organizationId: mapped.org.id,
          assetId,
          businessProcessIds: bpIds,
          financialExposure: money(r.financial_exposure != null ? r.financial_exposure : r.exposure),
          costToRemediate: money(r.cost_to_remediate),
          likelihood: r.likelihood || null,
          description: r.description || null,
        });
        risksInserted++;
      }
    }

    res.json({
      org_id: mapped.org.id, org_name: mapped.org.name,
      counts: { processes: mapped.processes.length, assets: mapped.assets.length, risks: risksInserted },
    });
  } catch (e) {
    // Surface the real cause (masked by the global handler otherwise) so ingest
    // failures are diagnosable from the response itself.
    logger.error('[crown-jewels/ingest] failed', { step, message: e.message, code: e.code, detail: e.detail });
    res.status(500).json({ error: e.message, code: e.code || null, detail: e.detail || null, step });
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
