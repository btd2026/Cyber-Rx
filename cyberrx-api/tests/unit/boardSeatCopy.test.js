/**
 * Board seat — two-tab cockpit: 01 Oversight (with Regulatory & Assurance as panels) and
 * 02 Decisions, plus click-to-source provenance drawers on every Oversight box. Guards the
 * two-tab body + labels, the provenance data layer (c5bdFigures) and drawer (c5bdInspect),
 * the mixed source-type badges, and the "source not yet connected" honesty state.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const seats = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit-seats.js'), 'utf8');
const html = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');
function fnOf(n) { const a = src.indexOf('function ' + n + '('); return src.slice(a, src.indexOf('\nfunction ', a + 20)); }

describe('Board seat — two tabs only (Oversight + Decisions)', () => {
  it('the seat body is exactly Oversight + Decisions (Regulatory & Assurance are no longer standing tabs)', () => {
    expect(seats).toContain("sec('01','Is management managing cyber?','','<div id=\"bd-health\"></div>')");
    expect(seats).toContain("sec('02','What should the board note?','','<div id=\"bd-decisions\"></div>')");
    expect(seats).not.toContain('id="bd-material"');
    expect(seats).not.toContain('id="bd-governance"');
  });
  it('the tabs read Oversight / Decisions', () => {
    expect(html).toContain("'Is management managing cyber?':'Oversight'");
    expect(html).toContain("'What should the board note?':'Decisions'");
  });
});

describe('Board provenance data layer (c5bdFigures) — derived, never hardcoded', () => {
  const f = fnOf('c5bdFigures');
  it('derives from the shared data layer', () => {
    expect(f).toContain('c5RiskRegister()');
    expect(f).toContain('c5IdFix()');
    expect(f).toContain('c5CriticalServices()');
  });
  it('builds the 4 summary cards, 5 questions, regulatory rows, assurance items and the decision', () => {
    ['bd_dir','bd_risk','bd_disc','bd_oversight','bd_q1','bd_q5','bd_reg_sec','bd_reg_dora','bd_as_maturity','bd_as_appetite','bd_decision']
      .forEach(id => expect(f).toContain('F.' + id + '='));
  });
  it('carries typed sources: telemetry, self_reported, modeled', () => {
    expect(f).toContain('c5bdTelem(');
    expect(f).toContain('c5bdSelf(');
    expect(f).toContain('c5bdMod(');
    expect(f).toContain('c5bdDocSrc(');
  });
  it('Assurance "validated" items require a real uploaded artifact (else they drop to asserted)', () => {
    expect(f).toContain("c5bdDocSrc('audit|assessment|assurance'");
    expect(f).toContain("c5bdDocSrc('pen.?test|penetration|red.?team'");
    expect(f).toContain('validated:!!auditDoc');
  });
});

describe('Board provenance drawer (c5bdInspect)', () => {
  const d = fnOf('c5bdInspect');
  it('opens via the shared drawer shell and shows a source-type badge per source', () => {
    expect(d).toContain('openDrill(');
    expect(d).toContain('c5bdProvBadge(s.type)');
    expect(d).toContain('Source &amp; confidence');
  });
  it('shows confidence, owner and an as-of in a compact footer (no separate Owned-by panel)', () => {
    expect(d).toContain('Confidence');
    expect(d).toContain("'Owner: '");
    expect(d).toContain('as of ');
    expect(d).not.toContain('Owned by');
  });
  it('honestly reports an unwired figure instead of fabricating a source', () => {
    expect(d).toContain('Source not yet connected');
  });
  it('a mixed figure labels each source individually', () => {
    expect(d).toContain('Combined from the sources above');
  });
  const badge = fnOf('c5bdProvBadge');
  it('the source-type badges are the three required types', () => {
    expect(badge).toContain('Live telemetry');
    expect(badge).toContain('Self-reported');
    expect(badge).toContain('Modeled');
  });
});

describe('Board Oversight tab (c5bdHealth) — layout + clickable boxes', () => {
  const h = fnOf('c5bdHealth');
  it('every box is clickable (data-c5bd) — cards, questions, panels, decision', () => {
    expect(h).toContain('data-c5bd="');
    expect(h).toContain("card('bd_dir')");
    expect(h).toContain('The five questions your board asks — answered');
    expect(h).toContain('Regulatory &amp; disclosure');
    expect(h).toContain('Assurance');
    expect(h).toContain('data-c5bd="bd_decision"');
  });
  it('the decision keeps the record action ("Note & set review date") wired to the Decisions tab', () => {
    expect(h).toContain('Note &amp; set review date');
    expect(h).toContain('data-c5bdtab="1"');
  });
  it('the headline cannot contradict the cyber-risk card (adapts to over/within appetite)', () => {
    expect(h).toContain('var headline=over');
  });
});

describe('Board — single shared identity constant', () => {
  it('$382M / 90–180 days resolve to c5IdFix, not hardcoded in the board figures', () => {
    // The only literal "90–180 days" is inside c5IdFix; board code reads IDF.timeline.
    const matches = (src.match(/90–180 days/g) || []).length;
    expect(matches).toBe(1);
  });
});
