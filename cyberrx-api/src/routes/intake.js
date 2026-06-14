'use strict';

/**
 * routes/intake — Organization Intake "Document Request" API.
 *
 * Thin HTTP layer over the existing DocumentPipelineService + DocumentNormalizer:
 *   GET  /api/intake/document-checklist          -> deduplicated checklist (each document type once)
 *   POST /api/intake/documents                   -> upload: normalize -> store -> review fan-out
 *   POST /api/intake/documents/:id/rereview      -> re-run review from stored text (no re-upload)
 *   GET  /api/intake/documents/:id/assessments   -> per-control results for one upload
 */

const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const logger = require('../utils/logger');
const { normalize } = require('../services/DocumentNormalizer');
const pipeline = require('../services/DocumentPipelineService');
const SampleDoc = require('../services/SampleDocService');
const ProcessExtraction = require('../services/ProcessExtractionService');

function orgOf(req) {
  return req.query.org_id || (req.body && req.body.org_id) || req.headers['x-org-id'] || '';
}

// Deduplicated checklist: each document_type appears once, with the controls it
// satisfies and the org's current upload status. Optional ?frameworks= filter.
router.get('/document-checklist', async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  const frameworks = String(req.query.frameworks || '').split(',').map((s) => s.trim()).filter(Boolean);
  try {
    const params = [orgId];
    let frameworkFilter = '';
    if (frameworks.length) { params.push(frameworks); frameworkFilter = 'WHERE m.framework_id = ANY($2)'; }
    const rows = await db.query(`
      SELECT dt.id, dt.name, dt.description, dt.category,
             COUNT(m.*)::int AS control_count,
             json_agg(json_build_object(
               'framework_id', m.framework_id,
               'requirement_id', m.requirement_id,
               'domain', r.family,
               'title', r.title,
               'expected_requirement', m.expected_requirement
             ) ORDER BY m.framework_id, m.requirement_id) AS controls,
             u.id AS upload_id, u.status AS upload_status, u.file_name, u.uploaded_at
      FROM document_type dt
      JOIN document_control_map m ON m.document_type_id = dt.id
      JOIN framework_requirements r ON r.framework_id = m.framework_id AND r.requirement_id = m.requirement_id
      LEFT JOIN document_upload u ON u.document_type_id = dt.id AND u.org_id = $1
      ${frameworkFilter}
      GROUP BY dt.id, u.id, u.status, u.file_name, u.uploaded_at
      ORDER BY dt.category NULLS LAST, dt.name`, params);
    res.json({ org_id: orgId, count: rows.length, documents: rows, pilot: SampleDoc.isPilot() });
  } catch (e) {
    logger.warn('intake checklist failed', { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// Upload one document for a document_type: normalize -> upsert document_upload
// (one per org+type) -> fan-out review to every mapped control.
router.post('/documents', async (req, res) => {
  const orgId = orgOf(req);
  const { document_type_id, file_name, contentBase64, text } = req.body || {};
  if (!orgId || !document_type_id) return res.status(400).json({ error: 'org_id and document_type_id are required' });
  if (!contentBase64 && !text) return res.status(400).json({ error: 'provide contentBase64 or text' });
  try {
    const dt = await db.query('SELECT id FROM document_type WHERE id=$1', [document_type_id]);
    if (!dt[0]) return res.status(404).json({ error: `unknown document_type_id: ${document_type_id}` });

    const norm = contentBase64
      ? normalize(Buffer.from(contentBase64, 'base64'), file_name || 'document')
      : normalize(String(text || ''), file_name || 'document.txt');

    const id = `du_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const up = await db.query(`
      INSERT INTO document_upload (id, org_id, document_type_id, file_name, normalized_text, format, status, uploaded_at)
      VALUES ($1,$2,$3,$4,$5,$6,'normalized',NOW())
      ON CONFLICT (org_id, document_type_id) DO UPDATE SET
        file_name=EXCLUDED.file_name, normalized_text=EXCLUDED.normalized_text,
        format=EXCLUDED.format, status='normalized', error=NULL, uploaded_at=NOW()
      RETURNING id`, [id, orgId, document_type_id, file_name || null, norm.text, norm.format]);
    const uploadId = up[0].id;

    const result = await pipeline.processUpload(orgId, uploadId);
    res.json({ upload_id: uploadId, format: norm.format, text_length: norm.text.length, ...result });
  } catch (e) {
    logger.warn('intake upload failed', { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// Re-run review from the stored normalized_text (no re-upload needed).
router.post('/documents/:id/rereview', async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  try {
    const result = await pipeline.rereview(orgId, req.params.id);
    res.json(result);
  } catch (e) {
    const code = /not found/i.test(e.message) ? 404 : 500;
    res.status(code).json({ error: e.message });
  }
});

// Per-control assessment results for a single upload (the fan-out output).
router.get('/documents/:id/assessments', async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  try {
    const rows = await db.query(`
      SELECT ca.framework_id, ca.requirement_id, r.title, r.family AS domain,
             ca.status, ca.finding, ca.evidence_excerpt, ca.reviewed_at
      FROM control_assessment ca
      LEFT JOIN framework_requirements r ON r.framework_id=ca.framework_id AND r.requirement_id=ca.requirement_id
      WHERE ca.org_id=$1 AND ca.document_upload_id=$2
      ORDER BY ca.framework_id, ca.requirement_id`, [orgId, req.params.id]);
    res.json({ org_id: orgId, upload_id: req.params.id, count: rows.length, assessments: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Extract the business-function -> process hierarchy (with RTO priority) from an
// uploaded process / BIA document. Returns a structure the wizard renders as a
// validation checklist; nothing is persisted here (the user validates first).
router.post('/extract-processes', async (req, res) => {
  const { file_name, contentBase64, text } = req.body || {};
  if (!contentBase64 && !text) return res.status(400).json({ error: 'provide contentBase64 or text' });
  try {
    const input = contentBase64 ? Buffer.from(contentBase64, 'base64') : text;
    const norm = normalize(input, file_name || 'process.txt');
    const result = await ProcessExtraction.extract(norm.text);
    if (!result.count) {
      return res.json({ ...result, note: 'No processes could be extracted from this document. Try a process inventory or BIA with named processes and RTOs.' });
    }
    res.json(result);
  } catch (e) {
    logger.warn('process extraction failed', { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// PILOT/TEST: generate a representative sample document for a document_type so
// the full pipeline can be exercised end-to-end. Gated by PILOT_SAMPLE_DOCS.
router.get('/sample/:documentTypeId', async (req, res) => {
  if (!SampleDoc.isPilot()) return res.status(404).json({ error: 'pilot sample generation is disabled' });
  try { res.json(await SampleDoc.generateForType(req.params.documentTypeId)); }
  catch (e) {
    const code = /unknown document_type/.test(e.message) ? 404 : 500;
    res.status(code).json({ error: e.message });
  }
});

module.exports = router;
