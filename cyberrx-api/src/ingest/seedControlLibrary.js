'use strict';

/**
 * ingest/seedControlLibrary.js — Onboarding redesign, Step 2.
 * ----------------------------------------------------------
 * Seeds the framework-agnostic control_library + control_library_crosswalk.
 * Each library control is mapped to the canonical requirement IDs across the
 * seven onboarding frameworks, so one piece of evidence (a connector pull or an
 * uploaded policy) can score every in-scope framework at once.
 *
 * Crosswalk provenance is 'curated': mappings follow well-established public
 * references (NIST OLIR, CIS mappings, common ISO/SOC2/HIPAA crosswalks). Where a
 * mapping is a reasonable-but-imperfect fit, coverage is marked 'partial' so the
 * projection never over-claims. Idempotent: re-running replaces the crosswalk.
 *
 * Framework IDs match framework_requirements:
 *   nist_csf_2 · nist_800_53_r5 · cis_v8_1 · iso_27001 · soc_2 ·
 *   hipaa_security · hitrust_csf
 */

const db = require('../utils/db');
const logger = require('../utils/logger');

const SYS = 'system', DOC = 'documentation', HUM = 'human';

// id, domain, dimension, title, default_method, description, crosswalk{fw:[ids]}, partial{fw:[ids]}
const LIBRARY = [
  {
    id: 'CL-IAM-001', domain: 'Identity & Access', dimension: SYS, default_method: 'automated',
    title: 'Multi-factor authentication on remote and privileged access',
    description: 'MFA is enforced for remote access and for all privileged/administrative accounts.',
    x: {
      nist_csf_2: ['PR.AA-02', 'PR.AA-03'], nist_800_53_r5: ['IA-2(1)', 'IA-2(2)'],
      cis_v8_1: ['CIS 6.3', 'CIS 6.4', 'CIS 6.5'], iso_27001: ['A.8.5'], soc_2: ['CC6.1'],
      hipaa_security: ['164.312(d)'], hitrust_csf: ['01.0'],
    },
  },
  {
    id: 'CL-IAM-002', domain: 'Identity & Access', dimension: SYS, default_method: 'automated',
    title: 'Account lifecycle and least-privilege access management',
    description: 'Access is provisioned, reviewed and revoked on a least-privilege basis with timely deprovisioning.',
    x: {
      nist_csf_2: ['PR.AA-01', 'PR.AA-05'], nist_800_53_r5: ['AC-2', 'AC-6'],
      cis_v8_1: ['CIS 5.1', 'CIS 6.1', 'CIS 6.2', 'CIS 6.8'], iso_27001: ['A.5.15', 'A.5.18'],
      soc_2: ['CC6.2', 'CC6.3'], hipaa_security: ['164.308(a)(4)(i)', '164.312(a)(2)(i)'], hitrust_csf: ['01.0'],
    },
  },
  {
    id: 'CL-DAT-001', domain: 'Data Protection', dimension: SYS, default_method: 'automated',
    title: 'Encryption of data at rest and in transit',
    description: 'Sensitive data is encrypted at rest and in transit using strong, managed cryptography.',
    x: {
      nist_csf_2: ['PR.DS-01', 'PR.DS-02'], nist_800_53_r5: ['SC-8', 'SC-13', 'SC-28'],
      cis_v8_1: ['CIS 3.10', 'CIS 3.11'], iso_27001: ['A.8.24'], soc_2: ['CC6.7'],
      hipaa_security: ['164.312(a)(2)(iv)', '164.312(e)(2)(ii)'], hitrust_csf: ['09.0'],
    },
  },
  {
    id: 'CL-VUL-001', domain: 'Vulnerability Management', dimension: SYS, default_method: 'automated',
    title: 'Vulnerability scanning and timely remediation',
    description: 'Systems are scanned for vulnerabilities and remediated within risk-based timelines.',
    x: {
      nist_csf_2: ['ID.RA-01', 'PR.PS-02'], nist_800_53_r5: ['RA-5', 'SI-2'],
      cis_v8_1: ['CIS 7.1', 'CIS 7.3', 'CIS 7.4'], iso_27001: ['A.8.8'], soc_2: ['CC7.1'],
      hipaa_security: ['164.308(a)(1)(ii)(B)'], hitrust_csf: ['10.0'],
    },
  },
  {
    id: 'CL-LOG-001', domain: 'Detection & Monitoring', dimension: SYS, default_method: 'automated',
    title: 'Audit logging and security monitoring',
    description: 'Security-relevant events are logged centrally, retained, and monitored for anomalies.',
    x: {
      nist_csf_2: ['DE.CM-01', 'DE.AE-03'], nist_800_53_r5: ['AU-2', 'AU-6', 'SI-4'],
      cis_v8_1: ['CIS 8.2', 'CIS 8.5', 'CIS 8.11'], iso_27001: ['A.8.15', 'A.8.16'], soc_2: ['CC7.2'],
      hipaa_security: ['164.312(b)', '164.308(a)(1)(ii)(D)'], hitrust_csf: ['09.0'],
    },
  },
  {
    id: 'CL-EDR-001', domain: 'Endpoint Security', dimension: SYS, default_method: 'automated',
    title: 'Endpoint malware protection',
    description: 'Anti-malware / EDR is deployed and current on endpoints and servers.',
    x: {
      nist_csf_2: ['PR.PS-05', 'DE.CM-01'], nist_800_53_r5: ['SI-3'],
      cis_v8_1: ['CIS 10.1', 'CIS 10.2'], iso_27001: ['A.8.7'], soc_2: ['CC6.8'],
      hipaa_security: ['164.308(a)(5)(ii)(B)'], hitrust_csf: ['09.0'],
    },
  },
  {
    id: 'CL-BCP-001', domain: 'Resilience', dimension: SYS, default_method: 'automated',
    title: 'Backup, recovery and contingency planning',
    description: 'Critical data is backed up, recoverable, and recovery procedures are tested.',
    x: {
      nist_csf_2: ['RC.RP-01', 'PR.DS-11'], nist_800_53_r5: ['CP-9', 'CP-10'],
      cis_v8_1: ['CIS 11.1', 'CIS 11.2', 'CIS 11.3'], iso_27001: ['A.8.13', 'A.5.29'],
      soc_2: ['A1.2', 'A1.3'], hipaa_security: ['164.308(a)(7)(i)', '164.308(a)(7)(ii)(A)'], hitrust_csf: ['12.0'],
    },
  },
  {
    id: 'CL-IR-001', domain: 'Incident Management', dimension: SYS, default_method: 'document',
    title: 'Incident response program',
    description: 'A documented, exercised incident response capability detects, responds to and reports incidents.',
    x: {
      nist_csf_2: ['RS.MA-01', 'DE.AE-02'], nist_800_53_r5: ['IR-4', 'IR-8'],
      cis_v8_1: ['CIS 17.1', 'CIS 17.4'], iso_27001: ['A.5.24', 'A.5.26'], soc_2: ['CC7.4'],
      hipaa_security: ['164.308(a)(6)(i)', '164.308(a)(6)(ii)'], hitrust_csf: ['11.0'],
    },
  },
  {
    id: 'CL-GOV-001', domain: 'Governance', dimension: DOC, default_method: 'document',
    title: 'Information security policy',
    description: 'A board-approved information security policy is established, communicated and reviewed.',
    x: {
      nist_csf_2: ['GV.PO-01'], nist_800_53_r5: ['PL-1', 'PM-1'], iso_27001: ['A.5.1'],
      soc_2: ['CC1.1'], hipaa_security: ['164.316(a)'], hitrust_csf: ['04.0'],
    },
  },
  {
    id: 'CL-RSK-001', domain: 'Governance', dimension: DOC, default_method: 'document',
    title: 'Risk assessment and management',
    description: 'Cyber risk is assessed, treated and tracked through a documented risk-management process.',
    x: {
      nist_csf_2: ['ID.RA-01', 'GV.RM-01'], nist_800_53_r5: ['RA-3', 'PM-9'],
      iso_27001: ['Clause 6.1'], soc_2: ['CC3.1', 'CC3.2'],
      hipaa_security: ['164.308(a)(1)(ii)(A)', '164.308(a)(1)(ii)(B)'], hitrust_csf: ['03.0'],
    },
  },
  {
    id: 'CL-TPM-001', domain: 'Third-Party Risk', dimension: DOC, default_method: 'document',
    title: 'Third-party / supplier risk management',
    description: 'Suppliers and business associates are risk-assessed and bound by security obligations.',
    x: {
      nist_csf_2: ['GV.SC-01', 'GV.SC-07'], nist_800_53_r5: ['SR-3', 'SR-6', 'SA-9'],
      cis_v8_1: ['CIS 15.1', 'CIS 15.2'], iso_27001: ['A.5.19', 'A.5.20'], soc_2: ['CC9.2'],
      hipaa_security: ['164.308(b)(1)', '164.314(a)(1)'], hitrust_csf: ['05.0'],
    },
  },
  {
    id: 'CL-HUM-001', domain: 'People', dimension: HUM, default_method: 'attestation',
    title: 'Security awareness and training',
    description: 'Workforce receives security awareness training on a defined cadence.',
    x: {
      nist_csf_2: ['PR.AT-01', 'PR.AT-02'], nist_800_53_r5: ['AT-2', 'AT-3'],
      cis_v8_1: ['CIS 14.1', 'CIS 14.2'], iso_27001: ['A.6.3'], soc_2: ['CC1.4'],
      hipaa_security: ['164.308(a)(5)(i)', '164.308(a)(5)(ii)(A)'], hitrust_csf: ['02.0'],
    },
  },
];

async function seed() {
  let controls = 0, mappings = 0;
  for (const c of LIBRARY) {
    await db.query(
      `INSERT INTO control_library (id, domain, title, description, dimension, weight, default_method, meta)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET domain=EXCLUDED.domain, title=EXCLUDED.title,
         description=EXCLUDED.description, dimension=EXCLUDED.dimension, default_method=EXCLUDED.default_method`,
      [c.id, c.domain, c.title, c.description || null, c.dimension, c.weight || 1, c.default_method || null, JSON.stringify(c.meta || {})]);
    controls++;
    // Replace this control's crosswalk so curated edits take effect on re-seed.
    await db.query('DELETE FROM control_library_crosswalk WHERE library_control_id=$1', [c.id]);
    const partial = c.partial || {};
    for (const [framework, ids] of Object.entries(c.x)) {
      for (const reqId of ids) {
        const coverage = (partial[framework] || []).includes(reqId) ? 'partial' : 'full';
        await db.query(
          `INSERT INTO control_library_crosswalk (library_control_id, framework, requirement_id, coverage, provenance)
           VALUES ($1,$2,$3,$4,'curated')
           ON CONFLICT (library_control_id, framework, requirement_id) DO UPDATE SET coverage=EXCLUDED.coverage`,
          [c.id, framework, reqId, coverage]);
        mappings++;
      }
    }
  }
  logger.info('seedControlLibrary complete', { controls, mappings });
  return { controls, mappings };
}

module.exports = { seed, LIBRARY };

if (require.main === module) {
  seed().then((r) => { console.log('seeded', r); process.exit(0); }).catch((e) => { console.error(e); process.exit(1); });
}
