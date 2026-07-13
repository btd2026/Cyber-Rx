'use strict';

/**
 * Onboarding redo — the setup flow now mirrors the platform chain
 * Corporate → Region → Entity → Process → System → Risk → Control, with a persistent spine
 * visual and an EXPLICIT section→tab map. The old keyword-matched tabs collided
 * ("Organization" vs "Organizational structure") and silently orphaned whole sections —
 * Security operating model and Per-entity connectors matched no tab and never rendered.
 * This guards the fix. Source-scan.
 */
const fs = require('fs');
const path = require('path');

const onboarding = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/onboarding.html'), 'utf8');

describe('Onboarding — chain-driven tabs', () => {
  it('defines the seven chain stages as tabs, in order', () => {
    ['corp', 'struct', 'sys', 'connect', 'risk', 'control', 'exec'].forEach((k) => {
      expect(onboarding).toContain("{k:'" + k + "'");
    });
    expect(onboarding).toContain("l:'Regions & entities'");
    expect(onboarding).toContain("l:'Controls & evidence'");
  });

  it('boots on Corporate and drives visibility from an explicit rule map, not fragile keywords', () => {
    expect(onboarding).toContain('var OB_TABRULES=[');
    expect(onboarding).toContain("obShow('corp');");
    // most-specific-first: structure claimed before the generic "organization"
    expect(onboarding).toContain("{t:'struct',m:'organizational structure'}");
    expect(onboarding).toContain("{t:'corp',m:'organization'}");
    expect(onboarding).toContain('function obTabOf(sec){');
    expect(onboarding).toContain('if(h.indexOf(OB_TABRULES[i].m)>=0)return OB_TABRULES[i].t;');
  });

  it('rescues the sections the old keyword tabs orphaned (operating model, per-entity connectors)', () => {
    expect(onboarding).toContain("{t:'struct',m:'security operating model'}");
    expect(onboarding).toContain("{t:'connect',m:'per-entity connectors'}");
    // AI supply-chain + strategic objectives were orphaned too
    expect(onboarding).toContain("{t:'control',m:'software supply-chain'}");
    expect(onboarding).toContain("{t:'exec',m:'strategic objectives'}");
  });
});

describe('Onboarding — the chain spine', () => {
  it('renders the full Corporate→…→Control spine and lights the active stage', () => {
    expect(onboarding).toContain('id="chainSpine"');
    expect(onboarding).toContain('var OB_SPINE=[');
    expect(onboarding).toContain("{k:'Corporate',t:['corp']}");
    expect(onboarding).toContain("{k:'Control',t:['control']}");
    expect(onboarding).toContain('function renderSpine(active){');
    // System stage is lit on both the systems and connect tabs
    expect(onboarding).toContain("{k:'System',t:['sys','connect']}");
    // the spine redraws on every tab change
    expect(onboarding).toContain('function obShow(key){OB_ACTIVE=key;renderSpine(key);');
  });

  it('the hero leads with the chain and continuous 106-control assessment, differentiated from Vanta', () => {
    expect(onboarding).toContain('Corporate → Region → Entity → Process → System → Risk → Control');
    expect(onboarding).toContain('continuously assesses all 106 NIST CSF controls');
    expect(onboarding).toContain('Not another Vanta');
  });
});
