'use strict';
const express = require('express');
const router = express.Router();
const CisoPostureService = require('../services/CisoPostureService');
const AiControlsService = require('../services/AiControlsService');
const CisoDashboardService = require('../services/CisoDashboardService');
const ExecReportService = require('../services/ExecReportService');
const CisoReportBuilder = require('../services/CisoReportBuilder');
const AuditorPackBuilder = require('../services/AuditorPackBuilder');
const ExecutiveSummaryService = require('../services/ExecutiveSummaryService');
const ReportBuilderService = require('../services/ReportBuilderService');
const MetricsEngine = require('../services/MetricsEngine');
const db = require('../utils/db');
const { optionalJWT } = require('../middleware/auth');
const logger = require('../utils/logger');

function org(req, res) { const id = req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId; if (!id) { res.status(400).json({ error: 'Organization not specified' }); return null; } return id; }

// Org context for the consultant report: client name + the setup metrics used to
// write organization-specific (non-generic) risk statements.
async function loadOrgCtx(orgId) {
  let name = String(orgId), inputs = {};
  try { const rows = await db.query('SELECT name FROM orgs WHERE id=$1', [orgId]); if (rows[0] && rows[0].name) name = rows[0].name; } catch (_) {}
  try { inputs = await MetricsEngine.loadInputs(orgId); } catch (_) {}
  return { name, inputs };
}

router.get('/posture', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json(await CisoPostureService.getPosture(orgId)); }
  catch (err) { logger.error('CISO posture error', { error: err.message }); res.status(500).json({ error: 'Failed to compute posture', message: err.message }); }
});

// Live coverage — how much of the posture is real telemetry vs. derived/modeled/
// demo, with per-signal detail and the "connect this to go live" upgrade list.
router.get('/coverage', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json(await CisoPostureService.getCoverage(orgId)); }
  catch (err) { logger.error('CISO coverage error', { error: err.message }); res.status(500).json({ error: 'Failed to compute coverage', message: err.message }); }
});

// AI security controls — how well AI-coding / GenAI controls are operating.
router.get('/ai-controls', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json(await AiControlsService.getAiControls(orgId)); }
  catch (err) { logger.error('AI controls error', { error: err.message }); res.status(500).json({ error: 'Failed to compute AI controls', message: err.message }); }
});

// Dedicated CISO Security Posture Dashboard (CISO persona only): weighted
// posture, domain health, control-risk ranking, thresholds, action queue,
// process protection, attack pathways, readiness, investments, hidden risk,
// and a decision-ready executive answer for each of the 15 CISO questions.
router.get('/dashboard', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  const role = String(req.query.role || 'CISO').trim() || 'CISO';
  try { res.json(await CisoDashboardService.getDashboard(orgId, role)); }
  catch (err) { logger.error('CISO dashboard error', { error: err.message }); res.status(500).json({ error: 'Failed to build CISO dashboard', message: err.message }); }
});

// Control Efficacy — controls tied to the risks they reduce, SOC MTTD/MTTR, and
// the framework + industry overlay with compliance posture.
router.get('/control-efficacy', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json(await require('../services/ControlEfficacyService').getEfficacy(orgId)); }
  catch (err) { logger.error('Control efficacy error', { error: err.message }); res.status(500).json({ error: 'Failed to build control efficacy', message: err.message }); }
});

// Key Risks evidence layer — vulnerabilities ranked by exploitability (EPSS/KEV).
router.get('/exploitability', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json(await require('../services/ExploitabilityService').rank(orgId)); }
  catch (err) { logger.error('Exploitability error', { error: err.message }); res.status(500).json({ error: 'Failed to rank exploitability', message: err.message }); }
});

// Professional executive exports — board-ready PDF and PowerPoint of the full
// CISO posture (summary, domains, risks, actions, attack paths, readiness).
router.get('/report.pdf', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try {
    const [d, fw, octx] = await Promise.all([
      CisoDashboardService.getDashboard(orgId),
      ExecReportService.cisoPack(orgId, { baseline: req.query.baseline }).catch(() => null),
      loadOrgCtx(orgId),
    ]);
    octx.execSummary = await ExecutiveSummaryService.forReport(orgId, d, fw).catch(() => null);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="dtnk-shield-${String(octx.name).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-posture-assessment.pdf"`);
    CisoReportBuilder.buildPdf(res, d, fw, octx);
  } catch (err) { logger.error('CISO pdf error', { error: err.message }); res.status(500).json({ error: 'Failed to build PDF', message: err.message }); }
});
router.get('/report.pptx', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try {
    const [d, fw, octx] = await Promise.all([
      CisoDashboardService.getDashboard(orgId),
      ExecReportService.cisoPack(orgId, { baseline: req.query.baseline }).catch(() => null),
      loadOrgCtx(orgId),
    ]);
    octx.execSummary = await ExecutiveSummaryService.forReport(orgId, d, fw).catch(() => null);
    const buf = await CisoReportBuilder.buildPptxBuffer(d, fw, octx);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="cyberrx-ciso-posture-deck.pptx"`);
    res.end(buf);
  } catch (err) { logger.error('CISO pptx error', { error: err.message }); res.status(500).json({ error: 'Failed to build PPTX', message: err.message }); }
});

// Per-framework auditor pack (PPTX). The Frameworks tab posts the SAME computed
// assessment it renders (scores + findings + roadmap + mapping + evidence), so the
// deck matches the tab exactly. Body-driven — no server recompute, no re-typed numbers.
router.post('/auditor-pack.pptx', optionalJWT, express.json({ limit: '4mb' }), async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.register)) {
      return res.status(400).json({ error: 'assessment payload required (register[])' });
    }
    const buf = await AuditorPackBuilder.buildPptxBuffer(payload);
    const fw = String(payload.fw || 'framework').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'framework';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="nerion-auditor-pack-${fw}.pptx"`);
    res.end(buf);
  } catch (err) { logger.error('CISO auditor-pack error', { error: err.message }); res.status(500).json({ error: 'Failed to build auditor pack', message: err.message }); }
});

// ---- Executive summary — intake-driven, LLM-generated, human-in-the-loop -----
// Generate a DRAFT from intake + assessment (stored, not auto-published).
router.post('/exec-summary/generate', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try {
    const [d, fw] = await Promise.all([
      CisoDashboardService.getDashboard(orgId),
      ExecReportService.cisoPack(orgId, { baseline: req.query.baseline }).catch(() => null),
    ]);
    res.json(await ExecutiveSummaryService.generate(orgId, d, fw));
  } catch (err) { logger.error('exec-summary generate error', { error: err.message }); res.status(500).json({ error: err.message }); }
});

// Fetch the stored summary for review/edit.
router.get('/exec-summary', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json(await ExecutiveSummaryService.getStored(orgId)); }
  catch (err) { logger.error('exec-summary get error', { error: err.message }); res.status(500).json({ error: err.message }); }
});

// Save the consultant's reviewed/edited version (marks it reviewed).
router.put('/exec-summary', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try {
    const b = req.body || {};
    if (!b.blocks) return res.status(400).json({ error: 'blocks is required' });
    res.json(await ExecutiveSummaryService.saveEdited(orgId, b.blocks, b.editedBy));
  } catch (err) { logger.error('exec-summary save error', { error: err.message }); res.status(500).json({ error: err.message }); }
});

// ---- LLM report builder — full multi-section board report, human-in-the-loop --
// Generate a DRAFT report (LLM-composed, grounded; deterministic fallback). Stored,
// not auto-published.
router.post('/report/generate', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try {
    const [d, fw] = await Promise.all([
      CisoDashboardService.getDashboard(orgId),
      ExecReportService.cisoPack(orgId, { baseline: req.query.baseline }).catch(() => null),
    ]);
    res.json(await ReportBuilderService.generate(orgId, d, fw));
  } catch (err) { logger.error('report generate error', { error: err.message }); res.status(500).json({ error: err.message }); }
});

// Fetch the stored report for review/edit.
router.get('/report', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json(await ReportBuilderService.getStored(orgId)); }
  catch (err) { logger.error('report get error', { error: err.message }); res.status(500).json({ error: err.message }); }
});

// Save the consultant's reviewed/edited report (marks it reviewed).
router.put('/report', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try {
    const b = req.body || {};
    if (!b.report || !Array.isArray(b.report.sections)) return res.status(400).json({ error: 'report.sections is required' });
    res.json(await ReportBuilderService.saveEdited(orgId, b.report, b.editedBy));
  } catch (err) { logger.error('report save error', { error: err.message }); res.status(500).json({ error: err.message }); }
});

module.exports = router;
