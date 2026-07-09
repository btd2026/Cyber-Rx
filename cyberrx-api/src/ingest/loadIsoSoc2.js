'use strict';

/**
 * ingest/loadIsoSoc2.js — SOC 2 framework structure seed.
 * ------------------------------------------------------
 * Seeds SOC 2 (AICPA Trust Services Criteria) into the generalized framework
 * engine as a first-class, INDEPENDENTLY assessed framework.
 *
 * COPYRIGHT-SAFE: we store only the criteria IDs (facts) and SHORT NERION-AUTHORED
 * labels — NOT the official AICPA TSC wording and NOT a paraphrase/summary of it.
 * No official text is bundled. A customer who has licensed the AICPA text may
 * upload it; it is stored TENANT-ONLY via native/tenantFrameworkContent and is
 * never copied into product defaults, seeds, templates, or other tenants.
 *
 * assessment_type = 'manual': a governance/audit framework evidenced by documents +
 * telemetry; no evidence yields an honest not_assessed, never a fabricated verdict.
 * Idempotent: re-running upserts.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');

// SOC 2 criteria — [id, family, NERION-AUTHORED label]. IDs are facts; labels are
// Nerion's own short functional descriptions, never the official AICPA TSC text.
const SOC2 = [
  ['CC1.1', 'CC1', 'Ethics & integrity program'],
  ['CC1.2', 'CC1', 'Board / governance oversight'],
  ['CC1.3', 'CC1', 'Roles, authority & reporting lines'],
  ['CC1.4', 'CC1', 'Workforce competence'],
  ['CC1.5', 'CC1', 'Accountability enforcement'],
  ['CC2.1', 'CC2', 'Quality of security information'],
  ['CC2.2', 'CC2', 'Internal security communication'],
  ['CC2.3', 'CC2', 'External security communication'],
  ['CC3.1', 'CC3', 'Risk objectives set'],
  ['CC3.2', 'CC3', 'Risk identification & analysis'],
  ['CC3.3', 'CC3', 'Fraud risk considered'],
  ['CC3.4', 'CC3', 'Change-driven risk'],
  ['CC4.1', 'CC4', 'Ongoing & periodic evaluation'],
  ['CC4.2', 'CC4', 'Deficiency handling'],
  ['CC5.1', 'CC5', 'Control selection'],
  ['CC5.2', 'CC5', 'Technology general controls'],
  ['CC5.3', 'CC5', 'Policies & procedures'],
  ['CC6.1', 'CC6', 'Logical access controls'],
  ['CC6.2', 'CC6', 'User provisioning & authorization'],
  ['CC6.3', 'CC6', 'Least-privilege / RBAC'],
  ['CC6.4', 'CC6', 'Physical access restriction'],
  ['CC6.5', 'CC6', 'Asset & media disposal'],
  ['CC6.6', 'CC6', 'External threat protection'],
  ['CC6.7', 'CC6', 'Data-in-transit controls'],
  ['CC6.8', 'CC6', 'Malware prevention'],
  ['CC7.1', 'CC7', 'Vulnerability & config detection'],
  ['CC7.2', 'CC7', 'Anomaly monitoring'],
  ['CC7.3', 'CC7', 'Security event evaluation'],
  ['CC7.4', 'CC7', 'Incident response'],
  ['CC7.5', 'CC7', 'Incident recovery'],
  ['CC8.1', 'CC8', 'Change authorization & testing'],
  ['CC9.1', 'CC9', 'Risk mitigation activities'],
  ['CC9.2', 'CC9', 'Vendor / partner risk'],
  ['A1.1', 'A', 'Capacity management'],
  ['A1.2', 'A', 'Environmental & backup resilience'],
  ['A1.3', 'A', 'Recovery testing'],
  ['C1.1', 'C', 'Confidential data identification'],
  ['C1.2', 'C', 'Confidential data disposal'],
  ['PI1.1', 'PI', 'Processing definitions'],
  ['PI1.2', 'PI', 'Input accuracy'],
  ['PI1.3', 'PI', 'Processing accuracy'],
  ['PI1.4', 'PI', 'Output accuracy'],
  ['PI1.5', 'PI', 'Storage accuracy'],
  ['P1.1', 'P', 'Privacy notice'],
  ['P2.1', 'P', 'Choice & consent'],
  ['P3.1', 'P', 'Collection limits'],
  ['P3.2', 'P', 'Sensitive-data consent'],
  ['P4.1', 'P', 'Purpose limitation'],
  ['P4.2', 'P', 'Retention limits'],
  ['P4.3', 'P', 'Personal-data disposal'],
  ['P5.1', 'P', 'Data-subject access'],
  ['P5.2', 'P', 'Data-subject correction'],
  ['P6.1', 'P', 'Third-party disclosure control'],
  ['P7.1', 'P', 'Data quality'],
  ['P8.1', 'P', 'Privacy monitoring & complaints'],
];

async function ensureFramework(id, name, version) {
  await db.query(
    `INSERT INTO frameworks (id, name, version, provenance) VALUES ($1,$2,$3,$4)
     ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, version=EXCLUDED.version, provenance=EXCLUDED.provenance`,
    [id, name, version, 'nerion-authored']);
}

async function upsertReq(frameworkId, requirementId, family, label) {
  // Store the ID + Nerion label. No official/verbatim text is ever bundled here;
  // licensed official text lives tenant-only in native/tenantFrameworkContent.
  await db.query(
    `INSERT INTO framework_requirements
       (framework_id, requirement_id, parent_id, family, title, text, text_verbatim, assessment_type, meta)
     VALUES ($1,$2,$3,$4,$5,$6,NULL,'manual',$7)
     ON CONFLICT (framework_id, requirement_id) DO UPDATE SET
       family=EXCLUDED.family, title=EXCLUDED.title, text=EXCLUDED.text,
       assessment_type=EXCLUDED.assessment_type, meta=EXCLUDED.meta`,
    [frameworkId, requirementId, null, family, label, label,
      JSON.stringify({ source_type: 'Nerion-authored assessment logic', official_text_stored: false, official_text_displayed: false, license_required_for_official_text: true, customer_licensed_content_allowed: true, tenant_only_customer_content: true })]);
}

async function load() {
  await ensureFramework('soc_2', 'SOC 2 (AICPA Trust Services Criteria)', '2017 (rev. 2022)');
  let soc = 0;
  for (const [id, fam, label] of SOC2) { await upsertReq('soc_2', id, fam, label); soc++; }
  logger.info('loadIsoSoc2 complete', { soc, note: 'Nerion-authored labels only; no official/paraphrased AICPA text bundled' });
  return { soc };
}

module.exports = { load, SOC2 };

if (require.main === module) {
  load().then((r) => { console.log('seeded', r); process.exit(0); }).catch((e) => { console.error(e); process.exit(1); });
}
