'use strict';

/**
 * ingest/loadHipaaHitrust.js — Onboarding redesign, Step 2 (Control Library)
 * --------------------------------------------------------------------------
 * Seeds the two frameworks that were still missing from the engine (CSF 2.0,
 * 800-53 r5 and SOC 2 already load elsewhere):
 *   - HIPAA Security Rule (45 CFR Part 164 Subpart C) — standards + their
 *     implementation specifications, with the Required/Addressable flag and the
 *     CFR citation preserved in meta.
 *   - HITRUST CSF — the 14 canonical control categories.
 *
 * License posture: identifiers, CFR citations and enumeration are facts (not
 * copyrightable). `text` is our own paraphrase of each control's outcome. No
 * verbatim corpus is bundled. HIPAA Security Rule text is public domain (US
 * federal regulation); HITRUST category names are factual references.
 *
 * assessment_type = 'manual': both are governance/audit frameworks evidenced by
 * documents + human review (AssessmentEngine yields an honest not_assessed when
 * no evidence exists rather than fabricating a verdict).
 *
 * Idempotent: re-running upserts (mirrors ingest/loadIsoSoc2.js).
 */

const db = require('../utils/db');
const logger = require('../utils/logger');

// --- HIPAA Security Rule (45 CFR §164.308 / .310 / .312 / .314 / .316) --------
// Each row: [requirementId, family, title, kind, citation, parentId]
//   kind: 'standard' | 'R' (required impl spec) | 'A' (addressable impl spec)
const HIPAA_FAMILIES = {
  ADM: 'Administrative Safeguards (§164.308)',
  PHY: 'Physical Safeguards (§164.310)',
  TEC: 'Technical Safeguards (§164.312)',
  ORG: 'Organizational Requirements (§164.314)',
  DOC: 'Policies, Procedures & Documentation (§164.316)',
};

const HIPAA = [
  // §164.308 Administrative safeguards
  ['164.308(a)(1)(i)', 'ADM', 'Security Management Process', 'standard', '45 CFR 164.308(a)(1)(i)', null],
  ['164.308(a)(1)(ii)(A)', 'ADM', 'Risk Analysis', 'R', '45 CFR 164.308(a)(1)(ii)(A)', '164.308(a)(1)(i)'],
  ['164.308(a)(1)(ii)(B)', 'ADM', 'Risk Management', 'R', '45 CFR 164.308(a)(1)(ii)(B)', '164.308(a)(1)(i)'],
  ['164.308(a)(1)(ii)(C)', 'ADM', 'Sanction Policy', 'R', '45 CFR 164.308(a)(1)(ii)(C)', '164.308(a)(1)(i)'],
  ['164.308(a)(1)(ii)(D)', 'ADM', 'Information System Activity Review', 'R', '45 CFR 164.308(a)(1)(ii)(D)', '164.308(a)(1)(i)'],
  ['164.308(a)(2)', 'ADM', 'Assigned Security Responsibility', 'standard', '45 CFR 164.308(a)(2)', null],
  ['164.308(a)(3)(i)', 'ADM', 'Workforce Security', 'standard', '45 CFR 164.308(a)(3)(i)', null],
  ['164.308(a)(3)(ii)(A)', 'ADM', 'Authorization and/or Supervision', 'A', '45 CFR 164.308(a)(3)(ii)(A)', '164.308(a)(3)(i)'],
  ['164.308(a)(3)(ii)(B)', 'ADM', 'Workforce Clearance Procedure', 'A', '45 CFR 164.308(a)(3)(ii)(B)', '164.308(a)(3)(i)'],
  ['164.308(a)(3)(ii)(C)', 'ADM', 'Termination Procedures', 'A', '45 CFR 164.308(a)(3)(ii)(C)', '164.308(a)(3)(i)'],
  ['164.308(a)(4)(i)', 'ADM', 'Information Access Management', 'standard', '45 CFR 164.308(a)(4)(i)', null],
  ['164.308(a)(4)(ii)(A)', 'ADM', 'Isolating Health Care Clearinghouse Functions', 'R', '45 CFR 164.308(a)(4)(ii)(A)', '164.308(a)(4)(i)'],
  ['164.308(a)(4)(ii)(B)', 'ADM', 'Access Authorization', 'A', '45 CFR 164.308(a)(4)(ii)(B)', '164.308(a)(4)(i)'],
  ['164.308(a)(4)(ii)(C)', 'ADM', 'Access Establishment and Modification', 'A', '45 CFR 164.308(a)(4)(ii)(C)', '164.308(a)(4)(i)'],
  ['164.308(a)(5)(i)', 'ADM', 'Security Awareness and Training', 'standard', '45 CFR 164.308(a)(5)(i)', null],
  ['164.308(a)(5)(ii)(A)', 'ADM', 'Security Reminders', 'A', '45 CFR 164.308(a)(5)(ii)(A)', '164.308(a)(5)(i)'],
  ['164.308(a)(5)(ii)(B)', 'ADM', 'Protection from Malicious Software', 'A', '45 CFR 164.308(a)(5)(ii)(B)', '164.308(a)(5)(i)'],
  ['164.308(a)(5)(ii)(C)', 'ADM', 'Log-in Monitoring', 'A', '45 CFR 164.308(a)(5)(ii)(C)', '164.308(a)(5)(i)'],
  ['164.308(a)(5)(ii)(D)', 'ADM', 'Password Management', 'A', '45 CFR 164.308(a)(5)(ii)(D)', '164.308(a)(5)(i)'],
  ['164.308(a)(6)(i)', 'ADM', 'Security Incident Procedures', 'standard', '45 CFR 164.308(a)(6)(i)', null],
  ['164.308(a)(6)(ii)', 'ADM', 'Response and Reporting', 'R', '45 CFR 164.308(a)(6)(ii)', '164.308(a)(6)(i)'],
  ['164.308(a)(7)(i)', 'ADM', 'Contingency Plan', 'standard', '45 CFR 164.308(a)(7)(i)', null],
  ['164.308(a)(7)(ii)(A)', 'ADM', 'Data Backup Plan', 'R', '45 CFR 164.308(a)(7)(ii)(A)', '164.308(a)(7)(i)'],
  ['164.308(a)(7)(ii)(B)', 'ADM', 'Disaster Recovery Plan', 'R', '45 CFR 164.308(a)(7)(ii)(B)', '164.308(a)(7)(i)'],
  ['164.308(a)(7)(ii)(C)', 'ADM', 'Emergency Mode Operation Plan', 'R', '45 CFR 164.308(a)(7)(ii)(C)', '164.308(a)(7)(i)'],
  ['164.308(a)(7)(ii)(D)', 'ADM', 'Testing and Revision Procedures', 'A', '45 CFR 164.308(a)(7)(ii)(D)', '164.308(a)(7)(i)'],
  ['164.308(a)(7)(ii)(E)', 'ADM', 'Applications and Data Criticality Analysis', 'A', '45 CFR 164.308(a)(7)(ii)(E)', '164.308(a)(7)(i)'],
  ['164.308(a)(8)', 'ADM', 'Evaluation', 'standard', '45 CFR 164.308(a)(8)', null],
  ['164.308(b)(1)', 'ADM', 'Business Associate Contracts and Other Arrangements', 'standard', '45 CFR 164.308(b)(1)', null],
  ['164.308(b)(4)', 'ADM', 'Written Contract or Other Arrangement', 'R', '45 CFR 164.308(b)(4)', '164.308(b)(1)'],
  // §164.310 Physical safeguards
  ['164.310(a)(1)', 'PHY', 'Facility Access Controls', 'standard', '45 CFR 164.310(a)(1)', null],
  ['164.310(a)(2)(i)', 'PHY', 'Contingency Operations', 'A', '45 CFR 164.310(a)(2)(i)', '164.310(a)(1)'],
  ['164.310(a)(2)(ii)', 'PHY', 'Facility Security Plan', 'A', '45 CFR 164.310(a)(2)(ii)', '164.310(a)(1)'],
  ['164.310(a)(2)(iii)', 'PHY', 'Access Control and Validation Procedures', 'A', '45 CFR 164.310(a)(2)(iii)', '164.310(a)(1)'],
  ['164.310(a)(2)(iv)', 'PHY', 'Maintenance Records', 'A', '45 CFR 164.310(a)(2)(iv)', '164.310(a)(1)'],
  ['164.310(b)', 'PHY', 'Workstation Use', 'standard', '45 CFR 164.310(b)', null],
  ['164.310(c)', 'PHY', 'Workstation Security', 'standard', '45 CFR 164.310(c)', null],
  ['164.310(d)(1)', 'PHY', 'Device and Media Controls', 'standard', '45 CFR 164.310(d)(1)', null],
  ['164.310(d)(2)(i)', 'PHY', 'Disposal', 'R', '45 CFR 164.310(d)(2)(i)', '164.310(d)(1)'],
  ['164.310(d)(2)(ii)', 'PHY', 'Media Re-use', 'R', '45 CFR 164.310(d)(2)(ii)', '164.310(d)(1)'],
  ['164.310(d)(2)(iii)', 'PHY', 'Accountability', 'A', '45 CFR 164.310(d)(2)(iii)', '164.310(d)(1)'],
  ['164.310(d)(2)(iv)', 'PHY', 'Data Backup and Storage', 'A', '45 CFR 164.310(d)(2)(iv)', '164.310(d)(1)'],
  // §164.312 Technical safeguards
  ['164.312(a)(1)', 'TEC', 'Access Control', 'standard', '45 CFR 164.312(a)(1)', null],
  ['164.312(a)(2)(i)', 'TEC', 'Unique User Identification', 'R', '45 CFR 164.312(a)(2)(i)', '164.312(a)(1)'],
  ['164.312(a)(2)(ii)', 'TEC', 'Emergency Access Procedure', 'R', '45 CFR 164.312(a)(2)(ii)', '164.312(a)(1)'],
  ['164.312(a)(2)(iii)', 'TEC', 'Automatic Logoff', 'A', '45 CFR 164.312(a)(2)(iii)', '164.312(a)(1)'],
  ['164.312(a)(2)(iv)', 'TEC', 'Encryption and Decryption', 'A', '45 CFR 164.312(a)(2)(iv)', '164.312(a)(1)'],
  ['164.312(b)', 'TEC', 'Audit Controls', 'standard', '45 CFR 164.312(b)', null],
  ['164.312(c)(1)', 'TEC', 'Integrity', 'standard', '45 CFR 164.312(c)(1)', null],
  ['164.312(c)(2)', 'TEC', 'Mechanism to Authenticate Electronic PHI', 'A', '45 CFR 164.312(c)(2)', '164.312(c)(1)'],
  ['164.312(d)', 'TEC', 'Person or Entity Authentication', 'standard', '45 CFR 164.312(d)', null],
  ['164.312(e)(1)', 'TEC', 'Transmission Security', 'standard', '45 CFR 164.312(e)(1)', null],
  ['164.312(e)(2)(i)', 'TEC', 'Integrity Controls', 'A', '45 CFR 164.312(e)(2)(i)', '164.312(e)(1)'],
  ['164.312(e)(2)(ii)', 'TEC', 'Encryption', 'A', '45 CFR 164.312(e)(2)(ii)', '164.312(e)(1)'],
  // §164.314 Organizational requirements
  ['164.314(a)(1)', 'ORG', 'Business Associate Contracts or Other Arrangements', 'standard', '45 CFR 164.314(a)(1)', null],
  ['164.314(b)(1)', 'ORG', 'Requirements for Group Health Plans', 'standard', '45 CFR 164.314(b)(1)', null],
  // §164.316 Policies and procedures and documentation
  ['164.316(a)', 'DOC', 'Policies and Procedures', 'standard', '45 CFR 164.316(a)', null],
  ['164.316(b)(1)', 'DOC', 'Documentation', 'standard', '45 CFR 164.316(b)(1)', null],
  ['164.316(b)(2)(i)', 'DOC', 'Time Limit', 'R', '45 CFR 164.316(b)(2)(i)', '164.316(b)(1)'],
  ['164.316(b)(2)(ii)', 'DOC', 'Availability', 'R', '45 CFR 164.316(b)(2)(ii)', '164.316(b)(1)'],
  ['164.316(b)(2)(iii)', 'DOC', 'Updates', 'R', '45 CFR 164.316(b)(2)(iii)', '164.316(b)(1)'],
];

// --- HITRUST CSF — 14 canonical control categories ----------------------------
// Each row: [requirementId, family, title]
const HITRUST = [
  ['0.0', 'Program', 'Information Security Management Program'],
  ['01.0', 'Access Control', 'Access Control'],
  ['02.0', 'HR Security', 'Human Resources Security'],
  ['03.0', 'Risk Management', 'Risk Management'],
  ['04.0', 'Policy', 'Security Policy'],
  ['05.0', 'Organization', 'Organization of Information Security'],
  ['06.0', 'Compliance', 'Compliance'],
  ['07.0', 'Asset Management', 'Asset Management'],
  ['08.0', 'Physical', 'Physical and Environmental Security'],
  ['09.0', 'Operations', 'Communications and Operations Management'],
  ['10.0', 'SDLC', 'Information Systems Acquisition, Development and Maintenance'],
  ['11.0', 'Incident Mgmt', 'Information Security Incident Management'],
  ['12.0', 'Continuity', 'Business Continuity Management'],
  ['13.0', 'Privacy', 'Privacy Practices'],
];

async function ensureFramework(id, name, version, provenance) {
  await db.query(
    `INSERT INTO frameworks (id, name, version, provenance) VALUES ($1,$2,$3,$4)
     ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, version=EXCLUDED.version`,
    [id, name, version, provenance]);
}

async function upsertReq(frameworkId, requirementId, parentId, family, title, paraphrase, meta) {
  await db.query(
    `INSERT INTO framework_requirements
       (framework_id, requirement_id, parent_id, family, title, text, text_verbatim, assessment_type, meta)
     VALUES ($1,$2,$3,$4,$5,$6,NULL,'manual',$7)
     ON CONFLICT (framework_id, requirement_id) DO UPDATE SET
       parent_id=EXCLUDED.parent_id, family=EXCLUDED.family, title=EXCLUDED.title,
       text=EXCLUDED.text, assessment_type=EXCLUDED.assessment_type, meta=EXCLUDED.meta`,
    [frameworkId, requirementId, parentId, family, title, paraphrase, JSON.stringify(meta)]);
}

async function load() {
  // HIPAA Security Rule
  await ensureFramework('hipaa_security', 'HIPAA Security Rule (45 CFR Part 164 Subpart C)', '2013 Omnibus', 'US CFR');
  let hipaa = 0;
  for (const [id, fam, title, kind, citation, parent] of HIPAA) {
    const required = kind === 'standard' ? true : kind === 'R';
    const paraphrase = kind === 'standard'
      ? `Implement the ${title} standard to safeguard electronic protected health information.`
      : `Implementation specification (${kind === 'R' ? 'Required' : 'Addressable'}): ${title.toLowerCase()}.`;
    await upsertReq('hipaa_security', id, parent, HIPAA_FAMILIES[fam], title, paraphrase, {
      paraphrased: true, citation, spec_kind: kind, required,
    });
    hipaa++;
  }
  // HITRUST CSF control categories
  await ensureFramework('hitrust_csf', 'HITRUST CSF', 'v11', 'HITRUST');
  let hitrust = 0;
  for (const [id, fam, title] of HITRUST) {
    await upsertReq('hitrust_csf', id, null, fam, title, `HITRUST CSF control category: ${title.toLowerCase()}.`, {
      paraphrased: true, category: true,
    });
    hitrust++;
  }
  logger.info('loadHipaaHitrust complete', { hipaa, hitrust });
  return { hipaa, hitrust };
}

module.exports = { load, HIPAA, HITRUST, HIPAA_FAMILIES };

if (require.main === module) {
  load().then((r) => { console.log('seeded', r); process.exit(0); }).catch((e) => { console.error(e); process.exit(1); });
}
