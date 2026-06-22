'use strict';

/**
 * Pure unit tests for OnboardingService.computeCompleteness — the deterministic
 * phase-progress proxy used by the stepper until the full six-dimension
 * calculator ships. No database required.
 */

const Onboarding = require('../../src/services/OnboardingService');

describe('OnboardingService.computeCompleteness', () => {
  it('scores 0 with no completed phases', () => {
    const out = Onboarding.computeCompleteness({ phase_state: {} });
    expect(out.overall).toBe(0);
    for (const d of Onboarding.DIMENSIONS) expect(out.dimensions[d]).toBe(0);
    for (const q of Onboarding.EXEC_QUESTIONS) expect(out.answer_readiness[q]).toBe('red');
  });

  it('weights business_context at 15 when only that phase is complete', () => {
    const out = Onboarding.computeCompleteness({
      phase_state: { business_context: { completed_at: '2026-06-22T00:00:00Z' } },
    });
    expect(out.dimensions.business_context).toBe(100);
    expect(out.overall).toBe(15);
    // Q4/Q5 depend solely on business_context -> green; others still red.
    expect(out.answer_readiness.q4).toBe('green');
    expect(out.answer_readiness.q5).toBe('green');
    expect(out.answer_readiness.q1).toBe('red');
  });

  it('reaches 100 when every owning phase is complete', () => {
    const done = (k) => ({ [k]: { completed_at: '2026-06-22T00:00:00Z' } });
    const phase_state = Object.assign(
      {},
      done('business_context'), done('apps_tech'), done('connectors'),
      done('governance'), done('third_party'), done('scoring')
    );
    const out = Onboarding.computeCompleteness({ phase_state });
    expect(out.overall).toBe(100);
    for (const q of Onboarding.EXEC_QUESTIONS) expect(out.answer_readiness[q]).toBe('green');
  });

  it('returns amber for a question whose dependencies are partially met', () => {
    // Q2 depends on framework_coverage (scoring) + governance_coverage (governance).
    const out = Onboarding.computeCompleteness({
      phase_state: { governance: { completed_at: '2026-06-22T00:00:00Z' } },
    });
    expect(out.answer_readiness.q2).toBe('amber');
  });

  it('tolerates a missing phase_state', () => {
    const out = Onboarding.computeCompleteness({});
    expect(out.overall).toBe(0);
  });
});
