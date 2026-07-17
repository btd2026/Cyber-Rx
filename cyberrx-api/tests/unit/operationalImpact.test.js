'use strict';

/**
 * The operational-impact view is the honest alternative to a modeled dollar figure: impact is
 * expressed as which important business services break, for how long, whether recovery is PROVEN
 * (tested) or only modeled, and whether that beats the board's impact tolerance — the
 * operational-resilience currency (UK Op-Res / DORA). Source-scan guard.
 */
const fs = require('fs');
const path = require('path');
const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const seats = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit-seats.js'), 'utf8');
const cockpit = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');

describe('Operational impact — recovery vs. tolerance, proven not modeled', () => {
  it('renders as the CISO "Operational impact" section, wired into the render pipeline', () => {
    expect(seats).toContain("sec('02','Operational impact','','<div id=\"c5-resilience\"></div>')");
    expect(ciso).toContain('function c5Resilience(){');
    expect(cockpit).toContain("try{if(typeof c5Resilience==='function')c5Resilience();}catch(_){}");
  });

  it('measures impact in recovery-vs-tolerance and proven-vs-modeled, not dollars', () => {
    expect(ciso).toContain('var svcs=(typeof c5CriticalServices===\'function\')?c5CriticalServices():[];');
    expect(ciso).toContain('var within=svcs.filter(function(s){return s.rto<=s.tgt;}).length;');
    expect(ciso).toContain('var proven=svcs.filter(function(s){return s.live;}).length;');
    expect(ciso).toContain('✓ proven — recovery tested');
    expect(ciso).toContain('modeled — recovery not tested');
    // impact is hours + services lost, explicitly not a modeled dollar
    expect(ciso).toContain('hours of downtime and services lost</b>, not a modeled dollar');
  });

  it('anchors on the board impact tolerance and the operational-resilience regime', () => {
    expect(ciso).toContain('Important business service');
    expect(ciso).toContain('Impact tolerance');
    expect(ciso).toContain('UK Operational Resilience impact tolerances · EU DORA');
    expect(ciso).toContain("card(over,'Over tolerance'");
  });
});
