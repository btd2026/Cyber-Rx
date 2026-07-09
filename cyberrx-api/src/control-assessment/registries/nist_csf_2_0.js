'use strict';

/** nist_csf_2_0_assessment_registry — framework-NATIVE. No derivation from any
 * other framework. CSF verdicts come only from CSF-native evidence tests. */

const M = require('../evidenceModel');
const { makeTest } = require('../testKit');
const { EVIDENCE_LAYER, ASSESSMENT_TYPE } = M;
const FRAMEWORK = 'NIST CSF 2.0';
const def = (o) => Object.assign({ framework: FRAMEWORK, assessment_type: ASSESSMENT_TYPE.AUTOMATED, validation_status: 'documented_not_live_validated', live_tenant_validated: false, last_validated_at: null, evidence_freshness_requirement: 30, exception_handling: 'Unapproved exceptions block Effective.', optional_signals: [], required_time_period: 'review period', required_scope: 'authoritative population' }, o);

const REGISTRY = {
  'PR.AA-01': def({
    control_id: 'PR.AA-01', control_name: 'Identities and credentials are managed',
    control_objective: 'Identities and credentials for authorized users, services and hardware are issued, managed, verified, revoked and audited.',
    evidence_layer_supported: [EVIDENCE_LAYER.DESIGN, EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: [],
    required_api_fields: ['identity_lifecycle_events', 'credential_issuance_records', 'credential_revocation_events', 'identity_inventory_source'],
    required_denominator_source: 'authoritative identity inventory',
    pass_conditions: 'Identity/credential issuance, verification and revocation operate over the review period.',
    fail_conditions: 'Stale/unrevoked credentials or unmanaged identities.',
    partial_conditions: 'Identity inventory present but lifecycle events incomplete.',
    control_limitations: 'MFA adoption (mfa_pct) is NOT evidence of identity/credential lifecycle management.',
    cannot_conclude_without: ['identity lifecycle events', 'credential issuance/revocation records'],
    supported_connectors: ['okta', 'entra', 'sailpoint', 'saviynt'],
    test: makeTest({ relevanceSignals: [], designFields: ['identity_inventory_source'], oeFields: ['identity_lifecycle_events', 'credential_issuance_records', 'credential_revocation_events'], populationField: 'identity_inventory_source', proves: 'Identity and credential lifecycle operated over the review period.', notProve: 'Authentication enforcement at sign-in (see PR.AA-03).', noneMsg: 'No identity-lifecycle evidence; PR.AA-01 is not evidenced by MFA adoption.' }),
  }),

  'PR.AA-03': def({
    control_id: 'PR.AA-03', control_name: 'Users, services and hardware are authenticated',
    control_objective: 'Authentication is required and proportionate to risk (e.g., phishing-resistant MFA), enforced at sign-in.',
    evidence_layer_supported: [EVIDENCE_LAYER.RELEVANCE, EVIDENCE_LAYER.DESIGN, EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: ['mfa_pct'],
    required_api_fields: ['mfa_enforcement_policy', 'signin_logs', 'signins_without_mfa', 'active_user_denominator'],
    required_denominator_source: 'authoritative active-user directory',
    pass_conditions: 'MFA enforced at sign-in across the population over the review period with zero non-MFA sign-ins.',
    fail_conditions: 'Non-MFA sign-ins observed during the review period.',
    partial_conditions: 'Enrollment (mfa_pct) present but sign-in enforcement evidence missing — partial only.',
    control_limitations: 'Enrollment coverage alone is partial; only sign-in enforcement over time is operating-effectiveness evidence.',
    cannot_conclude_without: ['sign-in logs for the review period', 'enforcement policy', 'active-user denominator'],
    supported_connectors: ['okta', 'entra', 'ping', 'duo', 'onelogin'],
    test: makeTest({ relevanceSignals: ['mfa_pct'], designFields: ['mfa_enforcement_policy'], oeFields: ['signin_logs', 'signins_without_mfa', 'active_user_denominator'], populationField: 'active_user_denominator', pass: (ev) => (Number(M.field(ev, 'signins_without_mfa')) || 0) === 0, relevanceProves: 'MFA enrollment coverage (adoption) — partial evidence only.', designProves: 'An MFA enforcement policy exists.', proves: 'MFA was enforced at sign-in across the population over the review period.', notProve: 'Factor phishing-resistance unless factor data is supplied.', passMsg: 'MFA enforced at sign-in with no non-MFA sign-ins over the review period.', failMsg: 'Non-MFA sign-ins observed during the review period.' }),
  }),

  'PR.AA-05': def({
    control_id: 'PR.AA-05', control_name: 'Access permissions enforce least privilege and separation of duties',
    control_objective: 'Access is granted, reviewed and enforced on least-privilege and separation-of-duties principles.',
    evidence_layer_supported: [EVIDENCE_LAYER.DESIGN, EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: ['pam_pct'],
    required_api_fields: ['access_review_records', 'excessive_privilege_findings', 'sod_conflict_findings', 'remediation_events'],
    required_denominator_source: 'entitlement / privileged-account inventory',
    pass_conditions: 'Access reviews completed; least-privilege and SoD findings remediated over the review period.',
    fail_conditions: 'Open excessive-privilege or SoD conflicts.',
    partial_conditions: 'Reviews configured but findings/remediation incomplete.',
    control_limitations: 'pam_pct (vaulting coverage) is not least-privilege/SoD evidence.',
    cannot_conclude_without: ['access review records', 'SoD/excessive-privilege findings'],
    supported_connectors: ['sailpoint', 'saviynt', 'cyberark', 'entra_id_gov'],
    test: makeTest({ relevanceSignals: ['pam_pct'], designFields: ['access_review_records'], oeFields: ['excessive_privilege_findings', 'sod_conflict_findings', 'remediation_events'], pass: (ev) => (Number(M.field(ev, 'excessive_privilege_findings')) || 0) === 0 && (Number(M.field(ev, 'sod_conflict_findings')) || 0) === 0, proves: 'Least-privilege and SoD reviews operated with remediation over the review period.', notProve: 'Task-level appropriateness of every entitlement.', passMsg: 'Reviews completed with no open excessive-privilege or SoD findings.', failMsg: 'Open excessive-privilege or SoD conflicts.' }),
  }),

  'DE.CM-09': def({
    control_id: 'DE.CM-09', control_name: 'Computing hardware, software and data are monitored',
    control_objective: 'Endpoints, runtime environments and data are monitored to find potentially adverse events.',
    evidence_layer_supported: [EVIDENCE_LAYER.RELEVANCE, EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: ['edr_pct'],
    required_api_fields: ['endpoint_denominator', 'active_sensor_count', 'stale_sensor_count', 'detection_events'],
    required_denominator_source: 'CMDB / MDM / EDR endpoint inventory',
    pass_conditions: 'Sensor coverage complete against the endpoint denominator and detections operate over the review period.',
    fail_conditions: 'Unmanaged endpoints or no detections.',
    partial_conditions: 'edr_pct present but denominator/detection evidence missing.',
    control_limitations: 'edr_pct proves sensor coverage only; it is not incident-containment evidence.',
    cannot_conclude_without: ['endpoint denominator', 'detection events for the review period'],
    supported_connectors: ['crowdstrike', 'defender', 'sentinelone', 'cortexxdr', 'trendmicro'],
    test: makeTest({ relevanceSignals: ['edr_pct'], designFields: [], oeFields: ['endpoint_denominator', 'active_sensor_count', 'stale_sensor_count', 'detection_events'], populationField: 'endpoint_denominator', pass: (ev) => (Number(M.field(ev, 'stale_sensor_count')) || 0) === 0, relevanceProves: 'EDR sensor coverage indicator.', proves: 'Endpoint/data monitoring operated across the endpoint population over the review period.', notProve: 'Containment or response actions.', passMsg: 'Full sensor coverage with detections operating over the review period.', failMsg: 'Stale/unmanaged sensors present.' }),
  }),

  'PR.DS-11': def({
    control_id: 'PR.DS-11', control_name: 'Backups of data are created, protected, maintained and tested',
    control_objective: 'Backups are made, protected (e.g., immutable), maintained and periodically tested.',
    evidence_layer_supported: [EVIDENCE_LAYER.RELEVANCE, EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: ['backup_immutable_pct'],
    required_api_fields: ['critical_system_denominator', 'last_successful_backup', 'backup_failure_count', 'immutable_backup_coverage', 'last_restore_test'],
    required_denominator_source: 'critical-system inventory',
    pass_conditions: 'Backups created, protected and tested (restore test) across critical systems over the review period.',
    fail_conditions: 'Backup failures or no restore test.',
    partial_conditions: 'Immutability coverage present but denominator/test evidence missing.',
    control_limitations: 'backup_immutable_pct proves protection, not that backups were created for all critical systems or tested.',
    cannot_conclude_without: ['critical-system denominator', 'restore test evidence'],
    supported_connectors: ['rubrik', 'veeam', 'cohesity', 'commvault', 'dell_powerprotect'],
    test: makeTest({ relevanceSignals: ['backup_immutable_pct'], designFields: [], oeFields: ['critical_system_denominator', 'last_successful_backup', 'backup_failure_count', 'immutable_backup_coverage', 'last_restore_test'], populationField: 'critical_system_denominator', pass: (ev) => (Number(M.field(ev, 'backup_failure_count')) || 0) === 0, relevanceProves: 'Backup immutability coverage indicator.', proves: 'Backups created, protected and tested across critical systems over the review period.', notProve: 'Restore integrity (see RC.RP-03).', passMsg: 'Backups created, protected and restore-tested with no failures over the review period.', failMsg: 'Backup failures during the review period.' }),
  }),

  'RC.RP-03': def({
    control_id: 'RC.RP-03', control_name: 'The integrity of backups is verified prior to restoration',
    control_objective: 'Backup integrity is confirmed before it is used to restore.',
    evidence_layer_supported: [EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: ['backup_immutable_pct'],
    required_api_fields: ['restore_integrity_verification', 'restore_test_result', 'last_restore_test'],
    required_denominator_source: 'critical-system recovery inventory',
    pass_conditions: 'Backup integrity verified and a restore test passed over the review period.',
    fail_conditions: 'No integrity verification or failed restore test.',
    partial_conditions: 'Restore attempted but integrity not verified.',
    control_limitations: 'backup_immutable_pct does NOT prove restore integrity. Integrity verification evidence is required.',
    cannot_conclude_without: ['restore integrity verification', 'restore test result'],
    supported_connectors: ['rubrik', 'veeam', 'cohesity', 'commvault', 'dell_powerprotect'],
    test: makeTest({ relevanceSignals: ['backup_immutable_pct'], designFields: [], oeFields: ['restore_integrity_verification', 'restore_test_result', 'last_restore_test'], pass: (ev) => M.field(ev, 'restore_integrity_verification') === true && String(M.field(ev, 'restore_test_result')).toLowerCase() === 'pass', relevanceProves: 'Backup immutability indicator — not restore-integrity evidence.', proves: 'Backup integrity verified prior to restoration over the review period.', notProve: 'Recovery of untested systems.', passMsg: 'Restore integrity verified and restore test passed.', failMsg: 'Integrity not verified or restore test failed.', noneMsg: 'No restore-integrity evidence for RC.RP-03; backup immutability is not proof of restore integrity.' }),
  }),
};

module.exports = { framework: FRAMEWORK, REGISTRY };
