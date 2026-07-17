'use strict';

/**
 * Nerion's wedge is "provable assurance", not a maturity dashboard: the continuous-assessment
 * Summary leads with a "Can you prove it?" hero — the honest split of what is PROVEN by a sensor
 * today vs asserted on a policy vs unproven. On the AI framework it is framed as the "AI proof
 * gap" (governance is not assurance). Source-scan guard.
 */
const fs = require('fs');
const path = require('path');
const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const cockpit = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');
const seats = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit-seats.js'), 'utf8');

describe('Provable-assurance positioning', () => {
  it('brands the product as provable cyber & AI assurance', () => {
    expect(cockpit).toContain('Provable Cyber &amp; AI Assurance');
  });

  it('reframes the CISO seat around proof/defensibility, not dollars', () => {
    expect(seats).toContain("eyebrow:'CISO · Provable assurance cockpit'");
    expect(seats).toContain('what you can actually prove right now');
    // the old dollar-led "risk-removed per dollar" narrative is gone
    expect(seats).not.toContain('risk-removed per dollar than anything else on the table');
  });

  it('leads the assessment Summary with a "Can you prove it?" hero', () => {
    expect(ciso).toContain("(isAiFw?'The AI proof gap':'Can you prove it?')");
    expect(ciso).toContain('var pvProven=s.live,pvHuman=s.hybrid,pvAsserted=s.attestation,pvUnproven=s.awaiting+s.notAssessed;');
    expect(ciso).toContain('proven by a sensor right now');
    expect(ciso).toContain('subBody=provHero+cards+peerBox+queuePanel;');
  });

  it('frames the AI tab as the proof gap — governance is not assurance', () => {
    expect(ciso).toContain('Governance is not assurance');
    expect(ciso).toContain('awaiting</b> an AI-monitoring connector');
  });
});
