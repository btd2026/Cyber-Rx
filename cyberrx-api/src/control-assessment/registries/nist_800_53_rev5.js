'use strict';

/**
 * nist_800_53_rev5_assessment_registry — framework-NATIVE control assessments.
 * Every control's verdict comes from its OWN evidence test. Nothing here is
 * derived from CSF, CIS, HIPAA or SOC 2. Relevance signals are named, but only
 * operating-effectiveness evidence over a review period can conclude Effective.
 */

const M = require('../evidenceModel');
const { STATUS, EVIDENCE_LAYER, EVIDENCE_STRENGTH, ASSESSMENT_TYPE } = M;
const num = (v) => (v == null ? null : Number(v));

const FRAMEWORK = 'NIST SP 800-53 Rev 5';
const def = (o) => Object.assign({ framework: FRAMEWORK, assessment_type: ASSESSMENT_TYPE.AUTOMATED,
  validation_status: 'documented_not_live_validated', live_tenant_validated: false, last_validated_at: null,
  evidence_freshness_requirement: 30, exception_handling: 'Unapproved exceptions prevent an Effective conclusion; approved exceptions are recorded and excluded from failure.',
  optional_signals: [], required_scope: 'authoritative population in scope', required_time_period: 'review period (e.g. 90 days)' }, o);

const REGISTRY = {
  'IA-2': def({
    control_id: 'IA-2', control_name: 'Identification and Authentication (Organizational Users)',
    control_objective: 'Uniquely identify and authenticate organizational users; enforce MFA for privileged and network access.',
    evidence_layer_supported: [EVIDENCE_LAYER.RELEVANCE, EVIDENCE_LAYER.DESIGN, EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: ['mfa_pct'],
    required_api_fields: ['active_user_denominator', 'mfa_enforcement_policy', 'policy_assignment_scope', 'app_resource_scope', 'signin_logs', 'signins_without_mfa', 'failed_mfa_events', 'bypassed_mfa_events'],
    required_denominator_source: 'authoritative active-user directory (IdP)',
    pass_conditions: 'MFA enforced by policy across the assigned population and app scope, with zero non-MFA sign-ins and zero unapproved bypasses over the review period.',
    fail_conditions: 'Non-MFA sign-ins or unapproved bypasses observed during the review period.',
    partial_conditions: 'Enforcement policy present but sign-in evidence or population/scope incomplete.',
    control_limitations: 'mfa_pct alone is an adoption indicator; it does not prove sign-in enforcement or factor strength.',
    cannot_conclude_without: ['authoritative active-user denominator', 'sign-in logs for the review period', 'MFA enforcement policy'],
    supported_connectors: ['okta', 'entra', 'ping', 'duo', 'onelogin'],
    test(ev) {
      const rel = M.hasSignal(ev, 'mfa_pct');
      const denom = M.signalDenominatorSource(ev, 'mfa_pct') || (M.hasField(ev, 'active_user_denominator') ? 'active_user_denominator' : null);
      const oe = ['mfa_enforcement_policy', 'policy_assignment_scope', 'app_resource_scope', 'signin_logs', 'signins_without_mfa', 'failed_mfa_events', 'bypassed_mfa_events'];
      if (!rel && !M.hasField(ev, 'mfa_enforcement_policy')) return M.notEnough(this, 'No MFA adoption signal or enforcement evidence for IA-2.', ['mfa_pct or mfa_enforcement_policy']);
      const missing = [];
      if (!denom) missing.push('authoritative active-user denominator');
      M.missingFields(ev, oe).forEach((f) => missing.push(f));
      if (!M.reviewPeriodDefined(ev)) missing.push('review_period');
      if (missing.length) return M.conclude(this, ev, {
        status: STATUS.NOT_ENOUGH_EVIDENCE, evidence_layer: EVIDENCE_LAYER.RELEVANCE,
        evidence_strength: rel ? EVIDENCE_STRENGTH.INDICATOR : EVIDENCE_STRENGTH.NOT_EVIDENCE,
        signals_used: rel ? ['mfa_pct'] : [], missing_required_evidence: missing, population_source: denom,
        what_the_api_proves: 'MFA enrollment coverage among users (adoption).',
        what_the_api_does_not_prove: 'That MFA was enforced at sign-in for the authoritative population over the review period.',
      });
      const withoutMfa = num(M.field(ev, 'signins_without_mfa')) || 0;
      const bypassed = num(M.field(ev, 'bypassed_mfa_events')) || 0;
      const unapproved = num(M.field(ev, 'unapproved_exception_count')) || 0;
      const pass = withoutMfa === 0 && bypassed === 0 && unapproved === 0;
      return M.conclude(this, ev, {
        status: pass ? STATUS.EFFECTIVE : STATUS.PARTIALLY_EFFECTIVE,
        evidence_layer: EVIDENCE_LAYER.OPERATING_EFFECTIVENESS, evidence_strength: EVIDENCE_STRENGTH.DIRECT,
        signals_used: rel ? ['mfa_pct'] : [], API_fields_used: oe, population_source: denom,
        exception_count: num(M.field(ev, 'exception_count')), approved_exception_count: num(M.field(ev, 'approved_exception_count')), unapproved_exception_count: unapproved,
        pass_fail_rationale: pass ? 'MFA enforced at sign-in with no non-MFA sign-ins or unapproved bypasses over the review period.' : (withoutMfa + ' non-MFA sign-in(s) and ' + bypassed + ' bypass(es) observed.'),
        what_the_api_proves: 'MFA was enforced at authentication across the population over the review period.',
        what_the_api_does_not_prove: 'Phishing-resistance/strength of each factor unless factor data is supplied.',
      });
    },
  }),

  'IA-5': def({
    control_id: 'IA-5', control_name: 'Authenticator Management',
    control_objective: 'Manage authenticators through issuance, strength, rotation, revocation and protection.',
    evidence_layer_supported: [EVIDENCE_LAYER.DESIGN, EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: [],
    required_api_fields: ['authenticator_lifecycle', 'credential_policy', 'factor_strength', 'revocation_events', 'admin_reset_logs', 'reset_recovery_process'],
    required_denominator_source: 'authenticator inventory',
    pass_conditions: 'Authenticator lifecycle (issuance→rotation→revocation), factor strength and reset/recovery are evidenced and operated over the review period.',
    fail_conditions: 'Weak factors, stale credentials or unmanaged reset/recovery observed.',
    partial_conditions: 'Some authenticator-management configuration present but incomplete.',
    control_limitations: 'MFA adoption (IA-2) is NOT evidence of authenticator management. IA-5 must not be inferred from IA-2.',
    cannot_conclude_without: ['authenticator lifecycle evidence', 'credential policy', 'reset/recovery process'],
    supported_connectors: ['okta', 'entra', 'ping', 'onelogin'],
    test(ev) {
      const req = ['authenticator_lifecycle', 'credential_policy', 'factor_strength', 'revocation_events', 'admin_reset_logs', 'reset_recovery_process'];
      const missing = M.missingFields(ev, req);
      if (missing.length === req.length) return M.notEnough(this, 'No authenticator-management evidence. IA-5 cannot be inferred from MFA adoption (IA-2).', req, EVIDENCE_LAYER.NONE);
      if (missing.length) return M.conclude(this, ev, {
        status: STATUS.NOT_ENOUGH_EVIDENCE, evidence_layer: EVIDENCE_LAYER.DESIGN, evidence_strength: EVIDENCE_STRENGTH.PARTIAL,
        API_fields_used: req.filter((f) => M.hasField(ev, f)), missing_required_evidence: missing,
        what_the_api_proves: 'Partial authenticator-management configuration exists.',
        what_the_api_does_not_prove: 'That authenticators are managed through their full lifecycle over the review period.',
      });
      if (!M.reviewPeriodDefined(ev)) return M.conclude(this, ev, { status: STATUS.NOT_ENOUGH_EVIDENCE, evidence_layer: EVIDENCE_LAYER.DESIGN, evidence_strength: EVIDENCE_STRENGTH.DIRECT, API_fields_used: req, missing_required_evidence: ['review_period'], what_the_api_proves: 'Authenticator-management design exists.', what_the_api_does_not_prove: 'Operating effectiveness over a defined period.' });
      return M.conclude(this, ev, { status: STATUS.EFFECTIVE, evidence_layer: EVIDENCE_LAYER.OPERATING_EFFECTIVENESS, evidence_strength: EVIDENCE_STRENGTH.DIRECT, API_fields_used: req, pass_fail_rationale: 'Authenticator lifecycle, strength and reset/recovery evidenced and operated over the review period.', what_the_api_proves: 'Authenticators are managed end-to-end over the review period.', what_the_api_does_not_prove: 'Out-of-band manual credential handling.' });
    },
  }),

  'AC-7': def({
    control_id: 'AC-7', control_name: 'Unsuccessful Logon Attempts',
    control_objective: 'Enforce a limit on consecutive invalid logon attempts and lock/delay on exceedance.',
    evidence_layer_supported: [EVIDENCE_LAYER.DESIGN, EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: [],
    required_api_fields: ['failed_login_threshold_policy', 'lockout_duration', 'failed_signin_events', 'lockout_events', 'unlock_events', 'override_events'],
    required_denominator_source: 'authentication event log',
    pass_conditions: 'Lockout threshold/duration configured and lockouts triggered as configured on threshold breaches over the review period.',
    fail_conditions: 'Threshold breaches without lockout, or overrides without approval.',
    partial_conditions: 'Threshold policy present but enforcement events not observed.',
    control_limitations: 'mfa_pct is NOT evidence of lockout enforcement.',
    cannot_conclude_without: ['failed-login threshold policy', 'lockout/unlock events for the review period'],
    supported_connectors: ['okta', 'entra', 'ping', 'onelogin'],
    test(ev) {
      const req = ['failed_login_threshold_policy', 'lockout_duration', 'failed_signin_events', 'lockout_events', 'unlock_events', 'override_events'];
      const missing = M.missingFields(ev, req);
      if (missing.length === req.length) return M.notEnough(this, 'No failed-login / lockout evidence for AC-7. Not inferable from MFA adoption.', req, EVIDENCE_LAYER.NONE);
      if (missing.length || !M.reviewPeriodDefined(ev)) return M.conclude(this, ev, { status: STATUS.NOT_ENOUGH_EVIDENCE, evidence_layer: EVIDENCE_LAYER.DESIGN, evidence_strength: EVIDENCE_STRENGTH.PARTIAL, API_fields_used: req.filter((f) => M.hasField(ev, f)), missing_required_evidence: missing.concat(M.reviewPeriodDefined(ev) ? [] : ['review_period']), what_the_api_proves: 'Lockout policy configuration.', what_the_api_does_not_prove: 'That lockout enforcement operated on real threshold breaches over the review period.' });
      const overrides = num(M.field(ev, 'override_events')) || 0;
      const unapprovedOv = num(M.field(ev, 'unapproved_exception_count')) || 0;
      const pass = unapprovedOv === 0;
      return M.conclude(this, ev, { status: pass ? STATUS.EFFECTIVE : STATUS.PARTIALLY_EFFECTIVE, evidence_layer: EVIDENCE_LAYER.OPERATING_EFFECTIVENESS, evidence_strength: EVIDENCE_STRENGTH.DIRECT, API_fields_used: req, unapproved_exception_count: unapprovedOv, pass_fail_rationale: pass ? 'Lockout enforced on threshold breaches; overrides (' + overrides + ') accounted for.' : 'Unapproved lockout overrides observed.', what_the_api_proves: 'Account-lockout control operated over the review period.', what_the_api_does_not_prove: 'Behavior of systems outside the IdP scope.' });
    },
  }),

  'AC-2': def({
    control_id: 'AC-2', control_name: 'Account Management',
    control_objective: 'Manage account creation, enabling, modification, disabling, removal and monitoring.',
    evidence_layer_supported: [EVIDENCE_LAYER.DESIGN, EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: ['dormant_accounts'],
    required_api_fields: ['account_inventory', 'account_inventory_source', 'joiner_mover_leaver_events', 'disabled_stale_accounts', 'account_review_records'],
    required_denominator_source: 'authoritative account inventory',
    pass_conditions: 'Accounts inventoried; JML events and stale-account disablement operate; periodic reviews completed over the review period.',
    fail_conditions: 'Stale/orphaned accounts left active or JML not operating.',
    partial_conditions: 'Inventory present but lifecycle events/reviews incomplete.',
    control_limitations: 'A dormant-account count alone is an indicator, not proof of account lifecycle management.',
    cannot_conclude_without: ['authoritative account inventory', 'JML lifecycle events', 'account review records'],
    supported_connectors: ['okta', 'entra', 'sailpoint', 'saviynt'],
    test(ev) {
      const req = ['account_inventory', 'account_inventory_source', 'joiner_mover_leaver_events', 'disabled_stale_accounts', 'account_review_records'];
      const missing = M.missingFields(ev, req);
      const rel = M.hasSignal(ev, 'dormant_accounts');
      if (missing.length === req.length) return M.notEnough(this, 'No account-lifecycle evidence for AC-2.', req, rel ? EVIDENCE_LAYER.RELEVANCE : EVIDENCE_LAYER.NONE);
      if (missing.length || !M.reviewPeriodDefined(ev)) return M.conclude(this, ev, { status: STATUS.NOT_ENOUGH_EVIDENCE, evidence_layer: EVIDENCE_LAYER.DESIGN, evidence_strength: EVIDENCE_STRENGTH.PARTIAL, signals_used: rel ? ['dormant_accounts'] : [], API_fields_used: req.filter((f) => M.hasField(ev, f)), missing_required_evidence: missing.concat(M.reviewPeriodDefined(ev) ? [] : ['review_period']), what_the_api_proves: 'Partial account inventory / lifecycle configuration.', what_the_api_does_not_prove: 'That account lifecycle management operated over the review period.' });
      return M.conclude(this, ev, { status: STATUS.EFFECTIVE, evidence_layer: EVIDENCE_LAYER.OPERATING_EFFECTIVENESS, evidence_strength: EVIDENCE_STRENGTH.DIRECT, signals_used: rel ? ['dormant_accounts'] : [], API_fields_used: req, population_source: M.field(ev, 'account_inventory_source'), pass_fail_rationale: 'Accounts inventoried; JML and stale-account disablement operated with reviews over the review period.', what_the_api_proves: 'Account lifecycle management operated over the review period.', what_the_api_does_not_prove: 'Appropriateness of each individual access grant (see AC-6).' });
    },
  }),

  'AC-6': def({
    control_id: 'AC-6', control_name: 'Least Privilege',
    control_objective: 'Authorize only the access necessary to accomplish assigned tasks.',
    evidence_layer_supported: [EVIDENCE_LAYER.DESIGN, EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: ['pam_pct'],
    required_api_fields: ['privileged_account_inventory', 'least_privilege_review_records', 'excessive_privilege_findings', 'privilege_remediation_events'],
    required_denominator_source: 'privileged-account inventory',
    pass_conditions: 'Least-privilege reviews completed; excessive-privilege findings remediated over the review period.',
    fail_conditions: 'Unremediated excessive-privilege findings or no reviews.',
    partial_conditions: 'Inventory present but review/remediation incomplete.',
    control_limitations: 'pam_pct (vaulting coverage) is not least-privilege evidence.',
    cannot_conclude_without: ['privileged-account inventory', 'least-privilege review records'],
    supported_connectors: ['sailpoint', 'saviynt', 'cyberark', 'entra_id_gov'],
    test(ev) {
      const req = ['privileged_account_inventory', 'least_privilege_review_records', 'excessive_privilege_findings', 'privilege_remediation_events'];
      const missing = M.missingFields(ev, req);
      if (missing.length === req.length) return M.notEnough(this, 'No least-privilege review evidence for AC-6.', req);
      if (missing.length || !M.reviewPeriodDefined(ev)) return M.conclude(this, ev, { status: STATUS.NOT_ENOUGH_EVIDENCE, evidence_layer: EVIDENCE_LAYER.DESIGN, evidence_strength: EVIDENCE_STRENGTH.PARTIAL, API_fields_used: req.filter((f) => M.hasField(ev, f)), missing_required_evidence: missing.concat(M.reviewPeriodDefined(ev) ? [] : ['review_period']), what_the_api_proves: 'Partial least-privilege review configuration.', what_the_api_does_not_prove: 'That least privilege was reviewed and enforced over the review period.' });
      const open = num(M.field(ev, 'excessive_privilege_findings')) || 0;
      return M.conclude(this, ev, { status: open === 0 ? STATUS.EFFECTIVE : STATUS.PARTIALLY_EFFECTIVE, evidence_layer: EVIDENCE_LAYER.OPERATING_EFFECTIVENESS, evidence_strength: EVIDENCE_STRENGTH.DIRECT, API_fields_used: req, pass_fail_rationale: open === 0 ? 'Least-privilege reviews completed with excessive-privilege findings remediated.' : open + ' excessive-privilege finding(s) open.', what_the_api_proves: 'Least-privilege review/remediation operated over the review period.', what_the_api_does_not_prove: 'Task-level appropriateness of every entitlement.' });
    },
  }),

  'AU-6': def({
    control_id: 'AU-6', control_name: 'Audit Record Review, Analysis and Reporting',
    control_objective: 'Review and analyze audit records for inappropriate activity and report findings.',
    evidence_layer_supported: [EVIDENCE_LAYER.DESIGN, EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: ['open_incidents', 'notable_events_30d'],
    required_api_fields: ['log_review_records', 'review_cadence', 'review_findings', 'reviewer_identity'],
    required_denominator_source: 'audit-log sources in scope',
    pass_conditions: 'Audit records reviewed on cadence with findings dispositioned over the review period.',
    fail_conditions: 'No reviews performed or findings unactioned.',
    partial_conditions: 'Review cadence defined but review records incomplete.',
    control_limitations: 'Incident counts / notable-event volume are indicators, not proof of review.',
    cannot_conclude_without: ['log review records', 'reviewer identity', 'review cadence'],
    supported_connectors: ['splunk', 'sentinel', 'elastic', 'qradar'],
    test(ev) {
      const req = ['log_review_records', 'review_cadence', 'review_findings', 'reviewer_identity'];
      const missing = M.missingFields(ev, req);
      const rel = M.hasSignal(ev, 'open_incidents') || M.hasSignal(ev, 'notable_events_30d');
      if (missing.length === req.length) return M.notEnough(this, 'No audit-record review evidence for AU-6. Incident/event volume is an indicator only.', req, rel ? EVIDENCE_LAYER.RELEVANCE : EVIDENCE_LAYER.NONE);
      if (missing.length || !M.reviewPeriodDefined(ev)) return M.conclude(this, ev, { status: STATUS.NOT_ENOUGH_EVIDENCE, evidence_layer: EVIDENCE_LAYER.DESIGN, evidence_strength: EVIDENCE_STRENGTH.PARTIAL, signals_used: rel ? ['open_incidents'] : [], API_fields_used: req.filter((f) => M.hasField(ev, f)), missing_required_evidence: missing.concat(M.reviewPeriodDefined(ev) ? [] : ['review_period']), what_the_api_proves: 'Log-review configuration.', what_the_api_does_not_prove: 'That reviews were performed and findings dispositioned over the review period.' });
      return M.conclude(this, ev, { status: STATUS.EFFECTIVE, evidence_layer: EVIDENCE_LAYER.OPERATING_EFFECTIVENESS, evidence_strength: EVIDENCE_STRENGTH.DIRECT, API_fields_used: req, pass_fail_rationale: 'Audit records reviewed on cadence with findings dispositioned over the review period.', what_the_api_proves: 'Audit-record review operated over the review period.', what_the_api_does_not_prove: 'Quality of human analytical judgment.' });
    },
  }),

  'SI-4': def({
    control_id: 'SI-4', control_name: 'System Monitoring',
    control_objective: 'Monitor the system to detect attacks, indicators of attack and unauthorized activity.',
    evidence_layer_supported: [EVIDENCE_LAYER.RELEVANCE, EVIDENCE_LAYER.DESIGN, EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: ['edr_pct', 'siem_log_sources', 'critical_log_source_coverage_pct'],
    required_api_fields: ['monitoring_scope_denominator', 'critical_log_source_coverage_pct', 'detection_events', 'alert_forwarding', 'missing_critical_log_sources'],
    required_denominator_source: 'CMDB / application inventory (expected monitored assets)',
    pass_conditions: 'Critical log-source coverage complete and detections/alerts operating over the review period.',
    fail_conditions: 'Missing critical log sources or no detections/alert forwarding.',
    partial_conditions: 'Sensor/log coverage present but expected-source denominator or detections missing.',
    control_limitations: 'edr_pct / siem_log_sources are coverage indicators; coverage is not proven without an expected-source denominator.',
    cannot_conclude_without: ['expected monitored-asset denominator', 'detection events for the review period'],
    supported_connectors: ['splunk', 'sentinel', 'elastic', 'qradar', 'crowdstrike', 'defender'],
    test(ev) {
      const rel = M.hasSignal(ev, 'edr_pct') || M.hasSignal(ev, 'siem_log_sources');
      const req = ['monitoring_scope_denominator', 'critical_log_source_coverage_pct', 'detection_events', 'alert_forwarding', 'missing_critical_log_sources'];
      const missing = M.missingFields(ev, req);
      if (!rel && missing.length === req.length) return M.notEnough(this, 'No monitoring signal or scope evidence for SI-4.', ['edr_pct/siem_log_sources or ' + req.join('/')], EVIDENCE_LAYER.NONE);
      if (missing.length || !M.reviewPeriodDefined(ev)) return M.conclude(this, ev, { status: STATUS.NOT_ENOUGH_EVIDENCE, evidence_layer: EVIDENCE_LAYER.RELEVANCE, evidence_strength: rel ? EVIDENCE_STRENGTH.INDICATOR : EVIDENCE_STRENGTH.NOT_EVIDENCE, signals_used: rel ? ['edr_pct', 'siem_log_sources'].filter((k) => M.hasSignal(ev, k)) : [], missing_required_evidence: missing.concat(M.reviewPeriodDefined(ev) ? [] : ['review_period']), what_the_api_proves: 'Some sensor / log-source coverage exists.', what_the_api_does_not_prove: 'That the full expected asset population is monitored and that detection operated over the review period.' });
      const missingSources = num(M.field(ev, 'missing_critical_log_sources')) || 0;
      return M.conclude(this, ev, { status: missingSources === 0 ? STATUS.EFFECTIVE : STATUS.PARTIALLY_EFFECTIVE, evidence_layer: EVIDENCE_LAYER.OPERATING_EFFECTIVENESS, evidence_strength: EVIDENCE_STRENGTH.DIRECT, signals_used: ['edr_pct', 'siem_log_sources'].filter((k) => M.hasSignal(ev, k)), API_fields_used: req, population_source: M.field(ev, 'monitoring_scope_denominator'), pass_fail_rationale: missingSources === 0 ? 'Critical log-source coverage complete; detections and alert forwarding operated over the review period.' : missingSources + ' critical log source(s) missing.', what_the_api_proves: 'System monitoring operated across the expected asset population over the review period.', what_the_api_does_not_prove: 'Analyst triage quality.' });
    },
  }),

  'CP-9': def({
    control_id: 'CP-9', control_name: 'System Backup',
    control_objective: 'Back up system- and user-level information and protect its confidentiality, integrity and availability.',
    evidence_layer_supported: [EVIDENCE_LAYER.RELEVANCE, EVIDENCE_LAYER.DESIGN, EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: ['backup_immutable_pct'],
    required_api_fields: ['critical_system_denominator', 'protected_systems', 'last_successful_backup', 'backup_failure_count', 'immutable_backup_coverage'],
    required_denominator_source: 'critical-system inventory',
    pass_conditions: 'All critical systems backed up successfully and protected (immutable) over the review period.',
    fail_conditions: 'Critical systems unprotected or repeated backup failures.',
    partial_conditions: 'Immutability coverage present but critical-system denominator or success evidence missing.',
    control_limitations: 'backup_immutable_pct proves protection of existing backups, not that all critical systems are backed up.',
    cannot_conclude_without: ['critical-system denominator', 'backup success evidence for the review period'],
    supported_connectors: ['rubrik', 'veeam', 'cohesity', 'commvault', 'dell_powerprotect'],
    test(ev) {
      const rel = M.hasSignal(ev, 'backup_immutable_pct');
      const req = ['critical_system_denominator', 'protected_systems', 'last_successful_backup', 'backup_failure_count', 'immutable_backup_coverage'];
      const missing = M.missingFields(ev, req);
      if (!rel && missing.length === req.length) return M.notEnough(this, 'No backup signal or coverage evidence for CP-9.', req, EVIDENCE_LAYER.NONE);
      if (missing.length || !M.reviewPeriodDefined(ev)) return M.conclude(this, ev, { status: STATUS.NOT_ENOUGH_EVIDENCE, evidence_layer: EVIDENCE_LAYER.RELEVANCE, evidence_strength: rel ? EVIDENCE_STRENGTH.INDICATOR : EVIDENCE_STRENGTH.NOT_EVIDENCE, signals_used: rel ? ['backup_immutable_pct'] : [], missing_required_evidence: missing.concat(M.reviewPeriodDefined(ev) ? [] : ['review_period']), what_the_api_proves: 'Backup immutability coverage among existing backups.', what_the_api_does_not_prove: 'That every critical system is backed up successfully over the review period.' });
      const fails = num(M.field(ev, 'backup_failure_count')) || 0;
      return M.conclude(this, ev, { status: fails === 0 ? STATUS.EFFECTIVE : STATUS.PARTIALLY_EFFECTIVE, evidence_layer: EVIDENCE_LAYER.OPERATING_EFFECTIVENESS, evidence_strength: EVIDENCE_STRENGTH.DIRECT, signals_used: rel ? ['backup_immutable_pct'] : [], API_fields_used: req, population_source: M.field(ev, 'critical_system_denominator'), pass_fail_rationale: fails === 0 ? 'All critical systems backed up successfully and protected over the review period.' : fails + ' backup failure(s) over the review period.', what_the_api_proves: 'Backups operated across critical systems over the review period.', what_the_api_does_not_prove: 'Restorability (see CP-10).' });
    },
  }),

  'CP-10': def({
    control_id: 'CP-10', control_name: 'System Recovery and Reconstitution',
    control_objective: 'Recover and reconstitute the system to a known state after disruption or compromise.',
    evidence_layer_supported: [EVIDENCE_LAYER.DESIGN, EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: ['dr_test_days', 'backup_immutable_pct'],
    required_api_fields: ['last_restore_test', 'restore_test_result', 'restore_integrity_verification', 'rpo_target', 'rpo_actual'],
    required_denominator_source: 'critical-system recovery inventory',
    pass_conditions: 'Restore test completed and passed with integrity verified within RPO over the review period.',
    fail_conditions: 'No restore test, failed test, or integrity not verified.',
    partial_conditions: 'Backups present but restore not tested / integrity not verified.',
    control_limitations: 'Backup existence/immutability does NOT prove recoverability. Restore integrity verification is required.',
    cannot_conclude_without: ['restore test result', 'restore integrity verification'],
    supported_connectors: ['rubrik', 'veeam', 'cohesity', 'commvault', 'dell_powerprotect'],
    test(ev) {
      const req = ['last_restore_test', 'restore_test_result', 'restore_integrity_verification', 'rpo_target', 'rpo_actual'];
      const missing = M.missingFields(ev, req);
      const rel = M.hasSignal(ev, 'backup_immutable_pct') || M.hasSignal(ev, 'dr_test_days');
      if (missing.length === req.length) return M.notEnough(this, 'No restore-test / integrity-verification evidence for CP-10. Backup immutability is not recovery proof.', req, rel ? EVIDENCE_LAYER.RELEVANCE : EVIDENCE_LAYER.NONE);
      if (missing.length || !M.reviewPeriodDefined(ev)) return M.conclude(this, ev, { status: STATUS.NOT_ENOUGH_EVIDENCE, evidence_layer: EVIDENCE_LAYER.DESIGN, evidence_strength: EVIDENCE_STRENGTH.PARTIAL, signals_used: rel ? ['backup_immutable_pct', 'dr_test_days'].filter((k) => M.hasSignal(ev, k)) : [], API_fields_used: req.filter((f) => M.hasField(ev, f)), missing_required_evidence: missing.concat(M.reviewPeriodDefined(ev) ? [] : ['review_period']), what_the_api_proves: 'Backups exist / a DR test date is recorded.', what_the_api_does_not_prove: 'That a restore succeeded with verified integrity within RPO.' });
      const passed = String(M.field(ev, 'restore_test_result')).toLowerCase() === 'pass' && M.field(ev, 'restore_integrity_verification') === true;
      return M.conclude(this, ev, { status: passed ? STATUS.EFFECTIVE : STATUS.INEFFECTIVE, evidence_layer: EVIDENCE_LAYER.OPERATING_EFFECTIVENESS, evidence_strength: EVIDENCE_STRENGTH.DIRECT, signals_used: rel ? ['backup_immutable_pct'] : [], API_fields_used: req, pass_fail_rationale: passed ? 'Restore test passed with integrity verified within RPO over the review period.' : 'Restore test failed or integrity not verified.', what_the_api_proves: 'Recoverability tested with verified integrity.', what_the_api_does_not_prove: 'Recovery of systems outside the tested scope.' });
    },
  }),

  // Example of a control that is NOT API-testable — never auto-scored.
  'PL-2': def({
    control_id: 'PL-2', control_name: 'System Security and Privacy Plans', assessment_type: ASSESSMENT_TYPE.NOT_API_TESTABLE,
    control_objective: 'Develop and maintain a system security and privacy plan.',
    evidence_layer_supported: [], required_signals: [], required_api_fields: [], required_denominator_source: null,
    pass_conditions: 'n/a — document/manual review', fail_conditions: 'n/a', partial_conditions: 'n/a',
    control_limitations: 'Requires human review of the SSP document.', cannot_conclude_without: ['manual document review'],
    supported_connectors: [],
    test() { return M.notApiTestable(this, 'SSP existence/adequacy requires document and human review; no API proves it.'); },
  }),
};

module.exports = { framework: FRAMEWORK, REGISTRY };
