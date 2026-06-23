'use strict';

/**
 * ControlLibraryService — read + projection over the unified control library.
 * --------------------------------------------------------------------------
 * The library (control_library) is framework-agnostic; control_library_crosswalk
 * maps each library control to canonical requirement IDs across the seven
 * onboarding frameworks. This service answers:
 *   - listFrameworks()                          the 7 compliance frameworks
 *   - listControls({ domain })                  library controls (+ mapping count)
 *   - getControl(id)                            one control + its crosswalk
 *   - resolveRequirements(libraryControlId)     framework requirements it satisfies
 *   - coverageByFramework(framework)            how much of a framework the
 *                                               library can address (mapping reach)
 *   - projectFromSatisfied(framework, ids)      per-requirement status given the
 *                                               set of satisfied library controls
 *                                               (Step 3's evidence ledger feeds this)
 *
 * See docs/plans/onboarding-redesign-blueprint.md (§5, §8).
 */

const db = require('../utils/db');

// The seven compliance frameworks the onboarding journey reports against.
// (MITRE ATT&CK is threat-coverage, not a compliance framework, so it is excluded.)
const FRAMEWORKS = [
  { id: 'nist_csf_2', name: 'NIST CSF 2.0' },
  { id: 'nist_800_53_r5', name: 'NIST SP 800-53 Rev 5' },
  { id: 'cis_v8_1', name: 'CIS Controls v8.1' },
  { id: 'iso_27001', name: 'ISO/IEC 27001:2022' },
  { id: 'soc_2', name: 'SOC 2 (AICPA TSC)' },
  { id: 'hipaa_security', name: 'HIPAA Security Rule' },
  { id: 'hitrust_csf', name: 'HITRUST CSF' },
];
const FRAMEWORK_IDS = FRAMEWORKS.map((f) => f.id);

function listFrameworks() {
  return FRAMEWORKS.map((f) => ({ ...f }));
}

async function listControls({ domain } = {}) {
  const params = [];
  let where = '';
  if (domain) { params.push(domain); where = 'WHERE cl.domain = $1'; }
  return db.query(
    `SELECT cl.id, cl.domain, cl.title, cl.description, cl.dimension, cl.weight,
            cl.default_method,
            COUNT(x.requirement_id)::int AS mapping_count,
            COUNT(DISTINCT x.framework)::int AS framework_count
       FROM control_library cl
       LEFT JOIN control_library_crosswalk x ON x.library_control_id = cl.id
       ${where}
       GROUP BY cl.id
       ORDER BY cl.domain, cl.id`,
    params
  );
}

async function getControl(id) {
  const rows = await db.query('SELECT * FROM control_library WHERE id = $1', [id]);
  if (!rows.length) return null;
  const crosswalk = await resolveRequirements(id);
  return { ...rows[0], crosswalk };
}

/** Framework requirements a library control satisfies, with requirement titles. */
async function resolveRequirements(libraryControlId) {
  return db.query(
    `SELECT x.framework, x.requirement_id, x.coverage, x.provenance,
            fr.title, fr.family
       FROM control_library_crosswalk x
       LEFT JOIN framework_requirements fr
         ON fr.framework_id = x.framework AND fr.requirement_id = x.requirement_id
      WHERE x.library_control_id = $1
      ORDER BY x.framework, x.requirement_id`,
    [libraryControlId]
  );
}

/**
 * Mapping reach for a framework: of its requirements, how many are addressed by
 * at least one library control. This powers the framework-coverage completeness
 * dimension and shows where the library still has blind spots.
 */
async function coverageByFramework(framework) {
  if (!FRAMEWORK_IDS.includes(framework)) {
    const err = new Error(`unknown framework: ${framework}`);
    err.status = 400;
    throw err;
  }
  const rows = await db.query(
    `SELECT
       (SELECT COUNT(*)::int FROM framework_requirements
          WHERE framework_id = $1 AND COALESCE(withdrawn, false) = false) AS total,
       (SELECT COUNT(DISTINCT fr.requirement_id)::int
          FROM framework_requirements fr
          JOIN control_library_crosswalk x
            ON x.framework = fr.framework_id AND x.requirement_id = fr.requirement_id
         WHERE fr.framework_id = $1 AND COALESCE(fr.withdrawn, false) = false) AS mapped`,
    [framework]
  );
  const total = rows[0] ? rows[0].total : 0;
  const mapped = rows[0] ? rows[0].mapped : 0;
  const coverage_pct = total ? Math.round((mapped / total) * 100) : 0;
  return { framework, total, mapped, coverage_pct };
}

async function coverageAll() {
  const out = [];
  for (const f of FRAMEWORKS) {
    const c = await coverageByFramework(f.id);
    out.push({ ...c, name: f.name });
  }
  return out;
}

/**
 * Project per-requirement status for a framework given the set of library
 * controls the org has satisfied (Step 3's control_evidence_ledger supplies the
 * set). A requirement is 'met' if every mapping is satisfied, 'partial' if some
 * are, 'not_met' if mapped but none satisfied, 'unmapped' if the library does not
 * yet address it. Pure projection — no scoring weights here.
 */
async function projectFromSatisfied(framework, satisfiedControlIds = []) {
  if (!FRAMEWORK_IDS.includes(framework)) {
    const err = new Error(`unknown framework: ${framework}`);
    err.status = 400;
    throw err;
  }
  const reqs = await db.query(
    `SELECT requirement_id, family, title FROM framework_requirements
      WHERE framework_id = $1 AND COALESCE(withdrawn, false) = false
      ORDER BY requirement_id`,
    [framework]
  );
  const xwalk = await db.query(
    `SELECT requirement_id, library_control_id FROM control_library_crosswalk
      WHERE framework = $1`,
    [framework]
  );
  const satisfied = new Set(satisfiedControlIds);
  const byReq = new Map();
  for (const row of xwalk) {
    if (!byReq.has(row.requirement_id)) byReq.set(row.requirement_id, []);
    byReq.get(row.requirement_id).push(row.library_control_id);
  }

  let met = 0, partial = 0, notMet = 0, unmapped = 0;
  const requirements = reqs.map((r) => {
    const controls = byReq.get(r.requirement_id) || [];
    let status;
    if (!controls.length) { status = 'unmapped'; unmapped++; }
    else {
      const hit = controls.filter((c) => satisfied.has(c)).length;
      if (hit === controls.length) { status = 'met'; met++; }
      else if (hit > 0) { status = 'partial'; partial++; }
      else { status = 'not_met'; notMet++; }
    }
    return { requirement_id: r.requirement_id, family: r.family, title: r.title, status, mapped_controls: controls };
  });

  const total = requirements.length;
  const score = total ? Math.round(((met + partial * 0.5) / total) * 100) : 0;
  return {
    framework,
    summary: { total, met, partial, not_met: notMet, unmapped, score },
    requirements,
  };
}

module.exports = {
  FRAMEWORKS,
  FRAMEWORK_IDS,
  listFrameworks,
  listControls,
  getControl,
  resolveRequirements,
  coverageByFramework,
  coverageAll,
  projectFromSatisfied,
};
