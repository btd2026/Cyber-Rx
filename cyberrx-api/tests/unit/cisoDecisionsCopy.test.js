/**
 * Source-scan guards for the CISO "Decisions" tab (CyberRXNew/public/ciso5.js —
 * c5DecProj). The bespoke 3-panel "Decisions & projections" tool was replaced with the
 * SAME standardized decision panel every other seat uses (c5dec / c5decisions): one
 * funding decision per lever, a c5shell header, commit / defer options — and the tab is
 * renamed to just "Decisions".
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const seats = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit-seats.js'), 'utf8');
const a = src.indexOf('function c5DecProj(){');
const b = src.indexOf('\nfunction ', a + 10);
const fn = a >= 0 && b > a ? src.slice(a, b) : '';

describe('CISO Decisions tab — standardized like every other seat', () => {
  it('locates the tab', () => { expect(a).toBeGreaterThan(0); });
  it('renders through the shared c5dec / c5decisions panel', () => {
    expect(fn).toContain('c5decisions(list)');
    expect(fn).toContain("c5dec('cs',i+1,'Fund '+l.name+'?',l.need,rec,alt)");
  });
  it('uses a standard c5shell header titled "Decisions"', () => {
    expect(fn).toContain('c5shell(');
    expect(fn).toContain('Decisions · what needs your sign-off?');
  });
  it('builds one funding decision per lever from c5Levers()', () => {
    expect(fn).toContain('var levers=c5Levers()');
    expect(fn).toMatch(/levers\.slice\(0,4\)\.map/);
  });
});

describe('CISO Decisions — commit / defer options in the standard format', () => {
  it('the recommended option commits & funds; the alternative defers to next cycle', () => {
    expect(fn).toContain("on:'Commit & fund'");
    expect(fn).toContain("on:'Defer to next cycle'");
  });
  it('deferral is recorded and requires a rationale (req:true), the exposure stays open', () => {
    expect(fn).toMatch(/req:true/);
    expect(fn).toContain('the exposure remains open until the next cycle');
  });
  it('business language only — no CMMI / framework IDs on the executive decision', () => {
    expect(fn).not.toMatch(/\bCMMI\b/);
    expect(fn).not.toContain("Lifts <b>'+top.id");
  });
});

describe('CISO Decisions — the old bespoke projection tool is gone', () => {
  it('drops the 3-panel design (queues, planner, summary cards)', () => {
    expect(src).not.toContain('Partner accountability queue');
    expect(src).not.toContain('My decision queue');
    expect(src).not.toContain('control improvement planner');
    expect(src).not.toContain('class="c5dp-wrap"');
    expect(fn).not.toMatch(/data-cisodec="/);
  });
});

describe('CISO Decisions — renamed section', () => {
  it('the seat section is titled just "Decisions" (not "Decisions & projections")', () => {
    expect(seats).toContain("sec('08','Decisions','','<div id=\"c5-decproj\"></div>')");
    expect(seats).not.toContain('Decisions &amp; projections');
  });
});
