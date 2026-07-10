/**
 * Source-scan guards for the CFO "Spend ROI" tab (CyberRXNew/public/ciso5.js — c5cfRoi).
 * Honest & compact: modeled exposure reduction is shown, but ROI is "not enough
 * evidence" until spend is connected — no "risk removed" / "shift budget" claims, four
 * cards only, no rank table.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const a = src.indexOf('function c5cfRoi()');
const b = src.indexOf('function c5covBar(', a);
const fn = a >= 0 && b > a ? src.slice(a, b) : '';

describe('CFO Spend ROI — honest answer', () => {
  it('locates the tab', () => { expect(a).toBeGreaterThan(0); });
  it('uses the spend-not-connected answer', () => {
    expect(fn).toContain('Modeled exposure reduction is visible, but spend ROI is not complete until security spend is connected.');
  });
  it('drops the overclaiming / shift-budget wording', () => {
    expect(fn).not.toMatch(/removing risk/);
    expect(fn).not.toMatch(/risk removed/);
    expect(fn).not.toMatch(/you can prove/);
    expect(fn).not.toMatch(/best next dollar/i);
    expect(fn).not.toContain('Shift budget to identity');
  });
});

describe('CFO Spend ROI — four cards only, no table', () => {
  it('shows exactly the four executive cards', () => {
    expect(fn).toContain('Modeled exposure reduction');
    expect(fn).toContain('Security spend attributed');
    expect(fn).toContain('Return per dollar');
    expect(fn).toContain('ROI readiness');
  });
  it('removes the return-by-budget-area rank table', () => {
    expect(fn).not.toContain('c5ctlRankRows');
    expect(fn).not.toContain('Return by budget area');
  });
});

describe('CFO Spend ROI — spend-not-connected state', () => {
  it('shows Not connected / Not enough evidence / Partial', () => {
    expect(fn).toContain('Not connected');
    expect(fn).toContain('Not enough evidence');
    expect(fn).toMatch(/'Partial','Exposure model connected'/);
  });
  it('primary action connects spend; secondary reviews identity as a candidate', () => {
    expect(fn).toContain("txt:'Connect security spend data'");
    expect(fn).toContain("txt:'Review identity ROI candidate'");
  });
  it('only computes return per dollar when spend is attributed', () => {
    expect(fn).toMatch(/var haveSpend=!!\(st&&st\.invested>0&&st\.riskRemoved>0\)/);
    expect(fn).toMatch(/if\(haveSpend\)\{/);
  });
});
