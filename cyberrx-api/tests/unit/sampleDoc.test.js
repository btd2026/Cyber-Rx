'use strict';

/**
 * Phase 6 — pilot sample-document generator (flag-gated). Tests the pure text
 * builder + the flag. generateForType() (DB-backed) runs at the route layer.
 */

const { buildSampleText, isPilot, BANNER } = require('../../src/services/SampleDocService');

const docType = { id: 'access_control_policy', name: 'Access Control Policy', category: 'Policy', description: 'How access is governed.' };
const controls = [
  { framework_id: 'nist_csf_2', requirement_id: 'PR.AA-03', title: 'Authentication', expected_requirement: 'Multi-factor authentication is enforced for remote and privileged access.' },
  { framework_id: 'nist_csf_2', requirement_id: 'PR.AA-05', title: 'Least privilege', expected_requirement: 'Access permissions are defined and enforced using least privilege.' },
];

describe('sample document generator', () => {
  test('is clearly labeled as a TEST FIXTURE (top and bottom)', () => {
    const t = buildSampleText(docType, controls);
    expect(t.startsWith(BANNER)).toBe(true);
    expect(t.trim().endsWith(BANNER)).toBe(true);
    expect(BANNER).toMatch(/SAMPLE|TEST FIXTURE/);
  });

  test('echoes each mapped control requirement so the pipeline can match it', () => {
    const t = buildSampleText(docType, controls);
    expect(t).toContain('Access Control Policy');
    expect(t).toContain('Multi-factor authentication is enforced');
    expect(t).toContain('least privilege');
    expect(t).toContain('PR.AA-03');
  });

  test('handles a type with no mapped controls without throwing', () => {
    const t = buildSampleText({ id: 'x', name: 'Empty Policy' }, []);
    expect(t).toContain('Empty Policy');
    expect(t).toContain(BANNER);
  });

  test('isPilot reflects the PILOT_SAMPLE_DOCS flag', () => {
    const prev = process.env.PILOT_SAMPLE_DOCS;
    process.env.PILOT_SAMPLE_DOCS = 'true'; expect(isPilot()).toBe(true);
    process.env.PILOT_SAMPLE_DOCS = 'false'; expect(isPilot()).toBe(false);
    delete process.env.PILOT_SAMPLE_DOCS; expect(isPilot()).toBe(false);
    if (prev !== undefined) process.env.PILOT_SAMPLE_DOCS = prev;
  });
});
