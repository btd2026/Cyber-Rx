import { describe, it, expect } from 'vitest';
import { machineCarried } from '../src/register.js';
import { ASOF } from '../src/fixtures/instrumentation.js';

describe('bitemporal — instrumentation is a history, not a fact', () => {
  it('machine-carried re-derives at each quarterly stop: 4 → 6 → 7 → 11 → 19 → 30', () => {
    ASOF.forEach((stop, i) => {
      expect(machineCarried(i), `${stop[1]}`).toBe(stop[2]);
    });
  });

  it('the board four-year row (as % of 106) is computed, not asserted', () => {
    const pct = ASOF.map((_, i) => Math.round((machineCarried(i) / 106) * 100));
    expect(pct).toEqual([4, 6, 7, 10, 18, 28]);
  });
});
