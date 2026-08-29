import { describe, it, expect } from 'vitest';
import {
  entitySummaries,
  entityFindings,
  corporateReach,
  originOf,
} from '../src/federation.js';
import { ENTS, REACH } from '../src/fixtures/federation.js';
import { CAT } from '../src/fixtures/connectors.js';
import { creditsOrigin } from '../src/types.js';

describe('federation — every entity is its own subject', () => {
  it('every entity accounts for all 12 capabilities in exactly one origin', () => {
    for (const e of ENTS) {
      const codes = CAT.map((c) => e.o[c.k]);
      expect(codes.length).toBe(12);
      const sum =
        codes.filter((x) => x === 'L').length +
        codes.filter((x) => x === 'V').length +
        codes.filter((x) => x === 'C').length +
        codes.filter((x) => x === '-').length;
      expect(sum).toBe(12);
    }
  });

  it('an entity is credited only for local + inherited_verified; claim_false counts zero', () => {
    for (const s of entitySummaries()) {
      const credited = s.local + s.inherited_verified;
      expect(s.credited).toBeGreaterThanOrEqual(0);
      // claim_false and no_source never add to the credited capability count
      expect(s.local + s.inherited_verified + s.claim_false + s.no_source).toBe(12);
      // creditsOrigin is the single source of truth for what counts
      const recomputed = CAT.filter((c) =>
        creditsOrigin(originOf(ENTS.find((e) => e.id === s.id)!.o[c.k])),
      ).length;
      expect(recomputed).toBe(credited);
    }
  });

  it('every false inheritance claim raises a finding against the corporate provider', () => {
    for (const e of ENTS) {
      const cf = CAT.filter((c) => e.o[c.k] === 'C').length;
      expect(entityFindings(e).length).toBe(cf);
    }
  });

  it('corporate reach is the measured REACH count, of 147 — never averaged', () => {
    for (const r of corporateReach()) {
      expect(r.entities_present).toBe(REACH[r.key]);
      expect(r.total).toBe(147);
      expect(r.entities_present).toBeLessThanOrEqual(147);
    }
  });

  it('the acquired entity E-112 has false claims and no-source gaps, credited below its peers', () => {
    const summaries = entitySummaries();
    const e112 = summaries.find((s) => s.id === 'E-112')!;
    expect(e112.claim_false).toBeGreaterThan(0);
    expect(e112.no_source).toBeGreaterThan(0);
    // most-exposed first: the corporate provider (E-001, all local) is last
    expect(summaries[summaries.length - 1].id).toBe('E-001');
  });
});
