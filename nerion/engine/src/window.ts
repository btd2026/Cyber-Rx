/* =============================================================================
   The reporting window and the deviation arithmetic.
   Ported verbatim from the mock. The invariant these enforce — that the
   deviation intervals account for exactly the days the operating figure says
   were lost — is the one that shipped wrong twice (a 0.86 control labelled
   "no deviations" while losing 13 days). It is a property test, not a hope.
   ========================================================================== */
import type { Deviation } from './types.js';

export const WINDOW = 92;
export const DAY0 = new Date('2026-05-25T00:00:00Z');

export function dayStr(d: number): string {
  return new Date(DAY0.getTime() + d * 864e5).toISOString().slice(0, 10);
}

/* Days lost = the whole-day complement of the operating ratio over the window.
   round((1 - op) * WINDOW). Null op (not measurable) loses no days here — a
   non-interval control has no operating figure to reconcile. */
export function lostDays(op: number | null | undefined): number {
  return op === null || op === undefined ? 0 : Math.round((1 - op) * WINDOW);
}

/* How many distinct deviation intervals a given operating figure implies. */
export function devFor(op: number | null | undefined): number {
  const l = lostDays(op);
  return l === 0 ? 0 : Math.max(1, Math.min(6, Math.ceil(l / 12)));
}

/* The deviation intervals themselves — [startDay, lengthDays] — laid out so
   their lengths sum to exactly lostDays(op). */
export function gapsFor(op: number | null | undefined, dev: number): Deviation[] {
  if (op === null || op === undefined || !dev) return [];
  const lost = Math.round((1 - op) * WINDOW);
  if (lost <= 0) return [];
  const n = Math.min(dev, Math.max(1, lost));
  const out: Deviation[] = [];
  let cursor = 6,
    rem = lost;
  for (let i = 0; i < n; i++) {
    const len = i === n - 1 ? rem : Math.max(1, Math.round(rem / (n - i)));
    out.push({ start_day: cursor, length_days: len });
    rem -= len;
    cursor += len + Math.max(3, Math.floor((WINDOW - lost - 6) / n));
    if (cursor + rem > WINDOW) cursor = Math.max(0, WINDOW - rem - 1);
  }
  return out;
}
