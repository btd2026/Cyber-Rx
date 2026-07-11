/**
 * CEO seat — two-tab cockpit (01 Overview + 02 Decisions). The Overview folds the three
 * analytical tabs into one concise page (c5ceOverview) with plain-English answers and
 * click-to-source on every box via the shared provenance drawer/registry.
 */
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const seats = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit-seats.js'), 'utf8');
const html = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');
function fnOf(n) { const a = src.indexOf('function ' + n + '('); return src.slice(a, src.indexOf('\nfunction ', a + 20)); }

describe('CEO seat — two tabs only (Overview + Decisions)', () => {
  it('the seat body is Overview + Decisions (analytical tabs folded in)', () => {
    expect(seats).toContain("sec('01','What could cyber cost the business?','','<div id=\"ce-overview\"></div>')");
    expect(seats).toContain('id="ce-decisions"');
    expect(seats).not.toContain('id="ce-crown"');
    expect(seats).not.toContain('id="ce-trust"');
  });
  it('the tabs read Overview / Decisions', () => {
    expect(html).toContain("'What could cyber cost the business?':'Overview'");
    expect(html).toContain("'What needs my sign-off?':'Decisions'");
  });
  it('c5ceOverview is wired into the render pipeline', () => {
    expect(src).toContain('function c5ceOverview()');
    expect(html).toContain('c5ceOverview();');
  });
});

describe('CEO Overview (c5ceOverview) — derived, plain-English, click-to-source', () => {
  const o = fnOf('c5ceOverview');
  it('derives from the shared data layer, not hardcoded', () => {
    expect(o).toContain('c5expModel()');
    expect(o).toContain('c5IdFix()');
  });
  it('builds the cards, the three questions and the decision (all data-c5bd boxes)', () => {
    ["id:'ce_value'", "id:'ce_crown'", "id:'ce_trust'", "id:'ce_disc'", "id:'ce_q1'", "id:'ce_q2'", "id:'ce_q3'", "id:'ce_decision'"]
      .forEach(id => expect(o).toContain(id));
  });
  it('carries typed sources (telemetry / self-reported / modeled) via the shared helpers', () => {
    expect(o).toContain('c5bdTelem(');
    expect(o).toContain('c5bdMod(');
    expect(o).toContain('c5bdSelf(');
  });
  it('renders with no redundant breadcrumb and routes the decision to the Decisions tab', () => {
    expect(o).toContain('c5ovDo(');
    expect(o).toContain('tabIdx:1');
    expect(o).not.toContain("c5shell('Executive overview");
  });
});

describe('Shared Overview + drawer are seat-agnostic', () => {
  it('c5ovDo registers figures and c5bdInspect reads them from the shared registry', () => {
    expect(src).toContain('function c5ovDo(');
    expect(src).toContain('function c5regFigs(');
    expect(fnOf('c5bdInspect')).toContain('window.C5_FIGS');
  });
});
