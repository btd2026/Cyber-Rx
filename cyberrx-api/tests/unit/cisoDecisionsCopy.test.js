/**
 * Source-scan guards for the CISO "Decisions & Projection" tab (CyberRXNew/public/
 * ciso5.js — c5DecProj). Asserts the decision-command-queue redesign: new title,
 * summary cards, priority + partner queues, control-improvement planner moved to a
 * gated drill-down, evidence confidence, risk-acceptance deferral, and a dynamic
 * highest-impact bottom box — with no CMMI/framework IDs on the executive queue.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const a = src.indexOf('function c5DecProj(){');
const b = src.indexOf('function c5dpMeterRow(', a);
const fn = a >= 0 && b > a ? src.slice(a, b) : '';
// The executive assembly (everything from the command-view build to the end).
const asm = fn.indexOf('// ── Executive command view') >= 0 ? fn.slice(fn.indexOf('// ── Executive command view')) : fn;

describe('Decisions tab — page purpose & structure', () => {
  it('locates the tab', () => {
    expect(a).toBeGreaterThan(0);
  });
  it('titles the page "Decisions blocking risk reduction" with a dynamic answer', () => {
    expect(asm).toContain('Decisions blocking risk reduction');
    expect(asm).toContain("' blocking measurable exposure reduction. '");
  });
  it('renames the two queues (no "Decisions I owe" / "Awaiting other leaders")', () => {
    expect(asm).toContain('My decision queue');
    expect(asm).toContain('Partner accountability queue');
    expect(asm).not.toContain('Decisions I owe');
    expect(asm).not.toContain('Awaiting other leaders');
  });
});

describe('Decisions tab — summary cards', () => {
  it('shows the four executive summary cards', () => {
    expect(asm).toContain('My decision needed');
    expect(asm).toContain('Partner decisions pending');
    expect(asm).toContain('Exposure waiting on decisions');
    expect(asm).toContain('Oldest pending decision');
  });
  it('labels the exposure value as modeled (never a bare live number)', () => {
    expect(asm).toMatch(/Modeled exposure/);
  });
});

describe('Decisions tab — control-improvement planner moved to drill-down', () => {
  it('the executive assembly no longer shows "Raise a control to its ceiling"', () => {
    expect(asm).not.toContain('Raise a control to its ceiling');
  });
  it('exposes a "Control improvement planner" toggle instead', () => {
    expect(asm).toContain('control improvement planner');
  });
  it('the planner drill-down is hidden by default (gated on a toggle)', () => {
    expect(asm).toMatch(/id="c5dp-planner" style="display:'\+\(C5_DP_PLANNER_OPEN\?'block':'none'\)/);
  });
});

describe('Decisions tab — no CMMI / framework IDs on the executive queue', () => {
  it('the main decision card impact line is business language, not "Lifts <ID> +N CMMI"', () => {
    expect(fn).toContain('Unlocks modeled exposure reduction');
    expect(fn).not.toContain("Lifts <b>'+top.id");
    expect(fn).not.toContain("+l.gain+' CMMI");
  });
  it('the card title says Commit funding, not bare Fund', () => {
    expect(fn).toContain('Commit funding — ');
  });
});

describe('Decisions tab — actions, evidence, bottom line', () => {
  it('deferral uses risk-acceptance language', () => {
    expect(asm).toContain('Defer with risk acceptance');
  });
  it('the bottom box names the highest-impact open decision and offers commit/defer', () => {
    expect(asm).toContain('The highest-impact open decision is ');
    expect(asm).toMatch(/data-cisodec="'\+topOpen\.k\+'" data-cisoval="Committed">Commit funding/);
    expect(asm).toMatch(/data-cisoval="Deferred">Defer with risk acceptance/);
  });
  it('renders an evidence-confidence panel that can never read High while attestations pend/demo', () => {
    expect(asm).toContain('Evidence confidence');
    expect(asm).toMatch(/Partner confirmation evidence',connected:decided>0/);
    expect(asm).toMatch(/var evLevel=demo\?'Demo':evConf\.level/);
  });
  it('marks demo values in non-production', () => {
    expect(asm).toMatch(/signalsAreDemo/);
    expect(asm).toMatch(/Values are demo telemetry|· Demo/);
  });
});

describe('Decisions tab — traceability preserved', () => {
  it('decision rows and partner rows remain click-through (expand + jump-to-seat handlers intact)', () => {
    expect(fn).toMatch(/data-decexp="/);
    expect(fn).toMatch(/data-askexp="/);
    expect(fn).toMatch(/data-goseat="/);
  });
});
