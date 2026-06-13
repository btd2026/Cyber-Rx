'use strict';

/**
 * DocumentPipeline — unit tests for the discrete, re-runnable steps.
 * Runs offline: no ANTHROPIC_API_KEY -> deterministic heuristic review.
 */

const { normalize } = require('../../src/services/DocumentNormalizer');
const { reviewControl, reviewDocument, heuristicReview } = require('../../src/services/DocumentPipelineService');

// A small sample "Access Control Policy" document.
const SAMPLE = `ACME Health Plan — Access Control Policy

1. Purpose. This policy governs identity and access management.
2. Multi-factor authentication is required for all remote and privileged access.
3. User access is reviewed and recertified quarterly by system owners.
4. Dormant accounts are disabled within 45 days of inactivity.
5. Least-privilege is enforced for all administrative roles.`;

describe('DocumentNormalizer.normalize', () => {
  test('passes through plain text and tags the format', () => {
    const r = normalize(SAMPLE, 'access-control-policy.txt');
    expect(r.format).toBe('txt');
    expect(r.text).toContain('Multi-factor authentication');
  });
  test('handles a Buffer for an unknown type via utf-8 fallback', () => {
    const r = normalize(Buffer.from('hello world'), 'note.unknown');
    expect(r.text).toContain('hello world');
  });
});

describe('reviewControl (heuristic, offline)', () => {
  const mfaControl = { framework_id: 'nist_csf_2', requirement_id: 'PR.AA-03',
    requirement_text: 'Multi-factor authentication is enforced for remote and privileged access.' };
  const bcpControl = { framework_id: 'nist_csf_2', requirement_id: 'RC.RP-01',
    requirement_text: 'A disaster recovery and business continuity plan is tested annually for restoration.' };

  test('returns structured finding (status/excerpt/rationale)', async () => {
    const f = await reviewControl(SAMPLE, mfaControl);
    expect(['met', 'partially met', 'not met']).toContain(f.status);
    expect(f).toHaveProperty('evidence_excerpt');
    expect(f).toHaveProperty('rationale');
    expect(f.engine).toBe('heuristic');
  });
  test('finds a control the document covers', async () => {
    const f = await reviewControl(SAMPLE, mfaControl);
    expect(f.status).toBe('met');
    expect(f.evidence_excerpt.toLowerCase()).toContain('multi-factor');
  });
  test('flags a control the document does not cover', async () => {
    const f = heuristicReview(SAMPLE, bcpControl);
    expect(f.status).toBe('not met');
  });
  test('empty document is never "met"', async () => {
    const f = await reviewControl('', mfaControl);
    expect(f.status).toBe('not met');
  });
});

describe('reviewDocument fan-out (one finding per mapped control)', () => {
  test('produces a finding for every control passed', async () => {
    const controls = [
      { framework_id: 'nist_csf_2', requirement_id: 'PR.AA-03', requirement_text: 'Multi-factor authentication for privileged access.' },
      { framework_id: 'nist_800_53_r5', requirement_id: 'AC-2', requirement_text: 'Account management: review and recertify user access.' },
      { framework_id: 'cis_v8_1', requirement_id: '5.3', requirement_text: 'Disable dormant accounts within 45 days.' },
    ];
    const results = await reviewDocument(SAMPLE, controls);
    expect(results).toHaveLength(3);
    results.forEach((r) => {
      expect(r.control).toBeDefined();
      expect(['met', 'partially met', 'not met']).toContain(r.finding.status);
    });
    // the doc clearly covers MFA, access review, and dormant accounts
    expect(results.map((r) => r.finding.status).filter((s) => s === 'met').length).toBeGreaterThanOrEqual(2);
  });
});
