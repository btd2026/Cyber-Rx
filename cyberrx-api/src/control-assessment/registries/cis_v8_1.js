'use strict';

/** cis_v8_1_assessment_registry — framework-NATIVE, per-SAFEGUARD logic. No
 * ranges: each safeguard has its own evidence requirements and pass/fail. Not
 * derived from CSF or any other framework. */

const M = require('../evidenceModel');
const { makeTest } = require('../testKit');
const { COPYRIGHT_FLAGS } = require('../native/copyrightSafety');
const { EVIDENCE_LAYER, ASSESSMENT_TYPE } = M;
const FRAMEWORK = 'CIS Controls v8.1';
// Copyright-safe: control_name / control_objective are Nerion-AUTHORED descriptions
// of Nerion's own evidence test — never the official CIS Safeguard text.
const def = (o) => Object.assign({ framework: FRAMEWORK, assessment_type: ASSESSMENT_TYPE.AUTOMATED, validation_status: 'documented_not_live_validated', live_tenant_validated: false, last_validated_at: null, evidence_freshness_requirement: 30, exception_handling: 'Unapproved exceptions block Effective.', optional_signals: [], required_time_period: 'review period', required_scope: 'enterprise assets in scope' }, COPYRIGHT_FLAGS, o);

const REGISTRY = {
  '5.1': def({
    control_id: '5.1', control_name: 'Account inventory & reconciliation (Nerion test)',
    control_objective: 'Nerion test: an authoritative account inventory exists and is reconciled on cadence over the review period.',
    evidence_layer_supported: [EVIDENCE_LAYER.DESIGN, EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: ['dormant_accounts'],
    required_api_fields: ['account_inventory', 'account_inventory_source', 'inventory_last_reviewed', 'accounts_reconciled'],
    required_denominator_source: 'authoritative account directory',
    pass_conditions: 'A complete account inventory is maintained and reconciled on cadence over the review period.',
    fail_conditions: 'Inventory absent or not reconciled.',
    partial_conditions: 'Inventory source present but reconciliation cadence not evidenced.',
    control_limitations: 'mfa_pct is not evidence of an account inventory.',
    cannot_conclude_without: ['authoritative account inventory', 'reconciliation records'],
    supported_connectors: ['okta', 'entra', 'sailpoint', 'saviynt'],
    test: makeTest({ relevanceSignals: ['dormant_accounts'], designFields: ['account_inventory_source'], oeFields: ['account_inventory', 'inventory_last_reviewed', 'accounts_reconciled'], populationField: 'account_inventory_source', proves: 'A maintained, reconciled account inventory over the review period.', notProve: 'Appropriateness of the access each account holds.', noneMsg: 'No account-inventory evidence for CIS 5.1.' }),
  }),

  '5.2': def({
    control_id: '5.2', control_name: 'Password policy enforcement (Nerion test)',
    control_objective: 'Nerion test: a strong, unique-password policy is enforced with no non-compliant accounts over the review period.',
    evidence_layer_supported: [EVIDENCE_LAYER.DESIGN, EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: [],
    required_api_fields: ['password_policy', 'min_length', 'complexity_enforced', 'reuse_prevention', 'accounts_noncompliant'],
    required_denominator_source: 'account directory',
    pass_conditions: 'Strong unique-password policy enforced with no non-compliant accounts over the review period.',
    fail_conditions: 'Non-compliant accounts or no enforced policy.',
    partial_conditions: 'Policy present but enforcement evidence missing.',
    control_limitations: 'mfa_pct does not evidence password policy.',
    cannot_conclude_without: ['password policy configuration', 'non-compliant account count'],
    supported_connectors: ['okta', 'entra', 'ping', 'onelogin'],
    test: makeTest({ relevanceSignals: [], designFields: ['password_policy'], oeFields: ['min_length', 'complexity_enforced', 'reuse_prevention', 'accounts_noncompliant'], pass: (ev) => (Number(M.field(ev, 'accounts_noncompliant')) || 0) === 0, proves: 'Unique-password policy enforced across accounts over the review period.', notProve: 'Password strength of federated/third-party IdPs.', passMsg: 'Policy enforced with no non-compliant accounts.', failMsg: 'Non-compliant accounts present.', noneMsg: 'No password-policy evidence for CIS 5.2.' }),
  }),

  '6.3': def({
    control_id: '6.3', control_name: 'MFA on external applications (Nerion test)',
    control_objective: 'Nerion test: MFA is enforced on every externally-exposed application, with no non-MFA external sign-ins over the review period.',
    evidence_layer_supported: [EVIDENCE_LAYER.RELEVANCE, EVIDENCE_LAYER.DESIGN, EVIDENCE_LAYER.OPERATING_EFFECTIVENESS],
    required_signals: [], optional_signals: ['mfa_pct'],
    required_api_fields: ['external_app_inventory', 'external_apps_with_mfa', 'external_apps_total', 'signin_logs', 'external_signins_without_mfa'],
    required_denominator_source: 'externally-exposed application inventory',
    pass_conditions: 'Every externally-exposed application enforces MFA with no non-MFA external sign-ins over the review period.',
    fail_conditions: 'Externally-exposed apps without MFA, or non-MFA external sign-ins.',
    partial_conditions: 'Tenant-wide mfa_pct present but per-external-app enforcement not evidenced.',
    control_limitations: 'Tenant mfa_pct is partial; 6.3 is per externally-exposed application.',
    cannot_conclude_without: ['externally-exposed application inventory', 'per-app MFA enforcement', 'external sign-in logs'],
    supported_connectors: ['okta', 'entra', 'ping', 'duo', 'onelogin'],
    test: makeTest({ relevanceSignals: ['mfa_pct'], designFields: ['external_app_inventory'], oeFields: ['external_apps_with_mfa', 'external_apps_total', 'signin_logs', 'external_signins_without_mfa'], populationField: 'external_app_inventory', pass: (ev) => (Number(M.field(ev, 'external_signins_without_mfa')) || 0) === 0 && (Number(M.field(ev, 'external_apps_with_mfa')) || 0) === (Number(M.field(ev, 'external_apps_total')) || -1), relevanceProves: 'Tenant-wide MFA adoption — partial for this per-app safeguard.', proves: 'MFA enforced on every externally-exposed application over the review period.', notProve: 'Internal-app MFA posture.', passMsg: 'All externally-exposed apps enforce MFA with no non-MFA external sign-ins.', failMsg: 'Externally-exposed apps without MFA or non-MFA external sign-ins.' }),
  }),
};

module.exports = { framework: FRAMEWORK, REGISTRY };
