'use strict';

/**
 * Continuous-assessment view is split into per-function subtabs (Govern … Recover) so it
 * isn't one 106-row scroll, and each control row is clickable to open a detail panel — like
 * Classic view. Source-scan guard.
 */
const fs = require('fs');
const path = require('path');
const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');

describe('Continuous assessment — per-function subtabs + clickable detail', () => {
  it('tracks the active function subtab and the selected control', () => {
    expect(ciso).toContain("var C5_ASSESS_FN='GV', C5_ASSESS_CTRL=null;");
  });
  it('renders one function at a time (subtab strip + single-function table), not all 106', () => {
    expect(ciso).toContain('function assessTable(fnKey){');
    expect(ciso).toContain('var activeTable=assessTable(C5_ASSESS_FN);');
    expect(ciso).toContain('data-assessfn="');
    // the strip shows each function's score + control count
    expect(ciso).toContain("var cnt=ids.filter(function(id){return id.indexOf(F.k+'.')===0;}).length;");
  });
  it('control rows are clickable and open a detail panel (Classic-view style)', () => {
    expect(ciso).toContain('function assessRow(id){');
    expect(ciso).toContain('data-assessctl="');
    expect(ciso).toContain('function c5AssessDetail(id){');
    expect(ciso).toContain('var detailPanel=C5_ASSESS_CTRL?c5AssessDetail(C5_ASSESS_CTRL):');
  });
  it('wires subtab clicks, row clicks and detail close, re-rendering each time', () => {
    expect(ciso).toContain("host.querySelectorAll('[data-assessfn]').forEach(function(b){b.onclick=function(){C5_ASSESS_FN=b.getAttribute('data-assessfn');C5_ASSESS_CTRL=null;c5ContinuousAssessment(host);};});");
    expect(ciso).toContain("var id=row.getAttribute('data-assessctl');C5_ASSESS_CTRL=(C5_ASSESS_CTRL===id)?null:id;c5ContinuousAssessment(host);");
    expect(ciso).toContain("if(e.target.closest('select')||e.target.closest('[data-confirm]'))return;");
  });
});
