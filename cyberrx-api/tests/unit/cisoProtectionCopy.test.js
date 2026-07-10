/**
 * Source-scan guards for the CISO "Protection" tab (CyberRXNew/public/ciso5.js,
 * function c5Exposure). The tab renders from many live browser globals, so instead of
 * executing it we assert the executive-safe WORDING and structure directly in source:
 * exposure-reduced (not risk-removed), labelled dollars, simplified rows with drill-down,
 * score/status clarity note, evidence confidence, and a Financial-Services-priority
 * bottom line.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
// Protection tab region: function c5Exposure() → the evidence helper defined after it.
const start = src.indexOf('function c5Exposure()');
const end = src.indexOf('function c5ProtectionEvidence(', start);
const region = start >= 0 && end > start ? src.slice(start, end) : (start >= 0 ? src.slice(start, start + 16000) : '');
// The Protection SURFACE only (bodyA) — excludes the separate Control-value sub-tab
// (bodyB) rendered by the same function, which legitimately talks about control ROI.
const protEnd = src.indexOf('var bodyB=c5header()', start);
const protRegion = protEnd > start ? src.slice(start, protEnd) : region;

describe('Protection tab — page purpose & card labels', () => {
  it('locates the tab region', () => {
    expect(start).toBeGreaterThan(0);
    expect(region).toContain('Protection · how your core business areas are protected');
  });
  it('headline states protection is uneven and names the top-exposure area', () => {
    expect(region).toMatch(/Protection is uneven\. '\+topExp\.name\+' carries the highest modeled exposure/);
  });
  it('card label is "Modeled exposure reduced by controls", not "Risk removed"', () => {
    expect(region).toContain('Modeled exposure reduced by controls');
    expect(region).not.toContain("'Risk removed by controls'");
  });
  it('renames the two area cards to executive wording', () => {
    expect(region).toContain('Areas meeting protection threshold');
    expect(region).toContain('Evidence supports current protection level');
    expect(region).toContain('Areas requiring remediation');
    expect(region).not.toContain('Strong enough to defend to the board');
  });
  it('renames the two section headings', () => {
    expect(region).toContain('Business areas meeting protection threshold');
    expect(region).toContain('Business areas to prioritize');
    expect(region).not.toContain('Where the business is well protected');
    expect(region).not.toContain('Where to concentrate next');
  });
});

describe('Protection tab — no overclaiming', () => {
  it('does not use risk-removed / fully-protected / safe / no-risk on the surface', () => {
    expect(protRegion).not.toMatch(/risk removed/i);
    expect(protRegion).not.toMatch(/fully protected/i);
    expect(protRegion).not.toMatch(/\bno risk\b/i);
    expect(protRegion).not.toMatch(/risk eliminated/i);
  });
});

describe('Protection tab — dollar labelling & evidence marking', () => {
  it('labels dollar exposure as modeled', () => {
    expect(region).toMatch(/modeled exposure/);
  });
  it('states the modeled-exposure basis visibly (not only in row fine print)', () => {
    // Rendered by the evidence panel helper (defined just after the tab function).
    expect(src).toContain('estimated business value associated with services dependent on unresolved control gaps');
  });
  it('marks rows Demo when signals are demo, else Computed/Modeled', () => {
    expect(region).toMatch(/signalsAreDemo/);
    expect(region).toMatch(/return 'Demo'/);
    expect(region).toMatch(/a\.measured\?'Computed':'Modeled'/);
  });
});

describe('Protection tab — simplified rows & score/status clarity', () => {
  it('rows show a main exposure driver', () => {
    expect(region).toMatch(/Driver: '\+c5esc\(mainDriver\(a\)\)/);
  });
  it('detailed open-risks list is moved to drill-down, not rendered inline on the row', () => {
    expect(region).not.toMatch(/Open risks: '\+a\.risks\.slice/);
    expect(region).toMatch(/data-c5area="/); // row stays click-through to the drill-down
    expect(region).toMatch(/click for open risks/i); // in the row title tooltip
  });
  it('explains why a high-scoring area still needs strengthening', () => {
    expect(region).toMatch(/keeps residual exposure elevated/);
    expect(region).toMatch(/despite stronger controls/);
  });
});

describe('Protection tab — evidence confidence & bottom line', () => {
  it('renders the evidence-confidence panel', () => {
    expect(region).toContain('c5ProtectionEvidencePanel(areas)');
  });
  it('bottom line names the most-exposed area as the priority', () => {
    expect(region).toMatch(/is the most exposed business area/);
    expect(region).toMatch(/Decision: prioritize '\+T\.name\+' remediation/);
  });
  it('button says Prioritize <area> remediation', () => {
    expect(region).toMatch(/txt:'Prioritize '\+T\.name\+' remediation'/);
  });
  it('never says "close its 0 control-gaps"; handles zero gaps with a residual-risk explanation', () => {
    expect(region).not.toMatch(/Close its open control-gaps \('\+blGaps/);
    expect(region).toMatch(/No open control gaps remain, but residual risk remains/);
  });
});

describe('Protection tab — evidence sources are the right criticality', () => {
  it('business capability map, control assessment and financial model are critical', () => {
    // asserted in the helper defined just after the region
    const helper = src.slice(end, end + 2500);
    expect(helper).toMatch(/Business capability map',\s*connected:capmap,\s*critical:true/);
    expect(helper).toMatch(/Control assessment results',\s*connected:ctrlAssess,\s*critical:true/);
    expect(helper).toMatch(/Financial \/ business-value model',connected:finModel,\s*critical:true/);
  });
});
