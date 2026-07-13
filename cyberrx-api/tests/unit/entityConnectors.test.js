'use strict';

/**
 * Entity-level connectors — the connect call carries a SCOPE from the security operating
 * model, so a corporate COMMON-control tool connects once at 'corporate' (inherited by every
 * entity) and a federated tool is the entity's own. Connectors live at the right level of
 * Corporate → Region → Entity, not one flat org-wide bag. Backed by the scope-aware
 * EntityEvidenceService (#678). Source-scan guard.
 */
const fs = require('fs');
const path = require('path');

const onboarding = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/onboarding.html'), 'utf8');

describe('Entity-level connectors', () => {
  it('maps each tool to its capability so its provider can be resolved', () => {
    expect(onboarding).toContain('var TOOL_CAP={crowdstrike:\'edr\'');
    expect(onboarding).toContain("okta:'mfa'");
    expect(onboarding).toContain("splunk:'siem'");
  });

  it('derives connector scope from the operating model — common → corporate, else the entity/org', () => {
    expect(onboarding).toContain("function connScope(k){var cap=TOOL_CAP[k];return (cap&&_sm.common.indexOf(cap)>=0)?'corporate':'org';}");
  });

  it('the connect call carries the scope (URL + body)', () => {
    expect(onboarding).toContain("+'&scope='+encodeURIComponent(connScope(k))");
    expect(onboarding).toContain('scope:connScope(k)');
  });
});

describe('Per-entity connector plan UI', () => {
  it('renders a matrix where each entity connects only its FEDERATED tools', () => {
    expect(onboarding).toContain('id="entConnMatrix"');
    expect(onboarding).toContain('function renderEntConn()');
    // federated = all caps minus the common (corporate) ones
    expect(onboarding).toContain('var federated=ALL_CAPS.filter(function(c){return common.indexOf(c)<0;});');
  });

  it('shows common controls as inherited from Corporate (connected once, not per entity)', () => {
    expect(onboarding).toContain('Corporate (common, inherited by all)');
    expect(onboarding).toContain('connected once, not per entity');
  });

  it('persists each entity\'s connected federated tools', () => {
    expect(onboarding).toContain("localStorage.setItem('cyberrx_entity_connectors',JSON.stringify(ENT_CONN));");
  });
});
