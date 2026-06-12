'use strict';

/**
 * NIST CSF 2.0 Control Library
 * ----------------------------
 * Every NIST CSF 2.0 subcategory (106 total) across the six Functions
 * (GOVERN, IDENTIFY, PROTECT, DETECT, RESPOND, RECOVER).
 *
 * Each control records:
 *   - id        : CSF 2.0 subcategory ID (e.g. "PR.AA-01")
 *   - fn        : Function ID (GV | ID | PR | DE | RS | RC)
 *   - cat       : Category ID (e.g. "PR.AA")
 *   - name      : The CSF 2.0 outcome statement (faithfully summarized)
 *   - test      : How operating effectiveness is evidenced —
 *                   'auto'    : testable via a tool API call (no human needed)
 *                   'partial' : tool API gives partial signal; human attestation completes it
 *                   'manual'  : evidenced only by documentation/attestation collected at setup
 *   - tools     : security-tool IDs (see securityToolCatalog.js) whose API can
 *                 provide evidence of this control operating. Empty for manual.
 *   - signal    : primary metric_inputs key the tool feeds, when applicable
 *   - evidence  : for 'partial'/'manual', what to request from the org at setup
 *
 * The control → tool linkage drives the "every control × every tool that can
 * evidence it" table; the reverse index (tool → controls) is computed in the
 * service from the `tools` arrays here plus the API specs in the catalog.
 */

// terse row helper: keeps the 106-row table readable on one line each.
function C(id, fn, cat, name, test, tools, signal, evidence) {
  return { id, fn, cat, name, test, tools: tools || [], signal: signal || null, evidence: evidence || null };
}

const FUNCTIONS = [
  { id: 'GV', name: 'Govern' },
  { id: 'ID', name: 'Identify' },
  { id: 'PR', name: 'Protect' },
  { id: 'DE', name: 'Detect' },
  { id: 'RS', name: 'Respond' },
  { id: 'RC', name: 'Recover' },
];

const CATEGORIES = [
  { id: 'GV.OC', fn: 'GV', name: 'Organizational Context' },
  { id: 'GV.RM', fn: 'GV', name: 'Risk Management Strategy' },
  { id: 'GV.RR', fn: 'GV', name: 'Roles, Responsibilities & Authorities' },
  { id: 'GV.PO', fn: 'GV', name: 'Policy' },
  { id: 'GV.OV', fn: 'GV', name: 'Oversight' },
  { id: 'GV.SC', fn: 'GV', name: 'Cybersecurity Supply Chain Risk Management' },
  { id: 'ID.AM', fn: 'ID', name: 'Asset Management' },
  { id: 'ID.RA', fn: 'ID', name: 'Risk Assessment' },
  { id: 'ID.IM', fn: 'ID', name: 'Improvement' },
  { id: 'PR.AA', fn: 'PR', name: 'Identity Management, Authentication & Access Control' },
  { id: 'PR.AT', fn: 'PR', name: 'Awareness & Training' },
  { id: 'PR.DS', fn: 'PR', name: 'Data Security' },
  { id: 'PR.PS', fn: 'PR', name: 'Platform Security' },
  { id: 'PR.IR', fn: 'PR', name: 'Technology Infrastructure Resilience' },
  { id: 'DE.CM', fn: 'DE', name: 'Continuous Monitoring' },
  { id: 'DE.AE', fn: 'DE', name: 'Adverse Event Analysis' },
  { id: 'RS.MA', fn: 'RS', name: 'Incident Management' },
  { id: 'RS.AN', fn: 'RS', name: 'Incident Analysis' },
  { id: 'RS.CO', fn: 'RS', name: 'Incident Response Reporting & Communication' },
  { id: 'RS.MI', fn: 'RS', name: 'Incident Mitigation' },
  { id: 'RC.RP', fn: 'RC', name: 'Incident Recovery Plan Execution' },
  { id: 'RC.CO', fn: 'RC', name: 'Incident Recovery Communication' },
];

const CONTROLS = [
  // ---------------------------------------------------------------- GOVERN (GV)
  C('GV.OC-01', 'GV', 'GV.OC', 'The organizational mission is understood and informs cybersecurity risk management.', 'manual', [], null, 'Mission/charter statement and how it informs the cyber risk strategy.'),
  C('GV.OC-02', 'GV', 'GV.OC', 'Internal and external stakeholders, and their needs/expectations regarding cybersecurity risk management, are understood.', 'manual', [], null, 'Stakeholder map (board, regulators, members, partners) and expectations.'),
  C('GV.OC-03', 'GV', 'GV.OC', 'Legal, regulatory, and contractual requirements regarding cybersecurity — including privacy and civil-liberties obligations — are understood and managed.', 'partial', ['vanta', 'drata'], null, 'Obligations register (HIPAA, state breach laws, contracts) and how each is tracked.'),
  C('GV.OC-04', 'GV', 'GV.OC', 'Critical objectives, capabilities, and services that external stakeholders depend on are understood and communicated.', 'manual', [], null, 'List of critical services/capabilities stakeholders depend on.'),
  C('GV.OC-05', 'GV', 'GV.OC', 'Outcomes, capabilities, and services that the organization depends on are understood and communicated.', 'manual', [], null, 'List of internal/external dependencies the org relies on.'),

  C('GV.RM-01', 'GV', 'GV.RM', 'Risk management objectives are established and agreed to by organizational stakeholders.', 'manual', [], null, 'Documented, signed-off risk management objectives.'),
  C('GV.RM-02', 'GV', 'GV.RM', 'Risk appetite and risk tolerance statements are established, communicated, and maintained.', 'manual', [], null, 'Board-approved risk appetite & tolerance statements.'),
  C('GV.RM-03', 'GV', 'GV.RM', 'Cybersecurity risk management activities and outcomes are included in enterprise risk management processes.', 'manual', [], null, 'Evidence cyber risk is reported into ERM (e.g. ERM minutes).'),
  C('GV.RM-04', 'GV', 'GV.RM', 'Strategic direction describing appropriate risk response options is established and communicated.', 'manual', [], null, 'Risk-response strategy (accept/mitigate/transfer/avoid) guidance.'),
  C('GV.RM-05', 'GV', 'GV.RM', 'Lines of communication across the organization are established for cybersecurity risks, including risks from suppliers.', 'manual', [], null, 'Risk escalation/communication paths documentation.'),
  C('GV.RM-06', 'GV', 'GV.RM', 'A standardized method for calculating, documenting, categorizing, and prioritizing cybersecurity risks is established.', 'partial', ['vanta', 'drata', 'servicenow'], null, 'Risk scoring methodology and the register that uses it.'),
  C('GV.RM-07', 'GV', 'GV.RM', 'Strategic opportunities (positive risks) are characterized and included in risk discussions.', 'manual', [], null, 'Evidence positive risks/opportunities are considered.'),

  C('GV.RR-01', 'GV', 'GV.RR', 'Organizational leadership is responsible and accountable for cybersecurity risk and fosters a risk-aware, ethical culture.', 'manual', [], null, 'Leadership accountability statement / charter naming the accountable executive.'),
  C('GV.RR-02', 'GV', 'GV.RR', 'Roles, responsibilities, and authorities related to cybersecurity risk management are established, communicated, understood, and enforced.', 'manual', [], null, 'RACI / role descriptions for cybersecurity.'),
  C('GV.RR-03', 'GV', 'GV.RR', 'Adequate resources are allocated commensurate with the cybersecurity risk strategy, roles, responsibilities, and policies.', 'manual', [], null, 'Budget/headcount evidence aligned to the risk strategy.'),
  C('GV.RR-04', 'GV', 'GV.RR', 'Cybersecurity is included in human resources practices.', 'partial', ['workday'], null, 'HR practices: background checks, onboarding/offboarding, role-based duties.'),

  C('GV.PO-01', 'GV', 'GV.PO', 'Policy for managing cybersecurity risks is established based on organizational context, strategy, and priorities, and is communicated and enforced.', 'partial', ['vanta', 'drata'], null, 'Approved cybersecurity policy set and acknowledgement evidence.'),
  C('GV.PO-02', 'GV', 'GV.PO', 'Policy is reviewed, updated, communicated, and enforced to reflect changes in requirements, threats, technology, and mission.', 'partial', ['vanta', 'drata'], null, 'Policy review cadence and last-reviewed dates.'),

  C('GV.OV-01', 'GV', 'GV.OV', 'Cybersecurity risk management strategy outcomes are reviewed to inform and adjust strategy and direction.', 'manual', [], null, 'Evidence of strategy reviews and resulting adjustments.'),
  C('GV.OV-02', 'GV', 'GV.OV', 'The cybersecurity risk management strategy is reviewed and adjusted to ensure coverage of organizational requirements and risks.', 'manual', [], null, 'Records of strategy coverage reviews.'),
  C('GV.OV-03', 'GV', 'GV.OV', 'Organizational cybersecurity risk management performance is evaluated and reviewed for adjustments.', 'partial', ['vanta', 'drata'], null, 'KPIs/KRIs and the review record (e.g. board metrics pack).'),

  C('GV.SC-01', 'GV', 'GV.SC', 'A cybersecurity supply chain risk management program, strategy, objectives, policies, and processes are established and agreed to by stakeholders.', 'manual', [], null, 'C-SCRM program/policy document.'),
  C('GV.SC-02', 'GV', 'GV.SC', 'Cybersecurity roles and responsibilities for suppliers, customers, and partners are established, communicated, and coordinated.', 'manual', [], null, 'Third-party roles/responsibilities matrix.'),
  C('GV.SC-03', 'GV', 'GV.SC', 'Cybersecurity supply chain risk management is integrated into cybersecurity and enterprise risk management, risk assessment, and improvement processes.', 'partial', ['vanta', 'drata'], null, 'Evidence C-SCRM is integrated into ERM and assessments.'),
  C('GV.SC-04', 'GV', 'GV.SC', 'Suppliers are known and prioritized by criticality.', 'partial', ['bitsight', 'securityscorecard'], 'vendor', 'Supplier inventory with criticality tiering.'),
  C('GV.SC-05', 'GV', 'GV.SC', 'Requirements to address cybersecurity risks in supply chains are established, prioritized, and integrated into contracts and agreements.', 'manual', [], null, 'Standard security contract clauses / DPA template.'),
  C('GV.SC-06', 'GV', 'GV.SC', 'Planning and due diligence are performed to reduce risks before entering into formal supplier or other third-party relationships.', 'partial', ['bitsight', 'securityscorecard'], 'vendor', 'Pre-contract due-diligence questionnaires / ratings.'),
  C('GV.SC-07', 'GV', 'GV.SC', 'The risks posed by a supplier, their products and services, and other third parties are understood, recorded, prioritized, assessed, responded to, and monitored over the relationship.', 'auto', ['bitsight', 'securityscorecard'], 'vendor', null),
  C('GV.SC-08', 'GV', 'GV.SC', 'Relevant suppliers and other third parties are included in incident planning, response, and recovery activities.', 'manual', [], null, 'Evidence suppliers are part of IR/recovery plans & exercises.'),
  C('GV.SC-09', 'GV', 'GV.SC', 'Supply chain security practices are integrated into cybersecurity and ERM programs, and their performance is monitored throughout the technology product and service life cycle.', 'partial', ['bitsight', 'securityscorecard'], 'vendor', 'Ongoing supplier monitoring evidence.'),
  C('GV.SC-10', 'GV', 'GV.SC', 'Cybersecurity supply chain risk management plans include provisions for activities that occur after the conclusion of a partnership or service agreement.', 'manual', [], null, 'Offboarding/termination security provisions.'),

  // -------------------------------------------------------------- IDENTIFY (ID)
  C('ID.AM-01', 'ID', 'ID.AM', 'Inventories of hardware managed by the organization are maintained.', 'auto', ['axonius', 'servicenow_cmdb', 'tenable', 'crowdstrike'], 'endpoints', null),
  C('ID.AM-02', 'ID', 'ID.AM', 'Inventories of software, services, and systems managed by the organization are maintained.', 'auto', ['axonius', 'servicenow_cmdb', 'tenable', 'wiz'], null, null),
  C('ID.AM-03', 'ID', 'ID.AM', "Representations of the organization's authorized network communication and internal/external network data flows are maintained.", 'partial', ['prisma_cloud', 'wiz', 'panorama'], null, 'Network/data-flow diagrams and how they are kept current.'),
  C('ID.AM-04', 'ID', 'ID.AM', 'Inventories of services provided by suppliers are maintained.', 'partial', ['bitsight', 'servicenow_cmdb'], 'vendor', 'Inventory of supplier-provided services.'),
  C('ID.AM-05', 'ID', 'ID.AM', 'Assets are prioritized based on classification, criticality, resources, and impact on the mission.', 'partial', ['axonius', 'wiz', 'servicenow_cmdb'], null, 'Asset classification/criticality scheme.'),
  C('ID.AM-07', 'ID', 'ID.AM', 'Inventories of data and corresponding metadata for designated data types are maintained.', 'partial', ['purview', 'bigid'], 'phi_records', 'Data inventory / records-of-processing for PHI & sensitive data.'),
  C('ID.AM-08', 'ID', 'ID.AM', 'Systems, hardware, software, services, and data are managed throughout their life cycles.', 'partial', ['servicenow_cmdb', 'tenable'], null, 'Asset life-cycle / EOL management process.'),

  C('ID.RA-01', 'ID', 'ID.RA', 'Vulnerabilities in assets are identified, validated, and recorded.', 'auto', ['tenable', 'qualys', 'rapid7', 'wiz'], 'vuln_sla_pct', null),
  C('ID.RA-02', 'ID', 'ID.RA', 'Cyber threat intelligence is received from information sharing forums and sources.', 'partial', ['recorded_future', 'sentinel'], null, 'Threat-intel feeds/memberships (e.g. H-ISAC).'),
  C('ID.RA-03', 'ID', 'ID.RA', 'Internal and external threats to the organization are identified and recorded.', 'partial', ['recorded_future', 'sentinel'], null, 'Threat register and update cadence.'),
  C('ID.RA-04', 'ID', 'ID.RA', 'Potential impacts and likelihoods of threats exploiting vulnerabilities are identified and recorded.', 'manual', [], null, 'Risk analysis tying threats×vulns to impact/likelihood.'),
  C('ID.RA-05', 'ID', 'ID.RA', 'Threats, vulnerabilities, likelihoods, and impacts are used to understand inherent risk and inform risk response prioritization.', 'partial', ['tenable', 'qualys'], 'vuln_sla_pct', 'Risk prioritization method driven by vuln + threat data.'),
  C('ID.RA-06', 'ID', 'ID.RA', 'Risk responses are chosen, prioritized, planned, tracked, and communicated.', 'partial', ['servicenow'], null, 'Risk treatment / POA&M tracking.'),
  C('ID.RA-07', 'ID', 'ID.RA', 'Changes and exceptions are managed, assessed for risk impact, recorded, and tracked.', 'partial', ['servicenow'], null, 'Change & exception management records.'),
  C('ID.RA-08', 'ID', 'ID.RA', 'Processes for receiving, analyzing, and responding to vulnerability disclosures are established.', 'manual', [], null, 'Vulnerability disclosure policy / process.'),
  C('ID.RA-09', 'ID', 'ID.RA', 'The authenticity and integrity of hardware and software are assessed prior to acquisition and use.', 'manual', [], null, 'Acquisition integrity checks (e.g. SBOM, signing verification).'),
  C('ID.RA-10', 'ID', 'ID.RA', 'Critical suppliers are assessed prior to acquisition.', 'partial', ['bitsight', 'securityscorecard'], 'vendor', 'Pre-acquisition supplier security assessments.'),

  C('ID.IM-01', 'ID', 'ID.IM', 'Improvements are identified from evaluations.', 'partial', ['vanta', 'drata'], null, 'Evidence of assessment-driven improvement actions.'),
  C('ID.IM-02', 'ID', 'ID.IM', 'Improvements are identified from security tests and exercises, including those done in coordination with suppliers and third parties.', 'manual', [], null, 'Pen-test / tabletop reports and resulting actions.'),
  C('ID.IM-03', 'ID', 'ID.IM', 'Improvements are identified from execution of operational processes, procedures, and activities.', 'manual', [], null, 'Lessons-learned from operations feeding improvements.'),
  C('ID.IM-04', 'ID', 'ID.IM', 'Incident response plans and other cybersecurity plans that affect operations are established, communicated, maintained, and improved.', 'partial', ['servicenow'], null, 'IR/BCP/DR plans with review history.'),

  // --------------------------------------------------------------- PROTECT (PR)
  C('PR.AA-01', 'PR', 'PR.AA', 'Identities and credentials for authorized users, services, and hardware are managed by the organization.', 'auto', ['okta', 'entra_id', 'sailpoint'], 'mfa_pct', null),
  C('PR.AA-02', 'PR', 'PR.AA', 'Identities are proofed and bound to credentials based on the context of interactions.', 'partial', ['okta', 'entra_id'], null, 'Identity proofing process (joiner verification, IAL level).'),
  C('PR.AA-03', 'PR', 'PR.AA', 'Users, services, and hardware are authenticated.', 'auto', ['okta', 'entra_id'], 'mfa_pct', null),
  C('PR.AA-04', 'PR', 'PR.AA', 'Identity assertions are protected, conveyed, and verified.', 'partial', ['okta', 'entra_id'], null, 'SSO/federation config (SAML/OIDC) and assertion protection.'),
  C('PR.AA-05', 'PR', 'PR.AA', 'Access permissions, entitlements, and authorizations are defined and managed, enforcing least privilege and separation of duties, and are reviewed.', 'auto', ['sailpoint', 'cyberark', 'entra_id'], 'pam_pct', null),
  C('PR.AA-06', 'PR', 'PR.AA', 'Physical access to assets is managed, monitored, and enforced commensurate with risk.', 'manual', [], null, 'Physical access controls (badge logs, data-center access).'),

  C('PR.AT-01', 'PR', 'PR.AT', 'Personnel are provided with awareness and training so they possess the knowledge and skills to perform general tasks with cybersecurity risks in mind.', 'auto', ['knowbe4', 'workday'], 'training_pct', null),
  C('PR.AT-02', 'PR', 'PR.AT', 'Individuals in specialized roles are provided with awareness and training so they possess the knowledge and skills to perform relevant tasks with cybersecurity risks in mind.', 'partial', ['knowbe4', 'workday'], 'training_pct', 'Role-based / specialized training records (e.g. secure-coding).'),

  C('PR.DS-01', 'PR', 'PR.DS', 'The confidentiality, integrity, and availability of data-at-rest are protected.', 'partial', ['purview', 'prisma_cloud', 'wiz', 'defender_cloud'], null, 'Encryption-at-rest coverage attestation for stores not API-visible.'),
  C('PR.DS-02', 'PR', 'PR.DS', 'The confidentiality, integrity, and availability of data-in-transit are protected.', 'partial', ['panorama', 'zscaler', 'prisma_cloud'], null, 'TLS/in-transit encryption standards and enforcement.'),
  C('PR.DS-10', 'PR', 'PR.DS', 'The confidentiality, integrity, and availability of data-in-use are protected.', 'manual', [], null, 'Data-in-use protections (confidential computing, masking).'),
  C('PR.DS-11', 'PR', 'PR.DS', 'Backups of data are created, protected, maintained, and tested.', 'auto', ['rubrik', 'cohesity', 'veeam', 'aws_backup'], null, null),

  C('PR.PS-01', 'PR', 'PR.PS', 'Configuration management practices are established and applied.', 'partial', ['prisma_cloud', 'wiz', 'defender_cloud', 'qualys'], null, 'Secure baselines (CIS Benchmarks) and config-drift handling.'),
  C('PR.PS-02', 'PR', 'PR.PS', 'Software is maintained, replaced, and removed commensurate with risk.', 'auto', ['tenable', 'qualys', 'rapid7'], 'patch_pct', null),
  C('PR.PS-03', 'PR', 'PR.PS', 'Hardware is maintained, replaced, and removed commensurate with risk.', 'partial', ['axonius', 'servicenow_cmdb'], null, 'Hardware EOL/refresh program.'),
  C('PR.PS-04', 'PR', 'PR.PS', 'Log records are generated and made available for continuous monitoring.', 'auto', ['splunk', 'sentinel'], 'siem_days', null),
  C('PR.PS-05', 'PR', 'PR.PS', 'Installation and execution of unauthorized software are prevented.', 'partial', ['crowdstrike', 'defender_endpoint'], 'edr_pct', 'Application allow-listing / control attestation.'),
  C('PR.PS-06', 'PR', 'PR.PS', 'Secure software development practices are integrated, and their performance is monitored throughout the software development life cycle.', 'partial', ['snyk', 'gitguardian'], null, 'Secure-SDLC: SAST/SCA gates, secret scanning evidence.'),

  C('PR.IR-01', 'PR', 'PR.IR', 'Networks and environments are protected from unauthorized logical access and usage.', 'auto', ['panorama', 'zscaler', 'prisma_cloud'], null, null),
  C('PR.IR-02', 'PR', 'PR.IR', "The organization's technology assets are protected from environmental threats.", 'manual', [], null, 'Environmental controls (power, cooling, fire) for facilities/DCs.'),
  C('PR.IR-03', 'PR', 'PR.IR', 'Mechanisms are implemented to achieve resilience requirements in normal and adverse situations.', 'partial', ['prisma_cloud', 'wiz', 'aws_backup'], null, 'Resilience design (HA, redundancy) attestation.'),
  C('PR.IR-04', 'PR', 'PR.IR', 'Adequate resource capacity to ensure availability is maintained.', 'partial', ['prisma_cloud', 'wiz'], null, 'Capacity-management / scaling evidence.'),

  // ---------------------------------------------------------------- DETECT (DE)
  C('DE.CM-01', 'DE', 'DE.CM', 'Networks and network services are monitored to find potentially adverse events.', 'auto', ['splunk', 'sentinel', 'panorama'], 'siem_days', null),
  C('DE.CM-02', 'DE', 'DE.CM', 'The physical environment is monitored to find potentially adverse events.', 'manual', [], null, 'Physical monitoring (CCTV, sensors) attestation.'),
  C('DE.CM-03', 'DE', 'DE.CM', 'Personnel activity and technology usage are monitored to find potentially adverse events.', 'auto', ['crowdstrike', 'defender_endpoint', 'sentinel'], 'edr_pct', null),
  C('DE.CM-06', 'DE', 'DE.CM', 'External service provider activities and services are monitored to find potentially adverse events.', 'partial', ['bitsight', 'sentinel'], 'vendor', 'Monitoring of provider activity (logs/ratings).'),
  C('DE.CM-09', 'DE', 'DE.CM', 'Computing hardware and software, runtime environments, and their data are monitored to find potentially adverse events.', 'auto', ['crowdstrike', 'wiz', 'prisma_cloud'], 'edr_pct', null),

  C('DE.AE-02', 'DE', 'DE.AE', 'Potentially adverse events are analyzed to better understand associated activities.', 'auto', ['splunk', 'sentinel'], 'mttd_hrs', null),
  C('DE.AE-03', 'DE', 'DE.AE', 'Information is correlated from multiple sources.', 'auto', ['splunk', 'sentinel'], null, null),
  C('DE.AE-04', 'DE', 'DE.AE', 'The estimated impact and scope of adverse events are understood.', 'partial', ['sentinel', 'servicenow'], null, 'Impact/scope assessment process during triage.'),
  C('DE.AE-06', 'DE', 'DE.AE', 'Information on adverse events is provided to authorized staff and tools.', 'auto', ['splunk', 'sentinel', 'servicenow'], null, null),
  C('DE.AE-07', 'DE', 'DE.AE', 'Cyber threat intelligence and other contextual information are integrated into the analysis.', 'partial', ['recorded_future', 'sentinel'], null, 'Threat-intel enrichment of detections.'),
  C('DE.AE-08', 'DE', 'DE.AE', 'Incidents are declared when adverse events meet the defined incident criteria.', 'partial', ['servicenow', 'sentinel'], null, 'Documented incident-declaration criteria.'),

  // --------------------------------------------------------------- RESPOND (RS)
  C('RS.MA-01', 'RS', 'RS.MA', 'The incident response plan is executed in coordination with relevant third parties once an incident is declared.', 'partial', ['servicenow', 'pagerduty'], null, 'IR plan and evidence of execution/runbooks.'),
  C('RS.MA-02', 'RS', 'RS.MA', 'Incident reports are triaged and validated.', 'auto', ['servicenow', 'sentinel'], 'mttr_hrs', null),
  C('RS.MA-03', 'RS', 'RS.MA', 'Incidents are categorized and prioritized.', 'auto', ['servicenow', 'sentinel'], null, null),
  C('RS.MA-04', 'RS', 'RS.MA', 'Incidents are escalated or elevated as needed.', 'partial', ['pagerduty', 'servicenow'], null, 'Escalation matrix and on-call evidence.'),
  C('RS.MA-05', 'RS', 'RS.MA', 'The criteria for initiating incident recovery are applied.', 'manual', [], null, 'Recovery-initiation criteria documentation.'),

  C('RS.AN-03', 'RS', 'RS.AN', 'Analysis is performed to establish what has taken place during an incident and the root cause.', 'partial', ['sentinel', 'crowdstrike'], null, 'Root-cause / forensic analysis capability & samples.'),
  C('RS.AN-06', 'RS', 'RS.AN', "Actions performed during an investigation are recorded, and the records' integrity and provenance are preserved.", 'partial', ['servicenow', 'sentinel'], null, 'Investigation logging / chain-of-custody process.'),
  C('RS.AN-07', 'RS', 'RS.AN', 'Incident data and metadata are collected, and their integrity and provenance are preserved.', 'partial', ['crowdstrike', 'sentinel'], null, 'Evidence collection & preservation process.'),
  C('RS.AN-08', 'RS', 'RS.AN', "An incident's magnitude is estimated and validated.", 'partial', ['sentinel', 'servicenow'], null, 'Magnitude/impact estimation process.'),

  C('RS.CO-02', 'RS', 'RS.CO', 'Internal and external stakeholders are notified of incidents.', 'partial', ['servicenow', 'pagerduty'], null, 'Notification procedures (incl. regulatory breach timelines).'),
  C('RS.CO-03', 'RS', 'RS.CO', 'Information is shared with designated internal and external stakeholders.', 'manual', [], null, 'Information-sharing / comms plan for incidents.'),

  C('RS.MI-01', 'RS', 'RS.MI', 'Incidents are contained.', 'auto', ['crowdstrike', 'defender_endpoint'], null, null),
  C('RS.MI-02', 'RS', 'RS.MI', 'Incidents are eradicated.', 'partial', ['crowdstrike', 'defender_endpoint'], null, 'Eradication procedures and evidence.'),

  // --------------------------------------------------------------- RECOVER (RC)
  C('RC.RP-01', 'RC', 'RC.RP', 'The recovery portion of the incident response plan is executed once initiated from the incident response process.', 'partial', ['rubrik', 'cohesity', 'veeam'], null, 'Recovery plan execution evidence.'),
  C('RC.RP-02', 'RC', 'RC.RP', 'Recovery actions are selected, scoped, prioritized, and performed.', 'partial', ['rubrik', 'cohesity'], null, 'Recovery prioritization / runbooks.'),
  C('RC.RP-03', 'RC', 'RC.RP', 'The integrity of backups and other restoration assets is verified before using them for restoration.', 'auto', ['rubrik', 'cohesity', 'veeam'], null, null),
  C('RC.RP-04', 'RC', 'RC.RP', 'Critical mission functions and cybersecurity risk management are considered to establish post-incident operational norms.', 'manual', [], null, 'Post-incident operational-norms / RTO-RPO documentation.'),
  C('RC.RP-05', 'RC', 'RC.RP', 'The integrity of restored assets is verified, systems and services are restored, and normal operating status is confirmed.', 'partial', ['rubrik', 'cohesity', 'veeam'], null, 'Restore-verification process and test records.'),
  C('RC.RP-06', 'RC', 'RC.RP', 'The end of incident recovery is declared based on criteria, and incident-related documentation is completed.', 'manual', [], null, 'Recovery-completion criteria and after-action records.'),

  C('RC.CO-03', 'RC', 'RC.CO', 'Recovery activities and progress in restoring operational capabilities are communicated to designated internal and external stakeholders.', 'manual', [], null, 'Recovery communications plan.'),
  C('RC.CO-04', 'RC', 'RC.CO', 'Public updates on incident recovery are shared using approved methods and messaging.', 'manual', [], null, 'Public/PR comms templates & approval process.'),
];

module.exports = { FUNCTIONS, CATEGORIES, CONTROLS };
