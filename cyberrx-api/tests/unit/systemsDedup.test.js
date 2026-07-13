'use strict';

/**
 * De-duplicate systems entry — the legacy "Systems & applications" connect/upload UI was a
 * second way to enter systems, duplicating the discovery step in Processes & systems. It's
 * now auto-derived: the crown-jewel map (which needs APP) is bridged from the single
 * discovery import, and the old connect/upload UI is hidden (kept in the DOM so its handlers
 * never dangle). Source-scan guard.
 */
const fs = require('fs');
const path = require('path');

const onboarding = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/onboarding.html'), 'utf8');

describe('Systems — no duplicate entry', () => {
  it('relabels the legacy card as auto-derived and hides its connect/upload UI', () => {
    expect(onboarding).toContain('auto-derived');
    expect(onboarding).toContain('Derived automatically from your <b>discovery import</b>');
    expect(onboarding).toContain('<div id="appLegacyHidden" style="display:none" aria-hidden="true">');
  });

  it('bridges APP from the single discovery import so the crown-jewel map still works', () => {
    expect(onboarding).toContain('function bridgeAppFromDiscovery(){');
    expect(onboarding).toContain('APP=(IMPORTED||[]).map(function(r){return {name:r.name,host:classHost(r.class),data:classData(r.class)');
    // each imported system's declared process is its direct crown-jewel mapping
    expect(onboarding).toContain('processes:r.process?[r.process]:[]');
    expect(onboarding).toContain('function classHost(c){');
    expect(onboarding).toContain('function classData(c){');
  });

  it('runs the bridge on import, upload and restore', () => {
    expect(onboarding).toContain("IMPORTED=parseSystems(document.getElementById('sysBulk').value||'');renderDiscResult();bridgeAppFromDiscovery();saveSystems();");
    expect(onboarding).toContain('IMPORTED=parseSystems(String(r.result||\'\'));renderDiscResult();bridgeAppFromDiscovery();saveSystems();');
    expect(onboarding).toContain('renderDiscConn();renderDiscResult();bridgeAppFromDiscovery();}}catch(_){}');
  });

  it('makes wireDrop null-safe so the hidden legacy uploader never throws', () => {
    expect(onboarding).toContain('if(!d||!f)return;');
  });
});
