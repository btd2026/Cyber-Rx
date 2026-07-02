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

    // Economics inputs (financials, board appetite, insurance, budget) — stored on
    // the org and used by the cockpit's financial translation layer. All optional.
    const money = (v) => IngestMapper.money(v);
    const fin = b.financials || {};
    const ins = b.insurance || {};
    const economics = {
      financials: {
        revenue: money(fin.revenue), operatingIncome: money(fin.operatingIncome),
        netIncome: money(fin.netIncome), enterpriseValue: money(fin.enterpriseValue),
      },
      appetite: money(b.appetite),
      insurance: {
        limit: money(ins.limit), premium: money(ins.premium),
        retention: money(ins.retention), renewal: ins.renewal || null,
      },
      budget: money(b.budget),
      industry: b.industry || null,
      regions: Array.isArray(b.regions) ? b.regions : (b.regions ? [b.regions] : []),
    };

    // Operational-resilience inputs (per-process revenue/RTO, per-asset vendor/
    // EOL/recovery) — stored by name; used by the CIO/CRO seats. All optional.
    const eolOf = (v) => (v === true || /eol|end.of.life|unsupported|past support|true|yes/i.test(String(v || '')) ? true : (v == null || v === '' ? null : false));
    const resilience = { processes: {}, assets: {} };
    processes.forEach((p) => {
      if (!p || !p.name) return;
      const rev = money(p.revenue != null ? p.revenue : p.rev);
      const rto = p.rto != null ? Number(String(p.rto).replace(/[^0-9.]/g, '')) : null;
      if (rev || rto) resilience.processes[String(p.name).trim()] = { revenue: rev, rto: Number.isFinite(rto) ? rto : null };
    });
    apps.forEach((a) => {
      if (!a || !a.name) return;
      const vendor = a.vendor || null;
      const eol = eolOf(a.eol);
      const recovery = a.recovery != null ? Number(String(a.recovery).replace(/[^0-9.]/g, '')) : null;
      if (vendor || eol != null || recovery != null) resilience.assets[String(a.name).trim()] = { vendor, eol, recovery: Number.isFinite(recovery) ? recovery : null };
    });

    // Optional in-flight cyber projects/initiatives imported at onboarding.
    const initiatives = Array.isArray(b.initiatives) ? b.initiatives.filter((i) => i && (i.name || i.title)) : [];

    // Ensure the org row exists so the FK on business_processes/assets is satisfied.
    // JSONB-merge economics into setup_json so re-ingest overlays without clobbering.
    step = 'upsert_org';
    await db.query(
      `INSERT INTO orgs (id, name, type, setup_json, created_at)
       VALUES ($1,$2,$3,$4::jsonb,NOW())
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name,
         setup_json = COALESCE(orgs.setup_json,'{}'::jsonb) || EXCLUDED.setup_json`,
      [mapped.org.id, mapped.org.name, '', JSON.stringify({ economics, resilience, initiatives })]);

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
      const riskRows = IngestMapper.mapRisks(risks, mapped);
      for (const row of riskRows) { await Risk.create(row); risksInserted++; }
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
  try {
    const out = await CrownJewelEngine.run(orgId);
    // Record a real posture snapshot (expected loss, tail, posture, crown jewels)
    // so the board's quarter-over-quarter trend is genuine history — not authored.
    // Throttled to one point per ~day; capped to the last 12.
    if (!out.empty && out.summary && out.summary.economics) {
      out.summary.trend = await recordPostureSnapshot(orgId, out.summary);
    }
    res.json({ org_id: orgId, generated_at: out.generated_at, empty: !!out.empty, ...out.summary });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Append a daily posture snapshot to setup_json.posture_history and return the
// series. The trend is built from the org's own computed positions over time.
async function recordPostureSnapshot(orgId, summary) {
  try {
    const row = (await db.query('SELECT setup_json FROM orgs WHERE id=$1', [orgId]))[0];
    const sj = row && (typeof row.setup_json === 'string' ? JSON.parse(row.setup_json) : row.setup_json) || {};
    const hist = Array.isArray(sj.posture_history) ? sj.posture_history.slice() : [];
    const ale = Number(summary.economics && summary.economics.ale) || 0;
    if (ale <= 0) return hist;
    const now = Date.now();
    const last = hist[hist.length - 1];
    const DAY = 86400000;
    if (!last || (now - Date.parse(last.date)) >= DAY) {
      hist.push({
        date: new Date(now).toISOString(),
        ale,
        tail: Number(summary.economics.tail) || ale,
        crown_jewels: (summary.counts && summary.counts.crown_jewels) || 0,
      });
      while (hist.length > 12) hist.shift();
      await db.query("UPDATE orgs SET setup_json = COALESCE(setup_json,'{}'::jsonb) || $2::jsonb WHERE id=$1",
        [orgId, JSON.stringify({ posture_history: hist })]);
    }
    return hist;
  } catch (_) { return []; }
}

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
