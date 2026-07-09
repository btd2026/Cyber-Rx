'use strict';

/**
 * routes/control-assessment — the framework-native continuous control
 * operating-effectiveness engine, exposed to the cockpit and auditors.
 *   GET /api/control-assessment            → per-framework native assessments
 *   GET /api/control-assessment/export.csv → corrected mapping export
 *
 * Each framework is assessed independently from its own registry. Nothing here
 * derives one framework from another (no crosswalk). Because most operating-
 * effectiveness fields are not yet pulled by connectors, controls correctly
 * return Not Enough Evidence rather than an over-claimed score.
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const logger = require('../utils/logger');
const CA = require('../control-assessment');
const Integrations = require('../services/IntegrationService');
const vault = require('../utils/vault');

router.use(optionalJWT, demoOrg);
const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId || 'demo';

// Run the full continuous assessment pipeline for the org: collect required API
// fields from connected connectors → validate → assess → snapshot. Controls
// stay Not Enough Evidence until their connector is live-tenant-validated and
// the evidence is actually collected.
router.get('/', async (req, res) => {
  const orgId = orgOf(req);
  try {
    // connected connectors
    let connected = new Set();
    try { (await Integrations.listForOrg(orgId)).forEach((c) => { if (c.connected) connected.add(c.key); }); } catch (_) {}
    // live-tenant validation status
    let validation = {};
    try { validation = await CA.validation.getValidation(orgId); } catch (_) {}
    // creds only for connected connectors that have a collector
    const creds = {};
    for (const k of connected) {
      if (CA.CONNECTOR_COLLECTORS[k]) { try { creds[k] = await vault.get(orgId, 'integration:' + k); } catch (_) {} }
    }
    let signals = [];
    try { signals = await Integrations.signalsForOrg(orgId); } catch (_) { signals = []; }
    const run = await CA.runAssessment(orgId, { connectors: connected, validation, creds, signals });
    res.json(run);
  } catch (e) {
    if (logger && logger.warn) logger.warn('control-assessment failed', { error: e.message });
    res.status(500).json({ error: 'assessment failed' });
  }
});

// Mark a connector live-tenant-validated (or not) — a control cannot be Effective
// unless its connector is validated here.
router.post('/validate', express.json(), async (req, res) => {
  const orgId = orgOf(req);
  try {
    const b = req.body || {};
    if (!b.connector) return res.status(400).json({ error: 'connector required' });
    const out = await CA.validation.setValidation(orgId, b.connector, b.validated !== false, b.validated_by || null);
    res.json(out);
  } catch (e) { res.status(500).json({ error: 'validate failed' }); }
});

// The auditor design-effectiveness checklists — what the engine looks for in a
// policy/standard/SOP for each document-assessed control. No document required.
router.get('/design/criteria', (req, res) => {
  try {
    const id = req.query.control_id;
    if (id) { const c = CA.design.checklist(id); return c ? res.json(c) : res.status(404).json({ error: 'no criteria for ' + id }); }
    res.json({ controls: CA.design.allChecklists() });
  } catch (e) { res.status(500).json({ error: 'criteria failed' }); }
});

// Run the design-effectiveness review of a document against a control's criteria.
// POST { control_id, document_text, document_name?, document_type? }
router.post('/design/review', express.json({ limit: '4mb' }), (req, res) => {
  try {
    const b = req.body || {};
    if (!b.control_id) return res.status(400).json({ error: 'control_id required' });
    if (!CA.design.CRITERIA[b.control_id]) return res.status(404).json({ error: 'no design criteria for ' + b.control_id });
    const result = CA.design.reviewById(b.control_id, b.document_text || '', { document_name: b.document_name, document_type: b.document_type });
    res.json(result);
  } catch (e) {
    if (logger && logger.warn) logger.warn('design review failed', { error: e.message });
    res.status(500).json({ error: 'design review failed' });
  }
});

router.get('/export.csv', (req, res) => {
  try {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="corrected-framework-native-control-assessment.csv"');
    res.send(CA.exportCsv.toCsv());
  } catch (e) { res.status(500).json({ error: 'export failed' }); }
});

module.exports = router;
