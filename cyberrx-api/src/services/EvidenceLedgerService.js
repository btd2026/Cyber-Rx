'use strict';

/**
 * EvidenceLedgerService — the one place every kind of control evidence lands.
 * --------------------------------------------------------------------------
 * Records evidence at the library-control grain (control_evidence_ledger), then
 * lets the framework projection roll it up across all in-scope frameworks. A
 * library control is "satisfied" when it has at least one 'met' ledger row.
 *
 *   normalizeStatus(raw)                         map any source verdict -> met|partial|not_met|null
 *   record(orgId, evidence)                      upsert one ledger row
 *   recordForRequirement(orgId, fw, reqId, ev)   fan a requirement verdict out to
 *                                                its mapped library controls
 *   satisfiedControlIds(orgId)                   library controls with a 'met' row
 *   listForOrg(orgId)                            all ledger rows for an org
 *   projectOrgFramework(orgId, framework)        per-requirement posture for an org
 *   dimensionRollup(orgId)                       System/Documentation/Human rollup
 *
 * See docs/plans/onboarding-redesign-blueprint.md (§3.4, §5.4, §8).
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const Library = require('./ControlLibraryService');

// Map any source verdict to the ledger's three-state status (or null = no evidence).
function normalizeStatus(raw) {
  const s = String(raw || '').toLowerCase().trim();
  if (['met', 'passed', 'pass', 'compliant', 'implemented'].includes(s)) return 'met';
  if (['partial', 'partially met', 'partially_met', 'partially', 'in_progress'].includes(s)) return 'partial';
  if (['not met', 'not_met', 'failed', 'fail', 'gap', 'none'].includes(s)) return 'not_met';
  return null; // not_tested | needs_manual_evidence | unknown -> no usable evidence
}

/** Upsert one ledger row. Idempotent on (org, library_control_id, source_ref). */
async function record(orgId, ev) {
  const {
    libraryControlId, evidenceKind, dimension, sourceRef,
    status, confidence, excerpt, freshnessDate,
  } = ev;
  if (!libraryControlId || !evidenceKind || !sourceRef) {
    throw new Error('record requires libraryControlId, evidenceKind, sourceRef');
  }
  const rows = await db.query(
    `INSERT INTO control_evidence_ledger
       (id, organization_id, library_control_id, evidence_kind, dimension, source_ref,
        status, confidence, excerpt, freshness_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (organization_id, library_control_id, source_ref) DO UPDATE SET
       evidence_kind=EXCLUDED.evidence_kind, dimension=EXCLUDED.dimension,
       status=EXCLUDED.status, confidence=EXCLUDED.confidence, excerpt=EXCLUDED.excerpt,
       freshness_date=EXCLUDED.freshness_date, created_at=NOW()
     RETURNING *`,
    [uuidv4(), orgId, libraryControlId, evidenceKind, dimension || 'system', sourceRef,
      status || null, confidence == null ? null : confidence, excerpt || null, freshnessDate || null]
  );
  return rows[0];
}

/** Library controls that satisfy a given framework requirement (via crosswalk). */
async function librariesForRequirement(framework, requirementId) {
  const rows = await db.query(
    `SELECT x.library_control_id, cl.dimension
       FROM control_library_crosswalk x
       JOIN control_library cl ON cl.id = x.library_control_id
      WHERE x.framework = $1 AND x.requirement_id = $2`,
    [framework, requirementId]
  );
  return rows;
}

/**
 * Fan a per-requirement verdict (from the document pipeline or a manual review)
 * out to every library control mapped to that requirement. Each library control
 * gets a ledger row carrying its own dimension.
 */
async function recordForRequirement(orgId, framework, requirementId, ev) {
  const status = normalizeStatus(ev.status);
  const targets = await librariesForRequirement(framework, requirementId);
  const out = [];
  for (const t of targets) {
    out.push(await record(orgId, {
      libraryControlId: t.library_control_id,
      evidenceKind: ev.evidenceKind || 'document',
      dimension: ev.dimension || t.dimension,
      sourceRef: ev.sourceRef,
      status,
      confidence: ev.confidence,
      excerpt: ev.excerpt,
      freshnessDate: ev.freshnessDate,
    }));
  }
  return out;
}

/** Library control IDs with at least one 'met' ledger row for this org. */
async function satisfiedControlIds(orgId) {
  const rows = await db.query(
    `SELECT DISTINCT library_control_id
       FROM control_evidence_ledger
      WHERE organization_id = $1 AND status = 'met'`,
    [orgId]
  );
  return rows.map((r) => r.library_control_id);
}

async function listForOrg(orgId) {
  return db.query(
    `SELECT l.*, cl.domain, cl.title
       FROM control_evidence_ledger l
       JOIN control_library cl ON cl.id = l.library_control_id
      WHERE l.organization_id = $1
      ORDER BY cl.domain, l.library_control_id, l.created_at DESC`,
    [orgId]
  );
}

/** Per-requirement posture for an org against one framework. */
async function projectOrgFramework(orgId, framework) {
  const satisfied = await satisfiedControlIds(orgId);
  return Library.projectFromSatisfied(framework, satisfied);
}

/**
 * System / Documentation / Human rollup (blueprint §5.4). For each dimension,
 * the share of that dimension's library controls (that the org has touched) which
 * are 'met'. Honest: only counts controls with at least one ledger row.
 */
async function dimensionRollup(orgId) {
  const rows = await db.query(
    `SELECT cl.dimension,
            COUNT(DISTINCT l.library_control_id)::int AS touched,
            COUNT(DISTINCT l.library_control_id) FILTER (WHERE l.status = 'met')::int AS met
       FROM control_evidence_ledger l
       JOIN control_library cl ON cl.id = l.library_control_id
      WHERE l.organization_id = $1
      GROUP BY cl.dimension`,
    [orgId]
  );
  const weights = { system: 50, documentation: 30, human: 20 };
  const byDim = {};
  for (const r of rows) {
    byDim[r.dimension] = { touched: r.touched, met: r.met, score: r.touched ? Math.round((r.met / r.touched) * 100) : 0 };
  }
  let weighted = 0, wsum = 0;
  for (const [dim, w] of Object.entries(weights)) {
    const d = byDim[dim];
    if (d && d.touched) { weighted += d.score * w; wsum += w; }
  }
  return {
    dimensions: byDim,
    weights,
    overall: wsum ? Math.round(weighted / wsum) : 0,
  };
}

module.exports = {
  normalizeStatus,
  record,
  librariesForRequirement,
  recordForRequirement,
  satisfiedControlIds,
  listForOrg,
  projectOrgFramework,
  dimensionRollup,
};
