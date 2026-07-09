'use strict';

/**
 * iso_27001_2022_assessment_registry — framework-NATIVE, per-clause / per-Annex-A
 * control. Every entry is Nerion-AUTHORED: a short label, an assessment objective,
 * and evidence requirements written by Nerion. It NEVER stores, reproduces, or
 * paraphrases the official ISO/IEC 27001:2022 clause or Annex A text, and it is
 * NEVER derived from NIST CSF (no crosswalk).
 *
 * ISO is mostly a management-system + document/process framework, so most controls
 * are evidenced by automated DOCUMENT review of tenant-provided evidence (SoA, risk
 * assessment, risk treatment plan, ISMS scope, internal audit, management review,
 * corrective actions, policies/standards/procedures) plus OPERATING evidence
 * (tickets, approvals, test reports, exception registers, snapshots). A subset of
 * the Annex A 8.x technological controls also read live connector telemetry. A
 * document existing never means the control is Effective.
 *
 * Copyright: a customer who has licensed the official ISO text may upload it; it
 * stays tenant-only and is never bundled here (see COPYRIGHT_FLAGS + the copyright
 * safety tests). Reports refer to controls as "Nerion assessment for ISO/IEC
 * 27001 control ID X", never by official language.
 */

const M = require('../evidenceModel');
const { makeTest } = require('../testKit');
const { COPYRIGHT_FLAGS } = require('../native/copyrightSafety');
const { EVIDENCE_LAYER, ASSESSMENT_TYPE } = M;
const FRAMEWORK = 'ISO/IEC 27001:2022';

// A Nerion-authored native ISO control test. `o` carries the rich Nerion fields;
// this fills engine-required fields + the copyright flags. control_name /
// control_objective are Nerion-authored (never the official ISO wording).
function def(o) {
  const telemetry = (o.required_connector_telemetry || []).length > 0;
  const base = {
    framework: FRAMEWORK,
    assessment_type: o.assessment_type || (telemetry ? ASSESSMENT_TYPE.SEMI_AUTOMATED : ASSESSMENT_TYPE.MANUAL_REQUIRED),
    validation_status: 'documented_not_live_validated', live_tenant_validated: false, last_validated_at: null,
    evidence_freshness_requirement: (o.evidence_freshness_months || 12) * 30,
    exception_handling: 'Unapproved exceptions block Effective.',
    control_name: o.nerion_label, control_objective: o.nerion_assessment_objective,
    // rich Nerion-authored fields (the assessment definition)
    nerion_label: o.nerion_label, nerion_assessment_objective: o.nerion_assessment_objective,
    required_connector_telemetry: o.required_connector_telemetry || [],
    required_document_evidence: o.required_document_evidence || [],
    required_operating_evidence: o.required_operating_evidence || [],
    required_denominator: o.required_denominator || null,
    required_scope: o.required_scope || 'ISMS scope',
    pass_conditions: o.pass_conditions, partial_conditions: o.partial_conditions,
    fail_conditions: o.fail_conditions, not_enough_evidence_conditions: o.not_enough_evidence_conditions,
    what_nerion_can_prove: o.what_nerion_can_prove, what_nerion_cannot_prove: o.what_nerion_cannot_prove,
    additional_evidence_required: o.additional_evidence_required || [],
    // engine fields
    evidence_layer_supported: telemetry ? [EVIDENCE_LAYER.DESIGN, EVIDENCE_LAYER.OPERATING_EFFECTIVENESS] : [EVIDENCE_LAYER.DESIGN],
    required_signals: [], optional_signals: o.relevance_signals || [],
    required_api_fields: o.required_api_fields || [],
    required_denominator_source: o.required_denominator || null,
    control_limitations: o.what_nerion_cannot_prove,
    cannot_conclude_without: o.additional_evidence_required || [],
    supported_connectors: o.supported_connectors || [],
    native_test: true,
    test: o.test || makeTest({
      relevanceSignals: o.relevance_signals || [],
      designFields: [], oeFields: o.required_api_fields || [],
      proves: o.what_nerion_can_prove, notProve: o.what_nerion_cannot_prove,
      noneMsg: 'No telemetry evidence for ISO ' + o.control_id + ' — assessed by document review of tenant-provided ISO evidence.',
    }),
  };
  return Object.assign(base, COPYRIGHT_FLAGS, { control_id: o.control_id });
}

const REGISTRY = {
  // ---- ISMS management-system clauses (document / operating) ----
  '4.3': def({ control_id: '4.3', nerion_label: 'ISMS scope defined (Nerion test)',
    nerion_assessment_objective: 'Nerion test: a documented ISMS scope exists, is current, approved, and names the in-scope systems, locations and interfaces.',
    required_document_evidence: ['ISMS scope statement'], required_operating_evidence: [], evidence_freshness_months: 12,
    pass_conditions: 'Current approved ISMS scope covering systems, locations and boundaries.', partial_conditions: 'Scope present but not approved or out of date.',
    fail_conditions: 'No ISMS scope.', not_enough_evidence_conditions: 'Scope document not provided or not readable.',
    what_nerion_can_prove: 'That an ISMS scope is documented, approved and current.', what_nerion_cannot_prove: 'That the scope is complete for every asset the organization operates.',
    additional_evidence_required: ['ISMS scope statement'] }),
  '5.2': def({ control_id: '5.2', nerion_label: 'Information security policy approved (Nerion test)',
    nerion_assessment_objective: 'Nerion test: a top-level information security policy exists, is approved by management, communicated, and reviewed on cadence.',
    required_document_evidence: ['Information Security Policy'], required_operating_evidence: ['Management review record'], evidence_freshness_months: 12,
    pass_conditions: 'Approved, communicated, on-cadence-reviewed security policy.', partial_conditions: 'Policy present but no approval or review evidence.',
    fail_conditions: 'No security policy.', not_enough_evidence_conditions: 'Policy not provided.',
    what_nerion_can_prove: 'That a management-approved, communicated security policy exists and is reviewed.', what_nerion_cannot_prove: 'That personnel actually follow it day to day.',
    additional_evidence_required: ['Information Security Policy', 'approval record'] }),
  '6.1.2': def({ control_id: '6.1.2', nerion_label: 'Risk assessment process operated (Nerion test)',
    nerion_assessment_objective: 'Nerion test: a documented risk assessment methodology exists and a current risk assessment has been performed over the review period.',
    required_document_evidence: ['Risk Assessment Methodology'], required_operating_evidence: ['Risk Register'], evidence_freshness_months: 12,
    pass_conditions: 'Methodology + a dated, populated risk assessment covering in-scope assets.', partial_conditions: 'Methodology present but no current assessment output.',
    fail_conditions: 'No methodology or assessment.', not_enough_evidence_conditions: 'Neither methodology nor risk register provided.',
    what_nerion_can_prove: 'That risk assessment is defined and was performed with outputs.', what_nerion_cannot_prove: 'That every material risk was identified.',
    additional_evidence_required: ['Risk Assessment Methodology', 'Risk Register'] }),
  '6.1.3': def({ control_id: '6.1.3', nerion_label: 'Risk treatment & Statement of Applicability (Nerion test)',
    nerion_assessment_objective: 'Nerion test: a risk treatment plan and a Statement of Applicability exist, are current and approved, and each applicable control has a treatment decision.',
    required_document_evidence: ['Risk Treatment Plan', 'Statement of Applicability'], required_operating_evidence: [], evidence_freshness_months: 12,
    pass_conditions: 'Current approved SoA + risk treatment plan with per-control decisions.', partial_conditions: 'SoA present but incomplete or unapproved.',
    fail_conditions: 'No SoA or treatment plan.', not_enough_evidence_conditions: 'SoA / treatment plan not provided.',
    what_nerion_can_prove: 'That a treatment plan and SoA exist with control decisions.', what_nerion_cannot_prove: 'That the chosen treatments are operating effectively (assessed per control).',
    additional_evidence_required: ['Statement of Applicability', 'Risk Treatment Plan'] }),
  '7.5': def({ control_id: '7.5', nerion_label: 'Documented information controlled (Nerion test)',
    nerion_assessment_objective: 'Nerion test: ISMS documented information is version-controlled, approved, and access-restricted, with evidence of review.',
    required_document_evidence: ['Document control procedure'], required_operating_evidence: [], evidence_freshness_months: 12,
    pass_conditions: 'Documented-information control with versioning/approval evidenced.', partial_conditions: 'Procedure present but no versioning evidence.',
    fail_conditions: 'No document control.', not_enough_evidence_conditions: 'No procedure provided.',
    what_nerion_can_prove: 'That ISMS documents are version-controlled and approved.', what_nerion_cannot_prove: 'That every document in use is the current version.',
    additional_evidence_required: ['Document control procedure'] }),
  '9.1': def({ control_id: '9.1', nerion_label: 'Monitoring & measurement operated (Nerion test)',
    nerion_assessment_objective: 'Nerion test: security is monitored and measured on a defined cadence, with metrics/KPIs produced over the review period; live telemetry corroborates where available.',
    required_connector_telemetry: ['siem'], required_document_evidence: ['Metrics/KPI report'], required_operating_evidence: [],
    required_api_fields: ['siem_log_sources'], relevance_signals: ['siem_log_sources', 'open_incidents'], supported_connectors: ['splunk', 'sentinel', 'elastic'],
    required_denominator: 'monitored-asset inventory', evidence_freshness_months: 3,
    pass_conditions: 'Defined metrics produced on cadence with monitoring telemetry.', partial_conditions: 'Some monitoring telemetry but no measurement records, or vice versa.',
    fail_conditions: 'No monitoring or measurement.', not_enough_evidence_conditions: 'No metrics report and no monitoring telemetry.',
    what_nerion_can_prove: 'That monitoring is live and measurement records exist.', what_nerion_cannot_prove: 'That the chosen metrics are the right ones for the risk.',
    additional_evidence_required: ['Metrics/KPI report'] }),
  '9.2': def({ control_id: '9.2', nerion_label: 'Internal audit performed (Nerion test)',
    nerion_assessment_objective: 'Nerion test: internal ISMS audits are planned and performed over the review period, with findings recorded and tracked.',
    required_document_evidence: ['Internal audit programme'], required_operating_evidence: ['Internal Audit Report'], evidence_freshness_months: 12,
    pass_conditions: 'Audit programme + completed audit reports with tracked findings.', partial_conditions: 'Programme present but no completed audits.',
    fail_conditions: 'No internal audit.', not_enough_evidence_conditions: 'No audit programme or reports provided.',
    what_nerion_can_prove: 'That internal audits were performed with findings tracked.', what_nerion_cannot_prove: 'Auditor independence or audit quality.',
    additional_evidence_required: ['Internal Audit Report'] }),
  '9.3': def({ control_id: '9.3', nerion_label: 'Management review conducted (Nerion test)',
    nerion_assessment_objective: 'Nerion test: management reviews of the ISMS are conducted on cadence with documented inputs, decisions and actions.',
    required_document_evidence: ['Management review record'], required_operating_evidence: [], evidence_freshness_months: 12,
    pass_conditions: 'On-cadence management reviews with recorded decisions/actions.', partial_conditions: 'Review held but no recorded actions.',
    fail_conditions: 'No management review.', not_enough_evidence_conditions: 'No review records provided.',
    what_nerion_can_prove: 'That management reviews occurred with decisions.', what_nerion_cannot_prove: 'That decisions were followed through (see 10.1).',
    additional_evidence_required: ['Management review record'] }),
  '10.1': def({ control_id: '10.1', nerion_label: 'Nonconformity & corrective action (Nerion test)',
    nerion_assessment_objective: 'Nerion test: nonconformities are recorded and corrective actions are tracked to closure over the review period.',
    required_document_evidence: ['Corrective action procedure'], required_operating_evidence: ['Corrective action records'], evidence_freshness_months: 12,
    pass_conditions: 'Corrective actions recorded and closed with evidence.', partial_conditions: 'Actions opened but not closed.',
    fail_conditions: 'No corrective-action process.', not_enough_evidence_conditions: 'No records provided.',
    what_nerion_can_prove: 'That nonconformities are tracked and corrected.', what_nerion_cannot_prove: 'That root causes were truly eliminated.',
    additional_evidence_required: ['Corrective action records'] }),
  '10.2': def({ control_id: '10.2', nerion_label: 'Continual improvement (Nerion test)',
    nerion_assessment_objective: 'Nerion test: evidence of continual ISMS improvement — improvements identified from audits, reviews, incidents and metrics and acted on.',
    required_document_evidence: ['Improvement log'], required_operating_evidence: [], evidence_freshness_months: 12,
    pass_conditions: 'Improvement actions identified and implemented over the period.', partial_conditions: 'Improvements identified but not implemented.',
    fail_conditions: 'No improvement evidence.', not_enough_evidence_conditions: 'No improvement log provided.',
    what_nerion_can_prove: 'That the ISMS is being improved over time.', what_nerion_cannot_prove: 'That improvement pace matches the threat landscape.',
    additional_evidence_required: ['Improvement log'] }),

  // ---- Annex A — Organizational (A.5) ----
  'A.5.1': def({ control_id: 'A.5.1', nerion_label: 'Security policies set (Nerion test)',
    nerion_assessment_objective: 'Nerion test: topic-specific security policies exist, are approved, communicated and reviewed on cadence.',
    required_document_evidence: ['Information Security Policy'], evidence_freshness_months: 12,
    pass_conditions: 'Approved, communicated, reviewed policies.', partial_conditions: 'Policies present but unapproved/stale.',
    fail_conditions: 'No policies.', not_enough_evidence_conditions: 'Policies not provided.',
    what_nerion_can_prove: 'That security policies exist and are governed.', what_nerion_cannot_prove: 'Adherence in practice.', additional_evidence_required: ['Information Security Policy'] }),
  'A.5.9': def({ control_id: 'A.5.9', nerion_label: 'Asset inventory maintained (Nerion test)',
    nerion_assessment_objective: 'Nerion test: an inventory of information and associated assets is maintained and reconciled; asset telemetry corroborates coverage.',
    required_connector_telemetry: ['cspm'], required_document_evidence: ['Asset inventory'], required_api_fields: ['asset_inventory_source'],
    relevance_signals: ['cspm_pct'], supported_connectors: ['wiz', 'prisma_cloud', 'defender_cloud'], required_denominator: 'authoritative asset inventory', evidence_freshness_months: 3,
    pass_conditions: 'Reconciled asset inventory with a denominator and coverage telemetry.', partial_conditions: 'Inventory present but no reconciliation or denominator.',
    fail_conditions: 'No inventory.', not_enough_evidence_conditions: 'No inventory or asset telemetry.',
    what_nerion_can_prove: 'That an asset inventory exists and is reconciled.', what_nerion_cannot_prove: 'That every shadow asset is captured.', additional_evidence_required: ['Asset inventory'] }),
  'A.5.15': def({ control_id: 'A.5.15', nerion_label: 'Access control enforced (Nerion test)',
    nerion_assessment_objective: 'Nerion test: access is granted per an access-control policy, with periodic access reviews and least-privilege enforcement; IdP/IGA telemetry corroborates.',
    required_connector_telemetry: ['mfa', 'iga'], required_document_evidence: ['Access Control Policy'], required_operating_evidence: ['Access Review / Certification Report'],
    required_api_fields: ['access_review_records'], relevance_signals: ['mfa_pct'], supported_connectors: ['okta', 'entra', 'sailpoint'], required_denominator: 'in-scope user/account directory', evidence_freshness_months: 6,
    pass_conditions: 'Policy + completed access reviews + least-privilege enforcement over the period.', partial_conditions: 'Policy present but no review campaign records.',
    fail_conditions: 'No access control.', not_enough_evidence_conditions: 'No policy and no review records.',
    what_nerion_can_prove: 'That access is governed and reviewed.', what_nerion_cannot_prove: 'That each individual grant is appropriate.', additional_evidence_required: ['Access Review / Certification Report'] }),
  'A.5.23': def({ control_id: 'A.5.23', nerion_label: 'Cloud service security (Nerion test)',
    nerion_assessment_objective: 'Nerion test: security requirements for cloud services are defined and cloud posture is monitored; CSPM telemetry corroborates.',
    required_connector_telemetry: ['cspm'], required_document_evidence: ['Cloud security standard'], required_api_fields: ['cspm_pct'],
    relevance_signals: ['cspm_pct'], supported_connectors: ['wiz', 'prisma_cloud', 'defender_cloud', 'orca'], required_denominator: 'cloud account/subscription inventory', evidence_freshness_months: 1,
    pass_conditions: 'Cloud standard + monitored posture with no critical misconfigurations over the period.', partial_conditions: 'Posture monitored but no standard, or vice versa.',
    fail_conditions: 'No cloud security controls.', not_enough_evidence_conditions: 'No standard and no CSPM telemetry.',
    what_nerion_can_prove: 'That cloud posture is monitored against a standard.', what_nerion_cannot_prove: 'Contractual assurances from the cloud provider.', additional_evidence_required: ['Cloud security standard'] }),
  'A.5.24': def({ control_id: 'A.5.24', nerion_label: 'Incident management planned (Nerion test)',
    nerion_assessment_objective: 'Nerion test: incident management is planned and prepared — an IR plan exists and real incidents are recorded and handled over the period.',
    required_document_evidence: ['Incident Response Plan'], required_operating_evidence: ['Incident Register or Incident Ticket Export'], evidence_freshness_months: 12,
    pass_conditions: 'IR plan + incident records showing the process operated.', partial_conditions: 'Plan present but no incident records.',
    fail_conditions: 'No IR plan.', not_enough_evidence_conditions: 'No plan or records.',
    what_nerion_can_prove: 'That IR is planned and operated.', what_nerion_cannot_prove: 'Response quality for a novel incident.', additional_evidence_required: ['Incident Response Plan'] }),
  'A.5.30': def({ control_id: 'A.5.30', nerion_label: 'ICT continuity readiness (Nerion test)',
    nerion_assessment_objective: 'Nerion test: ICT readiness for business continuity is planned and tested — backups exist and restore/DR tests pass; backup telemetry corroborates.',
    required_connector_telemetry: ['backup'], required_document_evidence: ['Disaster Recovery Plan'], required_operating_evidence: ['Restore Test Report'],
    required_api_fields: ['backup_immutable_pct'], relevance_signals: ['backup_immutable_pct'], supported_connectors: ['rubrik', 'cohesity', 'veeam'], evidence_freshness_months: 12,
    pass_conditions: 'DR plan + passing restore test + protected backups over the period.', partial_conditions: 'Backups present but no restore test.',
    fail_conditions: 'No continuity readiness.', not_enough_evidence_conditions: 'No plan, test or backup telemetry.',
    what_nerion_can_prove: 'That backups exist and restores are tested.', what_nerion_cannot_prove: 'Full-scale failover under real disaster load.', additional_evidence_required: ['Restore Test Report'] }),

  // ---- Annex A — People (A.6) ----
  'A.6.3': def({ control_id: 'A.6.3', nerion_label: 'Awareness & training delivered (Nerion test)',
    nerion_assessment_objective: 'Nerion test: security awareness training is delivered on cadence with completion records; awareness/phishing telemetry corroborates.',
    required_connector_telemetry: ['aware'], required_document_evidence: ['Security Awareness Policy'], required_operating_evidence: ['Training completion records'],
    required_api_fields: ['training_pct'], relevance_signals: ['training_pct', 'phishing_pct'], supported_connectors: ['knowbe4', 'proofpoint'], required_denominator: 'workforce headcount', evidence_freshness_months: 12,
    pass_conditions: 'Training delivered with completion records above threshold over the period.', partial_conditions: 'Program present but low/no completion evidence.',
    fail_conditions: 'No awareness program.', not_enough_evidence_conditions: 'No policy or completion telemetry.',
    what_nerion_can_prove: 'That training was delivered and completed.', what_nerion_cannot_prove: 'Behavioral change from the training.', additional_evidence_required: ['Training completion records'] }),

  // ---- Annex A — Physical (A.7) ----
  'A.7.1': def({ control_id: 'A.7.1', nerion_label: 'Physical perimeter controls (Nerion test)',
    nerion_assessment_objective: 'Nerion test: physical security perimeters for facilities holding information assets are defined and monitored (document/attestation evidence).',
    required_document_evidence: ['Physical security policy'], required_operating_evidence: ['Facility access review'], evidence_freshness_months: 12,
    pass_conditions: 'Physical security policy + access controls evidenced.', partial_conditions: 'Policy present but no monitoring evidence.',
    fail_conditions: 'No physical controls.', not_enough_evidence_conditions: 'No physical security evidence.',
    what_nerion_can_prove: 'That physical perimeter controls are documented and reviewed.', what_nerion_cannot_prove: 'Physical security by direct telemetry — Manual escalation for on-site validation.',
    additional_evidence_required: ['Physical security policy', 'facility access review'] }),

  // ---- Annex A — Technological (A.8) ----
  'A.8.5': def({ control_id: 'A.8.5', nerion_label: 'Secure authentication (Nerion test)',
    nerion_assessment_objective: 'Nerion test: strong authentication (MFA) is enforced for access to in-scope systems, with no non-MFA sign-ins over the period.',
    required_connector_telemetry: ['mfa'], required_api_fields: ['mfa_enforcement_policy', 'signins_without_mfa', 'active_user_denominator'],
    relevance_signals: ['mfa_pct'], supported_connectors: ['okta', 'entra', 'ping', 'duo'], required_denominator: 'active-user directory', evidence_freshness_months: 1,
    pass_conditions: 'MFA enforced with zero non-MFA sign-ins over the period.', partial_conditions: 'MFA adoption metric present but no per-system enforcement / sign-in evidence.',
    fail_conditions: 'Non-MFA sign-ins observed.', not_enough_evidence_conditions: 'No MFA telemetry.',
    what_nerion_can_prove: 'That MFA is enforced and operating.', what_nerion_cannot_prove: 'Strength of the underlying authenticators for federated IdPs.', additional_evidence_required: ['sign-in logs'] }),
  'A.8.7': def({ control_id: 'A.8.7', nerion_label: 'Malware protection (Nerion test)',
    nerion_assessment_objective: 'Nerion test: anti-malware / EDR is deployed across in-scope endpoints with active detection over the period.',
    required_connector_telemetry: ['edr'], required_api_fields: ['endpoint_denominator', 'active_sensor_count', 'stale_sensor_count'],
    relevance_signals: ['edr_pct'], supported_connectors: ['crowdstrike', 'defender_endpoint', 'sentinelone'], required_denominator: 'endpoint inventory', evidence_freshness_months: 1,
    pass_conditions: 'EDR coverage across the endpoint denominator with no stale sensors.', partial_conditions: 'Coverage metric present but no endpoint denominator.',
    fail_conditions: 'Uncovered endpoints.', not_enough_evidence_conditions: 'No EDR telemetry.',
    what_nerion_can_prove: 'That anti-malware is deployed and active.', what_nerion_cannot_prove: 'Detection efficacy against a novel threat.', additional_evidence_required: ['endpoint inventory (denominator)'] }),
  'A.8.8': def({ control_id: 'A.8.8', nerion_label: 'Technical vulnerability management (Nerion test)',
    nerion_assessment_objective: 'Nerion test: technical vulnerabilities are identified and remediated within SLA over the period, across a scanned asset scope.',
    required_connector_telemetry: ['vuln'], required_api_fields: ['scan_coverage_denominator', 'open_critical_vulns', 'remediation_sla_met'],
    relevance_signals: ['vuln_sla_pct'], supported_connectors: ['tenable', 'qualys', 'rapid7'], required_denominator: 'asset inventory (scan scope)', evidence_freshness_months: 1,
    pass_conditions: 'Scanning on cadence with no open critical vulns past SLA.', partial_conditions: 'Findings present but no scan-coverage denominator or SLA evidence.',
    fail_conditions: 'Open critical vulns past SLA.', not_enough_evidence_conditions: 'No vulnerability telemetry.',
    what_nerion_can_prove: 'That vulnerabilities are scanned and remediated in SLA.', what_nerion_cannot_prove: 'Coverage of unscanned/unknown assets.', additional_evidence_required: ['scan coverage denominator'] }),
  'A.8.12': def({ control_id: 'A.8.12', nerion_label: 'Data leakage prevention (Nerion test)',
    nerion_assessment_objective: 'Nerion test: DLP controls are enforced across the required channels with policy coverage over the period.',
    required_connector_telemetry: ['dlp'], required_api_fields: ['dlp_pct'], relevance_signals: ['dlp_pct'], supported_connectors: ['purview', 'forcepoint', 'netskope'], required_denominator: 'in-scope channels/endpoints', evidence_freshness_months: 1,
    pass_conditions: 'DLP enforced across the required channels.', partial_conditions: 'DLP metric present but no channel denominator.',
    fail_conditions: 'Uncovered channels.', not_enough_evidence_conditions: 'No DLP telemetry.',
    what_nerion_can_prove: 'That DLP is enforced with coverage.', what_nerion_cannot_prove: 'Detection of novel exfiltration techniques.', additional_evidence_required: ['channel coverage denominator'] }),
  'A.8.13': def({ control_id: 'A.8.13', nerion_label: 'Information backup (Nerion test)',
    nerion_assessment_objective: 'Nerion test: backups are created, protected and restore-tested over the period.',
    required_connector_telemetry: ['backup'], required_api_fields: ['backup_immutable_pct', 'restore_test_result'], required_operating_evidence: ['Restore Test Report'],
    relevance_signals: ['backup_immutable_pct'], supported_connectors: ['rubrik', 'cohesity', 'veeam'], evidence_freshness_months: 12,
    pass_conditions: 'Protected backups + passing restore test over the period.', partial_conditions: 'Backups present but no restore test.',
    fail_conditions: 'No backups or failed restores.', not_enough_evidence_conditions: 'No backup telemetry.',
    what_nerion_can_prove: 'That backups exist and restores succeed.', what_nerion_cannot_prove: 'Recovery of an unbacked-up system.', additional_evidence_required: ['Restore Test Report'] }),
  'A.8.15': def({ control_id: 'A.8.15', nerion_label: 'Logging enabled (Nerion test)',
    nerion_assessment_objective: 'Nerion test: security-relevant events are logged from the required sources and retained; SIEM telemetry corroborates source coverage.',
    required_connector_telemetry: ['siem'], required_api_fields: ['critical_log_source_coverage_pct', 'monitoring_scope_denominator'],
    relevance_signals: ['siem_log_sources'], supported_connectors: ['splunk', 'sentinel', 'elastic', 'qradar'], required_denominator: 'expected log-source inventory', evidence_freshness_months: 1,
    pass_conditions: 'Required log sources reporting against the expected inventory.', partial_conditions: 'Sources reporting but no expected-source denominator.',
    fail_conditions: 'Missing critical log sources.', not_enough_evidence_conditions: 'No logging telemetry.',
    what_nerion_can_prove: 'That logging is enabled with source coverage.', what_nerion_cannot_prove: 'That logs are reviewed (see monitoring / 9.1).', additional_evidence_required: ['expected log-source inventory'] }),
  'A.8.16': def({ control_id: 'A.8.16', nerion_label: 'Monitoring activities (Nerion test)',
    nerion_assessment_objective: 'Nerion test: networks, systems and applications are monitored for anomalies with detections generated over the period.',
    required_connector_telemetry: ['siem'], required_api_fields: ['detection_events', 'alert_forwarding'], relevance_signals: ['siem_log_sources', 'edr_pct'], supported_connectors: ['splunk', 'sentinel', 'crowdstrike'], required_denominator: 'monitored-asset inventory', evidence_freshness_months: 1,
    pass_conditions: 'Active monitoring with detections and alert forwarding over the period.', partial_conditions: 'Monitoring present but no denominator/coverage.',
    fail_conditions: 'No monitoring.', not_enough_evidence_conditions: 'No monitoring telemetry.',
    what_nerion_can_prove: 'That monitoring is live and generating detections.', what_nerion_cannot_prove: 'Analyst triage quality.', additional_evidence_required: ['monitored-asset inventory'] }),
  'A.8.24': def({ control_id: 'A.8.24', nerion_label: 'Use of cryptography (Nerion test)',
    nerion_assessment_objective: 'Nerion test: a cryptography standard defines approved algorithms and key management, and encryption is applied to in-scope data (document + posture indicators).',
    required_document_evidence: ['Encryption Policy'], required_operating_evidence: [], relevance_signals: ['cspm_pct'], evidence_freshness_months: 12,
    pass_conditions: 'Approved crypto standard + evidence of encryption at rest/in transit.', partial_conditions: 'Standard present but no encryption evidence.',
    fail_conditions: 'No crypto standard.', not_enough_evidence_conditions: 'No encryption policy provided.',
    what_nerion_can_prove: 'That a cryptography standard exists and is applied.', what_nerion_cannot_prove: 'Key-management operational hygiene end to end.', additional_evidence_required: ['Encryption Policy'] }),
  'A.8.28': def({ control_id: 'A.8.28', nerion_label: 'Secure coding (Nerion test)',
    nerion_assessment_objective: 'Nerion test: secure development practices are defined and applied — code review, SAST/dependency scanning gates evidenced in the pipeline.',
    required_connector_telemetry: ['change'], required_document_evidence: ['Secure development standard'], required_api_fields: ['code_scanning_open', 'dependabot_critical'], supported_connectors: ['github'], evidence_freshness_months: 3,
    pass_conditions: 'Secure-coding standard + scanning gates with no open critical findings.', partial_conditions: 'Standard present but no pipeline scanning evidence.',
    fail_conditions: 'No secure development practices.', not_enough_evidence_conditions: 'No standard or pipeline telemetry.',
    what_nerion_can_prove: 'That secure-coding gates are defined and running.', what_nerion_cannot_prove: 'Absence of all logic flaws.', additional_evidence_required: ['Secure development standard'] }),
};

function get(controlId) { return REGISTRY[controlId] || null; }
function all() { return Object.keys(REGISTRY).map((k) => REGISTRY[k]); }

module.exports = { REGISTRY, get, all, framework: FRAMEWORK };
