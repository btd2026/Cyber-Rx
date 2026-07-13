'use strict';

/**
 * Fix: the regional scope switcher did "nothing" for a fresh / incognito visitor because
 * demo mode was off, so LIVE/SIGNALS were null and there was no data to re-scope.
 * demoActive() now defaults an UNCONFIGURED visitor (no cyberrx_demo_mode flag and no
 * configured org) to the populated demo, so the cockpit is interactive on first load,
 * while a real workspace (org configured, or explicit '0') still shows its own data.
 */
const fs = require('fs');
const path = require('path');

const cockpit = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');

describe('demoActive — auto-populate for an unconfigured visitor', () => {
  it('honors explicit choices and otherwise defaults on the presence of a real org', () => {
    expect(cockpit).toContain("if(m==='1')return true; if(m==='0')return false;");
    expect(cockpit).toContain('return !orgId();');
  });
});
