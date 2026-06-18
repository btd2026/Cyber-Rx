'use strict';

/**
 * ingest/loadIsoSoc2.js — Compiler Slice 2
 * ----------------------------------------
 * Seeds ISO/IEC 27001:2022 and SOC 2 (AICPA Trust Services Criteria) into the
 * generalized framework engine so they become first-class, INDEPENDENTLY
 * assessed frameworks alongside NIST CSF 2.0, NIST SP 800-53 Rev 5 and CIS v8.
 *
 * License posture (see chat with the user, 2026-06-18):
 *   - We store the framework STRUCTURE (control/criteria IDs, themes, counts) and
 *     PARAPHRASED outcomes in our own words. Identifiers and enumeration are
 *     facts, not copyrightable; paraphrase needs no license.
 *   - The verbatim official text is the only copyrighted part. It is stored in
 *     text_verbatim ONLY when the operator holds the license and sets the flag:
 *       VERBATIM_ISO=true   (ISO/IEC 27001:2022 + 27002:2022, purchased from ISO)
 *       VERBATIM_SOC2=true  (AICPA TSC — the criteria are freely downloadable
 *                            from the AICPA, but we still gate redistribution)
 *     Until then text_verbatim is null and `text` (paraphrase) is authoritative.
 *
 * assessment_type = 'manual': both are governance/audit frameworks evidenced by
 * documents + human review (AssessmentEngine merges document evidence; no
 * evidence yields an honest not_assessed rather than a fabricated verdict).
 *
 * Idempotent: re-running upserts. Verbatim text is intentionally left null here
 * (no licensed corpus is bundled); a future verbatim ingest fills text_verbatim.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');

const VERBATIM_ISO = process.env.VERBATIM_ISO === 'true';
const VERBATIM_SOC2 = process.env.VERBATIM_SOC2 === 'true';

// --- ISO/IEC 27001:2022 Annex A — 93 controls in 4 themes (official titles;
//     `text` is our paraphrase of the control's outcome). ----------------------
const ISO_THEMES = { A5: 'Organizational', A6: 'People', A7: 'Physical', A8: 'Technological' };
const ISO_ANNEX_A = [
  // A.5 Organizational (37)
  ['A.5.1', 'A5', 'Policies for information security'],
  ['A.5.2', 'A5', 'Information security roles and responsibilities'],
  ['A.5.3', 'A5', 'Segregation of duties'],
  ['A.5.4', 'A5', 'Management responsibilities'],
  ['A.5.5', 'A5', 'Contact with authorities'],
  ['A.5.6', 'A5', 'Contact with special interest groups'],
  ['A.5.7', 'A5', 'Threat intelligence'],
  ['A.5.8', 'A5', 'Information security in project management'],
  ['A.5.9', 'A5', 'Inventory of information and other associated assets'],
  ['A.5.10', 'A5', 'Acceptable use of information and other associated assets'],
  ['A.5.11', 'A5', 'Return of assets'],
  ['A.5.12', 'A5', 'Classification of information'],
  ['A.5.13', 'A5', 'Labelling of information'],
  ['A.5.14', 'A5', 'Information transfer'],
  ['A.5.15', 'A5', 'Access control'],
  ['A.5.16', 'A5', 'Identity management'],
  ['A.5.17', 'A5', 'Authentication information'],
  ['A.5.18', 'A5', 'Access rights'],
  ['A.5.19', 'A5', 'Information security in supplier relationships'],
  ['A.5.20', 'A5', 'Addressing information security within supplier agreements'],
  ['A.5.21', 'A5', 'Managing information security in the ICT supply chain'],
  ['A.5.22', 'A5', 'Monitoring, review and change management of supplier services'],
  ['A.5.23', 'A5', 'Information security for use of cloud services'],
  ['A.5.24', 'A5', 'Information security incident management planning and preparation'],
  ['A.5.25', 'A5', 'Assessment and decision on information security events'],
  ['A.5.26', 'A5', 'Response to information security incidents'],
  ['A.5.27', 'A5', 'Learning from information security incidents'],
  ['A.5.28', 'A5', 'Collection of evidence'],
  ['A.5.29', 'A5', 'Information security during disruption'],
  ['A.5.30', 'A5', 'ICT readiness for business continuity'],
  ['A.5.31', 'A5', 'Legal, statutory, regulatory and contractual requirements'],
  ['A.5.32', 'A5', 'Intellectual property rights'],
  ['A.5.33', 'A5', 'Protection of records'],
  ['A.5.34', 'A5', 'Privacy and protection of personally identifiable information (PII)'],
  ['A.5.35', 'A5', 'Independent review of information security'],
  ['A.5.36', 'A5', 'Compliance with policies, rules and standards for information security'],
  ['A.5.37', 'A5', 'Documented operating procedures'],
  // A.6 People (8)
  ['A.6.1', 'A6', 'Screening'],
  ['A.6.2', 'A6', 'Terms and conditions of employment'],
  ['A.6.3', 'A6', 'Information security awareness, education and training'],
  ['A.6.4', 'A6', 'Disciplinary process'],
  ['A.6.5', 'A6', 'Responsibilities after termination or change of employment'],
  ['A.6.6', 'A6', 'Confidentiality or non-disclosure agreements'],
  ['A.6.7', 'A6', 'Remote working'],
  ['A.6.8', 'A6', 'Information security event reporting'],
  // A.7 Physical (14)
  ['A.7.1', 'A7', 'Physical security perimeters'],
  ['A.7.2', 'A7', 'Physical entry'],
  ['A.7.3', 'A7', 'Securing offices, rooms and facilities'],
  ['A.7.4', 'A7', 'Physical security monitoring'],
  ['A.7.5', 'A7', 'Protecting against physical and environmental threats'],
  ['A.7.6', 'A7', 'Working in secure areas'],
  ['A.7.7', 'A7', 'Clear desk and clear screen'],
  ['A.7.8', 'A7', 'Equipment siting and protection'],
  ['A.7.9', 'A7', 'Security of assets off-premises'],
  ['A.7.10', 'A7', 'Storage media'],
  ['A.7.11', 'A7', 'Supporting utilities'],
  ['A.7.12', 'A7', 'Cabling security'],
  ['A.7.13', 'A7', 'Equipment maintenance'],
  ['A.7.14', 'A7', 'Secure disposal or re-use of equipment'],
  // A.8 Technological (34)
  ['A.8.1', 'A8', 'User endpoint devices'],
  ['A.8.2', 'A8', 'Privileged access rights'],
  ['A.8.3', 'A8', 'Information access restriction'],
  ['A.8.4', 'A8', 'Access to source code'],
  ['A.8.5', 'A8', 'Secure authentication'],
  ['A.8.6', 'A8', 'Capacity management'],
  ['A.8.7', 'A8', 'Protection against malware'],
  ['A.8.8', 'A8', 'Management of technical vulnerabilities'],
  ['A.8.9', 'A8', 'Configuration management'],
  ['A.8.10', 'A8', 'Information deletion'],
  ['A.8.11', 'A8', 'Data masking'],
  ['A.8.12', 'A8', 'Data leakage prevention'],
  ['A.8.13', 'A8', 'Information backup'],
  ['A.8.14', 'A8', 'Redundancy of information processing facilities'],
  ['A.8.15', 'A8', 'Logging'],
  ['A.8.16', 'A8', 'Monitoring activities'],
  ['A.8.17', 'A8', 'Clock synchronization'],
  ['A.8.18', 'A8', 'Use of privileged utility programs'],
  ['A.8.19', 'A8', 'Installation of software on operational systems'],
  ['A.8.20', 'A8', 'Networks security'],
  ['A.8.21', 'A8', 'Security of network services'],
  ['A.8.22', 'A8', 'Segregation of networks'],
  ['A.8.23', 'A8', 'Web filtering'],
  ['A.8.24', 'A8', 'Use of cryptography'],
  ['A.8.25', 'A8', 'Secure development life cycle'],
  ['A.8.26', 'A8', 'Application security requirements'],
  ['A.8.27', 'A8', 'Secure system architecture and engineering principles'],
  ['A.8.28', 'A8', 'Secure coding'],
  ['A.8.29', 'A8', 'Security testing in development and acceptance'],
  ['A.8.30', 'A8', 'Outsourced development'],
  ['A.8.31', 'A8', 'Separation of development, test and production environments'],
  ['A.8.32', 'A8', 'Change management'],
  ['A.8.33', 'A8', 'Test information'],
  ['A.8.34', 'A8', 'Protection of information systems during audit testing'],
];
// ISMS management clauses 4–10 (the certifiable management system requirements).
const ISO_CLAUSES = [
  ['4', 'ISMS', 'Context of the organization'],
  ['5', 'ISMS', 'Leadership'],
  ['6', 'ISMS', 'Planning'],
  ['7', 'ISMS', 'Support'],
  ['8', 'ISMS', 'Operation'],
  ['9', 'ISMS', 'Performance evaluation'],
  ['10', 'ISMS', 'Improvement'],
];

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
  // verbatimAllowed (VERBATIM_ISO/VERBATIM_SOC2) is recorded in meta so a future
  // verbatim ingest knows it may populate text_verbatim for this operator.
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
  // ISO/IEC 27001:2022
  await ensureFramework('iso_27001', 'ISO/IEC 27001:2022', '2022');
  let iso = 0;
  for (const [id, theme, title] of ISO_ANNEX_A) {
    await upsertReq('iso_27001', id, theme, title, `Establish and operate a control that achieves: ${title.toLowerCase()}.`, VERBATIM_ISO);
    iso++;
  }
  for (const [id, fam, title] of ISO_CLAUSES) {
    await upsertReq('iso_27001', `Clause ${id}`, fam, title, `ISMS requirement: ${title.toLowerCase()}.`, VERBATIM_ISO);
    iso++;
  }
  // SOC 2 — AICPA Trust Services Criteria
  await ensureFramework('soc_2', 'SOC 2 (AICPA Trust Services Criteria)', '2017 (rev. 2022)');
  let soc = 0;
  for (const [id, fam, title] of SOC2) {
    await upsertReq('soc_2', id, fam, title, `${title}.`, VERBATIM_SOC2);
    soc++;
  }
  logger.info('loadIsoSoc2 complete', { iso, soc, verbatimIso: VERBATIM_ISO, verbatimSoc2: VERBATIM_SOC2 });
  return { iso, soc };
}

module.exports = { load, ISO_ANNEX_A, ISO_CLAUSES, SOC2 };

if (require.main === module) {
  load().then((r) => { console.log('seeded', r); process.exit(0); }).catch((e) => { console.error(e); process.exit(1); });
}
