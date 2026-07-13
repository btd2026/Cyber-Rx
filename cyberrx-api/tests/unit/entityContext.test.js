'use strict';

/**
 * Entity-scoped onboarding — everything past "Regions & entities" is configured PER ENTITY.
 * A persistent context bar on the Processes & systems / Connect / Risks / Controls &
 * evidence / Executive-context tabs lists every entity the user defined (grouped by region)
 * plus Corporate (shared, inherited by all), and scopes those sections to the one picked.
 * Source-scan guard.
 */
const fs = require('fs');
const path = require('path');

const onboarding = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/onboarding.html'), 'utf8');

describe('Onboarding — per-entity context', () => {
  it('scopes the post-Region tabs to an entity (sys/connect/risk/control/exec)', () => {
    expect(onboarding).toContain("var OB_ENTITY_TABS=['sys','connect','risk','control','exec'];");
    expect(onboarding).toContain('var OB_ACTIVE_ENTITY=');
    expect(onboarding).toContain('id="entityCtx"');
  });

  it('builds the entity list from the org structure the user defined (live, else saved)', () => {
    expect(onboarding).toContain('function obEntityList()');
    expect(onboarding).toContain('collectOrgStructure().forEach(function(r){(r.entities||[]).forEach');
    expect(onboarding).toContain("localStorage.getItem('cyberrx_org_structure')");
  });

  it('offers Corporate (shared/inherited) plus every entity, grouped by region', () => {
    expect(onboarding).toContain('function renderEntityCtx(key){');
    expect(onboarding).toContain("'<option value=\"corporate\">Corporate — shared (inherited by all)</option>'");
    expect(onboarding).toContain("esc(e.region)+' › '+esc(e.label)");
    // shows the full path for the selected entity
    expect(onboarding).toContain("function obEntityPath(id)");
    expect(onboarding).toContain("'Corporate → '+esc(e.region)+' → <b>'+esc(e.label)+'</b>'");
  });

  it('re-renders the context on every tab change and hides it off the entity tabs', () => {
    expect(onboarding).toContain('function obShow(key){OB_ACTIVE=key;renderSpine(key);renderEntityCtx(key);');
    expect(onboarding).toContain("if(OB_ENTITY_TABS.indexOf(key)<0){host.innerHTML='';return;}");
  });
});
