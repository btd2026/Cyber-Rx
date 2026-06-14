'use strict';

/**
 * payerCapabilityTaxonomy — offline integrity checks on the canonical reference
 * content: unique ids, resolvable parents, valid tiers/criticality, packs and
 * business-type packs reference real ids, and NO plan-identifying / tenant data.
 */

const { VERSION, CAPABILITIES, PACKS, BUSINESS_TYPE_PACKS, DEPENDENCY_CATALOG } = require('../../src/data/payerCapabilityTaxonomy');

const ids = new Set(CAPABILITIES.map((c) => c.id));
const TIERS = new Set(['A_universal', 'B_blue', 'C_extension']);

describe('payer capability taxonomy', () => {
  test('version is well-formed', () => {
    expect(VERSION.id).toBeTruthy();
    expect(VERSION.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('capability ids are unique', () => {
    expect(ids.size).toBe(CAPABILITIES.length);
  });

  test('every node has valid tier/kind/name and capabilities resolve to a function', () => {
    for (const c of CAPABILITIES) {
      expect(TIERS.has(c.content_tier || c.tier)).toBe(true);
      expect(['function', 'capability']).toContain(c.kind);
      expect(typeof c.name).toBe('string');
      expect(c.name.length).toBeGreaterThan(0);
      if (c.kind === 'capability') {
        expect(c.parent).toBeTruthy();
        expect(ids.has(c.parent)).toBe(true);            // parent resolves
        const parent = CAPABILITIES.find((x) => x.id === c.parent);
        expect(parent.kind).toBe('function');            // parent is a function
      } else {
        expect(c.parent).toBeFalsy();                    // functions have no parent
      }
      if (c.crit != null) expect([1, 2, 3]).toContain(c.crit);
      expect(typeof c.rto).toBe('string');
    }
  });

  test('packs reference only existing capability ids', () => {
    for (const packId of Object.keys(PACKS)) {
      PACKS[packId].forEach((id) => expect(ids.has(id)).toBe(true));
    }
  });

  test('business-type packs reference existing packs and BCBS includes the Blue pack', () => {
    for (const bt of Object.keys(BUSINESS_TYPE_PACKS)) {
      BUSINESS_TYPE_PACKS[bt].forEach((p) => expect(PACKS[p]).toBeDefined());
    }
    expect(BUSINESS_TYPE_PACKS['BCBS Plan']).toContain('blue');
    expect(BUSINESS_TYPE_PACKS['Commercial Health Plan']).not.toContain('blue');
  });

  test('dependency catalog supports[] resolve to capabilities', () => {
    for (const d of DEPENDENCY_CATALOG) {
      (d.supports || []).forEach((id) => expect(ids.has(id)).toBe(true));
    }
  });

  test('GUARDRAIL: shared reference content carries no tenant / plan-identifying fields', () => {
    const banned = /organization_id|orgId|tenant|plan_id|bcbs[a-z]*_plan_name/i;
    CAPABILITIES.forEach((c) => Object.keys(c).forEach((k) => expect(k).not.toMatch(banned)));
  });
});
