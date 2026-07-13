'use strict';

/**
 * Regional representation (Phase 1 of the CISO-feedback transformation) — source-scan guard.
 *
 * The executive-persona seat nav is replaced by an ENTITY scope switcher: Enterprise
 * (consolidated roll-up) → Region → Entity. Selecting a scope re-filters telemetry and
 * crown jewels, so Neuron Controls + framework posture legitimately differ by region.
 * This is how one platform answers a global firm with 20+ branches across 100s of countries.
 */
const fs = require('fs');
const path = require('path');

const cockpit = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');

describe('Regional scope — model & switcher', () => {
  it('defines the Enterprise → Region → Entity hierarchy (EMEA includes EU)', () => {
    expect(cockpit).toContain('var REGIONS=[');
    ['enterprise', 'americas', 'emea', 'apac'].forEach((id) => expect(cockpit).toContain("id:'" + id + "'"));
    expect(cockpit).toContain("{id:'emea_eu',label:'EU (Continental)'}");
  });

  it('telemetry lives at the entity leaf; regions/enterprise are true aggregates', () => {
    expect(cockpit).toContain('var ENTITY_SIG={');
    expect(cockpit).toContain('function scopeSignalValues(id)');
    // region = mean of its entities; enterprise = mean of regions
    expect(cockpit).toContain('return meanSig(reg.entities.map(function(e){return ENTITY_SIG[e.id];}));');
    expect(cockpit).toContain("if(id==='enterprise')return meanSig(REGIONS.filter(function(r){return r.kind==='region';})");
  });

  it('applyScope re-scopes telemetry (via scopeSignalValues) and crown jewels', () => {
    expect(cockpit).toContain('function applyScope(id)');
    expect(cockpit).toContain('var ov=scopeSignalValues(id)||{};');
    // crown jewels filter to the region
    expect(cockpit).toContain('LIVE_MASTER.crown_jewels.filter(function(c){return c.region===region;})');
  });

  it('the nav is a scope switcher, not executive seats; boot opens at Enterprise/CISO', () => {
    expect(cockpit).toContain('id="scopeBar"');
    expect(cockpit).toContain('function renderScopeBar()');
    expect(cockpit).toContain('function selectScope(id)');
    expect(cockpit).toContain("try{applyScope('enterprise');}catch(_){}try{renderScopeBar();}");
    // the old "Speaking to" persona seat bar is gone
    expect(cockpit).not.toContain('Speaking to');
    expect(cockpit).not.toContain('data-seat="ceo"');
  });

  it('demo crown jewels are region-tagged for scoping (ids align with onboarding slugs)', () => {
    expect(cockpit).toContain("region:'americas'");
    expect(cockpit).toContain("region:'emea'");
    expect(cockpit).toContain("region:'apac'");
  });

  it('the cockpit reads the customer-defined structure from onboarding, else demo', () => {
    expect(cockpit).toContain('function loadOrgStructure()');
    expect(cockpit).toContain("localStorage.getItem('cyberrx_org_structure')");
    expect(cockpit).toContain("CUR='ciso';try{loadOrgStructure();}");
  });
});

describe('Onboarding — Organizational structure capture', () => {
  const onboarding = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/onboarding.html'), 'utf8');

  it('adds a regions → entities section with a repeater', () => {
    expect(onboarding).toContain('Organizational structure');
    expect(onboarding).toContain('id="orgRegions"');
    expect(onboarding).toContain('function addOrgRegion(v)');
    expect(onboarding).toContain('function addOrgEntity(entWrap,v)');
  });

  it('persists the hierarchy to cyberrx_org_structure (the key the cockpit reads)', () => {
    expect(onboarding).toContain('function collectOrgStructure()');
    expect(onboarding).toContain("localStorage.setItem('cyberrx_org_structure',JSON.stringify(o));");
    // slugged ids so region ids match across onboarding + cockpit
    expect(onboarding).toContain('function orgSlug(s)');
  });

  it('includes org_structure in the finish payload and offers a quick-fill', () => {
    expect(onboarding).toContain('org_structure:collectOrgStructure()');
    expect(onboarding).toContain('id="orgQuickFill"');
  });
});
