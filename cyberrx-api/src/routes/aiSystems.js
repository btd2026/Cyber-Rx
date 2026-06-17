'use strict';

/**
 * routes/ai-systems — AI governance Phase 1: the AI-BOM (AI bill of materials).
 *   POST /api/ai-systems/upload   { fileName, contentBase64 | text } → parse + persist
 *   POST /api/ai-systems/add      { ...system }                      → add one (e.g. shadow AI)
 *   GET  /api/ai-systems          list AI systems
 *   GET  /api/ai-systems/inventory  governance rollup (flags, posture, counts)
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const logger = require('../utils/logger');
const AI = require('../services/AiInventoryService');
const AiControl = require('../services/AiControlAssessmentService');

router.use(optionalJWT, demoOrg);
const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId || (req.body && req.body.org_id);

router.post('/upload', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  const { fileName, contentBase64, text } = req.body || {};
  if (!contentBase64 && !text) return res.status(400).json({ error: 'Provide an AI inventory file or text.' });
  try {
    const parsed = await AI.parseInventory(fileName, contentBase64, text);
    if (!parsed.length) return res.status(422).json({ error: 'No AI systems could be read. Try a CSV/Excel with a name column, or describe them in text.' });
    await AI.saveSystems(orgId, parsed.map((s) => Object.assign({ source: 'upload' }, s)));
    res.json({ imported: parsed.length, inventory: await AI.inventory(orgId) });
  } catch (e) { logger.warn('ai upload failed', { error: e.message }); res.status(500).json({ error: 'Unable to read the AI inventory.' }); }
});

router.post('/add', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'name is required.' });
  try {
    await AI.saveSystems(orgId, [Object.assign({ source: 'manual' }, b)], { replace: false });
    res.json({ inventory: await AI.inventory(orgId) });
  } catch (e) { res.status(500).json({ error: 'Unable to add the AI system.' }); }
});

router.get('/', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json({ systems: await AI.listSystems(orgId) }); } catch (e) { res.status(500).json({ error: 'Unable to load AI systems.' }); }
});

router.get('/inventory', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await AI.inventory(orgId)); } catch (e) { res.status(500).json({ error: 'Unable to compute AI inventory.' }); }
});

// Phase 2 — assess AI controls per framework (NIST AI RMF / OWASP LLM / ATLAS),
// each framework independent. ?framework= for one, omit for all.
router.get('/assessment', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await AiControl.assess(orgId, req.query.framework)); } catch (e) { res.status(500).json({ error: 'Unable to assess AI controls.' }); }
});

module.exports = router;
