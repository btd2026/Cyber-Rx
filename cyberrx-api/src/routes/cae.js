'use strict';

/**
 * routes/cae — Control Assessment Engine, user-facing API (Milestone 2).
 *
 * Exposes ONLY the minimal onboarding surface:
 *   GET  /api/cae/frameworks                  supported framework modules
 *   GET  /api/cae/categories                  tool categories
 *   GET  /api/cae/tools[?category=]           tool catalog (category + name)
 *   GET  /api/cae/tools/:tool/fields          required connection fields
 *   GET  /api/cae/connections                 this org's connection statuses
 *   POST /api/cae/connections                 connect a tool (secrets -> vault)
 *   POST /api/cae/connections/:tool/test      re-run the health check
 *   DELETE /api/cae/connections/:tool         remove a connection
 *
 * Every response is already projected (whitelisted) by onboardingService —
 * no endpoints, settings JSON, scopes, internal config, or raw errors.
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const svc = require('../cae/onboardingService');
const assess = require('../cae/assessmentService');
const coverage = require('../cae/coverageService');

router.use(optionalJWT, demoOrg);

// Which framework controls the selected systems will evidence (read-only, for UI).
router.post('/coverage', async (req, res) => {
  try { res.json(await coverage.coverageForTools((req.body && req.body.tools) || [])); }
  catch (e) { res.status(500).json({ error: 'Unable to compute coverage.' }); }
});

// Persist the org's declared systems so their controls are auto-assessed.
router.post('/select-tools', async (req, res) => {
  if (!req.orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await coverage.selectTools(req.orgId, (req.body && req.body.tools) || [])); }
  catch (e) { res.status(500).json({ error: 'Unable to save selected tools.' }); }
});

router.get('/frameworks', (_req, res) => res.json({ frameworks: svc.listFrameworks() }));

router.get('/categories', async (_req, res) => {
  try { res.json({ categories: await svc.listCategories() }); }
  catch (e) { res.status(500).json({ error: 'Unable to load categories.' }); }
});

router.get('/tools', async (req, res) => {
  try { res.json({ tools: await svc.listTools(req.query.category) }); }
  catch (e) { res.status(500).json({ error: 'Unable to load tools.' }); }
});

router.get('/tools/:tool/fields', async (req, res) => {
  try { res.json(await svc.getConnectionFields(req.params.tool)); }
  catch (e) { res.status(500).json({ error: 'Unable to load connection fields.' }); }
});

router.get('/connections', async (req, res) => {
  try { res.json({ connections: await svc.listConnections(req.orgId) }); }
  catch (e) { res.status(500).json({ error: 'Unable to load connections.' }); }
});

router.post('/connections', async (req, res) => {
  const { tool_name: toolName, fields } = req.body || {};
  if (!req.orgId) return res.status(400).json({ error: 'Organization required.' });
  if (!toolName) return res.status(400).json({ error: 'tool_name is required.' });
  try {
    res.json(await svc.saveConnection(req.orgId, toolName, fields || {}));
  } catch (e) {
    if (e.code === 'MISSING') return res.status(400).json({ error: 'Please complete all required connection fields, including the read-only confirmation.' });
    if (e.code === 'MANUAL') return res.status(409).json({ error: 'This tool is collected via manual evidence; no connection is required.' });
    res.status(500).json({ error: 'Unable to save the connection.' });
  }
});

router.post('/connections/:tool/test', async (req, res) => {
  if (!req.orgId) return res.status(400).json({ error: 'Organization required.' });
  try {
    res.json(await svc.healthCheck(req.orgId, req.params.tool));
  } catch (e) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ error: 'Connect the tool first.' });
    if (e.code === 'MANUAL') return res.status(409).json({ error: 'This tool is collected via manual evidence.' });
    res.status(500).json({ error: 'Unable to test the connection.' });
  }
});

router.delete('/connections/:tool', async (req, res) => {
  if (!req.orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await svc.removeConnection(req.orgId, req.params.tool)); }
  catch (e) { res.status(500).json({ error: 'Unable to remove the connection.' }); }
});

// ── Assessment (framework tabs) ────────────────────────────────────────────
// Run an assessment across one or more frameworks (each assessed independently).
router.post('/assessment/run', async (req, res) => {
  if (!req.orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await assess.runAssessment(req.orgId, (req.body && req.body.frameworks))); }
  catch (e) { res.status(500).json({ error: 'Unable to run the assessment.' }); }
});

// Per-framework executive results (projected). ?framework=nist_csf_2_0
router.get('/assessment', async (req, res) => {
  if (!req.orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await assess.getResults(req.orgId, req.query.framework)); }
  catch (e) { res.status(500).json({ error: 'Unable to load results.' }); }
});

// Per-framework rollup (status counts + average).
router.get('/assessment/summary', async (req, res) => {
  if (!req.orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await assess.getSummary(req.orgId)); }
  catch (e) { res.status(500).json({ error: 'Unable to load the summary.' }); }
});

module.exports = router;
