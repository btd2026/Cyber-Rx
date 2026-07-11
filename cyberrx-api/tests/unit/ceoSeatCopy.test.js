/**
 * CEO seat — two-tab cockpit (01 Overview + 02 Decisions), matching the Board pattern:
 * the former Value-at-risk / Crown-jewels / Trust tabs are folded into one concise Overview
 * (the CISO answering the CEO's key questions), with click-to-source provenance on every box.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const seats = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit-seats.js'), 'utf8');
const html = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');
function fnOf(n) { const a = src.indexOf('function ' + n + '('); return src.slice(a, src.indexOf('\nfunction ', a + 20)); }

describe('CEO seat — two tabs only (Overview + Decisions)', () => {
  it('the seat body is Overview + Decisions (the three analytical tabs are folded in)', () => {
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

describe('CEO Overview provenance layer (c5ceFigures)', () => {
  const f = fnOf('c5ceFigures');
  it('derives from the shared data layer, not hardcoded', () => {
    expect(f).toContain('c5expModel()');
    expect(f).toContain('c5IdFix()');
  });
  it('builds the summary cards, the three CEO questions and the decision', () => {
    ['ce_value', 'ce_crown', 'ce_trust', 'ce_disc', 'ce_q1', 'ce_q2', 'ce_q3', 'ce_decision']
      .forEach(id => expect(f).toContain('F.' + id + '='));
  });
  it('carries typed sources (telemetry / self-reported / modeled) via the shared helpers', () => {
    expect(f).toContain('c5bdTelem(');
    expect(f).toContain('c5bdMod(');
    expect(f).toContain('c5bdSelf(');
  });
});

describe('CEO Overview (c5ceOverview) — clickable boxes + shared drawer', () => {
  const o = fnOf('c5ceOverview');
  it('registers figures with the shared registry and makes every box click-to-source', () => {
    expect(o).toContain('c5regFigs(c5ceFigures())');
    expect(o).toContain('data-c5bd="');
    expect(o).toContain('The questions the CEO asks — answered');
    expect(o).toContain('data-c5bd="ce_decision"');
  });
  it('the decision routes to the Decisions tab', () => {
    expect(o).toContain('data-c5bdtab="1"');
  });
});

describe('Shared provenance drawer is seat-agnostic', () => {
  it('c5bdInspect reads any figure from the shared registry (window.C5_FIGS)', () => {
    expect(src).toContain('function c5regFigs(');
    expect(fnOf('c5bdInspect')).toContain('window.C5_FIGS');
  });
});
