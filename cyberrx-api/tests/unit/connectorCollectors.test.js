'use strict';

/**
 * Connector collector mapping tests. Proves the Okta/Entra collectors map real
 * documented API responses to the granular evidence fields the requirements
 * registry demands — and that collected + validated evidence drives the result
 * engine to IA-2 Effective. Uses an injected http mock (no live tenant).
 */

const { CONNECTOR_COLLECTORS } = require('../../src/control-assessment/collection/connectorCollectors');
const CA = require('../../src/control-assessment');
const { STATUS } = CA;

// Minimal fetch-like mock: decode the URL, then match by substring (specific
// routes first) → canned JSON. Decoding lets the needles read like real filters.
function mockHttp(routes) {
  return async function (url) {
    let u = url; try { u = decodeURIComponent(url); } catch (_) {}
    for (const [needle, body] of routes) {
      if (u.indexOf(needle) >= 0) return { ok: true, status: 200, json: async () => body, text: async () => '' };
    }
    return { ok: true, status: 200, json: async () => [], text: async () => '' };
  };
}

// Ordered specific → generic.
const OKTA_ROUTES = [
  ['status eq "DEPROVISIONED"', []],                              // disabled_stale = 0
  ['status eq "ACTIVE"', new Array(1200).fill({ id: 'u' })],      // active users (denominator 1200)
  ['type=MFA_ENROLL', [{ status: 'ACTIVE' }]],
  ['type=ACCESS_POLICY', [{ id: 'a' }, { id: 'b' }]],
  ['type=PASSWORD', [{ settings: { password: { lockout: { maxAttempts: 5, autoUnlockMinutes: 15 } } } }]],
  ['auth_via_mfa" and outcome.result eq "FAILURE"', [{}, {}]],    // failed_mfa_events = 2
  ['auth_via_mfa"', [{ uuid: 'x' }]],                             // signin_logs present
  ['user.authentication.sso', []],                               // signins_without_mfa = 0
  ['user.mfa.factor.deactivate', []],                            // bypassed = 0
  ['user.session.start', []],                                    // failed_signin_events = 0
  ['user.account.unlock_by_admin', []],                          // override_events = 0
  ['"user.account.unlock"', [{}]],                               // unlock_events = 1
  ['"user.account.lock"', [{}]],                                 // lockout_events = 1
  ['user.lifecycle.', [{}, {}, {}]],                             // JML = 3
  ['/api/v1/users?limit=200', new Array(1300).fill({ id: 'u' })], // account_inventory
];

describe('Okta collector maps API → evidence fields', () => {
  test('produces the IA-2 / AC-7 evidence fields from documented queries', async () => {
    const creds = { orgUrl: 'https://acme.okta.com', apiToken: 'x' };
    const out = await CONNECTOR_COLLECTORS.okta({ creds, http: mockHttp(OKTA_ROUTES), period: { start: '2026-04-01', end: '2026-06-30' } });
    // IA-2 required fields
    expect(out.active_user_denominator).toBe(1200);
    expect(out.mfa_enforcement_policy).toBe(true);
    expect(out.signin_logs).toBe(true);
    expect(out.signins_without_mfa).toBe(0);
    expect(out.failed_mfa_events).toBe(2);
    expect(out.bypassed_mfa_events).toBe(0);
    expect(out.policy_assignment_scope).toMatch(/active/i);
    expect(out.app_resource_scope).toMatch(/sign-on/i);
    // AC-7 fields
    expect(out.failed_login_threshold_policy).toBe('5 attempts');
    expect(out.lockout_duration).toBe('15m');
    expect(out.lockout_events).toBe(1);
    // AC-2
    expect(out.account_inventory_source).toBe('Okta');
  });

  test('missing creds → collects nothing (Not Enough Evidence)', async () => {
    expect(await CONNECTOR_COLLECTORS.okta({ creds: {}, http: mockHttp([]) })).toEqual({});
  });
});

describe('collected + validated Okta evidence → IA-2 Effective end to end', () => {
  test('runAssessment with the okta collector + live validation concludes IA-2 Effective', async () => {
    const collectors = { okta: (ctx) => CONNECTOR_COLLECTORS.okta(Object.assign({}, ctx, { http: mockHttp(OKTA_ROUTES) })) };
    const out = await CA.runAssessment('org_test', {
      noPersist: true, now: 1751000000000,
      connectors: ['okta'],
      creds: { okta: { orgUrl: 'https://acme.okta.com', apiToken: 'x' } },
      validation: { okta: { live_tenant_validated: true } },
      reviewPeriod: { start: '2026-04-01', end: '2026-06-30' },
      freshnessDays: 5, collectors,
    });
    const ia2 = out.frameworks.nist_800_53_rev5.results.find((r) => r.control_id === 'IA-2');
    expect(ia2.assessment_status).toBe(STATUS.EFFECTIVE);
    // and without validation → not Effective
    const out2 = await CA.runAssessment('org_test', {
      noPersist: true, now: 1751000000000, connectors: ['okta'],
      creds: { okta: { orgUrl: 'https://acme.okta.com', apiToken: 'x' } },
      validation: { okta: { live_tenant_validated: false } },
      reviewPeriod: { start: '2026-04-01', end: '2026-06-30' }, freshnessDays: 5, collectors,
    });
    expect(out2.frameworks.nist_800_53_rev5.results.find((r) => r.control_id === 'IA-2').assessment_status).not.toBe(STATUS.EFFECTIVE);
  });
});
