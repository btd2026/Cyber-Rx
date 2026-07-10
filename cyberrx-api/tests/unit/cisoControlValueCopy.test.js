/**
 * Source-scan guards for the CISO "Control Value" tab (CyberRXNew/public/ciso5.js —
 * the bodyB / w3 surface of c5Exposure). Asserts executive-safe wording: exposure
 * reduction (not risk removed), coverage + evidence status (not "deployed"), remaining
 * gap / next action per control, business-language descriptions, evidence confidence,
 * and a value-not-ROI bottom line.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
// bodyB surface (Control-value tab).
const cvStart = src.indexOf('// TAB B — control value');
const cvEnd = src.indexOf('var host2=document.getElementById', cvStart);
const cv = cvStart >= 0 && cvEnd > cvStart ? src.slice(cvStart, cvEnd) : '';
// The control-row template (w3), defined just above bodyB.
const w3Start = src.indexOf('var demoCV=');
const w3 = w3Start >= 0 ? src.slice(w3Start, cvStart) : '';

describe('Control Value tab — question & answer', () => {
  it('locates the tab surface', () => {
    expect(cvStart).toBeGreaterThan(0);
    expect(cv).toContain('which controls reduce the most business exposure');
  });
  it('headline says controls reduce modeled exposure, ranked by value delivered', () => {
    expect(cv).toMatch(/reduce '\+usd\(rr\.total\)\+' of modeled exposure — ranked by business value delivered/);
  });
  it('surfaces the highest-value control and the largest remaining gap when both differ', () => {
    expect(cv).toMatch(/delivers the highest current value, while '\+nm\(topGap\.c\)\+' has the largest remaining gap/);
  });
});

describe('Control Value tab — no overclaiming', () => {
  it('does not say risk removed / removed(dollar) / per-dollar / best-next-spend on the surface', () => {
    expect(cv).not.toMatch(/risk removed/i);
    expect(cv).not.toMatch(/\bremoved\b/i);
    expect(cv).not.toMatch(/per dollar/i);
    expect(cv).not.toMatch(/best next spend/i);
    expect(w3).not.toMatch(/\bremoved\b/i);
  });
  it('replaces "deployed" badges with coverage', () => {
    expect(w3).not.toMatch(/% deployed/);
    expect(w3).toMatch(/'% coverage'/);
  });
  it('uses "modeled exposure reduction" language', () => {
    expect(cv).toMatch(/modeled exposure reduction/);
  });
});

describe('Control Value tab — descriptions are business-language, not overbroad', () => {
  it('control descriptions never say protects all / protects every', () => {
    const descStart = src.indexOf('var CTRL_DESC=');
    const descBlock = src.slice(descStart, descStart + 900);
    expect(descBlock).not.toMatch(/protects all/i);
    expect(descBlock).not.toMatch(/protects every/i);
    expect(descBlock).toContain('Reduces identity-based access exposure');
    expect(descBlock).toContain('Reduces privileged-account misuse exposure');
  });
});

describe('Control Value tab — per-row evidence, gap and next action', () => {
  it('each row shows an evidence status badge', () => {
    expect(w3).toMatch(/ctrlEvidenceStatus\(cov,demoCV\)/);
  });
  it('each row shows remaining gap and next action (compact)', () => {
    expect(w3).toMatch(/· Gap '\+c5esc\(gapShort\)/);
    expect(w3).toMatch(/· Next<\/span> '\+c5esc\(next\)/);
  });
  it('marks rows Demo when signals are demo (mock marking)', () => {
    const fn = src.slice(src.indexOf('function ctrlEvidenceStatus'), src.indexOf('function ctrlEvidenceStatus') + 200);
    expect(fn).toMatch(/if\(demo\)return 'Mock \/ Demo'/);
  });
  it('preserves drill-down / source traceability', () => {
    expect(w3).toMatch(/data-c5cv="/);
    expect(w3).toMatch(/click for source/i); // in the row title tooltip
  });
});

describe('Control Value tab — evidence confidence & explanation', () => {
  it('renders the evidence-confidence panel', () => {
    expect(cv).toContain('c5ControlValueEvidencePanel(ctrlConn,rr,demoCV)');
  });
  it('explains what the total dollar value means', () => {
    expect(cv).toContain('Modeled exposure reduction estimates the business exposure reduced by covered controls');
  });
  it('coverage denominator and business-value model are critical evidence sources', () => {
    const helper = src.slice(src.indexOf('function c5ControlValueEvidence('), src.indexOf('function c5ControlValueEvidence(') + 1200);
    expect(helper).toMatch(/Coverage denominator',\s*connected:\(have&&!demo\),\s*critical:true/);
    expect(helper).toMatch(/Exposure \/ business-value model',\s*connected:\(rr\.total>0\),\s*critical:true/);
    expect(helper).toMatch(/Operating-effectiveness evidence',connected:false/);
  });
});

describe('Control Value tab — bottom line & button', () => {
  it('bottom line names the highest-reduction control (dynamic topCtrl), not ROI', () => {
    expect(cv).toMatch(/nm\(topCtrl\.c\)\+' delivers the highest modeled exposure reduction/);
    expect(cv).toMatch(/highest modeled exposure reduction among your current controls/);
  });
  it('flags PAM-style largest remaining gap as the next investment priority', () => {
    expect(cv).toMatch(/has the largest remaining coverage gap \('\+topGap\.p\+'%\) and should be evaluated as the next investment priority/);
  });
  it('the remaining-priority driver + button are data-ranked (c5TopDriver), not literal identity', () => {
    expect(cv).toContain('var TDcv=c5TopDriver()');
    expect(cv).toContain("The remaining priority is to reduce your largest exposure driver — '+TDcv.phrase");
    expect(cv).toContain("txt:'Close the '+c5esc(TDcv.short)+' gap'");
    expect(cv).not.toContain("txt:'Close remaining identity gaps'");
  });
  it('footer keeps source traceability language', () => {
    expect(cv).toContain('Click any control for source traceability and calculation basis');
  });
});
