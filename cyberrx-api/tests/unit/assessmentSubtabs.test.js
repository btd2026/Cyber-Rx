'use strict';

/**
 * The Continuous-assessment view uses the Classic-view layout: c5shell header, .c5cards
 * summary, an expandable function tree (.c5fw-tree), and a two-pane .c5fw-wrap with the
 * control detail pinned on the left — while keeping the continuous columns (method / verdict /
 * assurance / coverage / freshness / cadence). Source-scan guard.
 */
const fs = require('fs');
const path = require('path');
const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');

describe('Continuous assessment — Classic-view layout', () => {
  it('tracks expanded functions + the selected control', () => {
    expect(ciso).toContain('var C5_ASSESS_EXP=null, C5_ASSESS_CTRL=null, C5_ASSESS_DRIFT_ALL=false;');
  });
  it('uses classic chrome — c5shell header, .c5cards, expandable .c5fw-tree, two-pane .c5fw-wrap', () => {
    expect(ciso).toContain("c5shell('Continuous assessment · how is every control assessed?'");
    expect(ciso).toContain('var cards=\'<div class="c5cards">\'');
    expect(ciso).toContain('var tree=\'<div class="c5fw-tree">\'');
    expect(ciso).toContain('<div class="c5fw-wrap"><div class="c5fw-right">');
    expect(ciso).toContain('<div class="c5fw-left" id="assessDetail">');
  });
  it('each function group is expandable and opens to its control table (keeping the columns)', () => {
    expect(ciso).toContain('data-assessexp="');
    expect(ciso).toContain('var inner=open?(\'<div style="padding:4px 14px 12px 30px">\'+assessTable(F.k)+\'</div>\'):\'\';');
    expect(ciso).toContain("['Control','Method','Verdict','Assurance · confidence','Coverage','Freshness','Cadence']");
  });
  it('control rows are clickable and open the detail in the left pane', () => {
    expect(ciso).toContain('function assessRow(id){');
    expect(ciso).toContain('data-assessctl="');
    expect(ciso).toContain('function c5AssessDetail(id){');
    expect(ciso).toContain('var detail=C5_ASSESS_CTRL?c5AssessDetail(C5_ASSESS_CTRL):');
  });
  it('wires expand/collapse, row select and detail close, re-rendering each time', () => {
    expect(ciso).toContain("host.querySelectorAll('[data-assessexp]').forEach(function(b){b.onclick=function(){var k=b.getAttribute('data-assessexp');C5_ASSESS_EXP[k]=!C5_ASSESS_EXP[k];c5ContinuousAssessment(host);};});");
    expect(ciso).toContain("C5_ASSESS_CTRL=row.getAttribute('data-assessctl');C5_ASSESS_SUBTAB='controls';c5ContinuousAssessment(host);");
    expect(ciso).toContain("if(e.target.closest('select')||e.target.closest('[data-confirm]'))return;");
  });
  it('splits the view into Summary / Controls / Drift sub-tabs to reduce scroll', () => {
    expect(ciso).toContain("var C5_ASSESS_SUBTAB='summary';");
    // Controls tab only appears at a region/entity scope (or when a control is open)
    expect(ciso).toContain('var showControls=isEntScope||!!C5_ASSESS_CTRL;');
    expect(ciso).toContain("(showControls?assSubBtn('controls',");
    // Summary is the exec overview; drift is its own tab
    expect(ciso).toContain('subBody=scopeNavHtml+cards+peerBox+queuePanel;');
    expect(ciso).toContain("host.querySelectorAll('[data-asssub]').forEach(function(b){b.onclick=function(){C5_ASSESS_SUBTAB=b.getAttribute('data-asssub');c5ContinuousAssessment(host);};});");
  });
});
