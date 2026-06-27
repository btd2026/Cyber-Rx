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
const extraction = require('../services/DocumentExtractionService');
const SampleDoc = require('../services/SampleDocService');
const ProcessExtraction = require('../services/ProcessExtractionService');
const ScanQuota = require('../services/ScanQuotaService');
const RagIngest = require('../services/rag/RagIngestService');
const AssessmentPipeline = require('../services/assessment/AssessmentPipelineService');
const ScanRecord = require('../services/assessment/ScanRecordService');
const GroundedStore = require('../services/assessment/GroundedAssessmentStore');
const AssessmentReport = require('../services/assessment/AssessmentReportService');
const ExportService = require('../services/assessment/ExportService');
const AnalystQueue = require('../services/assessment/AnalystQueueService');
const { requireAdmin } = require('../middleware/auth');

// Split persisted grounded records into a report model (re-export is free).
function reportFromRecords(records, scanId, uploadId) {
  const spine = records.filter((r) => r.framework === 'NIST_SP_800-53');
  const csf = records.filter((r) => r.framework === 'NIST_CSF_2.0');
  return AssessmentReport.buildReport({ spineVerdicts: spine, csfRecords: csf, scanId, documentId: uploadId, generatedAt: new Date().toISOString() });
}

// Identity available for quota scoping. orgId is always derivable here; userId
// is only present when the route is authenticated (it usually isn't today), so
// the configured default scope is `org` (see config/scanQuota.js).
function scanIds(req) {
  return { orgId: orgOf(req), userId: req.userId || null, accountId: (req.user && req.user.accountId) || null };
}

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

    // QUOTA GATE (spec §3b). Normalizing + storing the document above is free;
    // initiating the assessment run consumes a scan slot. The gate reserves
    // before any LLM/embedding work, consumes on success, refunds on infra
    // failure. A QuotaExceededError short-circuits before processUpload runs.
    //
    // Structured extraction wraps the legacy review: it still writes
    // control_assessment, and additionally records document_extraction + posts
    // each verdict into the unified evidence ledger.
    const result = await ScanQuota.runGuardedScan(
      scanIds(req),
      { documentId: uploadId, actor: req.userId || orgId },
      async () => {
        // Section-aware chunk + embed into the vector store (best-effort), then
        // run the per-control assessment. Chunking failure must not break upload.
        let ingest = null;
        try { ingest = await RagIngest.ingestUpload(orgId, uploadId, norm.text); }
        catch (e) { logger.warn('rag ingest failed', { uploadId, error: e.message }); }
        const r = await extraction.processUpload(orgId, uploadId);
        return { ...r, ingest };
      }
    );
    const quota = await ScanQuota.usage(scanIds(req));
    res.json({ upload_id: uploadId, format: norm.format, text_length: norm.text.length, ...result, quota });
  } catch (e) {
    if (e && e.code === 'SCAN_QUOTA_EXCEEDED') {
      return res.status(429).json({ error: e.message, code: e.code, used: e.used, limit: e.limit, reset_date: e.resetDate });
    }
    logger.warn('intake upload failed', { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// Re-run review from the stored normalized_text (no re-upload needed).
router.post('/documents/:id/rereview', async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  try {
    // An incremental re-assessment is a new scan and consumes a slot (spec §3b).
    const result = await ScanQuota.runGuardedScan(
      scanIds(req),
      { documentId: req.params.id, actor: req.userId || orgId },
      async () => {
        let ingest = null;
        try { ingest = await RagIngest.ingestUpload(orgId, req.params.id); }
        catch (e) { logger.warn('rag ingest failed', { uploadId: req.params.id, error: e.message }); }
        const r = await extraction.processUpload(orgId, req.params.id);
        return { ...r, ingest };
      }
    );
    const quota = await ScanQuota.usage(scanIds(req));
    res.json({ ...result, quota });
  } catch (e) {
    if (e && e.code === 'SCAN_QUOTA_EXCEEDED') {
      return res.status(429).json({ error: e.message, code: e.code, used: e.used, limit: e.limit, reset_date: e.resetDate });
    }
    const code = /not found/i.test(e.message) ? 404 : 500;
    res.status(code).json({ error: e.message });
  }
});

// Remaining scan quota for the caller's scope — FREE (consumes nothing).
// Powers the "N of 2 scans remaining; resets <date>" surface.
router.get('/scan-quota', async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  try { res.json(await ScanQuota.usage(scanIds(req))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin override — grant extra scans for the current period (logged actor+reason).
router.post('/scan-quota/grant', requireAdmin, async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  const { extra, reason } = req.body || {};
  try {
    const actor = (req.user && req.user.userId) || req.headers['x-admin-actor'] || 'admin';
    res.json(await ScanQuota.adminGrant(scanIds(req), { extra: parseInt(extra, 10), actor, reason }));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Admin override — reset the period (refund active reservations; logged).
router.post('/scan-quota/reset', requireAdmin, async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  try {
    const actor = (req.user && req.user.userId) || req.headers['x-admin-actor'] || 'admin';
    res.json(await ScanQuota.adminReset(scanIds(req), { actor, reason: (req.body && req.body.reason) }));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Run the grounded assessment engine for an upload (quota-gated). Persists §4
// records + scan record, enqueues conflicts, returns the report summary.
router.post('/documents/:id/assess-grounded', async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  const uploadId = req.params.id;
  try {
    const out = await ScanQuota.runGuardedScan(scanIds(req), { documentId: uploadId, actor: req.userId || orgId }, async () => {
      const up = await db.query('SELECT normalized_text FROM document_upload WHERE id=$1 AND org_id=$2', [uploadId, orgId]);
      if (!up[0]) { const e = new Error('upload not found'); e.code = 'NOT_FOUND'; throw e; }
      const scanId = await ScanRecord.start({ scopeType: scanIds(req).orgId ? 'org' : 'user', scopeId: orgId, documentId: uploadId, documentText: up[0].normalized_text });
      await RagIngest.ingestUpload(orgId, uploadId, up[0].normalized_text); // ensure chunks/embeddings fresh
      const result = await AssessmentPipeline.run(orgId, uploadId, { scanId, generatedAt: new Date().toISOString() });
      await ScanRecord.complete(scanId, result.usage);
      return { scan_id: scanId, summary: result.report.summary, scorecards: result.report.scorecards, usage: result.usage };
    });
    const quota = await ScanQuota.usage(scanIds(req));
    res.json({ ...out, quota });
  } catch (e) {
    if (e && e.code === 'SCAN_QUOTA_EXCEEDED') return res.status(429).json({ error: e.message, code: e.code, used: e.used, limit: e.limit, reset_date: e.resetDate });
    if (e && e.code === 'NOT_FOUND') return res.status(404).json({ error: e.message });
    logger.warn('grounded assess failed', { uploadId, error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// Export a completed scan's report (FREE — re-export does not consume quota).
router.get('/scan/:scanId/report.:fmt', async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  const { scanId, fmt } = req.params;
  if (!['pdf', 'xlsx', 'docx', 'json'].includes(fmt)) return res.status(400).json({ error: 'format must be pdf|xlsx|docx|json' });
  try {
    const records = await GroundedStore.listByScan(scanId);
    if (!records.length) return res.status(404).json({ error: 'no assessment records for this scan' });
    const report = reportFromRecords(records, scanId);
    if (fmt === 'json') return res.json(report);
    const { buffer, contentType } = await ExportService.exportReport(report, fmt);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="assessment-${scanId}.${fmt}"`);
    res.send(buffer);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Analyst review queue (human-in-the-loop).
router.get('/analyst-queue', async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  try { res.json(await AnalystQueue.list(orgId, { status: req.query.status, scanId: req.query.scan_id })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/analyst-queue/:id/resolve', async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  const { action, reason, resolution } = req.body || {};
  try {
    const actor = req.userId || (req.body && req.body.actor) || 'analyst';
    res.json(await AnalystQueue.resolve(req.params.id, { action, actor, reason, resolution }));
  } catch (e) { res.status(400).json({ error: e.message }); }
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

// Persist the user's validated process tree into business_processes so the
// application→process mapping (and all downstream calculations) can use it.
// Idempotent: replaces previously intake-sourced processes for this org.
const SLUG = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'process';
router.post('/save-processes', async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  const processes = Array.isArray(req.body && req.body.processes) ? req.body.processes : [];
  const critFor = (t) => ({ 1: 'Critical', 2: 'High', 3: 'Medium', 4: 'Low' }[t] || 'Medium');
  try {
    await db.query("DELETE FROM business_processes WHERE organization_id=$1 AND description='(from intake)'", [orgId]);
    let saved = 0;
    for (const p of processes) {
      const name = String(p.name || '').trim();
      if (!name) continue;
      const tier = Number(p.tier) || null;
      await db.query(
        `INSERT INTO business_processes (id, organization_id, name, tier, criticality, owner, crit_tier, rto, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'(from intake)')
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, tier=EXCLUDED.tier, criticality=EXCLUDED.criticality,
           crit_tier=EXCLUDED.crit_tier, rto=EXCLUDED.rto, updated_at=NOW()`,
        [`${orgId}::proc::${SLUG(name)}`, orgId, name, (tier && tier <= 2) ? 'Primary' : 'Strategic',
          critFor(tier), 'Unassigned', tier, p.rto || null]);
      saved++;
    }
    res.json({ saved });
  } catch (e) {
    logger.warn('save-processes failed', { error: e.message });
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

// ===== Intake redesign Step 2 — business-process tree (Slice 2) =============

// Infer the FUNCTION -> PROCESS -> SUB-PROCESS tree from an uploaded document.
// Returns strict-JSON nodes (name/level/parent/confidence/source). Nothing is
// persisted — the user validates the tree first.
router.post('/processes/infer', async (req, res) => {
  const { file_name, contentBase64, text } = req.body || {};
  if (!contentBase64 && !text) return res.status(400).json({ error: 'provide contentBase64 or text' });
  try {
    const input = contentBase64 ? Buffer.from(contentBase64, 'base64') : text;
    const norm = normalize(input, file_name || 'process.txt');
    const result = await ProcessExtraction.extractTree(norm.text);
    res.json({ ...result, fileName: file_name || null, note: result.count ? undefined : 'No processes could be inferred. Try a process inventory or BIA with named processes and RTOs.' });
  } catch (e) {
    logger.warn('process tree infer failed', { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// Persist ONLY the user-validated nodes to business_processes (with level,
// parent, source, confidence, status='validated') and log every validation
// action to the intake evidence ledger. Idempotent per org.
const PSLUG = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'process';
router.post('/processes/validate', async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  const b = req.body || {};
  const nodes = Array.isArray(b.nodes) ? b.nodes : [];          // validated nodes
  const actions = Array.isArray(b.actions) ? b.actions : null;  // explicit ledger entries (accept/edit/delete/add)
  const decidedBy = b.decidedBy || 'intake user';
  const critFor = (t) => ({ 1: 'Critical', 2: 'High', 3: 'Medium', 4: 'Low' }[t] || 'Medium');
  try {
    // Replace this org's intake-sourced processes (idempotent re-validate;
    // also clears legacy intake rows persisted before provenance existed).
    await db.query("DELETE FROM business_processes WHERE organization_id=$1 AND (COALESCE(source,'') IN ('upload','llm','heuristic','manual','intake') OR description='(from intake)')", [orgId]);
    const idFor = (n) => `${orgId}::proc::${PSLUG(n.id || n.name)}`;
    let saved = 0;
    for (const n of nodes) {
      const name = String(n.name || '').trim(); if (!name) continue;
      const tier = Number(n.tier) || null;
      const pid = idFor(n);
      const parentId = n.parent ? `${orgId}::proc::${PSLUG(n.parent)}` : null;
      await db.query(
        `INSERT INTO business_processes (id, organization_id, name, parent_id, level, tier, criticality, owner, crit_tier, rto, source, confidence, status, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'validated','(from intake)')
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, parent_id=EXCLUDED.parent_id, level=EXCLUDED.level,
           tier=EXCLUDED.tier, criticality=EXCLUDED.criticality, crit_tier=EXCLUDED.crit_tier, rto=EXCLUDED.rto,
           source=EXCLUDED.source, confidence=EXCLUDED.confidence, status='validated', updated_at=NOW()`,
        [pid, orgId, name, parentId, n.level || 'process', (tier && tier <= 2) ? 'Primary' : 'Strategic',
          n.criticality || critFor(tier), 'Unassigned', tier, n.rto || null, n.source || 'upload', n.confidence != null ? Number(n.confidence) : null]);
      saved++;
    }
    // Ledger: explicit actions if provided, else an 'accept' per persisted node.
    const Ledger = require('../services/IntakeLedgerService');
    const entries = actions || nodes.map((n) => ({ step: 'processes', objectType: 'process', objectId: idFor(n), action: 'accept', changes: { name: n.name, level: n.level, source: n.source, confidence: n.confidence }, decidedBy }));
    await Ledger.recordMany(orgId, entries);
    res.json({ saved, logged: entries.length });
  } catch (e) {
    logger.warn('process validate failed', { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// ===== Intake redesign Step 3 — applications <-> processes (Slice 3) ========

// Run the 3-tier confidence cascade and persist PROPOSED mappings (many-to-many).
router.post('/apps/map', async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  try { res.json(await require('../crosswalk/CrosswalkService').cascadeMap(orgId, { apps: (req.body && req.body.apps) || null, linkage: (req.body && req.body.linkage) || null })); }
  catch (e) { logger.warn('apps map failed', { error: e.message }); res.status(500).json({ error: e.message }); }
});

// Persist pulled/normalized application rows (CMDB or file) into applications
// with provenance, then run the cascade using their structured linkage. Returns
// the review.
const ASLUG = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'app';
router.post('/apps/ingest', async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  const apps = Array.isArray(req.body && req.body.apps) ? req.body.apps : [];
  if (!apps.length) return res.status(400).json({ error: 'apps[] is required' });
  try {
    const linkage = {};
    for (const a of apps) {
      const name = String(a.name || '').trim(); if (!name) continue;
      const id = `app_${orgId}_${ASLUG(a.externalRef || name)}`;
      await db.query(
        `INSERT INTO applications (id, organization_id, name, owner, vendor, hosting, data_classification, external_ref, source, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'proposed',NOW(),NOW())
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, owner=EXCLUDED.owner, vendor=EXCLUDED.vendor,
           hosting=EXCLUDED.hosting, data_classification=EXCLUDED.data_classification, external_ref=EXCLUDED.external_ref,
           source=EXCLUDED.source, updated_at=NOW()`,
        [id, orgId, name, a.owner || null, a.vendor || null, a.hosting || null, JSON.stringify(a.dataClassification || []), a.externalRef || null, a.source || 'inventory']);
      const svcs = (a.businessServices || []).concat(a.supportedCapability ? [a.supportedCapability] : []);
      if (svcs.length) linkage[id] = svcs;
    }
    const review = await require('../crosswalk/CrosswalkService').cascadeMap(orgId, { linkage });
    res.json({ ingested: apps.length, ...review });
  } catch (e) { logger.warn('apps ingest failed', { error: e.message }); res.status(500).json({ error: e.message }); }
});

// Process-centric review: per process its mapped apps (low-confidence first) +
// gap findings (uncovered processes, orphan apps).
router.get('/apps/review', async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  try { res.json(await require('../crosswalk/CrosswalkService').mappingReview(orgId)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Validate a mapping (accept/reject/edit) -> status + ledger + criticality.
router.post('/apps/validate', async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  const b = req.body || {};
  const items = Array.isArray(b.items) ? b.items : [b];
  try {
    const Cross = require('../crosswalk/CrosswalkService');
    const out = [];
    for (const it of items) out.push(await Cross.validateMapping(orgId, it));
    res.json({ validated: out.length, results: out });
  } catch (e) { logger.warn('apps validate failed', { error: e.message }); res.status(500).json({ error: e.message }); }
});

// ===== Intake redesign foundation (Slice 0) — scaffolding endpoints =========
// CMDB connector — test reachability/credentials for a direct application pull.
router.post('/cmdb/test', async (req, res) => {
  const { system, config } = req.body || {};
  if (!system) return res.status(400).json({ error: 'system is required (e.g. servicenow)' });
  try { res.json(await require('../connectors/CmdbConnector').test(system, config || {})); }
  catch (e) { res.status(e.code === 'NO_CONNECTOR' ? 400 : 500).json({ ok: false, message: e.message }); }
});

// CMDB connector — pull the application inventory (normalized rows; NOT persisted
// here — Step 3 persists after the user validates).
router.post('/cmdb/pull', async (req, res) => {
  const { system, config } = req.body || {};
  if (!system) return res.status(400).json({ error: 'system is required (e.g. servicenow)' });
  try {
    const apps = await require('../connectors/CmdbConnector').pullApplications(system, config || {});
    res.json({ system, count: apps.length, applications: apps });
  } catch (e) { res.status(e.code === 'NO_CONNECTOR' ? 400 : 500).json({ error: e.message }); }
});

// Intake evidence ledger — record a validation action (accept/edit/delete/add).
router.post('/validate-log', async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  const b = req.body || {};
  const entries = Array.isArray(b.entries) ? b.entries : [b];
  try { res.json(await require('../services/IntakeLedgerService').recordMany(orgId, entries)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/validation-ledger', async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  try { res.json({ org_id: orgId, ledger: await require('../services/IntakeLedgerService').list(orgId, { step: req.query.step }) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Summary preview — validated structures + coverage stats + visibility.
router.get('/compile/preview', async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  try {
    const Compile = require('../services/IntakeCompileService');
    const data = await Compile.assemble(orgId);
    let visibility = null; try { visibility = await require('../services/VisibilityService').assess(orgId); } catch (_) {}
    res.json({ org_id: orgId, coverage: Compile.coverage(data), visibility, ...data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Confirm & Compile — emit validated structures for the compiling phase (scaffold).
router.post('/compile', async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'org_id is required' });
  try { res.json(await require('../services/IntakeCompileService').compile(orgId, { decidedBy: (req.body && req.body.decidedBy) || null })); }
  catch (e) { logger.warn('intake compile failed', { error: e.message }); res.status(500).json({ error: e.message }); }
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
