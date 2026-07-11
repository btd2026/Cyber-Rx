'use strict';

/**
 * Phase E guardrail 2 (frontend) — the CISO Threats tab surfaces the non-adversarial risk lane
 * alongside the ATT&CK (adversarial) view, and the demo model carries per-jewel non-adversarial risks.
 */
const fs = require('fs');
const path = require('path');

const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const cock = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');

describe('non-adversarial risk lane (Phase E)', () => {
  it('c5NonAdversarialLane renders a lane distinct from ATT&CK and is added to the Threats tab', () => {
    expect(ciso).toContain('function c5NonAdversarialLane(');
    expect(ciso).toContain('c5NonAdversarialLane()');
    expect(ciso).toContain('Non-adversarial risk lane');
    expect(ciso).toContain('Not every risk is an adversary');
  });
  it('mirrors the five non-adversarial categories', () => {
    ['outage_dr', 'data_corruption', 'insider', 'third_party_supply_chain', 'privacy_regulatory'].forEach((id) => {
      expect(ciso).toContain(id);
    });
  });
  it('the demo model carries per-crown-jewel non_adversarial risks + the effectiveness hook', () => {
    expect(cock).toContain('non_adversarial:');
    expect(cock).toContain('effectiveness_measured:false');
  });
});
