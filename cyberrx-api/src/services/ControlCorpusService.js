'use strict';

/**
 * ControlCorpusService — builds and serves the §4 control corpus.
 *
 * Built once from authoritative sources, version-pinned, reused for every scan:
 *   - Spine: NIST SP 800-53 Rev5 controls + 800-53A determination statements
 *     (parse80053, from bundled OSCAL/CPRT).
 *   - Target: NIST CSF 2.0 subcategories (nistCsfControlLibrary).
 *   - Crosswalk: 800-53 -> CSF 2.0 from requirement_crosswalks (derived/
 *     provisional today; partial mappings are flagged so Stage 6 re-verifies).
 *
 * ISO 27001 / CIS are out of scope until licensed content is supplied
 * (config/assessmentFrameworks).
 */

const db = require('../utils/db');
const logger = require('../utils/logger');
const cfg = require('../config/assessmentFrameworks');
const { buildSpineCorpus, RES } = require('./corpus/parse80053');
const { csfNature } = require('./controlNature');

// relationship -> §4 mapping strength. Equivalent => full; everything else
// (subset/superset/related) or a provisional/derived edge => partial.
function mappingStrength(relationship, provisional) {
  if (provisional) return 'partial';
  return relationship === 'equivalent' ? 'full' : 'partial';
}

/**
 * Assemble the §4 crosswalk object for a spine control from raw crosswalk edges.
 * @param {Array<{to_framework,to_id,relationship,provisional}>} edges
 * @param {Object<string,string>} labelByFwId  framework id -> §4 label
 */
function buildCrosswalk(edges, labelByFwId) {
  const out = {};
  for (const e of edges || []) {
    const label = labelByFwId[e.to_framework];
    if (!label) continue; // only in-scope target frameworks
    (out[label] = out[label] || []).push({ control_id: e.to_id, mapping: mappingStrength(e.relationship, e.provisional) });
  }
  return out;
}

// ---- Load (persist the corpus) -------------------------------------------

async function loadSpine() {
  const corpus = buildSpineCorpus({ framework: cfg.SPINE.label, version: cfg.SPINE.version });
  // Crosswalk edges spine -> in-scope targets, both stored directions normalized.
  const labelByFwId = {}; cfg.targets.forEach((t) => { labelByFwId[t.id] = t.label; });
  const targetIds = cfg.targets.map((t) => t.id);
  const edgesByControl = {};
  if (targetIds.length) {
    // forward edges (spine -> target)
    const fwd = await db.query(
      `SELECT from_id AS cid, to_framework, to_id, relationship, provisional
         FROM requirement_crosswalks WHERE from_framework=$1 AND to_framework = ANY($2)`,
      [cfg.SPINE.id, targetIds]);
    // reverse edges (target -> spine), flipped
    const rev = await db.query(
      `SELECT to_id AS cid, from_framework AS to_framework, from_id AS to_id, relationship, provisional
         FROM requirement_crosswalks WHERE to_framework=$1 AND from_framework = ANY($2)`,
      [cfg.SPINE.id, targetIds]);
    [...fwd, ...rev].forEach((e) => { (edgesByControl[e.cid] = edgesByControl[e.cid] || []).push(e); });
  }

  let n = 0;
  for (const rec of corpus) {
    rec.crosswalk = buildCrosswalk(edgesByControl[rec.control_id], labelByFwId);
    await upsert(rec, { isSpine: true, provenance: 'NIST OSCAL + 800-53A CPRT' });
    n += 1;
  }
  return { framework: cfg.SPINE.label, version: cfg.SPINE.version, controls: n };
}

async function loadCsfTarget() {
  if (!cfg.targets.some((t) => t.id === 'nist_csf_2')) return { framework: 'NIST_CSF_2.0', controls: 0, skipped: true };
  let lib;
  try { lib = require('../data/nistCsfControlLibrary'); }
  catch (e) { logger.warn(`CSF library unavailable: ${e.message}`); return { framework: 'NIST_CSF_2.0', controls: 0, error: e.message }; }
  const rows = lib.CONTROLS || lib.controls || (Array.isArray(lib) ? lib : []);
  let n = 0;
  for (const c of rows) {
    await upsert({
      control_id: c.id,
      framework: 'NIST_CSF_2.0',
      framework_version: cfg.ALL_TARGETS.nist_csf_2.version,
      family: c.fn || (c.id || '').split('.')[0],
      title: c.name,
      requirement_text: c.name, // CSF outcomes are the requirement statement
      control_nature: csfNature(c.test),
      // CSF has no 800-53A-style determinations; the outcome is the single objective.
      assessment_objectives: [{ objective_id: c.id, determination_statement: c.name }],
      crosswalk: {},
    }, { isSpine: false, provenance: 'NIST CSF 2.0 library' });
    n += 1;
  }
  return { framework: 'NIST_CSF_2.0', controls: n };
}

async function upsert(rec, { isSpine = false, provenance = null } = {}) {
  await db.query(
    `INSERT INTO control_corpus
       (framework, framework_version, control_id, title, requirement_text, family,
        control_nature, assessment_objectives, crosswalk, is_spine, source_provenance, loaded_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
     ON CONFLICT (framework, control_id) DO UPDATE SET
       framework_version=EXCLUDED.framework_version, title=EXCLUDED.title,
       requirement_text=EXCLUDED.requirement_text, family=EXCLUDED.family,
       control_nature=EXCLUDED.control_nature, assessment_objectives=EXCLUDED.assessment_objectives,
       crosswalk=EXCLUDED.crosswalk, is_spine=EXCLUDED.is_spine,
       source_provenance=EXCLUDED.source_provenance, loaded_at=NOW()`,
    [rec.framework, rec.framework_version, rec.control_id, rec.title || null, rec.requirement_text || null,
      rec.family || null, rec.control_nature || null, JSON.stringify(rec.assessment_objectives || []),
      JSON.stringify(rec.crosswalk || {}), isSpine, provenance]);
}

/** Build + persist the whole in-scope corpus. */
async function load() {
  const spine = await loadSpine();
  const csf = await loadCsfTarget();
  logger.info('control corpus loaded', { spine, csf });
  return { spine, targets: [csf], frameworkVersions: cfg.frameworkVersions() };
}

// ---- Read (serve §4 records) ---------------------------------------------

function rowToRecord(r) {
  return {
    control_id: r.control_id,
    framework: r.framework,
    framework_version: r.framework_version,
    title: r.title,
    requirement_text: r.requirement_text,
    control_nature: r.control_nature,
    family: r.family,
    assessment_objectives: r.assessment_objectives || [],
    crosswalk: r.crosswalk || {},
    is_spine: r.is_spine,
  };
}

async function getControl(framework, controlId) {
  const rows = await db.query('SELECT * FROM control_corpus WHERE framework=$1 AND control_id=$2', [framework, controlId]);
  return rows[0] ? rowToRecord(rows[0]) : null;
}

async function listSpine({ nature, limit } = {}) {
  const params = [cfg.SPINE.label]; let sql = 'SELECT * FROM control_corpus WHERE framework=$1';
  if (nature) { params.push(nature); sql += ` AND control_nature=$${params.length}`; }
  sql += ' ORDER BY control_id';
  if (limit) { params.push(limit); sql += ` LIMIT $${params.length}`; }
  return (await db.query(sql, params)).map(rowToRecord);
}

async function counts() {
  const rows = await db.query('SELECT framework, control_nature, COUNT(*)::int AS n FROM control_corpus GROUP BY framework, control_nature ORDER BY framework, control_nature');
  return rows;
}

module.exports = {
  mappingStrength, buildCrosswalk, rowToRecord,
  loadSpine, loadCsfTarget, load,
  getControl, listSpine, counts,
  RES,
};
