'use strict';

/** hipaa_164_assessment_registry — framework-NATIVE and ePHI-SCOPED. HIPAA is
 * assessed directly, never derived from CSF. Every control is Conditional until
 * the ePHI system boundary is known. */

const M = require('../evidenceModel');
const { makeTest } = require('../testKit');
const { EVIDENCE_LAYER, ASSESSMENT_TYPE } = M;
const FRAMEWORK = 'HIPAA Security Rule §164';
const def = (o) => Object.assign({ framework: FRAMEWORK, assessment_type: ASSESSMENT_TYPE.SEMI_AUTOMATED, validation_status: 'documented_not_live_validated', live_tenant_validated: false, last_validated_at: null, evidence_freshness_requirement: 30, exception_handling: 'Unapproved exceptions block Effective; ePHI scope is a precondition.', optional_signals: [], required_time_period: 'review period', required_scope: 'ePHI systems in scope' }, o);

const REGISTRY = {
  '164.312(d)': def({
    control_id: '164.312(d)', control_name: 'Person or Entity Authentication',
    control_objective: 'Verify that a person or entity seeking access to ePHI is the one claimed.',
    evidence_layer_supported: [EVIDENCE_LAYER.RELEVANCE, EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: ['mfa_pct'],
    required_api_fields: ['ephi_system_list', 'authentication_enforced_on_ephi', 'signin_logs_ephi', 'ephi_signins_without_mfa'],
    required_denominator_source: 'ePHI system inventory + user directory',
    pass_conditions: 'Authentication (incl. MFA) enforced on ePHI systems with no unauthenticated access over the review period.',
    fail_conditions: 'Unauthenticated/non-MFA ePHI access observed.',
    partial_conditions: 'Tenant mfa_pct present but ePHI-system authentication evidence missing.',
    control_limitations: 'Global mfa_pct is not ePHI-scoped authentication evidence; ePHI scope is required.',
    cannot_conclude_without: ['ePHI system list', 'ePHI sign-in logs for the review period'],
    supported_connectors: ['okta', 'entra', 'ping', 'duo', 'onelogin'],
    test: makeTest({ ephiScoped: true, relevanceSignals: ['mfa_pct'], designFields: ['authentication_enforced_on_ephi'], oeFields: ['ephi_system_list', 'signin_logs_ephi', 'ephi_signins_without_mfa'], populationField: 'ephi_system_list', pass: (ev) => (Number(M.field(ev, 'ephi_signins_without_mfa')) || 0) === 0, relevanceProves: 'Tenant MFA adoption — not ePHI-scoped.', proves: 'Authentication enforced on ePHI systems over the review period.', notProve: 'Non-ePHI systems.', passMsg: 'ePHI authentication enforced with no unauthenticated access.', failMsg: 'Unauthenticated ePHI access observed.' }),
  }),

  '164.312(a)(1)': def({
    control_id: '164.312(a)(1)', control_name: 'Access Control',
    control_objective: 'Allow access to ePHI only to authorized persons/software (unique ID, emergency access, auto-logoff, encryption).',
    evidence_layer_supported: [EVIDENCE_LAYER.DESIGN, EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: ['pam_pct'],
    required_api_fields: ['ephi_system_list', 'unique_user_ids_enforced', 'emergency_access_procedure', 'auto_logoff_configured', 'ephi_access_review_records'],
    required_denominator_source: 'ePHI system inventory',
    pass_conditions: 'Access-control mechanisms enforced on ePHI systems and reviewed over the review period.',
    fail_conditions: 'Shared IDs, no auto-logoff, or unreviewed ePHI access.',
    partial_conditions: 'Some access-control config present but review evidence missing.',
    control_limitations: 'pam_pct is not ePHI access-control evidence.',
    cannot_conclude_without: ['ePHI system list', 'ePHI access review records'],
    supported_connectors: ['okta', 'entra', 'sailpoint', 'cyberark'],
    test: makeTest({ ephiScoped: true, relevanceSignals: ['pam_pct'], designFields: ['unique_user_ids_enforced', 'emergency_access_procedure', 'auto_logoff_configured'], oeFields: ['ephi_system_list', 'ephi_access_review_records'], populationField: 'ephi_system_list', proves: 'Access control enforced and reviewed on ePHI systems over the review period.', notProve: 'Encryption strength unless key data supplied.', noneMsg: 'No ePHI access-control evidence for 164.312(a)(1).' }),
  }),

  '164.312(b)': def({
    control_id: '164.312(b)', control_name: 'Audit Controls',
    control_objective: 'Record and examine activity in information systems that contain or use ePHI.',
    evidence_layer_supported: [EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: ['siem_log_sources'],
    required_api_fields: ['ephi_system_list', 'ephi_audit_logging_enabled', 'ephi_log_sources_reporting', 'ephi_log_sources_expected'],
    required_denominator_source: 'ePHI system inventory (expected log sources)',
    pass_conditions: 'Audit logging enabled on all ePHI systems with complete log-source coverage over the review period.',
    fail_conditions: 'ePHI systems without audit logging.',
    partial_conditions: 'Some ePHI logging present but expected-source coverage incomplete.',
    control_limitations: 'siem_log_sources without an expected ePHI-source denominator is not coverage.',
    cannot_conclude_without: ['ePHI system list', 'expected vs reporting ePHI log sources'],
    supported_connectors: ['splunk', 'sentinel', 'elastic', 'qradar'],
    test: makeTest({ ephiScoped: true, relevanceSignals: ['siem_log_sources'], designFields: [], oeFields: ['ephi_system_list', 'ephi_audit_logging_enabled', 'ephi_log_sources_reporting', 'ephi_log_sources_expected'], pass: (ev) => (Number(M.field(ev, 'ephi_log_sources_reporting')) || 0) >= (Number(M.field(ev, 'ephi_log_sources_expected')) || Infinity), proves: 'Audit logging operated across all ePHI systems over the review period.', notProve: 'Log content adequacy.', passMsg: 'All expected ePHI log sources reporting.', failMsg: 'ePHI log sources missing.' }),
  }),

  '164.308(a)(1)(ii)(D)': def({
    control_id: '164.308(a)(1)(ii)(D)', control_name: 'Information System Activity Review',
    control_objective: 'Regularly review records of information system activity (audit logs, access reports, incident tracking).',
    evidence_layer_supported: [EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: [],
    required_api_fields: ['ephi_system_list', 'activity_review_records', 'review_cadence', 'reviewer_identity'],
    required_denominator_source: 'ePHI system inventory',
    pass_conditions: 'System-activity reviews performed on cadence for ePHI systems over the review period.',
    fail_conditions: 'No activity reviews performed.',
    partial_conditions: 'Cadence defined but review records incomplete.',
    control_limitations: 'Automated log collection is not the same as review.',
    cannot_conclude_without: ['activity review records', 'reviewer identity'],
    supported_connectors: ['splunk', 'sentinel', 'elastic', 'qradar'],
    test: makeTest({ ephiScoped: true, relevanceSignals: [], designFields: ['review_cadence'], oeFields: ['ephi_system_list', 'activity_review_records', 'reviewer_identity'], proves: 'Information-system activity reviewed for ePHI systems over the review period.', notProve: 'Reviewer judgment quality.', noneMsg: 'No activity-review evidence for 164.308(a)(1)(ii)(D).' }),
  }),

  '164.308(a)(7)': def({
    control_id: '164.308(a)(7)', control_name: 'Contingency Plan',
    control_objective: 'Data backup, disaster recovery and emergency-mode operation for ePHI.',
    evidence_layer_supported: [EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: ['backup_immutable_pct'],
    required_api_fields: ['ephi_system_list', 'ephi_backup_success', 'ephi_restore_test_result', 'restore_integrity_verification'],
    required_denominator_source: 'ePHI system inventory',
    pass_conditions: 'ePHI systems backed up and restore-tested with verified integrity over the review period.',
    fail_conditions: 'ePHI backup failures or no restore test.',
    partial_conditions: 'Backups present but restore not tested for ePHI systems.',
    control_limitations: 'backup_immutable_pct alone does not evidence ePHI contingency operation.',
    cannot_conclude_without: ['ePHI backup success', 'ePHI restore test result'],
    supported_connectors: ['rubrik', 'veeam', 'cohesity', 'commvault', 'dell_powerprotect'],
    test: makeTest({ ephiScoped: true, relevanceSignals: ['backup_immutable_pct'], designFields: [], oeFields: ['ephi_system_list', 'ephi_backup_success', 'ephi_restore_test_result', 'restore_integrity_verification'], pass: (ev) => String(M.field(ev, 'ephi_restore_test_result')).toLowerCase() === 'pass' && M.field(ev, 'restore_integrity_verification') === true, proves: 'ePHI contingency (backup + tested restore) operated over the review period.', notProve: 'Emergency-mode operation unless separately evidenced.', passMsg: 'ePHI backups and restore test passed with integrity verified.', failMsg: 'ePHI backup/restore evidence incomplete or failed.' }),
  }),
};

module.exports = { framework: FRAMEWORK, REGISTRY };
