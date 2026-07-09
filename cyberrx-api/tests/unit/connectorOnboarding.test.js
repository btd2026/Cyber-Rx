'use strict';

/**
 * Control-aware connector onboarding — manifest + readiness tests.
 * Proves onboarding fields come from manifests and that connecting a tool never
 * over-claims control readiness.
 */

const OB = require('../../src/control-assessment/onboarding');
const { buildManifest, computeReadiness } = OB;

const find = (readiness, id) => readiness.control_readiness.find((c) => c.control_id === id);
const IA2_FIELDS = { active_user_denominator: true, mfa_enforcement_policy: true, policy_assignment_scope: true, app_resource_scope: true, signin_logs: true, signins_without_mfa: true, failed_mfa_events: true, bypassed_mfa_events: true };
const baseConfig = (over) => Object.assign({
  auth_provided: ['tenant_id', 'client_id', 'client_secret_or_certificate'],
  permissions_sufficient: true,
  denominator_configured: { authoritative_user_source: 'Active Directory' },
  scope_configured: { in_scope_user_groups: ['All Employees'] },
  telemetry_available: {}, review_period: true, live_tenant_validated: false,
}, over || {});

describe('manifests drive onboarding fields', () => {
  test('Entra manifest exposes auth, permissions, scope, denominator, and supported controls', () => {
    const m = buildManifest('entra');
    expect(m.connector_name).toBe('Microsoft Entra ID');
    expect(m.required_auth_fields.map((f) => f.key)).toEqual(expect.arrayContaining(['tenant_id', 'client_id', 'client_secret_or_certificate']));
    expect(m.required_permissions).toEqual(expect.arrayContaining(['Directory.Read.All', 'AuditLog.Read.All']));
    expect(m.required_scope_fields.map((f) => f.key)).toEqual(expect.arrayContaining(['in_scope_user_groups', 'privileged_role_scope', 'break_glass_account_handling']));
    expect(m.required_denominator_fields.map((f) => f.key)).toEqual(expect.arrayContaining(['authoritative_user_source']));
    expect(m.supported_framework_controls.map((c) => c.control_id)).toEqual(expect.arrayContaining(['IA-2', 'IA-5', 'AC-7']));
    expect(m.evidence_required_for_operating_effectiveness).toEqual(expect.arrayContaining(['signin_logs', 'mfa_enforcement_policy']));
  });

  test('scope questions are category-specific — EDR asks endpoint scope, not identity scope', () => {
    const cs = buildManifest('crowdstrike');
    const scope = cs.required_scope_fields.map((f) => f.key);
    expect(scope).toEqual(expect.arrayContaining(['endpoint_groups_in_scope', 'stale_sensor_threshold']));
    expect(scope).not.toContain('in_scope_user_groups');
    expect(cs.required_denominator_fields.map((f) => f.key)).toContain('endpoint_denominator_source');
  });

  test('every listed connector has a manifest', () => {
    ['entra', 'okta', 'ping', 'duo', 'onelogin', 'crowdstrike', 'defender', 'sentinelone', 'cortexxdr', 'tenable', 'qualys', 'rapid7', 'defender_vm', 'splunk', 'sentinel', 'elastic', 'qradar', 'chronicle', 'cyberark', 'beyondtrust', 'delinea', 'oneidentity', 'sailpoint', 'saviynt', 'entra_id_gov', 'okta_iga', 'wiz', 'prisma', 'azure', 'aws', 'gcp', 'orca', 'rubrik', 'veeam', 'cohesity', 'commvault', 'purview', 'forcepoint', 'symantec_dlp', 'zscaler_dlp', 'netskope', 'illumio', 'zscaler_zpa', 'paloalto_seg', 'cisco_workload', 'guardicore', 'knowbe4', 'proofpoint', 'abnormal', 'mimecast', 'mdo365'].forEach((k) => {
      expect(buildManifest(k)).toBeTruthy();
    });
  });
});

describe('readiness never over-claims', () => {
  test('mfa_pct alone → IA-2 Partially Ready (adoption only)', () => {
    const r = computeReadiness('entra', baseConfig({ telemetry_available: { mfa_pct: true } }));
    const ia2 = find(r, 'IA-2');
    expect(ia2.readiness_status).toBe('Partially Ready');
    expect(ia2.message).toMatch(/cannot assess operating effectiveness/i);
  });

  test('mfa_pct alone → IA-5 Not Ready', () => {
    const r = computeReadiness('entra', baseConfig({ telemetry_available: { mfa_pct: true } }));
    expect(find(r, 'IA-5').readiness_status).toBe('Not Ready');
  });

  test('Splunk log-source count alone does not make AU-6 Ready', () => {
    const r = computeReadiness('splunk', { auth_provided: ['base_url', 'api_token'], permissions_sufficient: true, denominator_configured: { expected_log_source_inventory: 'CMDB' }, scope_configured: { critical_system_scope: ['x'] }, review_period: true, telemetry_available: { siem_log_sources: true } });
    expect(find(r, 'AU-6').readiness_status).not.toBe('Ready');
  });

  test('EDR host count alone → SI-4 Partially Ready, not Ready', () => {
    const r = computeReadiness('crowdstrike', { auth_provided: ['base_url'], permissions_sufficient: true, denominator_configured: { endpoint_denominator_source: 'CMDB' }, scope_configured: { endpoint_groups_in_scope: ['all'] }, review_period: true, telemetry_available: { edr_pct: true } });
    const si4 = find(r, 'SI-4');
    expect(si4.readiness_status).toBe('Partially Ready');
  });

  test('percentage metrics require a denominator — no denominator → Not Ready', () => {
    const r = computeReadiness('entra', baseConfig({ telemetry_available: IA2_FIELDS, denominator_configured: {}, live_tenant_validated: true }));
    const ia2 = find(r, 'IA-2');
    expect(ia2.readiness_status).toBe('Not Ready');
    expect(ia2.connector_status).toBe('Denominator Missing');
  });

  test('operating-effectiveness readiness requires live-tenant validation', () => {
    const notVal = computeReadiness('entra', baseConfig({ telemetry_available: IA2_FIELDS, live_tenant_validated: false }));
    expect(find(notVal, 'IA-2').readiness_status).toBe('Partially Ready');
    expect(find(notVal, 'IA-2').connector_status).not.toBe('Ready for Operating Effectiveness Assessment');
    const val = computeReadiness('entra', baseConfig({ telemetry_available: IA2_FIELDS, live_tenant_validated: true }));
    expect(find(val, 'IA-2').readiness_status).toBe('Ready');
    expect(find(val, 'IA-2').connector_status).toBe('Ready for Operating Effectiveness Assessment');
  });

  test('missing permissions surface in connector readiness output', () => {
    const r = computeReadiness('entra', baseConfig({ permissions_sufficient: false, telemetry_available: {} }));
    expect(r.permission_status).toBe('Missing Permissions');
    expect(r.missing_requirements).toContain('permissions');
  });

  test('connected does not equal control-ready', () => {
    const r = computeReadiness('entra', baseConfig({ telemetry_available: {} }));
    expect(r.connection_status).toBe('Connected');
    expect(r.ready_controls.length).toBe(0);
  });
});
