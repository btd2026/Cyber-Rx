'use strict';

/**
 * seedReferenceModel — idempotent seed of the canonical payer capability library
 * (capability_library_version / capability / capability_pack / *_item) from
 * payerCapabilityTaxonomy.js, plus a backfill of framework_requirements.assessment_type.
 *
 * Shared reference content only — no organization_id, no plan-identifying data.
 * Safe to re-run (ON CONFLICT upserts). Wired into ingest/bootstrap.js.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');
const { VERSION, CAPABILITIES, PACKS } = require('../data/payerCapabilityTaxonomy');

const CONTROL_FRAMEWORKS = ['nist_csf_2', 'nist_800_53_r5', 'cis_v8_1'];

function parseMeta(m) {
  if (!m) return {};
  if (typeof m === 'string') { try { return JSON.parse(m); } catch (_) { return {}; } }
  return m;
}

// Pure mapping: a requirement's catalog test flag -> assessment_type.
function assessmentTypeFor(req) {
  const t = parseMeta(req.meta).test;
  if (t === 'auto') return 'automated';
  if (t === 'manual') return 'manual';
  if (t === 'partial') return 'hybrid';
  return 'hybrid'; // control framework requirement with no explicit test flag
}

async function backfillAssessmentType() {
  const rows = await db.query(
    `SELECT framework_id, requirement_id, meta FROM framework_requirements
     WHERE assessment_type IS NULL AND framework_id = ANY($1)`, [CONTROL_FRAMEWORKS]);
  let n = 0;
  for (const r of rows) {
    await db.query(`UPDATE framework_requirements SET assessment_type=$1 WHERE framework_id=$2 AND requirement_id=$3`,
      [assessmentTypeFor(r), r.framework_id, r.requirement_id]);
    n++;
  }
  return n;
}

async function seed() {
  await db.query(
    `INSERT INTO capability_library_version (id, label, version) VALUES ($1,$2,$3)
     ON CONFLICT (id) DO UPDATE SET label=EXCLUDED.label, version=EXCLUDED.version`,
    [VERSION.id, VERSION.label, VERSION.version]);

  for (const c of CAPABILITIES) {
    await db.query(
      `INSERT INTO capability (id, version_id, parent_id, content_tier, kind, name, default_tier, default_rto)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET
         version_id=EXCLUDED.version_id, parent_id=EXCLUDED.parent_id, content_tier=EXCLUDED.content_tier,
         kind=EXCLUDED.kind, name=EXCLUDED.name, default_tier=EXCLUDED.default_tier, default_rto=EXCLUDED.default_rto`,
      [c.id, VERSION.id, c.parent || null, c.tier, c.kind, c.name, c.crit || null, c.rto || null]);
  }

  for (const packId of Object.keys(PACKS)) {
    await db.query(`INSERT INTO capability_pack (id, version_id, label) VALUES ($1,$2,$3)
       ON CONFLICT (id) DO UPDATE SET version_id=EXCLUDED.version_id`, [packId, VERSION.id, packId]);
    for (const capId of PACKS[packId]) {
      await db.query(`INSERT INTO capability_pack_item (pack_id, capability_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [packId, capId]);
    }
  }

  const assessmentTypeBackfilled = await backfillAssessmentType();
  const result = { version: VERSION.version, capabilities: CAPABILITIES.length, packs: Object.keys(PACKS).length, assessmentTypeBackfilled };
  logger.info('reference model seeded', result);
  return result;
}

module.exports = { seed, assessmentTypeFor, backfillAssessmentType };

if (require.main === module) {
  db.init().then(seed).then((s) => { console.log('seedReferenceModel:', JSON.stringify(s)); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
