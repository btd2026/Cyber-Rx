/**
 * Source-scan guards proving the executive cockpit derives "the largest driver" from
 * DATA (c5TopDriver → c5expModel drivers ranked by modeled USD), not a hard-coded
 * identity/dollar conclusion. Complements execNarrativeCopy.test.js (which unit-tests
 * the portable narrative service) by locking the wiring inside ciso5.js.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
function region(fromMarker, toMarker) {
  const a = src.indexOf(fromMarker);
  const b = toMarker ? src.indexOf(toMarker, a + 1) : src.length;
  return a >= 0 ? src.slice(a, b > a ? b : src.length) : '';
}

describe('c5TopDriver — the shared data-ranked top-driver helper', () => {
  const fn = region('function c5TopDriver()', 'function c5trendPill(');
  it('exists', () => { expect(fn).toContain('function c5TopDriver()'); });
  it('reads the data-ranked drivers[0] from c5expModel(), not a literal', () => {
    expect(fn).toMatch(/c5expModel\(\)/);
    expect(fn).toMatch(/drivers\[0\]/);
  });
  it('exposes name / phrase / short / mid / displayValue and is demo/connected aware', () => {
    ['name:', 'phrase:', 'short:', 'mid:', 'displayValue:', 'connected:', 'demo:'].forEach((k) => expect(fn).toContain(k));
  });
  it('the exposure model still ranks drivers by computed modeled USD (descending)', () => {
    const m = region('function c5expModel()', 'function c5TopDriver()');
    expect(m).toMatch(/drivers\.sort\(function\(a,b\)\{return b\.usd-a\.usd;\}\)/);
  });
});

describe('CFO Within Appetite — driver is data-driven, not hard-coded identity', () => {
  const fn = region('function c5cfExposure()', 'function c5cfRoi(');
  it('derives the driver from c5TopDriver()', () => {
    expect(fn).toMatch(/var TD=c5TopDriver\(\),dm=c5get\(TD\.mid\)/);
  });
  it('no longer hard-codes "identity risk is the largest financial driver"', () => {
    expect(fn).not.toContain('identity risk is the largest financial driver');
    expect(fn).not.toContain('largest financial exposure driver is customer-platform identity risk');
  });
  it('headline / bottom line / driver value all read the computed driver', () => {
    expect(fn).toMatch(/'The largest financial exposure driver is '\+drvL/);
    expect(fn).toMatch(/cfTile\('Largest financial exposure driver',\(dm\.connected\?dm\.displayValue/);
  });
  it('the within/outside-appetite verdict is computed from status, not asserted', () => {
    expect(fn).toMatch(/withinTxt=/);
    expect(fn).toMatch(/\/Within\/\.test\(status\)/);
  });
  it('the primary button reduces the computed driver (never a literal identity string)', () => {
    expect(fn).toMatch(/txt:'Approve '\+drvS\+' remediation — reduce modeled exposure'/);
    expect(fn).not.toContain("txt:'Approve identity remediation — reduce modeled exposure'");
  });
});

describe('CFO Insurance — largest tail driver is data-driven', () => {
  const fn = region('function c5cfInsurance()', 'function c5cfCost(');
  it('derives the tail driver from c5TopDriver()', () => {
    expect(fn).toMatch(/var TD=c5TopDriver\(\),dm=c5get\(TD\.mid\)/);
  });
  it('no longer hard-codes the identity tail-driver conclusion or button', () => {
    expect(fn).not.toContain('Customer-platform identity risk is the largest contributor to the modeled tail.');
    expect(fn).not.toContain('reduce the largest tail driver — customer-platform identity risk — before buying more coverage');
    expect(fn).not.toContain("txt:'Fund identity remediation'");
  });
  it('reduces the computed largest tail driver before buying more coverage', () => {
    expect(fn).toMatch(/reduce the largest tail driver — '\+drvL\+' — before buying more coverage/);
    expect(fn).toMatch(/txt:'Fund '\+drvS\+' remediation'/);
  });
});

describe('CFO Spend ROI — no hard-coded dollar default', () => {
  const fn = region('function c5cfRoi()', 'function c5covBar(');
  it('does not fall back to a hard-coded $604M', () => {
    expect(fn).not.toContain('$604M');
    expect(fn).toMatch(/redConn\?er\.displayValue:'Not connected'/);
  });
  it('the reallocation candidate is the computed top driver, not literal identity', () => {
    expect(fn).toMatch(/var TD=c5TopDriver\(\)/);
    expect(fn).not.toContain("txt:'Review identity ROI candidate'");
    expect(fn).toMatch(/txt:'Review '\+cand\+' ROI candidate'/);
  });
});

describe('CISO Cyber Exposure — identity fallback branch is data-driven', () => {
  const fn = region('function c5Health()', 'function c5ExposureEvidence(');
  it('no longer hard-codes "cloud identity sprawl" as the driver', () => {
    expect(fn).not.toContain('cloud identity sprawl');
    expect(fn).not.toContain('Approve identity remediation — reduce top exposure');
  });
  it('the driver branch derives name/value/button from c5TopDriver()', () => {
    expect(fn).toMatch(/var TD=c5TopDriver\(\)/);
    expect(fn).toMatch(/The largest exposure driver is <b>'\+c5esc\(TD\.phrase\)/);
    expect(fn).toMatch(/'Approve '\+c5esc\(TD\.short\)\+' remediation — reduce top exposure'/);
  });
  it('preserves the data-driven crown-jewel branch (topCj) untouched', () => {
    expect(fn).toMatch(/var topCj=/);
    expect(fn).toMatch(/Prioritize '\+c5esc\(topCj\.asset\)/);
  });
});

describe('no hard-coded flagged demo values survive in the reviewed cockpit', () => {
  it('the exact flagged tokens are gone from ciso5.js', () => {
    expect(src).not.toContain('$604M');
    expect(src).not.toContain('$382M');
  });
});
