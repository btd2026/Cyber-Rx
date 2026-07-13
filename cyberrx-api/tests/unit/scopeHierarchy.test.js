'use strict';

/**
 * The scope bar IS the Enterprise → Region → Entity hierarchy, always visible. Three labelled
 * tiers: Enterprise root, the regions, and (once inside a region) that region's entities —
 * the current path highlighted at every level. This is the explicit drill structure a global
 * CISO expects, not a click-to-reveal. Source-scan guard.
 */
const fs = require('fs');
const path = require('path');

const cockpit = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');

describe('Scope bar — explicit Enterprise → Region → Entity tiers', () => {
  it('renders a labelled Region tier and an Entity tier (counted), not just region buttons', () => {
    expect(cockpit).toContain('function renderScopeBar()');
    expect(cockpit).toContain("'<span class=\"scope-sep\">›</span><span class=\"scope-tier\">Region</span>'");
    expect(cockpit).toContain("'<span class=\"scope-sep\">›</span><span class=\"scope-tier\">Entity · '+reg.entities.length+'</span>'");
  });

  it('the Entity tier only appears inside a region and lists every branch + an "All <region>" roll-up', () => {
    expect(cockpit).toContain('if(reg&&reg.entities&&reg.entities.length){');
    expect(cockpit).toContain('All \'+esc(reg.label)+\'</button>');
    expect(cockpit).toContain('reg.entities.map(function(e){var on=(SCOPE===e.id);');
  });

  it('highlights the active region and entity so the full path reads at a glance', () => {
    // region tier: highlight the region on the current scope's path
    expect(cockpit).toContain('regions.map(function(r){var on=(r.id===activeRegion);');
    // entity buttons carry a distinct class + on-state
    expect(cockpit).toContain('class="seat ent\'+(on?\' on\':\'\')+\'"');
  });

  it('selecting a scope re-renders the bar so the Entity tier updates on region change', () => {
    expect(cockpit).toContain('function selectScope(id){try{applyScope(id);}catch(_){}renderScopeBar();');
  });
});
