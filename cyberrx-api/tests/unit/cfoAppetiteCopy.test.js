/**
 * Source-scan guards for the CFO "Within Appetite" tab (CyberRXNew/public/ciso5.js —
 * c5cfExposure + the cf_appetite / cf_headroom metrics). Asserts CFO-safe financial
 * framing: board-approved cyber loss appetite (not "Risk appetite"), separated
 * exposure/tail/BI/insurance-gap cards, funding block, evidence confidence, and a
 * reduce-not-remove button.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const a = src.indexOf('function c5cfExposure()');
const b = src.indexOf('function c5cfRoi(', a);
const fn = a >= 0 && b > a ? src.slice(a, b) : '';
const apM = src.slice(src.indexOf("case 'cf_appetite':"), src.indexOf("case 'cf_headroom':"));
const hrM = src.slice(src.indexOf("case 'cf_headroom':"), src.indexOf("case 'cf_tail':"));

describe('CFO Within Appetite — no overclaiming button', () => {
  it('the action button reduces, never removes/eliminates exposure', () => {
    expect(fn).not.toMatch(/Approve identity fix — removes/);
    expect(fn).not.toMatch(/removes '\+ec\.displayValue/);
    expect(fn).not.toMatch(/eliminates/i);
    expect(fn).not.toMatch(/guaranteed/i);
  });
  it('displays "reduce modeled exposure" on the primary action', () => {
    expect(fn).toContain('Approve identity remediation — reduce modeled exposure');
    expect(fn).toContain('Defer with risk acceptance');
  });
});

describe('CFO Within Appetite — appetite & headroom', () => {
  it('relabels risk appetite as board-approved cyber loss appetite', () => {
    expect(fn).toContain('Board-approved cyber loss appetite');
    expect(apM).toContain("name:'Board-approved cyber loss appetite'");
    expect(apM).not.toContain("name:'Risk appetite'");
    expect(hrM).toContain("name:'Financial headroom'");
  });
  it('marks a $B-vs-$M appetite as illustrative and gates confident headroom', () => {
    expect(fn).toMatch(/apImplausible=.*apN>expN\*50/);
    expect(fn).toContain('hrCredible=');
    expect(fn).toMatch(/Demo appetite threshold|Illustrative appetite/);
    expect(fn).toMatch(/Demo headroom|Illustrative/);
  });
  it('labels appetite as self-reported / demo, not board-approved-live', () => {
    expect(apM).toMatch(/label:\(apdemo\?'demo':'self-reported'\)/);
  });
});

describe('CFO Within Appetite — separated financial cards', () => {
  it('has distinct modeled-exposure / appetite / headroom / driver / tail / BI / insurance cards', () => {
    expect(fn).toContain('Modeled cyber exposure');
    expect(fn).toContain('Financial headroom');
    expect(fn).toContain('Largest financial exposure driver');
    expect(fn).toContain('1-in-20 modeled loss scenario');
    expect(fn).toContain('Customer-platform outage impact');
    expect(fn).toContain('Insurance gap');
  });
  it('the insurance card shows residual tail exposure + % of the 1-in-20 covered', () => {
    expect(fn).toContain('residual tail exposure');
    expect(fn).toMatch(/covPct\+'% of modeled 1-in-20 scenario covered'/);
  });
});

describe('CFO Within Appetite — funding block (no ROI without cost)', () => {
  it('shows funding required / cost-estimate-needed and modeled exposure reduction', () => {
    expect(fn).toContain('Funding required');
    expect(fn).toContain('Cost estimate needed');
    expect(fn).toContain('Modeled exposure reduction');
  });
  it('does not claim ROI / best-return / payback without cost data', () => {
    expect(fn).not.toMatch(/best ROI/i);
    expect(fn).not.toMatch(/highest return/i);
    expect(fn).not.toMatch(/payback/i);
  });
});

describe('CFO Within Appetite — evidence confidence & labels', () => {
  it('renders an evidence-confidence panel that caps below High while appetite is self-reported', () => {
    expect(fn).toContain('Evidence confidence');
    expect(fn).toMatch(/var evLevel=demo\?'Demo':\(ap\.connected&&evConf\.level==='High'\?'Medium':evConf\.level\)/);
  });
  it('labels demo / manual / self-reported / modeled values', () => {
    expect(fn).toMatch(/signalsAreDemo/);
    expect(fn).toContain('Insurance policy data (manual)');
    expect(fn).toMatch(/Modeled'\+\(demo\?' · Demo'/);
  });
  it('every card carries a source/provenance label', () => {
    expect(fn).toMatch(/function cfCard\(title,val,sub,prov,col,mid\)/);
  });
});

describe('CFO Within Appetite — clean executive view', () => {
  it('keeps framework/control IDs and CMMI off the CFO page', () => {
    expect(fn).not.toMatch(/\bCMMI\b/);
    expect(fn).not.toMatch(/PR\.[A-Z]{2}|ID\.AM/);
  });
  it('bottom line identifies identity risk as the largest financial driver', () => {
    expect(fn).toContain('identity risk is the largest financial driver');
    expect(fn).toContain('largest financial exposure driver is customer-platform identity risk');
  });
  it('cards/tiles remain click-through for source traceability', () => {
    expect(fn).toMatch(/data-c5m="'\+mid\+'"/);
  });
});
