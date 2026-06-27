'use strict';

/**
 * ingest/loadIsoSoc2.js — Compiler Slice 2
 * ----------------------------------------
 * Seeds SOC 2 (AICPA Trust Services Criteria) into the generalized framework
 * engine so it becomes a first-class, INDEPENDENTLY assessed framework alongside
 * NIST CSF 2.0 and NIST SP 800-53 Rev 5.
 *
 * License posture (see chat with the user, 2026-06-18):
 *   - We store the framework STRUCTURE (criteria IDs, themes, counts) and
 *     PARAPHRASED outcomes in our own words. Identifiers and enumeration are
 *     facts, not copyrightable; paraphrase needs no license.
 *   - The verbatim official text is the only copyrighted part. It is stored in
 *     text_verbatim ONLY when the operator holds the license and sets the flag:
 *       VERBATIM_SOC2=true  (AICPA TSC — the criteria are freely downloadable
 *                            from the AICPA, but we still gate redistribution)
 *     Until then text_verbatim is null and `text` (paraphrase) is authoritative.
 *
 * assessment_type = 'manual': a governance/audit framework evidenced by
 * documents + human review (AssessmentEngine merges document evidence; no
 * evidence yields an honest not_assessed rather than a fabricated verdict).
 *
 * Idempotent: re-running upserts. Verbatim text is intentionally left null here
 * (no licensed corpus is bundled); a future verbatim ingest fills text_verbatim.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');

const VERBATIM_SOC2 = process.env.VERBATIM_SOC2 === 'true';

// --- SOC 2 — AICPA Trust Services Criteria (CC = common criteria, mandatory in
//     every SOC 2; A/C/PI/P = additional category criteria). `text` paraphrased.
const SOC2 = [
  // CC1 Control Environment
  ['CC1.1', 'CC1', 'Demonstrates commitment to integrity and ethical values'],
  ['CC1.2', 'CC1', 'Board exercises oversight responsibility, independent of management'],
  ['CC1.3', 'CC1', 'Establishes structures, reporting lines, authorities and responsibilities'],
  ['CC1.4', 'CC1', 'Demonstrates commitment to attract, develop and retain competent individuals'],
  ['CC1.5', 'CC1', 'Holds individuals accountable for their internal control responsibilities'],
  // CC2 Communication and Information
  ['CC2.1', 'CC2', 'Uses relevant, quality information to support internal control'],
  ['CC2.2', 'CC2', 'Internally communicates objectives and responsibilities for internal control'],
  ['CC2.3', 'CC2', 'Communicates with external parties on matters affecting internal control'],
  // CC3 Risk Assessment
  ['CC3.1', 'CC3', 'Specifies objectives clearly enough to identify and assess risk'],
  ['CC3.2', 'CC3', 'Identifies and analyzes risk to the achievement of objectives'],
  ['CC3.3', 'CC3', 'Considers the potential for fraud when assessing risk'],
  ['CC3.4', 'CC3', 'Identifies and assesses changes that could impact internal control'],
  // CC4 Monitoring Activities
  ['CC4.1', 'CC4', 'Selects, develops and performs ongoing and separate control evaluations'],
  ['CC4.2', 'CC4', 'Evaluates and communicates control deficiencies on a timely basis'],
  // CC5 Control Activities
  ['CC5.1', 'CC5', 'Selects and develops control activities that mitigate risk'],
  ['CC5.2', 'CC5', 'Selects and develops general control activities over technology'],
  ['CC5.3', 'CC5', 'Deploys control activities through policies and procedures'],
  // CC6 Logical and Physical Access Controls
  ['CC6.1', 'CC6', 'Implements logical access security over protected information assets'],
  ['CC6.2', 'CC6', 'Registers and authorizes new users; removes access when no longer required'],
  ['CC6.3', 'CC6', 'Manages access based on roles and least privilege, with segregation of duties'],
  ['CC6.4', 'CC6', 'Restricts physical access to facilities and protected information assets'],
  ['CC6.5', 'CC6', 'Removes data and software before discontinuing protections over assets'],
  ['CC6.6', 'CC6', 'Implements controls to protect against threats from outside the boundary'],
  ['CC6.7', 'CC6', 'Restricts and protects information in transit, movement and removal'],
  ['CC6.8', 'CC6', 'Prevents or detects and acts on unauthorized or malicious software'],
  // CC7 System Operations
  ['CC7.1', 'CC7', 'Detects and monitors configuration changes and new vulnerabilities'],
  ['CC7.2', 'CC7', 'Monitors components for anomalies indicative of malicious acts or incidents'],
  ['CC7.3', 'CC7', 'Evaluates security events to determine whether they are incidents'],
  ['CC7.4', 'CC7', 'Responds to identified security incidents through a defined program'],
  ['CC7.5', 'CC7', 'Recovers from identified security incidents'],
  // CC8 Change Management
  ['CC8.1', 'CC8', 'Authorizes, designs, develops, tests, approves and implements changes'],
  // CC9 Risk Mitigation
  ['CC9.1', 'CC9', 'Identifies and develops risk mitigation for business disruptions'],
  ['CC9.2', 'CC9', 'Assesses and manages risk associated with vendors and business partners'],
  // Availability
  ['A1.1', 'A', 'Maintains and monitors processing capacity and use of resources'],
  ['A1.2', 'A', 'Implements backup, recovery and environmental protections'],
  ['A1.3', 'A', 'Tests recovery plan procedures supporting system recovery'],
  // Confidentiality
  ['C1.1', 'C', 'Identifies and maintains confidential information to meet objectives'],
  ['C1.2', 'C', 'Disposes of confidential information to meet objectives'],
  // Processing Integrity
  ['PI1.1', 'PI', 'Obtains or generates quality information about processing objectives'],
  ['PI1.2', 'PI', 'Implements policies and procedures over system inputs'],
  ['PI1.3', 'PI', 'Implements policies and procedures over processing'],
  ['PI1.4', 'PI', 'Implements policies and procedures to make outputs available per objectives'],
  ['PI1.5', 'PI', 'Stores inputs, items in process and outputs completely and accurately'],
  // Privacy (representative set across the P1–P8 series)
  ['P1.1', 'P', 'Provides notice about its privacy practices'],
  ['P2.1', 'P', 'Communicates choices and obtains consent for personal information'],
  ['P3.1', 'P', 'Collects personal information consistent with objectives'],
  ['P3.2', 'P', 'Obtains explicit consent for sensitive personal information'],
  ['P4.1', 'P', 'Uses personal information consistent with objectives and consent'],
  ['P4.2', 'P', 'Retains personal information consistent with objectives'],
  ['P4.3', 'P', 'Disposes of personal information to meet objectives'],
  ['P5.1', 'P', 'Provides data subjects access to their personal information'],
  ['P5.2', 'P', 'Corrects, amends or deletes personal information on request'],
  ['P6.1', 'P', 'Discloses personal information only with consent'],
  ['P7.1', 'P', 'Collects and maintains accurate, complete and relevant personal information'],
  ['P8.1', 'P', 'Handles privacy-related inquiries, complaints and disputes'],
];

async function ensureFramework(id, name, version) {
  await db.query(
    `INSERT INTO frameworks (id, name, version, provenance) VALUES ($1,$2,$3,$4)
     ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, version=EXCLUDED.version`,
    [id, name, version, 'paraphrase']);
}

async function upsertReq(frameworkId, requirementId, family, title, paraphrase, verbatimAllowed) {
  // No licensed verbatim corpus is bundled, so text_verbatim is always null here.
  // verbatimAllowed (VERBATIM_SOC2) is recorded in meta so a future verbatim
  // ingest knows it may populate text_verbatim for this operator.
  await db.query(
    `INSERT INTO framework_requirements
       (framework_id, requirement_id, parent_id, family, title, text, text_verbatim, assessment_type, meta)
     VALUES ($1,$2,$3,$4,$5,$6,NULL,'manual',$7)
     ON CONFLICT (framework_id, requirement_id) DO UPDATE SET
       family=EXCLUDED.family, title=EXCLUDED.title, text=EXCLUDED.text,
       assessment_type=EXCLUDED.assessment_type, meta=EXCLUDED.meta`,
    [frameworkId, requirementId, null, family, title, paraphrase,
      JSON.stringify({ paraphrased: true, verbatim_available: false, verbatim_licensed: !!verbatimAllowed })]);
}

async function load() {
  // SOC 2 — AICPA Trust Services Criteria
  await ensureFramework('soc_2', 'SOC 2 (AICPA Trust Services Criteria)', '2017 (rev. 2022)');
  let soc = 0;
  for (const [id, fam, title] of SOC2) {
    await upsertReq('soc_2', id, fam, title, `${title}.`, VERBATIM_SOC2);
    soc++;
  }
  logger.info('loadIsoSoc2 complete', { soc, verbatimSoc2: VERBATIM_SOC2 });
  return { soc };
}

module.exports = { load, SOC2 };

if (require.main === module) {
  load().then((r) => { console.log('seeded', r); process.exit(0); }).catch((e) => { console.error(e); process.exit(1); });
}
