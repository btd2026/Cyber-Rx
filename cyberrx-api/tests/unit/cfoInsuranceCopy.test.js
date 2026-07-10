/**
 * Source-scan guards for the CFO "Insurance" tab (CyberRXNew/public/ciso5.js —
 * c5cfInsurance + c5covBar). CFO-safe balance-sheet framing: modeled tail vs
 * transferred-to-insurer vs retained exposure, a fixed premium, a coverage-terms
 * caveat, evidence confidence, and reduce-the-tail-before-buying wording.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const a = src.indexOf('function c5cfInsurance()');
const b = src.indexOf('function c5cfCost(', a);
const fn = a >= 0 && b > a ? src.slice(a, b) : '';
const bar = src.slice(src.indexOf('function c5covBar()'), src.indexOf('function c5cfInsurance()'));

describe('CFO Insurance — answer & no vague wording', () => {
  it('locates the tab', () => { expect(a).toBeGreaterThan(0); });
  it('replaces "Covered for the everyday / watch the tail"', () => {
    expect(fn).not.toContain('Covered for the everyday');
    expect(fn).not.toContain('watch the tail');
    expect(fn).toMatch(/Insurance covers most modeled tail loss, but '\+gapV\+' remains retained\./);
  });
  it('does not overclaim payout / risk elimination', () => {
    expect(fn).not.toMatch(/fully insured/i);
    expect(fn).not.toMatch(/fully covered/i);
    expect(fn).not.toMatch(/guaranteed/i);
    expect(fn).not.toMatch(/risk removed/i);
    expect(fn).not.toMatch(/buy up/i);
  });
});

describe('CFO Insurance — CFO-safe cards & bar', () => {
  it('relabels the three main cards', () => {
    expect(fn).toContain('Modeled 1-in-20 cyber loss');
    expect(fn).toContain('Transferred to insurer');
    expect(fn).toContain('Retained exposure');
  });
  it('labels the bar transferred-to-insurer vs retained-by-company', () => {
    expect(bar).toContain('Transferred to insurer — ');
    expect(bar).toContain('Retained by company — ');
    expect(bar).toContain('modeled 1-in-20 cyber loss');
  });
});

describe('CFO Insurance — premium fix', () => {
  it('does not render the implausible premium; shows Not connected / Premium data needed', () => {
    expect(fn).toMatch(/var pImpl=pv>0&&\(\(plim>0&&pv>=plim\)\|\|\(plim<=0&&ptail>0&&pv>ptail\)\)/);
    expect(fn).toMatch(/premUsable\?\(usd\(pv\)\+' \/ yr'\):'Not connected'/);
    expect(fn).toContain('Premium data needed');
  });
});

describe('CFO Insurance — coverage terms, driver, evidence', () => {
  it('adds a coverage-terms review card mentioning exclusions/sublimits/BI', () => {
    expect(fn).toContain('Coverage terms review');
    expect(fn).toMatch(/Exclusions, sublimits, retention.*business interruption.*vendor\/supply-chain/);
  });
  it('names customer-platform identity risk as the largest tail driver', () => {
    expect(fn).toContain('Largest tail driver');
    expect(fn).toContain('Customer-platform identity risk is the largest contributor to the modeled tail.');
  });
  it('renders an evidence-confidence strip; policy terms are a critical not-connected source', () => {
    expect(fn).toMatch(/var evPanel=c5EvLine\(evLevel,/);
    expect(fn).toMatch(/Exclusions \/ sublimits \/ retention',connected:false,critical:true/);
    expect(fn).toMatch(/var evLevel=demo\?'Demo':evConf\.level/);
  });
});

describe('CFO Insurance — bottom line & buttons', () => {
  it('recommends reducing the tail before buying more coverage', () => {
    expect(fn).toContain('reduce the largest tail driver — customer-platform identity risk — before buying more coverage');
  });
  it('buttons say Fund identity remediation and Model additional coverage', () => {
    expect(fn).toContain("txt:'Fund identity remediation'");
    expect(fn).toContain("txt:'Model additional coverage'");
    expect(fn).not.toContain('Model buying up cover');
  });
  it('every card carries a source/status badge', () => {
    expect(fn).toMatch(/function cfCard\(t,v,badge,badgeCls,sub,col,mid\)/);
  });
});
