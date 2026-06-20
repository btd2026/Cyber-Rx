'use strict';

/**
 * routes/decisions — the decision spine: one shared event/DecisionCard rendered
 * per role, with a decision/evidence ledger.
 *   GET  /api/decisions?role=CFO      shared decision cards, projected to a role lens
 *   POST /api/decisions/:id/decision  record a decision (+ rationale → ledger)
 *   GET  /api/decisions/ledger        the decision & evidence ledger
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const logger = require('../utils/logger');
const Engine = require('../services/DecisionEngineService');

router.use(optionalJWT, demoOrg);
const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId || (req.body && req.body.org_id);

router.get('/', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await Engine.list(orgId, req.query.role)); }
  catch (e) { logger.warn('decisions list failed', { error: e.message }); res.status(500).json({ error: 'Unable to build the decision queue.' }); }
});

router.get('/ledger', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json({ ledger: await Engine.ledger(orgId) }); }
  catch (e) { res.status(500).json({ error: 'Unable to load the decision ledger.' }); }
});

// Defensibility artifact — export the decision & evidence ledger as CSV.
router.get('/ledger.csv', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try {
    const rows = await Engine.ledger(orgId);
    const cols = ['created_at', 'role', 'action', 'option_id', 'card_id', 'decided_by', 'rationale'];
    const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="decision-ledger-${orgId}.csv"`);
    res.send(csv);
  } catch (e) { res.status(500).json({ error: 'Unable to export the ledger.' }); }
});

// CRQ methodology + the org's tunable assumptions (transparency).
router.get('/methodology', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(Engine.methodology(orgId, await Engine.loadAssumptions(orgId))); }
  catch (e) { res.status(500).json({ error: 'Unable to load methodology.' }); }
});
router.put('/assumptions', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await Engine.saveAssumptions(orgId, req.body || {})); }
  catch (e) { res.status(500).json({ error: 'Unable to save assumptions.' }); }
});

// Tamper-evidence: verify the hash chain, and export the auditor evidence package.
router.get('/ledger/verify', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await Engine.verifyLedger(orgId)); }
  catch (e) { res.status(500).json({ error: 'Unable to verify the ledger.' }); }
});
router.get('/evidence-package', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try {
    const pkg = await Engine.evidencePackage(orgId);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="evidence-package-${orgId}.json"`);
    res.send(JSON.stringify(pkg, null, 2));
  } catch (e) { res.status(500).json({ error: 'Unable to build the evidence package.' }); }
});

router.post('/:id/decision', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  const b = req.body || {};
  if (!b.action) return res.status(400).json({ error: 'action is required.' });
  try { res.json(await Engine.record(orgId, req.params.id, b)); }
  catch (e) {
    if (e.code === 'RATIONALE_REQUIRED') return res.status(422).json({ error: e.message });
    logger.warn('decision record failed', { error: e.message }); res.status(500).json({ error: 'Unable to record the decision.' });
  }
});

module.exports = router;
