/**
 * Source-scan guards for the CFO "Within Appetite" tab (CyberRXNew/public/ciso5.js —
 * c5cfExposure + the cf_appetite / cf_headroom metrics).
 *
 * This view was reorganised to a compact, board-critical layout:
 *   header · hero (exposure vs appetite, 3 hairline-separated figures) · two cards
 *   (largest driver · downside tail) · a muted remediation strip · an evidence footnote.
 * Several non-board-critical cards were removed/merged (financial-headroom card,
 * outage-impact tile, insurance-gap tile, funding card, modeled-exposure-reduction card,
 * timeline card, bottom-line callout, evidence-confidence panel). Every figure still
 * traces to its metric; nothing is hard-coded.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const a = src.indexOf('function c5cfExposure()');
const b = src.indexOf('function c5cfRoi(', a);
const fn = a >= 0 && b > a ? src.slice(a, b) : '';
const apM = src.slice(src.indexOf("case 'cf_appetite':"), src.indexOf("case 'cf_headroom':"));
const hrM = src.slice(src.indexOf("case 'cf_headroom':"), src.indexOf("case 'cf_tail':"));

describe('CFO Within Appetite — no overclaiming', () => {
  it('never claims exposure is eliminated or a reduction is guaranteed', () => {
    expect(fn).not.toMatch(/eliminates/i);
    expect(fn).not.toMatch(/guaranteed/i);
  });
  it('does not claim ROI / best-return / payback without cost data', () => {
    expect(fn).not.toMatch(/best ROI/i);
    expect(fn).not.toMatch(/highest return/i);
    expect(fn).not.toMatch(/payback/i);
  });
});

describe('CFO Within Appetite — appetite & headroom metrics unchanged', () => {
  it('relabels risk appetite as board-approved cyber loss appetite', () => {
    expect(fn).toContain('Board-approved appetite'); // hero column label
    expect(apM).toContain("name:'Board-approved cyber loss appetite'");
    expect(apM).not.toContain("name:'Risk appetite'");
    expect(hrM).toContain("name:'Financial headroom'"); // metric still exists (drillable elsewhere)
  });
  it('flags a $B-vs-$M appetite as implausible (confirm scope)', () => {
    expect(fn).toMatch(/apImplausible=.*apN>expN\*50/);
    expect(fn).toContain('confirm scope');
  });
  it('labels appetite as self-reported / demo, not board-approved-live', () => {
    expect(apM).toMatch(/label:\(apdemo\?'demo':'self-reported'\)/);
  });
});

describe('CFO Within Appetite — reorganised layout (top → bottom)', () => {
  it('1) header: board-appetite breadcrumb + a single supporting line (not a 3-line paragraph)', () => {
    expect(fn).toContain("c5shell('Financial exposure · board appetite'");
    expect(fn).toContain('Every figure carries its source; drill any card for its basis.');
  });
  it('2) hero card: modeled exposure vs board appetite, three figures', () => {
    expect(fn).toContain('Modeled exposure vs board appetite');
    expect(fn).toContain('Modeled cyber exposure');
    expect(fn).toContain('Board-approved appetite');
    expect(fn).toMatch(/Over appetite|Headroom to appetite/);
  });
  it('2) "Over appetite" is DERIVED (exposure − appetite), not hard-coded', () => {
    expect(fn).toMatch(/overRaw=\(!isNaN\(expN\)&&!isNaN\(apN\)\)\?\(expN-apN\)/);
  });
  it('3) two cards: largest driver (with % share) + downside tail (insurance folded in)', () => {
    expect(fn).toContain("cfCard('Largest exposure driver'");
    expect(fn).toContain("cfCard('Downside — 1-in-20 tail'");
    expect(fn).toMatch(/Math\.round\(driverN\/expN\*100\)/); // driver share % is computed
    expect(fn).toContain('uninsured residual'); // insurance gap merged into the tail caption
  });
  it('4) remediation strip folds in exposure-reduction / timeline / owner / funding note', () => {
    expect(fn).toContain('Remediating the largest driver removes ');
    // timeline + owner now come from the shared c5IdFix config (single source, not retyped)
    expect(fn).toContain('c5IdFix().timeline');
    expect(fn).toContain("owner '+c5IdFix().owner");
    expect(fn).toContain('funding cost not yet connected');
  });
  it('5) evidence footnote counts connected sources from the evidence set', () => {
    expect(fn).toMatch(/connN=evSrcs\.filter\(function\(s\)\{return s\.connected;\}\)\.length/);
    expect(fn).toContain('sources connected');
  });
});

describe('CFO Within Appetite — removed / merged cards are gone', () => {
  it('no separate financial-headroom card, outage-impact, insurance-gap or funding cards', () => {
    expect(fn).not.toContain("cfCard('Financial headroom'");
    expect(fn).not.toContain('Customer-platform outage impact');
    expect(fn).not.toContain("cfTile('Insurance gap'");
    expect(fn).not.toContain("cfCard('Funding required'");
    expect(fn).not.toContain("cfCard('Modeled exposure reduction'");
  });
  it('no bottom-line callout (it duplicated the headline) and no tiles helper', () => {
    expect(fn).not.toContain('c5bl(');
    expect(fn).not.toContain('cfTile(');
  });
});

describe('CFO Within Appetite — clean executive view', () => {
  it('keeps framework/control IDs and CMMI off the CFO page', () => {
    expect(fn).not.toMatch(/\bCMMI\b/);
    expect(fn).not.toMatch(/PR\.[A-Z]{2}|ID\.AM/);
  });
  it('the largest driver is data-ranked (c5TopDriver), never a hard-coded identity conclusion', () => {
    expect(fn).toMatch(/var TD=c5TopDriver\(\),dm=c5get\(TD\.mid\)/);
    expect(fn).not.toContain('identity risk is the largest financial driver');
    expect(fn).not.toContain('largest financial exposure driver is customer-platform identity risk');
  });
  it('every card carries a source/provenance label and stays click-through for its basis', () => {
    expect(fn).toMatch(/function cfCard\(title,val,sub,prov,col,mid\)/);
    expect(fn).toMatch(/data-c5m="'\+mid\+'"/); // cfCard drill
    expect(fn).toContain('data-c5m="exp_total"'); // hero drills to the exposure metric
    expect(fn).toContain("'ink',TD.mid)"); // driver card drills to the ranked driver metric
  });
});
