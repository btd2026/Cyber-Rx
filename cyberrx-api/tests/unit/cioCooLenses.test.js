'use strict';

/**
 * Phase D — CIO lineage/coverage lens and COO single-point-of-failure lens (seat set completion).
 */
const fs = require('fs');
const path = require('path');

const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const cock = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');

describe('CIO lineage & coverage lens (Phase D)', () => {
  const cio = ciso.slice(ciso.indexOf('function c5ctOverview()'), ciso.indexOf('function c5crOverview()'));
  it('reads estate_coverage and renders a lineage/blind-spot card', () => {
    expect(cio).toContain('LIVE.estate_coverage');
    expect(cio).toContain("id:'ct_coverage'");
    expect(cio).toContain('Lineage & coverage');
    expect(cio).toContain('blind spot');
    expect(cio).toContain('process → application → infrastructure');
  });
  it('the demo model supplies estate_coverage', () => {
    expect(cock).toContain('estate_coverage:');
    expect(cock).toContain('blind_spots:');
  });
});

describe('COO single-point-of-failure lens (Phase D)', () => {
  const coo = ciso.slice(ciso.indexOf('function c5coOverview()'), ciso.indexOf('function c5ctOverview()'));
  it('surfaces crown jewels with a non-adversarial SPOF risk (outage/DR or third-party)', () => {
    expect(coo).toContain("id:'co_spof'");
    expect(coo).toContain('Single points of failure');
    expect(coo).toContain("indexOf('outage_dr')");
    expect(coo).toContain("indexOf('third_party_supply_chain')");
    expect(coo).toContain('without</b> an attacker'); // ties to the non-adversarial lane
  });
});
