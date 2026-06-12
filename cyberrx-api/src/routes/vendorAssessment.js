'use strict';

/**
 * Saraqael — Vendor Assessment API
 * --------------------------------
 *   GET  /api/vendor-assessment/doc-types          - the document types Saraqael reviews
 *   POST /api/vendor-assessment/documents          - assess one uploaded document
 *   POST /api/vendor-assessment/:vendorId/cross-validate - cross-validate a vendor's docs
 *   GET  /api/vendor-assessment/:vendorId          - vendor summary (docs, findings, score)
 *
 * Demo-posture org scoping (JWT → X-Org-Id → org_id), consistent with the rest.
 */

const express = require('express');
const router = express.Router();
const Saraqael = require('../services/VendorAssessmentService');
const { extractText } = require('../utils/extractText');
const { optionalJWT } = require('../middleware/auth');
const logger = require('../utils/logger');

function resolveOrg(req, res) {
  const orgId = req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId || (req.body && req.body.org_id);
  if (!orgId) { res.status(400).json({ error: 'Organization not specified' }); return null; }
  return orgId;
}

router.get('/doc-types', optionalJWT, (req, res) => {
  res.json({ docTypes: Saraqael.listDocTypes(), aiEnabled: Saraqael.aiEnabled() });
});

router.post('/documents', optionalJWT, async (req, res) => {
  const orgId = resolveOrg(req, res);
  if (!orgId) return;
  try {
    const b = req.body || {};
    if (!b.vendorId || !b.vendorName || !b.docType) {
      return res.status(400).json({ error: 'vendorId, vendorName and docType are required' });
    }
    if (!Saraqael.DOC_TYPE_IDS.includes(b.docType)) {
      return res.status(400).json({ error: 'Unknown docType', valid: Saraqael.DOC_TYPE_IDS });
    }
    // Read the actual uploaded file (PDF/text) so the agent reviews real
    // content. If only a filename or structured fields were sent, those are
    // used and the review notes that no text was available.
    if (!b.text && (b.contentBase64 || b.content)) {
      try { b.text = extractText({ contentBase64: b.contentBase64, content: b.content, fileName: b.fileName }); }
      catch (e) { logger.warn('vendor doc text extraction failed', { error: e.message }); }
    }
    const result = await Saraqael.assessDocument(orgId, b);
    // Cross-validate after each new document so inconsistencies surface immediately.
    const cross = await Saraqael.crossValidate(orgId, b.vendorId, b.vendorName);
    res.json({ document: result, crossValidationFindings: cross });
  } catch (err) {
    logger.error('Saraqael document assess error', { error: err.message });
    res.status(500).json({ error: 'Failed to assess document', message: err.message });
  }
});

router.post('/:vendorId/cross-validate', optionalJWT, async (req, res) => {
  const orgId = resolveOrg(req, res);
  if (!orgId) return;
  try {
    const vendorName = (req.body && req.body.vendorName) || req.query.vendorName || req.params.vendorId;
    const findings = await Saraqael.crossValidate(orgId, req.params.vendorId, vendorName);
    res.json({ findings });
  } catch (err) {
    logger.error('Saraqael cross-validate error', { error: err.message });
    res.status(500).json({ error: 'Failed to cross-validate', message: err.message });
  }
});

router.get('/:vendorId', optionalJWT, async (req, res) => {
  const orgId = resolveOrg(req, res);
  if (!orgId) return;
  try {
    res.json(await Saraqael.getVendorSummary(orgId, req.params.vendorId));
  } catch (err) {
    logger.error('Saraqael vendor summary error', { error: err.message });
    res.status(500).json({ error: 'Failed to load vendor summary', message: err.message });
  }
});

module.exports = router;
