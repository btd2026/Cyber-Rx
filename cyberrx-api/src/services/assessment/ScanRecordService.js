'use strict';

/**
 * ScanRecordService — persists the §4 scan record (status + token usage / est
 * cost by stage, pinned framework versions, document version hash). Used for
 * cost-per-scan observability and (Stage 8) incremental re-assessment.
 */

const crypto = require('crypto');
const db = require('../../utils/db');
const fwCfg = require('../../config/assessmentFrameworks');

const docVersionHash = (text) => crypto.createHash('sha256').update(String(text || '')).digest('hex');

async function start({ scanId, scopeType, scopeId, documentId, documentText, quotaPeriodKey }) {
  const id = scanId || `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.query(
    `INSERT INTO scan_record (scan_id, scope_type, scope_id, document_id, document_version_hash, framework_versions, quota_period_key, status, started_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'running',NOW())
     ON CONFLICT (scan_id) DO UPDATE SET status='running', started_at=NOW()`,
    [id, scopeType || null, scopeId || null, documentId || null, docVersionHash(documentText),
      JSON.stringify(fwCfg.frameworkVersions()), quotaPeriodKey || null]);
  return id;
}

async function complete(scanId, usage) {
  await db.query(
    `UPDATE scan_record SET status='completed', token_usage=$2, completed_at=NOW() WHERE scan_id=$1`,
    [scanId, JSON.stringify(usage || {})]);
  return scanId;
}

async function fail(scanId, usage) {
  await db.query(
    `UPDATE scan_record SET status='failed', token_usage=$2, completed_at=NOW() WHERE scan_id=$1`,
    [scanId, JSON.stringify(usage || {})]);
  return scanId;
}

async function get(scanId) {
  return (await db.query('SELECT * FROM scan_record WHERE scan_id=$1', [scanId]))[0] || null;
}

async function latestForDocument(documentId) {
  return (await db.query("SELECT * FROM scan_record WHERE document_id=$1 AND status='completed' ORDER BY completed_at DESC LIMIT 1", [documentId]))[0] || null;
}

module.exports = { start, complete, fail, get, latestForDocument, docVersionHash };
