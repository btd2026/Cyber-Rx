'use strict';

/**
 * intakeDocumentCatalog — STARTER catalog for the Organization Intake
 * "Document Request" phase.
 *
 * Each entry is a canonical document we ask the organization for ONCE, plus the
 * controls it evidences. That many-to-many is what powers (a) the deduplicated
 * Document Request checklist — each document appears once across all the controls
 * it covers — and (b) the review fan-out, where one upload writes a
 * control_assessment row per mapped control.
 *
 * `expected_requirement` records what THIS control needs the document to show,
 * and is the per-control prompt the review pipeline evaluates against.
 *
 * Scope note: this is a conservative, curated starting set mapped to NIST CSF 2.0
 * (plus a few NIST SP 800-53 policy "-1" controls). It is meant to be reviewed
 * and expanded by a GRC owner. The seed loader validates every
 * (framework_id, requirement_id) against framework_requirements and skips any
 * that aren't present, so framework data changes never break the seed and CIS
 * mappings can be added once that catalog is ingested.
 */

const CATALOG = [
  {
    id: 'information_security_policy',
    name: 'Information Security Policy',
    description: 'Overarching approved information security policy, with evidence it is communicated and acknowledged.',
    category: 'Policy',
    controls: [
      { framework_id: 'nist_csf_2', requirement_id: 'GV.PO-01', expected_requirement: 'A cybersecurity policy is established and communicated.' },
      { framework_id: 'nist_csf_2', requirement_id: 'GV.PO-02', expected_requirement: 'The policy is reviewed, updated, and approved on a defined cadence.' },
      { framework_id: 'nist_800_53_r5', requirement_id: 'PL-1', expected_requirement: 'Security planning policy and procedures are documented and maintained.' },
    ],
  },
  {
    id: 'access_control_policy',
    name: 'Access Control Policy',
    description: 'How identities, credentials, and access (including privileged and remote) are granted, reviewed, and revoked.',
    category: 'Policy',
    controls: [
      { framework_id: 'nist_csf_2', requirement_id: 'PR.AA-01', expected_requirement: 'Identities and credentials for authorized users and services are managed.' },
      { framework_id: 'nist_csf_2', requirement_id: 'PR.AA-03', expected_requirement: 'Users, services, and hardware are authenticated (MFA for remote/privileged access).' },
      { framework_id: 'nist_csf_2', requirement_id: 'PR.AA-05', expected_requirement: 'Access permissions and authorizations are defined and enforced using least privilege.' },
      { framework_id: 'nist_800_53_r5', requirement_id: 'AC-1', expected_requirement: 'Access control policy and procedures are documented and maintained.' },
    ],
  },
  {
    id: 'risk_management_policy',
    name: 'Risk Management Policy & Strategy',
    description: 'Risk management objectives, risk appetite/tolerance, scoring methodology, and the risk register process.',
    category: 'Policy',
    controls: [
      { framework_id: 'nist_csf_2', requirement_id: 'GV.RM-01', expected_requirement: 'Risk management objectives are established and agreed to by stakeholders.' },
      { framework_id: 'nist_csf_2', requirement_id: 'GV.RM-02', expected_requirement: 'Risk appetite and tolerance statements are established and communicated.' },
      { framework_id: 'nist_csf_2', requirement_id: 'GV.RM-04', expected_requirement: 'Strategic direction for risk response options is established and communicated.' },
      { framework_id: 'nist_csf_2', requirement_id: 'ID.RA-01', expected_requirement: 'Vulnerabilities/risks to the organization are identified and recorded.' },
      { framework_id: 'nist_800_53_r5', requirement_id: 'RA-1', expected_requirement: 'Risk assessment policy and procedures are documented and maintained.' },
    ],
  },
  {
    id: 'incident_response_plan',
    name: 'Incident Response Plan',
    description: 'Documented incident response process: roles, detection, analysis, containment, communication, and reporting.',
    category: 'Plan',
    controls: [
      { framework_id: 'nist_csf_2', requirement_id: 'RS.MA-01', expected_requirement: 'An incident response plan is executed during/after an incident.' },
      { framework_id: 'nist_csf_2', requirement_id: 'RS.MA-02', expected_requirement: 'Incident reports are triaged and validated.' },
      { framework_id: 'nist_csf_2', requirement_id: 'RS.CO-02', expected_requirement: 'Internal and external stakeholders are notified of incidents.' },
      { framework_id: 'nist_800_53_r5', requirement_id: 'IR-1', expected_requirement: 'Incident response policy and procedures are documented and maintained.' },
    ],
  },
  {
    id: 'business_continuity_dr_plan',
    name: 'Business Continuity & Disaster Recovery Plan',
    description: 'BCP/DR plan with recovery objectives (RTO/RPO), restoration procedures, and evidence of testing.',
    category: 'Plan',
    controls: [
      { framework_id: 'nist_csf_2', requirement_id: 'RC.RP-01', expected_requirement: 'The recovery portion of the incident response plan is executed.' },
      { framework_id: 'nist_csf_2', requirement_id: 'RC.RP-02', expected_requirement: 'Recovery actions are selected, scoped, prioritized, and performed.' },
      { framework_id: 'nist_csf_2', requirement_id: 'RC.RP-03', expected_requirement: 'Backups and restoration assets are verified before use in recovery.' },
      { framework_id: 'nist_800_53_r5', requirement_id: 'CP-1', expected_requirement: 'Contingency planning policy and procedures are documented and maintained.' },
    ],
  },
  {
    id: 'supply_chain_risk_policy',
    name: 'Third-Party / Supply Chain Risk Management Policy',
    description: 'C-SCRM program covering supplier risk assessment, contractual security requirements, and monitoring.',
    category: 'Policy',
    controls: [
      { framework_id: 'nist_csf_2', requirement_id: 'GV.SC-01', expected_requirement: 'A cyber supply chain risk management program/strategy is established.' },
      { framework_id: 'nist_800_53_r5', requirement_id: 'SA-1', expected_requirement: 'System and services acquisition policy and procedures are documented.' },
    ],
  },
  {
    id: 'data_protection_standard',
    name: 'Data Protection & Encryption Standard',
    description: 'How data is classified and protected at rest and in transit, including encryption requirements.',
    category: 'Standard',
    controls: [
      { framework_id: 'nist_csf_2', requirement_id: 'PR.DS-01', expected_requirement: 'The confidentiality, integrity, and availability of data-at-rest are protected.' },
      { framework_id: 'nist_csf_2', requirement_id: 'PR.DS-02', expected_requirement: 'The confidentiality, integrity, and availability of data-in-transit are protected.' },
      { framework_id: 'nist_csf_2', requirement_id: 'PR.DS-10', expected_requirement: 'The confidentiality, integrity, and availability of data-in-use are protected.' },
      { framework_id: 'nist_800_53_r5', requirement_id: 'SC-1', expected_requirement: 'System and communications protection policy and procedures are documented.' },
    ],
  },
  {
    id: 'asset_management_policy',
    name: 'Asset Management Policy & Inventory',
    description: 'How hardware, software, services, and data assets are inventoried and managed throughout their lifecycle.',
    category: 'Policy',
    controls: [
      { framework_id: 'nist_csf_2', requirement_id: 'ID.AM-01', expected_requirement: 'Inventories of hardware managed by the organization are maintained.' },
      { framework_id: 'nist_csf_2', requirement_id: 'ID.AM-02', expected_requirement: 'Inventories of software, services, and systems are maintained.' },
      { framework_id: 'nist_csf_2', requirement_id: 'ID.AM-03', expected_requirement: 'Representations of network communication and data flows are maintained.' },
      { framework_id: 'nist_800_53_r5', requirement_id: 'CM-1', expected_requirement: 'Configuration management policy and procedures are documented and maintained.' },
    ],
  },
  {
    id: 'security_awareness_training',
    name: 'Security Awareness & Training Policy',
    description: 'The security awareness program, role-based training, and completion/records evidence.',
    category: 'Policy',
    controls: [
      { framework_id: 'nist_csf_2', requirement_id: 'PR.AT-01', expected_requirement: 'Personnel are provided awareness and training so they perform their duties securely.' },
      { framework_id: 'nist_csf_2', requirement_id: 'PR.AT-02', expected_requirement: 'Individuals in specialized roles are provided role-based training.' },
      { framework_id: 'nist_800_53_r5', requirement_id: 'AT-1', expected_requirement: 'Awareness and training policy and procedures are documented and maintained.' },
    ],
  },
  {
    id: 'audit_logging_standard',
    name: 'Audit Logging & Monitoring Standard',
    description: 'Logging requirements, log sources, retention, and how logs are monitored and analyzed for events.',
    category: 'Standard',
    controls: [
      { framework_id: 'nist_csf_2', requirement_id: 'PR.PS-04', expected_requirement: 'Log records are generated and made available for continuous monitoring.' },
      { framework_id: 'nist_csf_2', requirement_id: 'DE.CM-01', expected_requirement: 'Networks and network services are monitored to find potentially adverse events.' },
      { framework_id: 'nist_csf_2', requirement_id: 'DE.AE-02', expected_requirement: 'Potentially adverse events are analyzed to understand associated activities.' },
      { framework_id: 'nist_800_53_r5', requirement_id: 'AU-1', expected_requirement: 'Audit and accountability policy and procedures are documented and maintained.' },
    ],
  },
];

module.exports = { CATALOG };
