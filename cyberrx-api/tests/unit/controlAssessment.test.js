'use strict';

/**
 * Guardrail tests for the framework-native control-assessment engine.
 * These prove the hard rules: no cross-framework derivation, no crosswalk
 * scoring, and no Effective conclusion without direct operating-effectiveness
 * evidence over a defined period with live-tenant validation.
 */

const fs = require('fs');
const path = require('path');
const CA = require('../../src/control-assessment');
const { STATUS } = CA;
const { assessControl, assessFramework, assessAll } = CA;

const MFA_ONLY = {
  signals: { mfa_pct: { value: 98, denominator_source: 'okta_active_users' } },
  fields: {}, scope: { ephi_systems_known: false }, review_period: null,
  connector_validation: {}, freshness_days: Infinity,
};

// A fully-evidenced IA-2 bundle (denominator, enforcement, sign-in, exceptions, period, live validation, fresh).
function ia2Full(over) {
  return Object.assign({
    signals: { mfa_pct: { value: 99, denominator_source: 'okta_active_users' } },
    fields: {
      mfa_enforcement_policy: true, policy_assignment_scope: 'all-users', app_resource_scope: 'all-apps',
      signin_logs: true, signins_without_mfa: 0, failed_mfa_events: 3, bypassed_mfa_events: 0,
      active_user_denominator: 1000, exception_count: 1, approved_exception_count: 1, unapproved_exception_count: 0,
    },
    scope: { ephi_systems_known: false },
    review_period: { start: '2026-04-01', end: '2026-06-30' },
    connector_validation: { okta: { live_tenant_validated: true } },
    freshness_days: 5,
  }, over || {});
}

describe('framework independence (no crosswalk derivation)', () => {
  test('registries and engine never import a crosswalk or another framework', () => {
    const dir = path.join(__dirname, '../../src/control-assessment');
    const files = ['engine.js', 'registries/nist_800_53_rev5.js', 'registries/nist_csf_2_0.js',
      'registries/cis_v8_1.js', 'registries/hipaa_164.js', 'registries/soc2_2017_tsc.js'];
    for (const f of files) {
      const src = fs.readFileSync(path.join(dir, f), 'utf8');
      expect(src).not.toMatch(/c5RevX|CIS_MAP|SOC2_MAP|HIPAA_MAP|fwXmap|c5DocXwalk/);
      // a framework registry must not require another framework's registry
      const requires = (src.match(/require\('\.\/(nist_csf_2_0|nist_800_53_rev5|cis_v8_1|hipaa_164|soc2_2017_tsc)'\)/g) || []);
      expect(requires.length).toBe(0);
    }
  });

  test('an Effective CSF PR.AA-03 does NOT make HIPAA 164.312(d) Effective', () => {
    // CSF-favorable evidence, but ePHI scope unknown → HIPAA must not conclude.
    const ev = ia2Full({ scope: { ephi_systems_known: false } });
    const csf = assessControl('nist_csf_2_0', 'PR.AA-03', ev);
    const hipaa = assessControl('hipaa_164', '164.312(d)', ev);
    expect(csf.assessment_status).toBe(STATUS.EFFECTIVE);
    expect(hipaa.assessment_status).not.toBe(STATUS.EFFECTIVE);
    expect(hipaa.assessment_status).toBe(STATUS.NOT_ENOUGH_EVIDENCE);
  });

  test('each framework score is computed only from its own controls', () => {
    const ev = ia2Full();
    const all = assessAll(ev);
    // CSF has some effective controls; HIPAA (ephi unknown) has none scored effective.
    expect(all.nist_csf_2_0.score.effective).toBeGreaterThanOrEqual(1);
    expect(all.hipaa_164.score.effective || 0).toBe(0);
    // Making CSF fully effective cannot change the HIPAA score object shape/independence.
    expect(all.hipaa_164.framework_key).toBe('hipaa_164');
    expect(all.nist_800_53_rev5.framework_key).toBe('nist_800_53_rev5');
  });
});

describe('mfa_pct alone proves almost nothing', () => {
  test('mfa_pct alone does not prove IA-2 operating effectiveness', () => {
    const r = assessControl('nist_800_53_rev5', 'IA-2', MFA_ONLY);
    expect(r.assessment_status).not.toBe(STATUS.EFFECTIVE);
    expect([STATUS.NOT_ENOUGH_EVIDENCE, STATUS.PARTIALLY_EFFECTIVE]).toContain(r.assessment_status);
    expect(r.evidence_layer).not.toBe('Operating Effectiveness');
  });
  test('mfa_pct does not map to IA-5 (authenticator management)', () => {
    const r = assessControl('nist_800_53_rev5', 'IA-5', MFA_ONLY);
    expect(r.assessment_status).toBe(STATUS.NOT_ENOUGH_EVIDENCE);
    expect(r.missing_required_evidence).toEqual(expect.arrayContaining(['authenticator_lifecycle']));
  });
  test('mfa_pct does not map to AC-7 (lockout)', () => {
    const r = assessControl('nist_800_53_rev5', 'AC-7', MFA_ONLY);
    expect(r.assessment_status).toBe(STATUS.NOT_ENOUGH_EVIDENCE);
  });
  test('mfa_pct does not map to PR.AA-01 (identity/credential lifecycle)', () => {
    const r = assessControl('nist_csf_2_0', 'PR.AA-01', MFA_ONLY);
    expect(r.assessment_status).toBe(STATUS.NOT_ENOUGH_EVIDENCE);
  });
});

describe('what each control actually requires', () => {
  test('IA-2 requires denominator, enforcement policy, sign-in evidence, exceptions and review period', () => {
    const r = assessControl('nist_800_53_rev5', 'IA-2', ia2Full());
    expect(r.assessment_status).toBe(STATUS.EFFECTIVE);
    expect(r.evidence_layer).toBe('Operating Effectiveness');
    expect(r.review_period_start).toBeTruthy();
    // Drop the review period → no longer Effective.
    const noPeriod = assessControl('nist_800_53_rev5', 'IA-2', ia2Full({ review_period: null }));
    expect(noPeriod.assessment_status).not.toBe(STATUS.EFFECTIVE);
  });
  test('IA-5 needs authenticator-management evidence to conclude', () => {
    const ev = ia2Full({ fields: {
      authenticator_lifecycle: true, credential_policy: true, factor_strength: 'phishing_resistant',
      revocation_events: 4, admin_reset_logs: true, reset_recovery_process: true,
    }, connector_validation: { okta: { live_tenant_validated: true } } });
    const r = assessControl('nist_800_53_rev5', 'IA-5', ev);
    expect(r.assessment_status).toBe(STATUS.EFFECTIVE);
  });
  test('AC-7 needs failed-login/lockout evidence', () => {
    const ev = ia2Full({ fields: {
      failed_login_threshold_policy: '5 attempts', lockout_duration: '15m', failed_signin_events: 120,
      lockout_events: 8, unlock_events: 8, override_events: 0, unapproved_exception_count: 0,
    } });
    const r = assessControl('nist_800_53_rev5', 'AC-7', ev);
    expect(r.assessment_status).toBe(STATUS.EFFECTIVE);
  });
});

describe('signal-to-control corrections', () => {
  test('bec_blocked is not mapped to any awareness/training control', () => {
    for (const key of CA.FRAMEWORK_KEYS) {
      const reg = CA.REGISTRIES[key].REGISTRY;
      for (const id of Object.keys(reg)) {
        const d = reg[id];
        const sigs = (d.required_signals || []).concat(d.optional_signals || []);
        if (/training|awareness/i.test(d.control_name)) expect(sigs).not.toContain('bec_blocked');
        expect(sigs).not.toContain('bec_blocked'); // email-security signal, not used as control evidence here
      }
    }
  });
  test('cspm_pct is not mapped generically into HIPAA', () => {
    const reg = CA.REGISTRIES.hipaa_164.REGISTRY;
    for (const id of Object.keys(reg)) {
      const sigs = (reg[id].required_signals || []).concat(reg[id].optional_signals || []);
      expect(sigs).not.toContain('cspm_pct');
    }
  });
  test('dlp_pct is not used as MP-6 / media-sanitization evidence', () => {
    let dlpUsed = false;
    for (const key of CA.FRAMEWORK_KEYS) {
      const reg = CA.REGISTRIES[key].REGISTRY;
      for (const id of Object.keys(reg)) {
        const sigs = (reg[id].required_signals || []).concat(reg[id].optional_signals || []);
        if (sigs.includes('dlp_pct')) dlpUsed = true;
      }
    }
    expect(dlpUsed).toBe(false); // dlp_pct is not evidence for any control until media-sanitization fields exist
  });
  test('backup_immutable_pct does not prove RC.RP-03 without restore integrity verification', () => {
    const only = { signals: { backup_immutable_pct: { value: 100, denominator_source: 'rubrik' } }, fields: {}, scope: {}, review_period: { start: 'a', end: 'b' }, connector_validation: { rubrik: { live_tenant_validated: true } }, freshness_days: 5 };
    const r = assessControl('nist_csf_2_0', 'RC.RP-03', only);
    expect(r.assessment_status).toBe(STATUS.NOT_ENOUGH_EVIDENCE);
    const withVerify = { signals: { backup_immutable_pct: { value: 100, denominator_source: 'rubrik' } }, fields: { restore_integrity_verification: true, restore_test_result: 'pass', last_restore_test: '2026-06-01' }, scope: {}, review_period: { start: 'a', end: 'b' }, connector_validation: { rubrik: { live_tenant_validated: true } }, freshness_days: 5 };
    const r2 = assessControl('nist_csf_2_0', 'RC.RP-03', withVerify);
    expect(r2.assessment_status).toBe(STATUS.EFFECTIVE);
  });
  test('siem_log_sources is not coverage without expected sources (SI-4)', () => {
    const only = { signals: { siem_log_sources: { value: 40, denominator_source: null } }, fields: {}, scope: {}, review_period: { start: 'a', end: 'b' }, connector_validation: { splunk: { live_tenant_validated: true } }, freshness_days: 5 };
    const r = assessControl('nist_800_53_rev5', 'SI-4', only);
    expect(r.assessment_status).toBe(STATUS.NOT_ENOUGH_EVIDENCE);
  });
});

describe('the Effective gate', () => {
  test('any percentage signal requires a denominator source to reach Effective', () => {
    const noDenom = ia2Full();
    noDenom.signals.mfa_pct.denominator_source = null;
    delete noDenom.fields.active_user_denominator;
    const r = assessControl('nist_800_53_rev5', 'IA-2', noDenom);
    expect(r.assessment_status).not.toBe(STATUS.EFFECTIVE);
  });
  test('Effective requires live-tenant validation', () => {
    const noVal = ia2Full({ connector_validation: { okta: { live_tenant_validated: false } } });
    const r = assessControl('nist_800_53_rev5', 'IA-2', noVal);
    expect(r.assessment_status).not.toBe(STATUS.EFFECTIVE);
  });
  test('Effective requires fresh evidence', () => {
    const stale = ia2Full({ freshness_days: 400 });
    const r = assessControl('nist_800_53_rev5', 'IA-2', stale);
    expect(r.assessment_status).not.toBe(STATUS.EFFECTIVE);
  });
  test('not-API-testable controls are excluded from scoring, never marked Effective', () => {
    const r = assessControl('nist_800_53_rev5', 'PL-2', MFA_ONLY);
    expect(r.assessment_status).toBe(STATUS.NOT_API_TESTABLE);
    expect(r.audit_readiness).toBe('Manual Review Required');
  });
});
