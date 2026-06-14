'use strict';

/**
 * seedIntakeCatalog — idempotent seed of the Organization Intake document
 * catalog (document_type + document_control_map) from intakeDocumentCatalog.js.
 *
 * Upserts each document_type and its control mappings. Every mapped
 * (framework_id, requirement_id) is validated against framework_requirements;
 * mappings whose control is not present (e.g. CIS before its catalog is loaded)
 * are skipped and counted, so this never fails on missing framework data.
 *
 * Safe to run repeatedly (ON CONFLICT upserts). Wired into ingest/bootstrap.js.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');
const { CATALOG } = require('../data/intakeDocumentCatalog');

async function seed() {
  const reqRows = await db.query('SELECT framework_id, requirement_id FROM framework_requirements');
  const have = new Set(reqRows.map((r) => `${r.framework_id}::${r.requirement_id}`));

  let documentTypes = 0, mappings = 0, skippedUnresolved = 0;
  for (const dt of CATALOG) {
    await db.query(
      `INSERT INTO document_type (id, name, description, category)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO UPDATE SET
         name=EXCLUDED.name, description=EXCLUDED.description, category=EXCLUDED.category`,
      [dt.id, dt.name, dt.description || null, dt.category || null]);
    documentTypes++;

    for (const c of (dt.controls || [])) {
      if (!have.has(`${c.framework_id}::${c.requirement_id}`)) { skippedUnresolved++; continue; }
      await db.query(
        `INSERT INTO document_control_map (document_type_id, framework_id, requirement_id, expected_requirement)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (document_type_id, framework_id, requirement_id)
         DO UPDATE SET expected_requirement=EXCLUDED.expected_requirement`,
        [dt.id, c.framework_id, c.requirement_id, c.expected_requirement || null]);
      mappings++;
    }
  }

  const result = { documentTypes, mappings, skippedUnresolved };
  logger.info('intake catalog seeded', result);
  return result;
}

module.exports = { seed };

if (require.main === module) {
  db.init().then(seed).then((s) => { console.log('seedIntakeCatalog:', JSON.stringify(s)); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
