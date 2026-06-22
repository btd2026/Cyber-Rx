'use strict';

/**
 * ingest/backfillEvidenceLedger.js — Onboarding redesign, Step 3 (M4 backfill).
 * ---------------------------------------------------------------------------
 * Populates control_evidence_ledger from the evidence the platform already has:
 *   - control_assessment  (document-pipeline verdicts; framework_id matches the
 *     engine directly) -> documentation-dimension ledger rows
 *   - cae_result         (automated control results) -> system-dimension rows,
 *     after normalizing the CAE framework label to the engine framework id
 *
 * Safe by construction: every row is posted via EvidenceLedgerService
 * .recordForRequirement, which only writes when a real crosswalk mapping from
 * (framework, requirement) to a library control exists. Unmatched rows (e.g.
 * CIS control-level results with no safeguard-level crosswalk) are skipped rather
 * than fabricated. Idempotent: ledger upserts on (org, library_control, source_ref).
 *
 * csf_evidence is intentionally NOT backfilled: it is Q&A keyed by question_key
 * with no question->requirement map, so any mapping would be invented. It will be
 * wired in when that map is curated.
 *
 * See docs/plans/onboarding-redesign-blueprint.md (§3.5 step M4).
 */

const db = require('../utils/db');
const logger = require('../utils/logger');
const ledger = require('../services/EvidenceLedgerService');

// CAE framework label (raw CSV value stored on cae_result.framework) -> engine id.
function normalizeCaeFramework(raw) {
  const s = String(raw || '').toLowerCase();
  if (s.includes('csf')) return 'nist_csf_2';
  if (s.includes('800-53') || s.includes('800 53')) return 'nist_800_53_r5';
  if (s.includes('cis')) return 'cis_v8_1';
  if (s.includes('27001') || s.includes('iso')) return 'iso_27001';
  if (s.includes('soc')) return 'soc_2';
  if (s.includes('hitrust')) return 'hitrust_csf';
  if (s.includes('hipaa')) return 'hipaa_security';
  return null; // e.g. MITRE ATT&CK — not a compliance framework
}

async function backfillControlAssessments() {
  let scanned = 0, posted = 0;
  const rows = await db.query(
    `SELECT org_id, document_upload_id, framework_id, requirement_id, status, evidence_excerpt
       FROM control_assessment`
  );
  for (const r of rows) {
    scanned++;
    const out = await ledger.recordForRequirement(r.org_id, r.framework_id, r.requirement_id, {
      status: r.status,
      evidenceKind: 'document',
      dimension: 'documentation',
      sourceRef: `ca:${r.document_upload_id}:${r.framework_id}:${r.requirement_id}`,
      excerpt: r.evidence_excerpt || null,
      confidence: 0.5,
    });
    posted += out.length;
  }
  return { scanned, posted };
}

async function backfillCaeResults() {
  let scanned = 0, posted = 0, skipped = 0;
  let rows;
  try {
    rows = await db.query(
      `SELECT org_id, framework, control_id, status, score_pct, confidence, summary_finding, computed_at
         FROM cae_result`
    );
  } catch (_) {
    return { scanned: 0, posted: 0, skipped: 0, note: 'cae_result not present' };
  }
  for (const r of rows) {
    scanned++;
    const fw = normalizeCaeFramework(r.framework);
    if (!fw) { skipped++; continue; }
    const out = await ledger.recordForRequirement(r.org_id, fw, r.control_id, {
      status: r.status,
      evidenceKind: 'connector',
      dimension: 'system',
      sourceRef: `cae:${fw}:${r.control_id}`,
      excerpt: r.summary_finding || null,
      confidence: r.confidence == null ? null : Number(r.confidence) / 100,
      freshnessDate: r.computed_at ? new Date(r.computed_at).toISOString().slice(0, 10) : null,
    });
    if (out.length) posted += out.length; else skipped++;
  }
  return { scanned, posted, skipped };
}

async function backfill() {
  const ca = await backfillControlAssessments();
  const cae = await backfillCaeResults();
  const result = { control_assessment: ca, cae_result: cae };
  logger.info('backfillEvidenceLedger complete', result);
  return result;
}

module.exports = { backfill, normalizeCaeFramework };

if (require.main === module) {
  db.init().then(backfill).then((r) => { console.log('backfill:', JSON.stringify(r)); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
