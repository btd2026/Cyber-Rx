'use strict';

/**
 * automationCoverage — guards the catalog sizes and that every tier split adds up
 * to its control/family total, so the auto/partial/manual counts stay honest.
 */

const AC = require('../../src/control-assessment/automationCoverage');

test('CIS v8.1 has 153 safeguards and every group split sums to its safeguard count', () => {
  const sum = AC.CIS_V8_1.groups.reduce((a, g) => a + g.safeguards, 0);
  expect(sum).toBe(153);
  AC.CIS_V8_1.groups.forEach((g) => expect(g.auto + g.partial + g.manual).toBe(g.safeguards));
});

test('NIST 800-53 Rev 5 base controls sum to 322 and every family split sums to its base count', () => {
  const base = AC.NIST_800_53_REV5.families.reduce((a, f) => a + f.base, 0);
  expect(base).toBe(322);
  AC.NIST_800_53_REV5.families.forEach((f) => expect(f.auto + f.partial + f.manual).toBe(f.base));
});

test('every enumerated control carries a valid tier', () => {
  const valid = ['auto', 'partial', 'manual'];
  [AC.HIPAA_164.controls, AC.SOC2_2017_TSC.controls, AC.NIST_CSF_2_0.controls].forEach((list) => {
    list.forEach((c) => { expect(valid).toContain(c.tier); expect(c.id).toBeTruthy(); });
  });
});

test('summary tallies are internally consistent (auto+partial+manual === total)', () => {
  const s = AC.summary();
  Object.values(s).forEach((r) => expect(r.auto + r.partial + r.manual).toBe(r.total));
  // grand total is the sum of the five framework catalogs
  const five = ['nist_csf_2_0', 'cis_v8_1', 'hipaa_164', 'soc2_2017_tsc', 'nist_800_53_rev5'];
  const t = five.reduce((a, k) => a + s[k].total, 0);
  expect(s.all_frameworks.total).toBe(t);
});
