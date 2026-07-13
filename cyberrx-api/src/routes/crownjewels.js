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
const CrownJewelRisk = require('../services/CrownJewelRiskService');
const IngestMapper = require('../services/crownjewels/IngestMapper');
const Asset = require('../models/Asset');
const BusinessProcess = require('../models/BusinessProcess');
const Risk = require('../models/Risk');
const RiskProposer = require('../services/crownjewels/RiskProposer');
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
  // When the org has no cyber risk register, Nerion's offline proposer suggests a
  // starter set from each application's characteristics (self-contained, no network).
  // The org's own register always wins; proposed risks are flagged as estimates.
  const uploadedRisks = Array.isArray(b.risks) ? b.risks.filter((r) => r && (r.title || r.name)) : [];
  const risksProposed = uploadedRisks.length === 0 && apps.length > 0;
  const risks = risksProposed ? RiskProposer.proposeRisks(apps, { industry: b.industry }) : uploadedRisks;
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
        sharesOutstanding: money(fin.sharesOutstanding),
      },
      appetite: money(b.appetite),
      insurance: {
        limit: money(ins.limit), premium: money(ins.premium),
        retention: money(ins.retention), renewal: ins.renewal || null,
      },
      budget: money(b.budget),
      dataRecords: money(b.dataRecords),
      principalRisks: (function () { const p = b.principalRisks || {}; return { creditMarket: money(p.creditMarket), operational: money(p.operational), thirdParty: money(p.thirdParty), compliance: money(p.compliance) }; })(),
      industry: b.industry || null,
      regions: Array.isArray(b.regions) ? b.regions : (b.regions ? [b.regions] : []),
      currency: (typeof b.currency === 'string' && b.currency.trim()) ? b.currency.trim().toUpperCase() : 'USD',
      risks_proposed: risksProposed, // true when Nerion proposed the register (no upload)
    };

    // Operational-resilience inputs (per-process revenue/RTO, per-asset vendor/
    // EOL/recovery) — stored by name; used by the CIO/CRO seats. All optional.
    const eolOf = (v) => (v === true || /eol|end.of.life|unsupported|past support|true|yes/i.test(String(v || '')) ? true : (v == null || v === '' ? null : false));
    const resilience = { processes: {}, assets: {} };
    processes.forEach((p) => {
      if (!p || !p.name) return;
      const rev = money(p.revenue != null ? p.revenue : p.rev);
      const rto = p.rto != null ? Number(String(p.rto).replace(/[^0-9.]/g, '')) : null;
      // Optional: transactions/day (from the process file or an observability feed)
      // and board-approved downtime tolerance ($ loss the board will tolerate for an
      // outage of this process). Both power the CISO crown-jewel cards.
      const txRaw = p.txPerDay != null ? p.txPerDay : p.tx;
      const tx = txRaw != null ? Number(String(txRaw).replace(/[^0-9.]/g, '')) : null;
      const tol = money(p.tolerance != null ? p.tolerance : p.downtimeTolerance);
      // Optional business-function grouping — the macro layer above processes in the
      // Framework value chain (Function → Process → Technology → Cyber risk → Control).
      const func = (p.function != null ? String(p.function) : (p.businessFunction != null ? String(p.businessFunction) : '')).trim() || null;
      if (rev || rto || tx || tol || func) resilience.processes[String(p.name).trim()] = {
        revenue: rev, rto: Number.isFinite(rto) ? rto : null,
        txPerDay: Number.isFinite(tx) && tx > 0 ? tx : null, tolerance: tol || null, function: func };
    });
    apps.forEach((a) => {
      if (!a || !a.name) return;
      const vendor = a.vendor || null;
      const eol = eolOf(a.eol);
      const recovery = a.recovery != null ? Number(String(a.recovery).replace(/[^0-9.]/g, '')) : null;
      // Optional per-system operating figures (the CISO crown-jewel cards) — provided
      // directly on the inventory row so each system's numbers trace to it, not to a
      // process estimate. tx/day and value/day override the process-derived fallback.
      const txRaw = a.txPerDay != null ? a.txPerDay : a.transactionsPerDay;
      const tx = txRaw != null ? Number(String(txRaw).replace(/[^0-9.]/g, '')) : null;
      const val = money(a.valuePerDay != null ? a.valuePerDay : a.dailyValue);
      // Annual transaction volume ($/currency per year) — Nerion derives value/day
      // (÷365) and value/hour (÷8760) from it. A direct valuePerDay overrides.
      const valYear = money(a.valuePerYear != null ? a.valuePerYear : a.annualValue);
      if (vendor || eol != null || recovery != null || tx || val || valYear) resilience.assets[String(a.name).trim()] = {
        vendor, eol, recovery: Number.isFinite(recovery) ? recovery : null,
        txPerDay: Number.isFinite(tx) && tx > 0 ? tx : null, valuePerDay: val || null, valuePerYear: valYear || null };
    });

    // Optional in-flight cyber projects/initiatives imported at onboarding.
    const initiatives = Array.isArray(b.initiatives) ? b.initiatives.filter((i) => i && (i.name || i.title)) : [];

    // Board governance & incident-readiness (SEC Reg S-K Item 106) — powers the
    // CEO/Board governance panel. All optional; stored verbatim on the org.
    const g = b.governance || {};
    const governance = {
      committee: g.committee || null, cadence: g.cadence || null, ermIntegrated: g.ermIntegrated || null,
      ir: {
        tested: (g.ir && g.ir.tested) || null, lastTabletop: (g.ir && g.ir.lastTabletop) || null,
        retainer: (g.ir && g.ir.retainer) || null, ransomwarePolicy: (g.ir && g.ir.ransomwarePolicy) || null,
      },
    };

    // Strategic initiatives (CEO per-initiative go/no-go safety check + decision brief).
    const strategicInitiatives = Array.isArray(b.strategicInitiatives)
      ? b.strategicInitiatives.filter((s) => s && s.name).slice(0, 20).map((s) => ({
          name: String(s.name).slice(0, 140),
          type: s.type ? String(s.type).slice(0, 60) : null,
          valueUsd: money(s.valueUsd) || null,
          horizon: s.horizon ? String(s.horizon).slice(0, 40) : null,
        }))
      : [];

    // Security-as-a-growth-engine (CISO revenue-enablement) — pipeline in security
    // review, deal-review cycle time, certifications held, trust reviews. Optional;
    // stored verbatim and echoed in /summary. null-safe so the cockpit can gate it.
    const gr = b.growth || {};
    const numOf = (v) => { const n = Number(String(v == null ? '' : v).replace(/[^0-9.]/g, '')); return Number.isFinite(n) && n > 0 ? n : null; };
    const growthRaw = {
      pipelineUsd: money(gr.pipelineUsd),
      reviewBeforeWks: numOf(gr.reviewBeforeWks),
      reviewNowWks: gr.reviewNowWks != null && String(gr.reviewNowWks) !== '' ? Number(String(gr.reviewNowWks).replace(/[^0-9.]/g, '')) : null,
      dealsGated: numOf(gr.dealsGated),
      trustReviews: numOf(gr.trustReviews),
      certs: Array.isArray(gr.certs) ? gr.certs.filter((c) => c && String(c).trim()).map((c) => String(c).trim()) : [],
    };
    const growth = (growthRaw.pipelineUsd || growthRaw.reviewNowWks != null || growthRaw.dealsGated || growthRaw.certs.length) ? growthRaw : {};

    // CEO strategic objectives (each tagged with the cyber driver it depends on) — powers
    // the CEO "objectives protected" metric. Persisted so it survives a new device/browser.
    const objectives = Array.isArray(b.objectives)
      ? b.objectives.filter((o) => o && (o.name || typeof o === 'string')).slice(0, 20)
          .map((o) => ({ name: String(o.name || o).slice(0, 140), map: o.map ? String(o.map).slice(0, 40) : '' }))
      : [];

    // Business capability map (name + cyber exposure + GRC status) — powers the CISO
    // Enterprise-Risk tile "business capabilities with highest exposure".
    const capabilities = Array.isArray(b.capabilities)
      ? b.capabilities.filter((c) => c && c.name).slice(0, 40)
          .map((c) => {
            const gaps = Number(c.control_gaps); const risk = Number(c.open_risk);
            return { name: String(c.name).slice(0, 140), exposure_usd: money(c.exposure_usd), grc_status: c.grc_status ? String(c.grc_status).slice(0, 20) : null,
              control_gaps: Number.isFinite(gaps) ? gaps : null, open_risk: Number.isFinite(risk) ? risk : null };
          })
      : [];

    // CISO registers (documents) — Crown Jewel Register, BIA, SBOM. Normalized to a
    // defined internal schema; a `document_validation` map records provided/invalid so
    // the readiness gate treats a malformed upload as not-satisfied.
    const documentValidation = {};
    const normReg = (arr, shape, key) => {
      if (!Array.isArray(arr) || !arr.length) return [];
      const rows = arr.filter((x) => x && (x.name || x.asset || x.component)).slice(0, 500).map(shape);
      documentValidation[key] = rows.length ? 'provided' : 'invalid';
      return rows;
    };
    const crownJewelRegister = normReg(b.crownJewelRegister, (c, i) => ({
      asset_id: String(c.asset_id || c.id || ('cj_' + i)).slice(0, 80),
      name: String(c.name || c.asset || ('Asset ' + (i + 1))).slice(0, 140),
      criticality: String(c.criticality || 'High').slice(0, 20),
    }), 'crownJewelRegister');
    const bia = normReg(b.bia, (p, i) => ({
      process_id: String(p.process_id || p.id || ('bp_' + i)).slice(0, 80),
      name: String(p.name || p.process || ('Process ' + (i + 1))).slice(0, 140),
      rto_hours: Number(p.rto_hours != null ? p.rto_hours : p.rto) || null,
      impact_usd: money(p.impact_usd != null ? p.impact_usd : p.impact),
      criticality: p.criticality ? String(p.criticality).slice(0, 20) : null,
    }), 'bia');
    // DELTA registers (Board / CLO / CRO): Risk Appetite, Regulatory, Materiality, Benchmark.
    const riskAppetite = normReg(b.riskAppetite, (r, i) => ({
      category: String(r.category || r.name || ('Category ' + (i + 1))).slice(0, 120),
      appetite_usd: money(r.appetite_usd != null ? r.appetite_usd : r.appetite),
      threshold: r.threshold ? String(r.threshold).slice(0, 40) : null,
    }), 'riskAppetite');
    const regulatoryRegister = normReg(b.regulatoryRegister, (r, i) => ({
      regulation: String(r.regulation || r.name || ('Regulation ' + (i + 1))).slice(0, 140),
      obligation: r.obligation ? String(r.obligation).slice(0, 200) : null,
      status: r.status ? String(r.status).slice(0, 40) : null,
      exposure_usd: money(r.exposure_usd != null ? r.exposure_usd : r.exposure),
    }), 'regulatoryRegister');
    const materialityCriteria = normReg(b.materialityCriteria, (r, i) => ({
      metric: String(r.metric || r.name || ('Criterion ' + (i + 1))).slice(0, 140),
      threshold_usd: money(r.threshold_usd != null ? r.threshold_usd : r.threshold),
      basis: r.basis ? String(r.basis).slice(0, 120) : null,
    }), 'materialityCriteria');
    const benchmarkData = normReg(b.benchmarkData, (r, i) => ({
      metric: String(r.metric || r.name || ('Metric ' + (i + 1))).slice(0, 140),
      our_value: r.our_value != null ? String(r.our_value).slice(0, 60) : null,
      benchmark: r.benchmark != null ? String(r.benchmark).slice(0, 60) : null,
    }), 'benchmarkData');

    // Executive names by seat id — each seat's decisions are stamped with the leader's
    // name. Stored server-side so the cockpit shows them on any device.
    const seatNames = {};
    if (b.seatNames && typeof b.seatNames === 'object') {
      Object.keys(b.seatNames).forEach((k) => {
        const v = b.seatNames[k];
        if (typeof v === 'string' && v.trim()) seatNames[String(k).slice(0, 20)] = v.trim().slice(0, 80);
      });
    }
    // Executive emails — lets the CISO cockpit send reminder emails to each leader.
    const seatEmails = {};
    if (b.seatEmails && typeof b.seatEmails === 'object') {
      Object.keys(b.seatEmails).forEach((k) => {
        const v = b.seatEmails[k];
        if (typeof v === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim())) seatEmails[String(k).slice(0, 20)] = v.trim().slice(0, 120);
      });
    }

    // Ensure the org row exists so the FK on business_processes/assets is satisfied.
    // JSONB-merge economics into setup_json so re-ingest overlays without clobbering.
    step = 'upsert_org';
    await db.query(
      `INSERT INTO orgs (id, name, type, setup_json, created_at)
       VALUES ($1,$2,$3,$4::jsonb,NOW())
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name,
         setup_json = COALESCE(orgs.setup_json,'{}'::jsonb) || EXCLUDED.setup_json`,
      [mapped.org.id, mapped.org.name, '', JSON.stringify({ economics, resilience, initiatives, governance, growth, strategicInitiatives, objectives, capabilities, crownJewelRegister, bia, riskAppetite, regulatoryRegister, materialityCriteria, benchmarkData, document_validation: documentValidation, seatNames, seatEmails })]);

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
    // CISO "Crown jewels at greatest risk" — composite risk (register × VM × EDR)
    // through the source-agnostic adapter. Guarded so it never blocks the summary.
    if (!out.empty && out.summary) {
      try { out.summary.crown_jewel_risk = await CrownJewelRisk.compute(orgId); }
      catch (e) { logger.debug('crown_jewel_risk compute failed', { error: e.message }); }
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
