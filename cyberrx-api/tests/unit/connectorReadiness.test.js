'use strict';

/**
 * Connector three-status readiness — proves the hard principle: authentication
 * success is NOT continuous-control-assessment readiness. Connection, telemetry,
 * and control-assessment readiness are tracked separately, and a connector is only
 * "Ready" when it can connect AND collect the required telemetry AND has scoped,
 * fresh, complete evidence for at least one supported control.
 */

const OB = require('../../src/control-assessment/onboarding');
const { buildStatus, CONNECTION, TELEMETRY, CONTROL } = require('../../src/control-assessment/onboarding/statusModel');

// A connected-but-nothing-else config: auth present, nothing tested/configured.
const connectedOnly = { auth_provided: ['clientId', 'clientSecret', 'tenantId'] };
const avail = (fields) => { const o = {}; fields.forEach((f) => { o[f] = true; }); return o; };
const ctrlOf = (status, id) => (status.control_readiness || []).find((c) => c.control_id === id);

// 1
test('1. OAuth/API token success only sets connection_status = Connected', () => {
  const s = buildStatus('entra', connectedOnly, { connection: { ok: true } });
  expect(s.connection_status).toBe(CONNECTION.CONNECTED);
});

// 2
test('2. Connected does NOT automatically make telemetry Available', () => {
  const s = buildStatus('entra', connectedOnly, { connection: { ok: true } });
  expect(s.telemetry_status).toBe(TELEMETRY.NOT_TESTED);
  expect(s.telemetry_status).not.toBe(TELEMETRY.AVAILABLE);
});

// 3
test('3. Connected does NOT automatically make control assessment Ready', () => {
  const s = buildStatus('entra', connectedOnly, { connection: { ok: true } });
  expect(s.control_assessment_status).not.toBe(CONTROL.READY_OE);
  expect([CONTROL.NOT_READY, CONTROL.NOT_CONFIGURED]).toContain(s.control_assessment_status);
  expect(s.overall_status).not.toBe('Ready');
});

// 4
test('4. Missing permission → telemetry_status = Missing Required Permissions', () => {
  const s = buildStatus('entra', Object.assign({}, connectedOnly, { permissions_sufficient: false, telemetry_available: avail(['mfa_enforcement_policy']) }), { connection: { ok: true } });
  expect(s.telemetry_status).toBe(TELEMETRY.MISSING_PERMS);
});

// 5
test('5. Missing telemetry → Partially Available / Unavailable (not Available)', () => {
  const partial = buildStatus('entra', Object.assign({}, connectedOnly, { telemetry_available: avail(['mfa_enforcement_policy', 'mfa_pct']) }), { connection: { ok: true } });
  expect(partial.telemetry_status).toBe(TELEMETRY.PARTIAL);
  const none = buildStatus('entra', Object.assign({}, connectedOnly, { telemetry_available: {} }), { connection: { ok: true } });
  expect(none.telemetry_status).toBe(TELEMETRY.UNAVAILABLE);
});

// 6
test('6. Missing denominator → control Partially Ready or Not Ready', () => {
  // full IA-2 telemetry present, but no denominator/scope/period
  const s = buildStatus('entra', Object.assign({}, connectedOnly, {
    telemetry_available: avail(['active_user_denominator', 'mfa_enforcement_policy', 'policy_assignment_scope', 'app_resource_scope', 'signin_logs', 'signins_without_mfa', 'failed_mfa_events', 'bypassed_mfa_events']),
  }), { connection: { ok: true } });
  expect([CONTROL.PARTIAL, CONTROL.NOT_READY]).toContain(s.control_assessment_status);
  expect(s.control_assessment_status).not.toBe(CONTROL.READY_OE);
});

// 7
test('7. Missing scope → not Ready for Operating Effectiveness', () => {
  const s = buildStatus('tenable', Object.assign({}, connectedOnly, {
    telemetry_available: avail(['scan_coverage_denominator', 'vuln_scan_cadence', 'config_monitoring_enabled', 'open_critical_vulns', 'remediation_sla_met']),
    denominator_configured: { scan_coverage_denominator: 'asset inventory' }, review_period: true, live_tenant_validated: true,
    // scope NOT configured
  }), { connection: { ok: true } });
  expect(s.control_assessment_status).not.toBe(CONTROL.READY_OE);
});

// 8
test('8. Missing review period prevents Operating Effectiveness readiness', () => {
  const base = {
    auth_provided: connectedOnly.auth_provided,
    telemetry_available: avail(['scan_coverage_denominator', 'vuln_scan_cadence', 'config_monitoring_enabled', 'open_critical_vulns', 'remediation_sla_met']),
    denominator_configured: { d: 'x' }, scope_configured: { s: 'y' }, live_tenant_validated: true,
  };
  const noPeriod = buildStatus('tenable', base, { connection: { ok: true } });
  expect(noPeriod.control_assessment_status).not.toBe(CONTROL.READY_OE);
  const withPeriod = buildStatus('tenable', Object.assign({}, base, { review_period: true }), { connection: { ok: true } });
  expect(withPeriod.control_assessment_status).toBe(CONTROL.READY_OE);
});

// 9
test('9. Entra with no sign-in logs → IA-2 Partially Ready, not Ready', () => {
  const s = buildStatus('entra', Object.assign({}, connectedOnly, {
    telemetry_available: avail(['mfa_enforcement_policy', 'mfa_pct']), // config/adoption, but no signin_logs
    denominator_configured: { active_user_denominator: 'IdP' }, scope_configured: { s: 'tenant' }, review_period: true,
  }), { connection: { ok: true } });
  const ia2 = ctrlOf(s, 'IA-2');
  expect(ia2.readiness_status).toBe('Partially Ready');
  expect(ia2.readiness_status).not.toBe('Ready');
});

// 10
test('10. Entra with no authenticator-lifecycle data → IA-5 Not Ready', () => {
  const s = buildStatus('entra', Object.assign({}, connectedOnly, { telemetry_available: avail(['mfa_enforcement_policy']) }), { connection: { ok: true } });
  const ia5 = ctrlOf(s, 'IA-5');
  expect(ia5.readiness_status).toBe('Not Ready');
});

// 11
test('11. Splunk with log-source activity but no expected denominator → AU-6 Partially Ready', () => {
  const s = buildStatus('splunk', Object.assign({}, connectedOnly, {
    telemetry_available: avail(['notable_events_30d']), // reporting sources visible, but no denominator
  }), { connection: { ok: true } });
  const au6 = ctrlOf(s, 'AU-6');
  expect(au6.readiness_status).toBe('Partially Ready');
});

// 12
test('12. CrowdStrike with host/sensor data but no endpoint denominator → SI-4 Partially Ready', () => {
  const s = buildStatus('crowdstrike', Object.assign({}, connectedOnly, {
    telemetry_available: avail(['edr_pct', 'detection_events']), // sensor data, no denominator
  }), { connection: { ok: true } });
  const si4 = ctrlOf(s, 'SI-4');
  expect(si4.readiness_status).toBe('Partially Ready');
});

// 13
test('13. Status object exposes three DISTINCT statuses (dashboard badges)', () => {
  const s = buildStatus('entra', connectedOnly, { connection: { ok: true } });
  expect(s).toHaveProperty('connection_status');
  expect(s).toHaveProperty('telemetry_status');
  expect(s).toHaveProperty('control_assessment_status');
  expect(s).toHaveProperty('overall_status');
  // they are independent — not the same field echoed three times
  expect(s.connection_status).toBe(CONNECTION.CONNECTED);
  expect(s.telemetry_status).toBe(TELEMETRY.NOT_TESTED);
});

// 14
test('14. connection / telemetry / readiness are computed as separate inputs', () => {
  // connection ok, telemetry not tested → control not ready, even though connected
  const s = buildStatus('entra', connectedOnly, { connection: { ok: true }, telemetry: {} });
  expect(s.connection_status).toBe(CONNECTION.CONNECTED);
  expect(s.telemetry_status).toBe(TELEMETRY.NOT_TESTED);
  expect(s.control_assessment_status).not.toBe(CONTROL.READY_OE);
  // a connection error is independent of telemetry
  const err = buildStatus('entra', connectedOnly, { connection: { ok: false, error_code: 'expired_token' } });
  expect(err.connection_status).toBe(CONNECTION.EXPIRED);
  expect(err.overall_status).toBe('Error');
});

// 15
test('15. Existing per-control readiness engine still works', () => {
  const r = OB.computeReadiness('entra', Object.assign({}, connectedOnly, {
    telemetry_available: avail(['active_user_denominator', 'mfa_enforcement_policy', 'policy_assignment_scope', 'app_resource_scope', 'signin_logs', 'signins_without_mfa', 'failed_mfa_events', 'bypassed_mfa_events']),
    denominator_configured: { active_user_denominator: 'IdP' }, scope_configured: { s: 'tenant' }, review_period: true, live_tenant_validated: true,
  }));
  expect(r.ready_controls).toContain('IA-2');
  expect(Array.isArray(r.control_readiness)).toBe(true);
});
