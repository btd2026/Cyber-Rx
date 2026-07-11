'use strict';

/**
 * Phase D — CRO residual-ranking lens. The CRO seat ranks crown jewels by residual risk using a
 * browser mirror of the backend ResidualRiskService formula. Source-scan guard.
 */
const fs = require('fs');
const path = require('path');

const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const cock = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');

describe('CRO residual-ranking lens (Phase D)', () => {
  it('has a browser residual formula that mirrors the backend (impact × unmitigated-prevention × detection-gap, floored)', () => {
    expect(ciso).toContain('function c5Residual(');
    expect(ciso).toContain('imp*noCtrl*detGap');
    expect(ciso).toContain('function c5ResidualRank(');
    expect(ciso).toContain('LIVE.crown_jewel_residual');
  });
  it('the CRO overview renders a residual-ranking card sorted by residual', () => {
    const cro = ciso.slice(ciso.indexOf('function c5crOverview()'), ciso.indexOf('function c5clOverview()'));
    expect(cro).toContain("id:'cr_residual'");
    expect(cro).toContain('Residual ranking');
    expect(cro).toContain('c5ResidualRank()');
    expect(cro).toContain('ranked by <b>residual risk</b>');
  });
  it('the demo model supplies per-crown-jewel prevent/detect coverage', () => {
    expect(cock).toContain('crown_jewel_residual:');
    expect(cock).toContain('control_presence:'); // honest axis name (Phase E)
    expect(cock).toContain('detection:');
  });
});
