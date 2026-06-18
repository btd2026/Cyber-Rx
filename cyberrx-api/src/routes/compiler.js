'use strict';

/**
 * routes/compiler — the compiler: assemble the traceable chain and write the
 * per-framework control assessment (each framework independent, no crosswalk).
 *   GET  /api/compiler/chain        the traceable chain (risk → process → app → security system → control)
 *   POST /api/compiler/run          compile: populate control_framework_assessment + record a run
 *   GET  /api/compiler/run/latest   the most recent compile run summary
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const logger = require('../utils/logger');
const Compiler = require('../services/CompilerService');

router.use(optionalJWT, demoOrg);
const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId || (req.body && req.body.org_id);

router.get('/chain', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await Compiler.assembleChain(orgId)); }
  catch (e) { logger.warn('compiler chain failed', { error: e.message }); res.status(500).json({ error: 'Unable to assemble the chain.' }); }
});

router.post('/run', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await Compiler.run(orgId, { decidedBy: (req.body && req.body.decidedBy) || null })); }
  catch (e) { logger.warn('compiler run failed', { error: e.message }); res.status(500).json({ error: 'Unable to run the compiler.' }); }
});

router.get('/run/latest', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json((await Compiler.latestRun(orgId)) || { runId: null }); }
  catch (e) { res.status(500).json({ error: 'Unable to load the latest run.' }); }
});

// Per-framework posture + gaps + remediation (live from control_framework_assessment).
router.get('/posture', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await Compiler.posture(orgId)); }
  catch (e) { logger.warn('compiler posture failed', { error: e.message }); res.status(500).json({ error: 'Unable to compute posture.' }); }
});

module.exports = router;
