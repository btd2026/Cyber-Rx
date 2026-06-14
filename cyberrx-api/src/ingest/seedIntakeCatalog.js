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

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
const FW_LABEL = { nist_csf_2: 'NIST CSF 2.0', nist_800_53_r5: 'NIST 800-53', cis_v8_1: 'CIS' };
const CSF_FN = { GV: 'Govern', ID: 'Identify', PR: 'Protect', DE: 'Detect', RS: 'Respond', RC: 'Recover' };
const NIST_FAM = { AC: 'Access Control', AT: 'Awareness & Training', AU: 'Audit & Accountability', CA: 'Assessment, Authorization & Monitoring', CM: 'Configuration Management', CP: 'Contingency Planning', IA: 'Identification & Authentication', IR: 'Incident Response', MA: 'Maintenance', MP: 'Media Protection', PE: 'Physical & Environmental Protection', PL: 'Planning', PM: 'Program Management', PS: 'Personnel Security', PT: 'PII Processing & Transparency', RA: 'Risk Assessment', SA: 'System & Services Acquisition', SC: 'System & Communications Protection', SI: 'System & Information Integrity', SR: 'Supply Chain Risk Management' };

function familyDocName(fw, family) {
  if (fw === 'nist_csf_2') return `${CSF_FN[family] || family} (CSF) — policy & evidence`;
  if (fw === 'nist_800_53_r5') return `${NIST_FAM[family] || family} (800-53 ${family}) — policy & evidence`;
  if (fw === 'cis_v8_1') return `CIS Control ${family} — policy & evidence`;
  return `${FW_LABEL[fw] || fw} ${family} — policy & evidence`;
}

// Auto-cover EVERY manual/hybrid control across CSF / 800-53 / CIS that the
// curated catalog doesn't already request, grouped into one document per
// framework family — so the Document Request phase is complete for the manual
// assessment. Idempotent; skips controls already mapped.
async function seedManualCoverage() {
  const covered = new Set((await db.query('SELECT framework_id, requirement_id FROM document_control_map'))
    .map((r) => `${r.framework_id}::${r.requirement_id}`));
  const reqs = await db.query(
    `SELECT framework_id, requirement_id, family, COALESCE(text, title) AS req
       FROM framework_requirements
      WHERE assessment_type IN ('manual','hybrid')
        AND framework_id = ANY($1) AND family IS NOT NULL`,
    [['nist_csf_2', 'nist_800_53_r5', 'cis_v8_1']]);

  let docTypes = 0, mappings = 0; const seenType = new Set();
  for (const r of reqs) {
    if (covered.has(`${r.framework_id}::${r.requirement_id}`)) continue;  // curated already asks for it
    const dtId = `doc.${r.framework_id}.${slug(r.family)}`;
    if (!seenType.has(dtId)) {
      await db.query(
        `INSERT INTO document_type (id, name, description, category) VALUES ($1,$2,$3,'Policy & Evidence')
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name`,
        [dtId, familyDocName(r.framework_id, r.family), `Documents evidencing the manual ${FW_LABEL[r.framework_id] || r.framework_id} ${r.family} controls.`]);
      seenType.add(dtId); docTypes++;
    }
    await db.query(
      `INSERT INTO document_control_map (document_type_id, framework_id, requirement_id, expected_requirement)
       VALUES ($1,$2,$3,$4) ON CONFLICT (document_type_id, framework_id, requirement_id)
       DO UPDATE SET expected_requirement=EXCLUDED.expected_requirement`,
      [dtId, r.framework_id, r.requirement_id, (r.req || '').slice(0, 240)]);
    mappings++;
  }
  return { docTypes, mappings };
}

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

  const coverage = await seedManualCoverage();   // complete the manual-assessment doc set
  const result = { documentTypes, mappings, skippedUnresolved, autoFamilyDocs: coverage.docTypes, autoFamilyMappings: coverage.mappings };
  logger.info('intake catalog seeded', result);
  return result;
}

module.exports = { seed, seedManualCoverage, familyDocName };

if (require.main === module) {
  db.init().then(seed).then((s) => { console.log('seedIntakeCatalog:', JSON.stringify(s)); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
