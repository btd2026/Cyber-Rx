/* =============================================================================
   The operating-effectiveness factory.
   This is the ONE place an OperatingEffectiveness value is constructed. Given a
   non-interval class it can only ever return the `measurable:false` arm — there
   is no code path from a document, an attestation or an interview to a ratio.
   The reason is derived from the class, so it can never disagree with it.
   ========================================================================== */
import {
  EvidenceClass,
  OperatingEffectiveness,
  isIntervalClass,
} from './types.js';
import { WINDOW, devFor, gapsFor } from './window.js';

/* Reason a class cannot answer operating — total function over the three
   design-only classes. */
function notMeasurableReason(
  c: Exclude<EvidenceClass, 'telemetry' | 'config_export'>,
): 'attested' | 'interview' | 'document' {
  return c === 'attestation' ? 'attested' : c === 'interview' ? 'interview' : 'document';
}

/* Build operating effectiveness for a control.
   - Interval class + a ratio  → measured, with the reconciled deviations.
   - Interval class + null      → still not measurable (below the evidence
                                  threshold: measured on too few entities).
   - Any design-only class      → not measurable, reason derived from the class;
                                  the caller's `ratio` is ignored by construction. */
export function makeOperating(
  cls: EvidenceClass,
  ratio: number | null,
  coverageEntities: number | null,
): OperatingEffectiveness {
  if (!isIntervalClass(cls)) {
    return { measurable: false, reason: notMeasurableReason(cls) };
  }
  // interval class, but no ratio available → measured on too few entities.
  // Distinct from a design-only absence: it is BELOW THRESHOLD, and the
  // coverage is carried so the UI can show "measured on 11 of 147".
  if (ratio === null || coverageEntities === null) {
    return { measurable: false, reason: 'below_threshold', coverage_entities: coverageEntities ?? 0 };
  }
  const applicable = coverageEntities * WINDOW;
  const operated = Math.round(applicable * ratio);
  const dev = devFor(ratio);
  return {
    measurable: true,
    ratio,
    applicable_entity_days: applicable,
    operated_entity_days: operated,
    window_days: WINDOW,
    deviations: gapsFor(ratio, dev),
    resolution: cls === 'telemetry' ? 'event' : 'daily_snapshot',
  };
}

/* Total lost days implied by an operating value (0 when not measurable). */
export function operatingLostDays(op: OperatingEffectiveness): number {
  if (!op.measurable) return 0;
  return op.deviations.reduce((a, d) => a + d.length_days, 0);
}
