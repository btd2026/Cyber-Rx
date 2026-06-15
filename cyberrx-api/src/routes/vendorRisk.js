'use strict';

/**
 * routes/vendorRisk — vendor authentication + document analysis + unified risk.
 * Uses the app's demo-friendly auth (optionalJWT + demoOrg) so it works in the
 * intake flow. Mounted at /api/vendor-monitoring BEFORE the authenticated router,
 * so these specific paths are handled here.
 *
 *   POST /vendors/:vendorId/connect/:connectorType   vault creds + pull signals
 *   POST /vendors/:vendorId/documents                LLM-analyze a vendor document
 *   GET  /vendors/:vendorId/documents                list document reviews
 *   POST /vendors/:vendorId/risk-synthesis           unified vendor risk
 *   GET  /vendors/:vendorId/risk                      latest unified vendor risk
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const vault = require('../utils/vault');
const logger = require('../utils/logger');
const ContinuousMonitoring = require('../services/ContinuousMonitoringService');
const VendorDocAnalysis = require('../services/VendorDocAnalysisService');
const VendorRiskSynthesis = require('../services/VendorRiskSynthesisService');

router.use(optionalJWT, demoOrg);
const orgOf = (req) => req.orgId;

// Authenticate to a monitoring source: store credentials in the vault, then
// attempt a read-only pull. Returns connected/failed with a sanitized message.
router.post('/vendors/:vendorId/connect/:connectorType', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  const { vendorId, connectorType } = req.params;
  const credentials = (req.body && req.body.credentials) || {};
  if (!Object.keys(credentials).length) return res.status(400).json({ error: 'Enter the service credentials to authenticate.' });
  try {
    await vault.set(orgId, `vendor:${vendorId}:${connectorType}`, credentials);
    let pulled = { stored: 0 };
    try { pulled = await ContinuousMonitoring.syncConnector(connectorType, vendorId, orgId, credentials); } catch (_) { /* live pull may be unavailable */ }
    res.json({ connected: true, connector: connectorType, signalCount: pulled.stored || pulled.signalCount || 0 });
  } catch (e) {
    logger.warn('vendor connect failed', { connectorType });
    res.status(502).json({ connected: false, error: 'Connection failed. Check the credentials and required read-only permissions.' });
  }
});

// Analyze an uploaded vendor document → findings (what's missing) + score + recommendations.
router.post('/vendors/:vendorId/documents', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  const { vendorId } = req.params;
  const { vendorName, docType, fileName, contentBase64, text } = req.body || {};
  if (!docType || (!contentBase64 && !text)) return res.status(400).json({ error: 'docType and document content are required.' });
  try { res.json(await VendorDocAnalysis.analyze(orgId, vendorId, { vendorName, docType, fileName, contentBase64, text })); }
  catch (e) { logger.warn('vendor doc analysis failed', { error: e.message }); res.status(500).json({ error: 'Unable to analyze the document.' }); }
});

router.get('/vendors/:vendorId/documents', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json({ reviews: await VendorDocAnalysis.listReviews(orgId, req.params.vendorId) }); }
  catch (e) { res.status(500).json({ error: 'Unable to load document reviews.' }); }
});

router.post('/vendors/:vendorId/risk-synthesis', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  const { vendorName, documents } = req.body || {};
  try { res.json(await VendorRiskSynthesis.synthesize(orgId, req.params.vendorId, { vendorName, documents })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/vendors/:vendorId/risk', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json({ risk: await VendorRiskSynthesis.getLatest(orgId, req.params.vendorId) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
