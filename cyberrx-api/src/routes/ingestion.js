'use strict';

/**
 * routes/ingestion — generic, schema-agnostic ingestion API.
 *   POST /api/ingestion/preview   parse a file + propose a field mapping (confidence)
 *   POST /api/ingestion/commit    create a source, persist mapping, ingest rows
 *   GET  /api/ingestion/sources   list declared sources
 *   GET  /api/ingestion/exceptions?source_id=  the review/exception queue
 *
 * Framing: source_kind 'cmdb' -> applications; 'process_inventory' -> business
 * functions/processes. CMDB uploads do NOT create process groupings.
 */

const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const logger = require('../utils/logger');
const { optionalJWT } = require('../middleware/auth');
const Ingestion = require('../ingestion/IngestionService');
const { parse } = require('../ingestion/parsers');

function org(req, res) {
  const id = req.orgId || req.headers['x-org-id'] || req.query.org_id || (req.body && req.body.org_id);
  if (!id) { res.status(400).json({ error: 'Organization not specified' }); return null; }
  return id;
}
const SOURCE_KINDS = ['process_inventory', 'cmdb'];
function inputOf(b) {
  if (b.contentBase64) return Buffer.from(b.contentBase64, 'base64');
  return String(b.text || '');
}

router.post('/preview', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  const b = req.body || {};
  if (!SOURCE_KINDS.includes(b.sourceKind)) return res.status(400).json({ error: `sourceKind must be one of ${SOURCE_KINDS.join(', ')}` });
  try {
    res.json(Ingestion.preview(b.sourceKind, inputOf(b), { fileName: b.fileName, mime: b.mime }));
  } catch (e) { logger.warn('ingestion preview failed', { error: e.message }); res.status(500).json({ error: e.message }); }
});

router.post('/commit', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  const b = req.body || {};
  if (!SOURCE_KINDS.includes(b.sourceKind)) return res.status(400).json({ error: `sourceKind must be one of ${SOURCE_KINDS.join(', ')}` });
  if (!b.mapping) return res.status(400).json({ error: 'mapping is required (confirm it from /preview first)' });
  try {
    // The intake can import an application inventory before the org profile is
    // formally saved. Ensure the orgs row exists so the ingestion_source -> orgs
    // foreign key is satisfied; the later profile save merges real values in.
    await db.query(
      `INSERT INTO orgs (id, name, type, setup_json, created_at)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (id) DO NOTHING`,
      [orgId, orgId, '', '{}']);
    const sourceId = `isrc_${orgId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await db.query(
      `INSERT INTO ingestion_source (id, organization_id, source_kind, origin, label, created_at)
       VALUES ($1,$2,$3,$4,$5,NOW())`,
      [sourceId, orgId, b.sourceKind, b.origin || 'file', b.label || b.fileName || b.sourceKind]);
    const parsed = parse(inputOf(b), { fileName: b.fileName, mime: b.mime });
    const result = await Ingestion.ingest(orgId, b.sourceKind, parsed, b.mapping, { sourceId });
    res.json({ sourceId, ...result });
  } catch (e) { logger.warn('ingestion commit failed', { error: e.message }); res.status(500).json({ error: e.message }); }
});

router.get('/sources', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json({ sources: await db.query('SELECT * FROM ingestion_source WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 200', [orgId]) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/exceptions', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try {
    const params = [orgId]; let where = 'organization_id=$1';
    if (req.query.source_id) { params.push(req.query.source_id); where += ` AND source_id=$2`; }
    res.json({ exceptions: await db.query(`SELECT * FROM ingestion_exception WHERE ${where} ORDER BY created_at DESC LIMIT 500`, params) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
