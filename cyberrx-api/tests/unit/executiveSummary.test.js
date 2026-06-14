'use strict';

/**
 * build_executive_summary — offline tests (no ANTHROPIC_API_KEY -> deterministic).
 * Verifies structured blocks, grounding in intake + assessment, and the
 * guardrails: missing fields are omitted and never fabricated; sparse intake
 * still yields an accurate summary.
 */

const { buildExecutiveSummary, deterministic } = require('../../src/services/ExecutiveSummaryService');

const intake = {
  client_name: 'Acme Health',
  org_profile: {
    industry: 'Health Plan / Payer', employee_count: '1200', revenue_band: '$1B–$5B',
    regulatory_obligations: ['HIPAA', 'CMS'], crown_jewels: ['Claims Processing', 'Member Portal'],
  },
  process: { incident_response: 'partial' },
  technology: { hosting: 'hybrid', app_count: '180' },
};

const assessment = {
  overall: { score: 62, band: 'Moderate', trend: 'improving', delta: 4 },
  strengths: [{ name: 'Governance', score: 73, status: 'Moderate' }],
  weakest: [
    { name: 'Detection & Response', score: 55, status: 'Weak', deteriorating: 'MTTD' },
    { name: 'Vulnerability Management', score: 58, status: 'Weak' },
    { name: 'Third-Party Risk', score: 54, status: 'Weak' },
  ],
  thresholds: { breaches: 6, total: 15, critical: 1 },
  topActions: [{ action: 'Onboard legacy claims DB to SIEM', owner: 'SecOps', due: '2026-07-01', process: 'Claims Processing' }],
  controlCount: 18,
};

const BLOCK_KEYS = ['context', 'posture', 'key_risks', 'quick_wins', 'path_forward'];

describe('build_executive_summary (deterministic, offline)', () => {
  test('returns all structured blocks with stable shape', async () => {
    const s = await buildExecutiveSummary(intake, assessment);
    BLOCK_KEYS.forEach((k) => expect(s).toHaveProperty(k));
    expect(Array.isArray(s.key_risks)).toBe(true);
    expect(Array.isArray(s.quick_wins)).toBe(true);
    s.key_risks.forEach((r) => { expect(r).toHaveProperty('title'); expect(r).toHaveProperty('detail'); });
  });

  test('grounds context in org_profile and posture in the score', async () => {
    const s = await buildExecutiveSummary(intake, assessment);
    expect(s.context).toContain('Health Plan');
    expect(s.context).toContain('HIPAA');
    expect(s.posture).toContain('62');
    expect(s.key_risks.length).toBeGreaterThanOrEqual(3);
    expect(s.key_risks[0].title).toBe('Detection & Response');
  });

  test('GUARDRAIL: never emits the literal "undefined" (no fabrication of missing fields)', async () => {
    const s = await buildExecutiveSummary(intake, assessment);
    expect(JSON.stringify(s)).not.toMatch(/undefined/);
  });

  test('GUARDRAIL: missing intake fields are omitted, not invented', () => {
    // No geos provided -> the "Operations span" clause must not appear.
    const s = deterministic({ client_name: 'NoGeo Co', org_profile: { industry: 'SaaS' } }, assessment);
    expect(s.context).not.toMatch(/Operations span/);
    expect(s.context).not.toMatch(/undefined/);
  });

  test('GUARDRAIL: sparse intake degrades to a generic-but-accurate summary', async () => {
    const s = await buildExecutiveSummary({}, assessment);
    expect(s.context.length).toBeGreaterThan(0);
    expect(s.posture).toContain('62');                 // still grounded in assessment
    expect(s.key_risks.length).toBeGreaterThanOrEqual(3);
    expect(JSON.stringify(s)).not.toMatch(/undefined/);
  });
});
