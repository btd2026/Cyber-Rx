'use strict';

/**
 * routes/document-assessment — framework-native DOCUMENT control assessment.
 *
 * Assesses an uploaded governance document (policy / standard / plan / procedure
 * / record) against a control's OWN document evidence requirements. Keeps design
 * and operating effectiveness strictly separate, cites where each required design
 * element is covered, versions by content hash, and re-assesses on change.
 *
 *   GET  /api/document-assessment/requirements            → the requirement registry
 *   GET  /api/document-assessment/requirements/:fk/:cid   → one control's requirements
 *   POST /api/document-assessment/classify                → classify document type
 *   POST /api/document-assessment/assess                  → assess a document vs a control
 *   POST /api/document-assessment/reassess                → reassess (with prior result diff)
 *
 * Nothing here derives one framework from another. Document existence never
 * becomes control effectiveness — operating evidence is required separately.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { optionalJWT, demoOrg } = require('../middleware/auth');
const logger = require('../utils/logger');
const docs = require('../control-assessment/documents');
const db = require('../utils/db');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.use(optionalJWT, demoOrg);
const orgOf = (req) => req.orgId || req.headers['x-org-id'] || (req.body && req.body.org_id) || req.query.org_id || 'demo';

// Best-effort text extraction (txt/csv/md direct; otherwise printable-char sweep).
// PDFs/DOCX without a parser degrade gracefully — the engine marks Not Enough
// Evidence when text cannot be extracted, never a false pass.
function extractText(buffer, filename) {
  const ext = String(filename || '').split('.').pop().toLowerCase();
  if (['txt', 'csv', 'md', 'json'].includes(ext)) return buffer.toString('utf8');
  let text = '';
  for (let i = 0; i < buffer.length; i++) {
    const c = buffer[i];
    if (c >= 32 && c <= 126) text += String.fromCharCode(c);
    else if (c === 10 || c === 13) text += ' ';
  }
  return text;
}

// The full requirement registry (what the engine looks for, per control).
router.get('/requirements', (req, res) => {
  try { res.json({ requirements: docs.allRequirements() }); }
  catch (e) { res.status(500).json({ error: 'requirements failed' }); }
});

router.get('/requirements/:fk/:cid', (req, res) => {
  try {
    const r = docs.getRequirement(req.params.fk, req.params.cid);
    return r ? res.json(r) : res.status(404).json({ error: 'no document requirement for ' + req.params.fk + ':' + req.params.cid });
  } catch (e) { res.status(500).json({ error: 'requirement failed' }); }
});

// Classify a document's type from its content (client label is a weak hint only).
router.post('/classify', express.json({ limit: '8mb' }), (req, res) => {
  try {
    const b = req.body || {};
    res.json(docs.classify(b.document_text || '', b.document_name || '', b.expected_type || null));
  } catch (e) { res.status(500).json({ error: 'classify failed' }); }
});

// Assess a document against a control. Accepts JSON (document_text) or a file upload.
router.post('/assess', upload.single('file'), express.json({ limit: '8mb' }), async (req, res) => {
  try {
    const orgId = orgOf(req);
    const b = req.body || {};
    if (!b.framework_key || !b.control_id) return res.status(400).json({ error: 'framework_key and control_id required' });

    let text = b.document_text || '';
    let fileName = b.document_name || null;
    let extractionFailed = false;
    if (req.file) {
      fileName = fileName || req.file.originalname;
      text = extractText(req.file.buffer, req.file.originalname);
      if (!text || !text.trim()) extractionFailed = true;
    }

    // supporting operating-evidence documents (records/reports) may be passed as JSON
    let supporting = [];
    try { supporting = typeof b.supporting_documents === 'string' ? JSON.parse(b.supporting_documents) : (b.supporting_documents || []); } catch (_) { supporting = []; }

    const metadata = {
      owner: b.owner || null, approval_date: b.approval_date || null,
      effective_date: b.effective_date || null, last_review_date: b.last_review_date || null,
      version: b.version || null,
    };
    // content-hash version tracking (best-effort DB)
    let versionInfo = null;
    try {
      versionInfo = await docs.recordVersion(db, {
        org_id: orgId, framework_key: b.framework_key, control_id: b.control_id,
        document_type: b.expected_type || (docs.getRequirement(b.framework_key, b.control_id) || {}).required_document_types && (docs.getRequirement(b.framework_key, b.control_id).required_document_types[0]) || 'Unknown',
        document_name: fileName, text,
        owner: metadata.owner, approval_date: metadata.approval_date,
        effective_date: metadata.effective_date, last_review_date: metadata.last_review_date,
      });
      if (versionInfo) metadata.version = metadata.version || versionInfo.version;
      if (versionInfo) metadata.hash = versionInfo.hash;
    } catch (_) {}

    const result = docs.assessDocument({
      framework_key: b.framework_key, control_id: b.control_id,
      text, fileName, expectedType: b.expected_type || null,
      extraction_failed: extractionFailed,
      metadata, supportingDocuments: supporting,
      findings_remediated: b.findings_remediated === true || b.findings_remediated === 'true',
    });
    if (versionInfo) result.version_info = { version: versionInfo.version, hash: versionInfo.hash, is_new: versionInfo.is_new, unchanged: versionInfo.unchanged, superseded_version_id: versionInfo.superseded_version_id };
    res.json(result);
  } catch (e) {
    if (logger && logger.warn) logger.warn('document assessment failed', { error: e.message });
    res.status(500).json({ error: 'assessment failed' });
  }
});

// Reassess a document and diff against a prior assessment (client passes prior result).
router.post('/reassess', express.json({ limit: '8mb' }), (req, res) => {
  try {
    const b = req.body || {};
    if (!b.framework_key || !b.control_id) return res.status(400).json({ error: 'framework_key and control_id required' });
    const input = {
      framework_key: b.framework_key, control_id: b.control_id,
      text: b.document_text || '', fileName: b.document_name || null, expectedType: b.expected_type || null,
      metadata: { owner: b.owner, approval_date: b.approval_date, effective_date: b.effective_date, last_review_date: b.last_review_date, version: b.version },
      supportingDocuments: b.supporting_documents || [], scope_key: b.scope_key || null,
      findings_remediated: b.findings_remediated === true,
    };
    res.json(docs.reassess(input, b.previous_result || null));
  } catch (e) {
    if (logger && logger.warn) logger.warn('document reassessment failed', { error: e.message });
    res.status(500).json({ error: 'reassessment failed' });
  }
});

module.exports = router;
