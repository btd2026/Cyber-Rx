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
  it('defines the Enterprise → Region → Entity hierarchy', () => {
    expect(cockpit).toContain('var REGIONS=[');
    ['enterprise', 'amer', 'emea', 'apac'].forEach((id) => expect(cockpit).toContain("id:'" + id + "'"));
    expect(cockpit).toContain('entities:[{id:\'amer_us\'');
  });

  it('carries per-scope telemetry so posture varies by region (APAC is the laggard)', () => {
    expect(cockpit).toContain('var REGION_SIG={');
    expect(cockpit).toContain('apac:{edr_pct:82');
  });

  it('applyScope re-scopes telemetry and crown jewels, guarding Enterprise >= regions', () => {
    expect(cockpit).toContain('function applyScope(id)');
    // only override tools the enterprise actually has connected
    expect(cockpit).toContain('if(SIGNALS_BASE[k]!=null)s[k]={key:k,value:ov[k],demo:true};');
    // crown jewels filter to the region
    expect(cockpit).toContain('LIVE_MASTER.crown_jewels.filter(function(c){return c.region===region;})');
  });

  it('the nav is a scope switcher, not executive seats; boot opens at Enterprise/CISO', () => {
    expect(cockpit).toContain('id="scopeBar"');
    expect(cockpit).toContain('function renderScopeBar()');
    expect(cockpit).toContain('function selectScope(id)');
    expect(cockpit).toContain("CUR='ciso';try{applyScope('enterprise');}");
    // the old "Speaking to" persona seat bar is gone
    expect(cockpit).not.toContain('Speaking to');
    expect(cockpit).not.toContain('data-seat="ceo"');
  });

  it('demo crown jewels are region-tagged for scoping', () => {
    expect(cockpit).toContain("region:'amer'");
    expect(cockpit).toContain("region:'emea'");
    expect(cockpit).toContain("region:'apac'");
  });
});
