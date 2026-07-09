'use strict';

/** soc2_2017_tsc_assessment_registry — framework-NATIVE, criterion-specific. Not
 * derived from CSF. Common Criteria are kept distinct from Availability,
 * Confidentiality, Processing Integrity and Privacy — a signal is only assigned
 * to a criterion its evidence actually supports. */

const M = require('../evidenceModel');
const { makeTest } = require('../testKit');
const { COPYRIGHT_FLAGS } = require('../native/copyrightSafety');
const { EVIDENCE_LAYER, ASSESSMENT_TYPE } = M;
const FRAMEWORK = 'SOC 2 (2017 TSC)';
// Copyright-safe: control_name / control_objective are Nerion-AUTHORED descriptions
// of Nerion's own evidence test — never the official AICPA Trust Services Criteria text.
const def = (o) => Object.assign({ framework: FRAMEWORK, assessment_type: ASSESSMENT_TYPE.AUTOMATED, validation_status: 'documented_not_live_validated', live_tenant_validated: false, last_validated_at: null, evidence_freshness_requirement: 30, exception_handling: 'Unapproved exceptions block Effective.', optional_signals: [], required_time_period: 'review period (Type II window)', required_scope: 'system boundary in scope' }, COPYRIGHT_FLAGS, o);

const REGISTRY = {
  'CC6.1': def({
    control_id: 'CC6.1', control_name: 'Logical access controls (Nerion test)', category: 'Common Criteria',
    control_objective: 'Nerion test: logical access is enforced (authentication / MFA / privileged access), access is reviewed, and exceptions are governed over the review period.',
    evidence_layer_supported: [EVIDENCE_LAYER.DESIGN, EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: ['mfa_pct', 'pam_pct'],
    required_api_fields: ['access_control_policy', 'authentication_enforced', 'access_review_records', 'access_exceptions'],
    required_denominator_source: 'in-scope system user directory',
    pass_conditions: 'Logical access controls enforced and reviewed over the SOC 2 window with exceptions handled.',
    fail_conditions: 'Unenforced access controls or unhandled exceptions.',
    partial_conditions: 'Policy present but operation over the window not evidenced.',
    control_limitations: 'A single MFA metric is partial; CC6.1 requires enforced logical access + review over the window.',
    cannot_conclude_without: ['access control policy', 'access review records for the window'],
    supported_connectors: ['okta', 'entra', 'sailpoint', 'cyberark'],
    test: makeTest({ relevanceSignals: ['mfa_pct', 'pam_pct'], designFields: ['access_control_policy'], oeFields: ['authentication_enforced', 'access_review_records', 'access_exceptions'], proves: 'Logical access security operated over the SOC 2 window.', notProve: 'User-provisioning approval flow (see CC6.2).', noneMsg: 'No logical-access evidence for CC6.1.' }),
  }),

  'CC6.2': def({
    control_id: 'CC6.2', control_name: 'User provisioning & authorization (Nerion test)', category: 'Common Criteria',
    control_objective: 'Nerion test: users are authorized before access is granted, and provisioning/deprovisioning is evidenced over the review period.',
    evidence_layer_supported: [EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: [],
    required_api_fields: ['provisioning_approval_records', 'new_user_events', 'deprovisioning_events', 'unapproved_provisioning_count'],
    required_denominator_source: 'joiner/mover/leaver event stream',
    pass_conditions: 'Every access grant is preceded by an approval, and leavers are deprovisioned, over the window.',
    fail_conditions: 'Access granted without approval.',
    partial_conditions: 'Provisioning events present but approval linkage missing.',
    control_limitations: 'mfa_pct is unrelated to registration/authorization.',
    cannot_conclude_without: ['provisioning approval records'],
    supported_connectors: ['sailpoint', 'saviynt', 'okta', 'entra'],
    test: makeTest({ relevanceSignals: [], designFields: [], oeFields: ['provisioning_approval_records', 'new_user_events', 'deprovisioning_events', 'unapproved_provisioning_count'], pass: (ev) => (Number(M.field(ev, 'unapproved_provisioning_count')) || 0) === 0, proves: 'User registration/authorization operated with approvals over the window.', notProve: 'Ongoing least-privilege appropriateness.', passMsg: 'All access grants approved; leavers deprovisioned.', failMsg: 'Unapproved provisioning observed.', noneMsg: 'No provisioning-approval evidence for CC6.2.' }),
  }),

  'CC7.1': def({
    control_id: 'CC7.1', control_name: 'Vulnerability & configuration monitoring (Nerion test)', category: 'Common Criteria',
    control_objective: 'Nerion test: configuration drift and newly discovered vulnerabilities are detected and remediated within SLA over the review period.',
    evidence_layer_supported: [EVIDENCE_LAYER.RELEVANCE, EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: ['critical_vuln_free_pct', 'vuln_sla_pct', 'cspm_pct'],
    required_api_fields: ['scan_coverage_denominator', 'vuln_scan_cadence', 'config_monitoring_enabled', 'open_critical_vulns', 'remediation_sla_met'],
    required_denominator_source: 'asset inventory (scan scope)',
    pass_conditions: 'Vulnerability scanning and configuration monitoring operate on cadence with SLA-met remediation over the window.',
    fail_conditions: 'Unscanned assets or unremediated critical vulns past SLA.',
    partial_conditions: 'A posture percentage present but scan-coverage denominator or cadence missing.',
    control_limitations: 'cspm_pct / vuln percentages are indicators without scan-coverage denominator and cadence.',
    cannot_conclude_without: ['scan coverage denominator', 'remediation SLA evidence'],
    supported_connectors: ['qualys', 'tenable', 'rapid7', 'defender_vm', 'wiz', 'prisma'],
    test: makeTest({ relevanceSignals: ['critical_vuln_free_pct', 'vuln_sla_pct', 'cspm_pct'], designFields: ['config_monitoring_enabled'], oeFields: ['scan_coverage_denominator', 'vuln_scan_cadence', 'open_critical_vulns', 'remediation_sla_met'], populationField: 'scan_coverage_denominator', pass: (ev) => (Number(M.field(ev, 'open_critical_vulns')) || 0) === 0 && M.field(ev, 'remediation_sla_met') === true, relevanceProves: 'A posture indicator is present.', proves: 'Vulnerability + config monitoring operated with SLA-met remediation over the window.', notProve: 'Penetration-test depth.', passMsg: 'Scanning on cadence; no open critical vulns past SLA.', failMsg: 'Open critical vulns or SLA breaches.' }),
  }),

  'CC8.1': def({
    control_id: 'CC8.1', control_name: 'Change management (Nerion test)', category: 'Common Criteria',
    control_objective: 'Nerion test: changes are authorized, tested and approved, with no unauthorized changes over the review period.',
    evidence_layer_supported: [EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: ['change_pass_pct'],
    required_api_fields: ['change_records', 'change_approvals', 'change_testing_evidence', 'unauthorized_changes'],
    required_denominator_source: 'change/deployment event stream',
    pass_conditions: 'Changes are approved and tested before implementation with no unauthorized changes over the window.',
    fail_conditions: 'Unauthorized or untested changes deployed.',
    partial_conditions: 'Change records present but approval/testing linkage missing.',
    control_limitations: 'A change-pass percentage is an indicator; CC8.1 requires per-change approval + testing evidence.',
    cannot_conclude_without: ['change approval records', 'change testing evidence'],
    supported_connectors: ['github', 'servicenow_grc', 'sap'],
    test: makeTest({ relevanceSignals: ['change_pass_pct'], designFields: [], oeFields: ['change_records', 'change_approvals', 'change_testing_evidence', 'unauthorized_changes'], pass: (ev) => (Number(M.field(ev, 'unauthorized_changes')) || 0) === 0, relevanceProves: 'A change-governance indicator is present.', proves: 'Change management operated with approvals + testing over the window.', notProve: 'Code quality of each change.', passMsg: 'Changes approved and tested; no unauthorized changes.', failMsg: 'Unauthorized or untested changes deployed.' }),
  }),

  // Privacy criterion — only assessable with real privacy evidence, never from a security signal.
  'P5.1': def({
    control_id: 'P5.1', control_name: 'Data-subject access requests (Nerion test)', category: 'Privacy', assessment_type: ASSESSMENT_TYPE.SEMI_AUTOMATED,
    control_objective: 'Nerion test: data-subject access requests are fulfilled within the required window, with none overdue over the review period.',
    evidence_layer_supported: [EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: ['dsar_open', 'dsar_overdue'],
    required_api_fields: ['dsar_request_records', 'dsar_fulfilled', 'dsar_overdue', 'identity_verification_on_dsar'],
    required_denominator_source: 'DSAR request log',
    pass_conditions: 'Data-subject access requests fulfilled within SLA with identity verification over the window.',
    fail_conditions: 'Overdue or unverified DSARs.',
    partial_conditions: 'DSAR volume present but fulfillment/verification evidence missing.',
    control_limitations: 'Security signals (mfa_pct, access reviews) do NOT support a Privacy criterion. Only DSAR/privacy evidence does.',
    cannot_conclude_without: ['DSAR request + fulfillment records'],
    supported_connectors: ['onetrust', 'trustarc'],
    test: makeTest({ relevanceSignals: ['dsar_open', 'dsar_overdue'], designFields: [], oeFields: ['dsar_request_records', 'dsar_fulfilled', 'dsar_overdue', 'identity_verification_on_dsar'], pass: (ev) => (Number(M.field(ev, 'dsar_overdue')) || 0) === 0, proves: 'Data-subject access requests fulfilled over the window.', notProve: 'Anything about security controls.', noneMsg: 'No DSAR/privacy evidence for P5.1 — this Privacy criterion is not supported by security signals.' }),
  }),
};

module.exports = { framework: FRAMEWORK, REGISTRY };
