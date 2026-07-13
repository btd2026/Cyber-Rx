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

  it('bulk import owns each system by an entity, or Corporate (shared/GSS), and totals the estate', () => {
    expect(onboarding).toContain('id="sysBulk"');
    expect(onboarding).toContain('function discTotal()');
    // owner = entity id or 'corporate'; region derived from the entity
    expect(onboarding).toContain("var scope=(p[2]||'').toLowerCase();var region=(scope==='corporate'||!scope)?'':(scope.indexOf('_')>0?scope.split('_')[0]:scope);");
    expect(onboarding).toContain('name:p[0],class:(p[1]||\'\').toLowerCase(),owner:scope||\'\',region:region');
  });

  it('splits entity-owned vs corporate-shared (GSS) systems — the Entity->Systems edge + inheritance', () => {
    expect(onboarding).toContain("var shared=IMPORTED.filter(function(r){return r.owner==='corporate';}).length;");
    expect(onboarding).toContain('corporate-shared');
    expect(onboarding).toContain('inherited by every entity when centralized');
  });

  it('persists the discovered + imported estate to cyberrx_systems', () => {
    expect(onboarding).toContain("localStorage.setItem('cyberrx_systems',JSON.stringify({discovered:DISCOVERED,imported:IMPORTED,total:discTotal()}));");
  });

  it('materiality triage: Critical/High are material (triage first), the rest auto-classified', () => {
    expect(onboarding).toContain("var material=IMPORTED.filter(function(r){return /^(critical|high)$/i.test(r.criticality||'');}).length;");
    expect(onboarding).toContain('material — triage first');
    expect(onboarding).toContain('auto-classified standard');
  });
});
