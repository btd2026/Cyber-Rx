import { describe, it, expect } from 'vitest';
import { register } from '../src/register.js';
import { makeOperating, operatingLostDays } from '../src/operating.js';
import { WINDOW } from '../src/window.js';
import { isIntervalClass, EvidenceClass } from '../src/types.js';

const CLASSES: EvidenceClass[] = ['telemetry', 'config_export', 'document', 'attestation', 'interview'];

describe('design ≠ operating — the type makes the illegal state unconstructable', () => {
  it('a design-only class can never yield an operating number', () => {
    for (const cls of ['document', 'attestation', 'interview'] as EvidenceClass[]) {
      const op = makeOperating(cls, 0.9 /* ignored */, 140);
      expect(op.measurable).toBe(false);
      if (!op.measurable) {
        expect(op.reason).toBe(cls === 'attestation' ? 'attested' : cls === 'interview' ? 'interview' : 'document');
      }
    }
  });

  it('an interval class measured on too few entities is below_threshold, not zero and not null', () => {
    const op = makeOperating('config_export', null, 11);
    expect(op.measurable).toBe(false);
    if (!op.measurable) {
      expect(op.reason).toBe('below_threshold');
      // @ts-expect-error narrow to the below_threshold arm
      expect(op.coverage_entities).toBe(11);
    }
  });

  it('operating.measurable ⟹ evidence_class ∈ {telemetry, config_export}', () => {
    for (const c of register()) {
      if (c.operating.measurable) expect(isIntervalClass(c.evidence_class)).toBe(true);
    }
  });
});

describe('deviation reconciliation — the bug I shipped twice', () => {
  it('Σ deviation.days === round((1 − op) × 92) for every measured control', () => {
    for (const c of register()) {
      if (!c.operating.measurable) continue;
      const expected = Math.round((1 - c.operating.ratio) * WINDOW);
      const summed = operatingLostDays(c.operating);
      expect(summed, `${c.subcategory} @ op=${c.operating.ratio}`).toBe(expected);
    }
  });

  it('deviation count === 0 ⟺ Σ days === 0 (0.86 must NOT read "no deviations")', () => {
    for (const c of register()) {
      if (!c.operating.measurable) continue;
      const days = operatingLostDays(c.operating);
      const count = c.operating.deviations.length;
      expect(count === 0).toBe(days === 0);
    }
  });

  it('the exact case: op = 0.86 over 92 days loses 13 days across ≥1 interval', () => {
    const op = makeOperating('telemetry', 0.86, 119);
    expect(op.measurable).toBe(true);
    if (op.measurable) {
      expect(operatingLostDays(op)).toBe(13);
      expect(op.deviations.length).toBeGreaterThan(0);
    }
  });

  it('operated_entity_days = round(applicable × ratio) and applicable = coverage × 92', () => {
    for (const c of register()) {
      if (!c.operating.measurable) continue;
      expect(c.operating.applicable_entity_days).toBe((c.coverage_entities ?? 0) * WINDOW);
      expect(c.operating.operated_entity_days).toBe(
        Math.round(c.operating.applicable_entity_days * c.operating.ratio),
      );
    }
  });
});
