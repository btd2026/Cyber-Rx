'use strict';

/**
 * Continuous control assessment RESULT engine — pipeline tests.
 * Proves: the registry drives which fields are collected; collected + validated
 * evidence yields a real result; a control is Effective ONLY when its connector
 * is live-tenant-validated and all required evidence is present; evidence
 * snapshots and per-control history are produced; missing evidence → Not Enough.
 */

const CA = require('../../src/control-assessment');
const { STATUS } = CA;

// Full IA-2 operating-effectiveness evidence, as if collected from Okta.
const OKTA_FULL = () => ({
  active_user_denominator: 1200, mfa_enforcement_policy: true, policy_assignment_scope: 'all-users',
  app_resource_scope: 'all-apps', signin_logs: true, signins_without_mfa: 0, failed_mfa_events: 5,
  bypassed_mfa_events: 0, exception_count: 2, approved_exception_count: 2, unapproved_exception_count: 0,
});

function run(opts) {
  return CA.runAssessment('org_test', Object.assign({
    noPersist: true, now: 1751000000000,
    signals: [{ key: 'mfa_pct', value: 99, denominator_source: 'okta_active_users' }],
    freshnessDays: 5,
  }, opts));
}

describe('result engine pipeline', () => {
  test('the requirements registry drives the collected field set', () => {
    const fields = CA.requiredFields();
    expect(fields).toEqual(expect.arrayContaining(['active_user_denominator', 'signin_logs', 'restore_integrity_verification']));
  });

  test('collected + validated evidence → IA-2 Effective', async () => {
    const out = await run({
      connectors: ['okta'],
      validation: { okta: { live_tenant_validated: true } },
      collectors: { okta: async () => OKTA_FULL() },
    });
    const ia2 = out.frameworks.nist_800_53_rev5.results.find((r) => r.control_id === 'IA-2');
    expect(ia2.assessment_status).toBe(STATUS.EFFECTIVE);
    expect(out.evidence_report.fields_collected.map((f) => f.field)).toEqual(expect.arrayContaining(['signin_logs', 'active_user_denominator']));
    expect(out.evidence_snapshot_id).toMatch(/^snap_/);
  });

  test('same evidence but connector NOT validated → not Effective', async () => {
    const out = await run({
      connectors: ['okta'],
      validation: { okta: { live_tenant_validated: false } },
      collectors: { okta: async () => OKTA_FULL() },
    });
    const ia2 = out.frameworks.nist_800_53_rev5.results.find((r) => r.control_id === 'IA-2');
    expect(ia2.assessment_status).not.toBe(STATUS.EFFECTIVE);
  });

  test('no connectors connected → everything Not Enough Evidence, report lists missing', async () => {
    const out = await run({ connectors: [], validation: {}, collectors: {} });
    const ia2 = out.frameworks.nist_800_53_rev5.results.find((r) => r.control_id === 'IA-2');
    expect(ia2.assessment_status).toBe(STATUS.NOT_ENOUGH_EVIDENCE);
    expect(out.evidence_report.fields_missing.length).toBeGreaterThan(0);
    // A not-API-testable control is still surfaced as such.
    const pl2 = out.frameworks.nist_800_53_rev5.results.find((r) => r.control_id === 'PL-2');
    expect(pl2.assessment_status).toBe(STATUS.NOT_API_TESTABLE);
  });

  test('partial evidence (missing sign-in logs) → not Effective', async () => {
    const partial = OKTA_FULL(); delete partial.signin_logs; delete partial.signins_without_mfa;
    const out = await run({
      connectors: ['okta'], validation: { okta: { live_tenant_validated: true } },
      collectors: { okta: async () => partial },
    });
    const ia2 = out.frameworks.nist_800_53_rev5.results.find((r) => r.control_id === 'IA-2');
    expect(ia2.assessment_status).not.toBe(STATUS.EFFECTIVE);
  });

  test('each framework is scored independently and a status summary is produced', async () => {
    const out = await run({ connectors: ['okta'], validation: { okta: { live_tenant_validated: true } }, collectors: { okta: async () => OKTA_FULL() } });
    expect(Object.keys(out.frameworks)).toEqual(expect.arrayContaining(['nist_csf_2_0', 'nist_800_53_rev5', 'cis_v8_1', 'hipaa_164', 'soc2_2017_tsc']));
    expect(out.status_summary).toBeTruthy();
    // HIPAA stays Not Enough (ePHI scope unknown) even though 800-53 IA-2 is Effective.
    const hipaa = out.frameworks.hipaa_164.results.find((r) => r.control_id === '164.312(d)');
    expect(hipaa.assessment_status).not.toBe(STATUS.EFFECTIVE);
  });
});
