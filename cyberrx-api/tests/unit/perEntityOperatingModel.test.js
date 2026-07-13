'use strict';

/**
 * Per-entity operating model (NIST GSS/common-control inheritance is PER ENTITY, not one
 * enterprise-wide switch). Each entity independently inherits the Corporate baseline
 * (centralized/hybrid) or runs its own (federated → inherits nothing). Set at onboarding,
 * carried on the org structure, and reflected in the cockpit's inheritance + the backend.
 * Source-scan guard.
 */
const fs = require('fs');
const path = require('path');

const onboarding = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/onboarding.html'), 'utf8');
const cockpit = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');

describe('Onboarding — per-entity operating model', () => {
  it('stores a model per entity (many can inherit from Corporate), not one global setting', () => {
    expect(onboarding).toContain('var OB_ENTITY_MODELS={');
    expect(onboarding).toContain("localStorage.setItem('cyberrx_entity_models',JSON.stringify(OB_ENTITY_MODELS));");
    expect(onboarding).toContain("function obEntityModel(id){return OB_ENTITY_MODELS[id]||'centralized';}");
  });

  it('offers centralized / hybrid / federated per entity, with an apply-to-all', () => {
    expect(onboarding).toContain("['centralized','Centralized'");
    expect(onboarding).toContain("['federated','Federated'");
    expect(onboarding).toContain('data-emode=');
    expect(onboarding).toContain("id=\"emodeAll\"");
    expect(onboarding).toContain('obEntityList().forEach(function(e){OB_ENTITY_MODELS[e.id]=m;});');
  });

  it('carries each entity model on the org structure so it reaches the cockpit + backend', () => {
    expect(onboarding).toContain("var mdl=(typeof OB_ENTITY_MODELS!=='undefined'&&OB_ENTITY_MODELS[eid])||'centralized';return {id:eid,label:el,own:own,model:mdl};");
  });
});

describe('Cockpit — entity-aware inheritance', () => {
  it('resolves the operating model per scope (federated inherits nothing)', () => {
    expect(cockpit).toContain('var ENTITY_MODELS={};');
    expect(cockpit).toContain("function entityMode(scope){return ENTITY_MODELS[scope]||'centralized';}");
    expect(cockpit).toContain("function scopeCommon(scope){scope=scope||(typeof SCOPE!=='undefined'?SCOPE:'enterprise');return entityMode(scope)==='federated'?[]:securityModel().common;}");
  });

  it('inheritance + provider are scope-aware and load the models from the structure', () => {
    expect(cockpit).toContain('commonSigKeys(id).forEach(function(sk){if(CORPORATE_SIG[sk]!=null)own[sk]=CORPORATE_SIG[sk];});');
    expect(cockpit).toContain('function capProvider(capKey,scope){return (scopeCommon(scope).indexOf(capKey)>=0)?');
    expect(cockpit).toContain('function loadEntityModels()');
    expect(cockpit).toContain('if(e.model)ENTITY_MODELS[e.id]=e.model;');
  });
});
