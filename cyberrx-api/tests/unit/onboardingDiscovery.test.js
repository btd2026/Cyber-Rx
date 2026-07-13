'use strict';

/**
 * Onboarding redesign Phase 2 — discovery intake at enterprise scale. You don't type 1000s
 * of systems: connect a discovery source (CMDB / cloud / IdP / EDR) and Nerion pulls the
 * inventory, or bulk-import a list. Each system carries a class + region so it scores per
 * region and rolls up. Source-scan guard.
 */
const fs = require('fs');
const path = require('path');

const onboarding = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/onboarding.html'), 'utf8');

describe('Onboarding — system discovery & bulk import', () => {
  it('offers discovery sources (CMDB / cloud / IdP / EDR), not hand-entry of every system', () => {
    expect(onboarding).toContain('id="discSources"');
    expect(onboarding).toContain('data-src="cmdb" data-n="1240"');
    expect(onboarding).toContain('data-src="cloud"');
    expect(onboarding).toContain('data-src="edr"');
    expect(onboarding).toContain('discover, don’t type');
  });

  it('supports bulk import (name, class, region, owner, criticality) and totals the estate', () => {
    expect(onboarding).toContain('id="sysBulk"');
    expect(onboarding).toContain('function discTotal()');
    expect(onboarding).toContain('name:p[0],class:(p[1]||\'\').toLowerCase(),region:(p[2]||\'\').toLowerCase()');
  });

  it('persists the discovered + imported estate to cyberrx_systems', () => {
    expect(onboarding).toContain("localStorage.setItem('cyberrx_systems',JSON.stringify({discovered:DISCOVERED,imported:IMPORTED,total:discTotal()}));");
  });
});
