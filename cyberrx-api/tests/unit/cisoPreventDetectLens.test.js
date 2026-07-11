'use strict';

/**
 * Phase D — CISO two-axis (prevent/detect) coverage lens on the Threats tab, reading the same
 * LIVE.crown_jewel_residual the CRO residual ranking uses (one model, CISO's control-coverage angle).
 */
const fs = require('fs');
const path = require('path');

const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');

describe('CISO prevent/detect coverage lens (Phase D)', () => {
  it('c5PreventDetect renders per-crown-jewel prevent + detect axes with the residual band', () => {
    expect(ciso).toContain('function c5PreventDetect(');
    expect(ciso).toContain('c5ResidualRank()');
    expect(ciso).toContain('Control presence / detection coverage by crown jewel');
    expect(ciso).toContain('CONTROL PRESENT');
    expect(ciso).toContain('DETECTION');
    // honest: presence is a mapped control, not proven effectiveness; effectiveness is a hook
    expect(ciso).toContain('not proof it works');
    expect(ciso).toContain('Effectiveness is not yet measured');
  });
  it('the Threats tab renders the lens', () => {
    const threats = ciso.slice(ciso.indexOf('function c5Threats()'), ciso.indexOf('/* ---------- Tab 05 — Peers'));
    expect(threats).toContain('c5PreventDetect()');
  });
});
