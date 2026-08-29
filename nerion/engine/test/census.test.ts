import { describe, it, expect } from 'vitest';
import { classCensus, machineCarried, functionCensus } from '../src/register.js';
import { isoProjection, cisProjection } from '../src/projections.js';
import { ISOC } from '../src/fixtures/iso.js';

describe('CSF 2.0 census — measured once', () => {
  it('106 = 19 telemetry + 11 config + 29 document + 30 attestation + 17 interview', () => {
    const c = classCensus();
    expect(c).toEqual({
      telemetry: 19,
      config_export: 11,
      document: 29,
      attestation: 30,
      interview: 17,
    });
    const total = Object.values(c).reduce((a, b) => a + b, 0);
    expect(total).toBe(106);
  });

  it('106 = 31 GV + 21 ID + 22 PR + 11 DE + 13 RS + 8 RC by function', () => {
    const f = functionCensus();
    expect(f).toEqual({ GV: 31, ID: 21, PR: 22, DE: 11, RS: 13, RC: 8 });
    expect(Object.values(f).reduce((a, b) => a + b, 0)).toBe(106);
  });

  it('machine-carried today = 30 of 106 (telemetry + config)', () => {
    expect(machineCarried()).toBe(30);
  });
});

describe('ISO 27001:2022 projection — same estate, re-labelled', () => {
  it('93 Annex A controls = 37 + 8 + 14 + 34', () => {
    const p = isoProjection();
    expect(p.units).toBe(93);
    expect(ISOC['A.5'].length).toBe(37);
    expect(ISOC['A.6'].length).toBe(8);
    expect(ISOC['A.7'].length).toBe(14);
    expect(ISOC['A.8'].length).toBe(34);
  });
});

describe('CIS v8.1 projection', () => {
  it('153 safeguards, IG1 = 56, across 18 controls', () => {
    const p = cisProjection();
    expect(p.units).toBe(153);
    expect(p.ig1).toBe(56);
    expect(p.groups.length).toBe(18);
  });
});
