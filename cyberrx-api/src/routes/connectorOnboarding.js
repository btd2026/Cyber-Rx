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

// ---- three-status readiness model -------------------------------------------
// Load the org's non-secret config + auth presence + live-validation for a connector.
async function loadConfig(orgId, key, manifest) {
  const cfg = await OB.configStore.getConfig(orgId, key);
  let authProvided = [];
  try { const cr = await vault.get(orgId, 'integration:' + key); if (cr) authProvided = (manifest.required_auth_fields || []).map((f) => f.key); } catch (_) {}
  let live = false;
  try { const v = await CA.validation.getValidation(orgId); live = !!(v[key] && v[key].live_tenant_validated); } catch (_) {}
  return Object.assign({}, cfg, { auth_provided: authProvided, live_tenant_validated: live });
}

// CONNECTION check only — credentials load + valid + reachable. Never proves telemetry.
async function checkConnection(orgId, key) {
  const c = Connectors.get(key);
  const at = new Date().toISOString();
  if (!c) return { status: 'Connection Error', message: 'Unknown connector.', checked_at: at, error_code: 'unknown_connector', remediation: null };
  let creds = null; try { creds = await vault.get(orgId, 'integration:' + key); } catch (_) {}
  if (!creds || !Object.keys(creds).length) return { status: 'Not Connected', message: 'No credentials on file — connect the tool.', checked_at: at, error_code: null, remediation: 'Connect ' + (c.label || key) + '.' };
  try {
    creds = await require('../services/oauth/token').ensureFresh(orgId, key, creds);
    const r = await c.test(creds || {});
    return { ok: true, status: 'Connected', message: (r && r.detail) || (c.label || key) + ' is reachable and the credentials are valid.', checked_at: at, error_code: null, remediation: null };
  } catch (e) {
    const msg = String(e.message || '').toLowerCase();
    let code = 'connection_error';
    if (msg.indexOf('expired') >= 0) code = 'expired_token';
    else if (msg.indexOf('401') >= 0 || msg.indexOf('403') >= 0 || msg.indexOf('unauthor') >= 0 || msg.indexOf('invalid') >= 0) code = 'invalid_credentials';
    else if (msg.indexOf('required') >= 0 || msg.indexOf('missing') >= 0) code = 'insufficient_auth';
    return { ok: false, status: code === 'expired_token' ? 'Expired Token' : code === 'invalid_credentials' ? 'Invalid Credentials' : code === 'insufficient_auth' ? 'Insufficient Authentication Details' : 'Connection Error', message: e.message, checked_at: at, error_code: code, remediation: 'Reconnect ' + (c.label || key) + '.' };
  }
}

// TELEMETRY check only — what fields the connector can actually pull right now.
async function checkTelemetry(orgId, key) {
  const at = new Date().toISOString();
  const available = {};
  try { (await Integrations.signalsForOrg(orgId)).forEach((s) => { if (s && s.key != null) available[s.key] = true; }); } catch (_) {}
  const collector = CA.CONNECTOR_COLLECTORS[key];
  if (collector) {
    let creds = null; try { creds = await vault.get(orgId, 'integration:' + key); } catch (_) {}
    try { creds = await require('../services/oauth/token').ensureFresh(orgId, key, creds); } catch (_) {}
    try { const got = await collector({ orgId, connector: key, creds, signals: [], period: null }); Object.keys(got || {}).forEach((f) => { if (got[f] != null) available[f] = true; }); } catch (_) {}
  }
  const cfg = await OB.configStore.getConfig(orgId, key);
  cfg.telemetry_available = Object.assign({}, cfg.telemetry_available, available);
  cfg.last_telemetry_check_at = at;
  await OB.configStore.setConfig(orgId, key, cfg);
  return { telemetry_available: available, last_sample_collection_at: at, checked_at: at };
}

async function statusFor(orgId, key, checks) {
  const m = OB.buildManifest(key);
  if (!m) return null;
  const cfg = await loadConfig(orgId, key, m);
  const status = OB.buildStatus(key, cfg, checks || {});
  try { await OB.statusStore.save(orgId, status); } catch (_) {}
  return status;
}

// GET the three-status object (uses stored config; does not hit the vendor).
router.get('/:id/status', async (req, res) => {
  try { const s = await statusFor(orgOf(req), req.params.id); return s ? res.json(s) : res.status(404).json({ error: 'unknown connector' }); }
  catch (e) { res.status(500).json({ error: 'status failed' }); }
});

// Connection check ONLY.
router.post('/:id/check-connection', async (req, res) => {
  try { res.json(await checkConnection(orgOf(req), req.params.id)); }
  catch (e) { res.status(500).json({ error: 'connection check failed' }); }
});

// Telemetry check ONLY.
router.post('/:id/check-telemetry', async (req, res) => {
  try { res.json(await checkTelemetry(orgOf(req), req.params.id)); }
  catch (e) { res.status(500).json({ error: 'telemetry check failed' }); }
});

// Control-assessment readiness check (recompute + persist the three-status object).
router.post('/:id/check-readiness', async (req, res) => {
  try { const s = await statusFor(orgOf(req), req.params.id); return s ? res.json(s) : res.status(404).json({ error: 'unknown connector' }); }
  catch (e) { res.status(500).json({ error: 'readiness check failed' }); }
});

// Per-control readiness detail.
router.get('/:id/control-readiness', async (req, res) => {
  try {
    const orgId = orgOf(req), key = req.params.id;
    const m = OB.buildManifest(key);
    if (!m) return res.status(404).json({ error: 'unknown connector' });
    const cfg = await loadConfig(orgId, key, m);
    const r = OB.computeReadiness(key, cfg);
    res.json({ connector_id: key, connector_name: m.connector_name, controls: r.control_readiness });
  } catch (e) { res.status(500).json({ error: 'control readiness failed' }); }
});

// Run connection → telemetry → readiness in sequence, each separately.
router.post('/:id/validate-all', async (req, res) => {
  const orgId = orgOf(req), key = req.params.id;
  try {
    const connection = await checkConnection(orgId, key);
    const telemetry = (connection.ok !== false) ? await checkTelemetry(orgId, key) : { telemetry_available: {}, error_code: 'not_connected' };
    const status = await statusFor(orgId, key, { connection, telemetry: telemetry.error_code ? { error_code: telemetry.error_code } : {} });
    res.json({ connection, telemetry, status });
  } catch (e) { res.status(500).json({ error: 'validate-all failed' }); }
});

// Connector readiness history (for trending).
router.get('/:id/status-history', async (req, res) => {
  try { res.json({ connector_id: req.params.id, history: await OB.statusStore.history(orgOf(req), req.params.id, Number(req.query.limit) || 50) }); }
  catch (e) { res.status(500).json({ error: 'history failed' }); }
});

module.exports = router;
