'use strict';

/**
 * Phase E guardrail 2 — the two risk lanes. Not every risk is an adversary; ATT&CK is one lane and
 * a parallel non-adversarial lane covers outage/DR, corruption, insider, third-party, privacy.
 */
const L = require('../../src/config/riskLanes');

describe('risk lanes taxonomy', () => {
  test('exposes an adversarial (ATT&CK) lane and a non-adversarial lane', () => {
    expect(L.LANES.map((x) => x.id)).toEqual(['adversarial', 'non_adversarial']);
    expect(L.ADVERSARIAL.label).toMatch(/ATT&CK/);
  });

  test('the non-adversarial lane has the five required categories, each routed to an owner', () => {
    const ids = L.NON_ADVERSARIAL_IDS;
    ['outage_dr', 'data_corruption', 'insider', 'third_party_supply_chain', 'privacy_regulatory'].forEach((id) => {
      expect(ids).toContain(id);
      const c = L.nonAdversarialCategory(id);
      expect(c).toBeTruthy();
      expect(c.owner).toBeTruthy();
    });
  });

  test('validates category ids', () => {
    expect(L.isNonAdversarialCategory('privacy_regulatory')).toBe(true);
    expect(L.isNonAdversarialCategory('ransomware')).toBe(false); // that's adversarial (ATT&CK)
  });
});
