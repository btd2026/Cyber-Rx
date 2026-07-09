'use strict';

/**
 * routes/connectors — control-aware connector onboarding.
 *   GET  /api/connectors/manifests                 catalog of manifests
 *   GET  /api/connectors/manifests/:id             one manifest (dynamic form spec)
 *   POST /api/connectors/:id/validate              validate creds + permissions (secrets vaulted)
 *   POST /api/connectors/:id/test-collection       what telemetry/evidence is pullable
 *   POST /api/connectors/:id/configure             save scope / denominator / review period (non-secret)
 *   GET  /api/connectors/:id/readiness             per-control continuous-assessment readiness
 *
 * Secrets are never stored in plaintext — credentials go through utils/vault.
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const logger = require('../utils/logger');
const OB = require('../control-assessment/onboarding');
const CA = require('../control-assessment');
const Integrations = require('../services/IntegrationService');
const Connectors = require('../services/connectors');
const vault = require('../utils/vault');

router.use(optionalJWT, demoOrg);
const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId || (req.body && req.body.org_id) || 'demo';

router.get('/manifests', (req, res) => {
  try { res.json({ connectors: OB.listManifests() }); }
  catch (e) { res.status(500).json({ error: 'manifests failed' }); }
});

router.get('/manifests/:id', (req, res) => {
  const m = OB.buildManifest(req.params.id);
  if (!m) return res.status(404).json({ error: 'unknown connector ' + req.params.id });
  delete m._controls;
  res.json(m);
});

// Validate credentials + read-only permissions. Vaults the secret, runs the
// connector's own test(), and reports whether the connection works. Does NOT
// set live_tenant_validated — that is a deliberate confirmation step.
router.post('/:id/validate', express.json(), async (req, res) => {
  const orgId = orgOf(req);
  const key = req.params.id;
  try {
    const c = Connectors.get(key);
    if (!c) return res.status(404).json({ error: 'unknown connector ' + key });
    const creds = (req.body && req.body.credentials) || {};
    if (Object.keys(creds).length) { try { await vault.set(orgId, 'integration:' + key, creds); } catch (_) {} }
    const check = { credentials_valid: false, permissions_sufficient: false, detail: '' };
    try {
      const stored = Object.keys(creds).length ? creds : await vault.get(orgId, 'integration:' + key);
      const r = await c.test(stored || {});
      check.credentials_valid = !!(r && r.ok);
      check.permissions_sufficient = !!(r && r.ok); // vendor test call succeeded with the granted scopes
      check.detail = (r && r.detail) || '';
    } catch (e) { check.detail = e.message; }
    // Bridge to the cockpit: once creds validate, collect this connector's signals
    // into signal_sync (best-effort, in the background) so the tool actually lights
    // up its controls in the Frameworks view instead of staying document-only.
    if (check.credentials_valid) {
      Promise.resolve().then(() => Integrations.sync(orgId, key)).catch(() => {});
    }
    res.json({ connector_id: key, checks: check });
  } catch (e) {
    if (logger && logger.warn) logger.warn('connector validate failed', { error: e.message });
    res.status(502).json({ error: e.message || 'validation failed' });
  }
});

// What evidence/telemetry can actually be pulled — drives readiness.
router.post('/:id/test-collection', express.json(), async (req, res) => {
  const orgId = orgOf(req);
  const key = req.params.id;
  try {
    const available = {};
    // 1) signals the connector already returns
    try {
      const signals = await Integrations.signalsForOrg(orgId);
      signals.forEach((s) => { if (s && s.key != null) available[s.key] = true; });
    } catch (_) {}
    // 2) granular evidence fields the collector can pull
    const collector = CA.CONNECTOR_COLLECTORS[key];
    if (collector) {
      let creds = null; try { creds = await vault.get(orgId, 'integration:' + key); } catch (_) {}
      try {
        const got = await collector({ orgId, connector: key, creds, signals: [], period: null });
        Object.keys(got || {}).forEach((f) => { if (got[f] != null) available[f] = true; });
      } catch (_) {}
    }
    // persist onto the stored config so readiness reflects it
    const cfg = await OB.configStore.getConfig(orgId, key);
    cfg.telemetry_available = Object.assign({}, cfg.telemetry_available, available);
    await OB.configStore.setConfig(orgId, key, cfg);
    res.json({ connector_id: key, telemetry_available: available });
  } catch (e) { res.status(500).json({ error: 'test-collection failed' }); }
});

// Save scope / denominator / review period (no secrets).
router.post('/:id/configure', express.json(), async (req, res) => {
  const orgId = orgOf(req);
  const key = req.params.id;
  try {
    const body = req.body || {};
    const cfg = await OB.configStore.getConfig(orgId, key);
    ['scope_configured', 'denominator_configured', 'review_period', 'permissions_sufficient'].forEach((k) => {
      if (body[k] !== undefined) cfg[k] = body[k];
    });
    await OB.configStore.setConfig(orgId, key, cfg);
    res.json({ connector_id: key, saved: true });
  } catch (e) { res.status(500).json({ error: 'configure failed' }); }
});

router.get('/:id/readiness', async (req, res) => {
  const orgId = orgOf(req);
  const key = req.params.id;
  try {
    const m = OB.buildManifest(key);
    if (!m) return res.status(404).json({ error: 'unknown connector ' + key });
    const cfg = await OB.configStore.getConfig(orgId, key);
    // auth presence (never returns the secret)
    let authProvided = [];
    try { const cr = await vault.get(orgId, 'integration:' + key); if (cr) authProvided = m.required_auth_fields.map((f) => f.key); } catch (_) {}
    // live-tenant validation status
    let live = false;
    try { const v = await CA.validation.getValidation(orgId); live = !!(v[key] && v[key].live_tenant_validated); } catch (_) {}
    const config = Object.assign({}, cfg, { auth_provided: authProvided, live_tenant_validated: live });
    res.json(OB.computeReadiness(key, config));
  } catch (e) { res.status(500).json({ error: 'readiness failed' }); }
});

module.exports = router;
