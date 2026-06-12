'use strict';

/**
 * ingest/seedCisoDashboard.js
 * ---------------------------
 * Persists the CISO dashboard data model (data/cisoDashboard.js) into the
 * polymorphic ciso_entities table for the demo orgs, so the dashboard is
 * schema-backed and a live integration can overwrite any single entity row of
 * the same shape. Idempotent (upsert). The service falls back to the module if
 * a type isn't present, so seeding is optional for the demo.
 */

const db = require('../utils/db');
const D = require('../data/cisoDashboard');

const SETS = [
  ['SecurityDomain', D.SECURITY_DOMAINS],
  ['ControlArea', D.CONTROL_AREAS],
  ['Threshold', D.THRESHOLDS],
  ['CriticalBusinessProcess', D.BUSINESS_PROCESSES],
  ['AttackPathway', D.ATTACK_PATHWAYS],
  ['CyberReadinessItem', D.READINESS_ITEMS],
  ['SecurityInvestment', D.INVESTMENTS],
  ['HiddenRisk', D.HIDDEN_RISKS],
  ['SecurityAction', D.ATTENTION_ITEMS],
  ['EvidenceSource', D.EVIDENCE_SOURCES],
  ['CISOQuestion', D.QUESTIONS],
];

async function demoOrgs() {
  try {
    const rows = await db.query(`SELECT DISTINCT org_id FROM metric_inputs WHERE org_id <> '_defaults'`);
    if (rows.length) return rows.map((r) => r.org_id);
  } catch (_) {}
  return ['blue-cross-blue-shield-of-massachusetts'];
}

async function seed(orgIds) {
  const orgs = orgIds || (await demoOrgs());
  let n = 0;
  for (const org of orgs) {
    for (const [type, arr] of SETS) {
      for (let i = 0; i < arr.length; i++) {
        const e = arr[i];
        await db.query(`
          INSERT INTO ciso_entities (org_id, entity_type, entity_id, ordinal, data)
          VALUES ($1,$2,$3,$4,$5)
          ON CONFLICT (org_id, entity_type, entity_id) DO UPDATE SET data=EXCLUDED.data, ordinal=EXCLUDED.ordinal, updated_at=NOW()`,
          [org, type, e.id || `${type}_${i}`, i, JSON.stringify(e)]);
        n++;
      }
    }
  }
  return { orgs: orgs.length, rows: n };
}

module.exports = { seed };

if (require.main === module) {
  db.init().then(() => seed()).then((r) => { console.log('seedCisoDashboard:', JSON.stringify(r)); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
