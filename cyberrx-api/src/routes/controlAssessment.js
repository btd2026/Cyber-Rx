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

router.use(optionalJWT, demoOrg);
const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId || 'demo';

router.get('/', async (req, res) => {
  const orgId = orgOf(req);
  try {
    let signals = [];
    try { signals = await Integrations.signalsForOrg(orgId); } catch (_) { signals = []; }
    // Enrich raw telemetry into an evidence bundle. Operating-effectiveness
    // fields (sign-in logs, restore-integrity verification, ePHI scope, review
    // period) are not yet pulled, so they stay absent — which the framework-
    // native tests read as Not Enough Evidence. Never fabricated.
    const ev = CA.buildEvidence(signals, {
      scope: { ephi_systems_known: false, ephi_in_scope: null },
      reviewPeriod: null,
      connectorValidation: {},
      freshnessDays: Infinity,
    });
    const all = CA.assessAll(ev);
    const frameworks = {};
    Object.keys(all).forEach((k) => {
      frameworks[k] = { framework: all[k].framework, framework_key: k, score: all[k].score, results: all[k].results };
    });
    try { await CA.history.record(orgId, all, {}); } catch (_) { /* best effort */ }
    res.json({ org_id: orgId, generated_at: new Date().toISOString(), engine: 'framework-native (no crosswalk)', frameworks });
  } catch (e) {
    if (logger && logger.warn) logger.warn('control-assessment failed', { error: e.message });
    res.status(500).json({ error: 'assessment failed' });
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
