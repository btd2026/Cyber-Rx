'use strict';

/**
 * Drift detection — the score is for the board, the drift alert is for the operator. The
 * score is a lagging summary; the alert on CHANGE is what people act on. A control flipping
 * met → not-met (or met → dark/expired) raises a finding and an automatic ITSM ticket.
 * Regressions are ranked crown-jewel-weighted. Source-scan guard.
 */
const fs = require('fs');
const path = require('path');

const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');

describe('Drift detection', () => {
  it('compares each control to a prior snapshot and classifies the delta', () => {
    expect(ciso).toContain('function c5AssessmentPrior(a){');
    expect(ciso).toContain('function c5DriftAlerts(){');
    expect(ciso).toContain('var VERDICT_RANK={not_assessed:0,not_met:1,partial:2,met:3};');
    expect(ciso).toContain('if(now<was){');   // a regression
    expect(ciso).toContain('else if(now>was)out.improvements.push');
  });

  it('a met → not-met / dark flip auto-raises a ticket, and regressions rank by crown weight', () => {
    expect(ciso).toContain("var breach=(prior==='met'&&(a.verdict==='not_met'||a.verdict==='not_assessed'));");
    expect(ciso).toContain('ticket:breach');
    expect(ciso).toContain('out.regressions.sort(function(x,y){return (y.weight-x.weight)||(y.drop-x.drop);});');
  });

  it('renders the actionable drift panel in its own sub-tab with the auto-ticket badge', () => {
    expect(ciso).toContain('var drift=c5DriftAlerts();');
    expect(ciso).toContain('drifted since last assessment');
    expect(ciso).toContain('🎫 ticket auto-raised');
    expect(ciso).toContain('The score is the lagging summary; this is what to act on now.');
    // drift lives in the Drift sub-tab (with a friendly empty state when nothing drifted)
    expect(ciso).toContain("subBody=driftPanel||'");
  });
});
