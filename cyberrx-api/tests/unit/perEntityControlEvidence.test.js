'use strict';

/**
 * Layer A — the region scope is wired down to the CONTROLS: document evidence resolves
 * per region with inheritance (entity → region → enterprise), and onboarding captures,
 * per branch, whether it connects its own systems/documents or inherits the parent.
 */
const fs = require('fs');
const path = require('path');

const cockpit = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');
const onboarding = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/onboarding.html'), 'utf8');

describe('Cockpit — document/control evidence per region (with inheritance)', () => {
  it('splits the raw store (docScoresBase) from the resolved scoped view (docScores)', () => {
    expect(cockpit).toContain('function docScoresBase()');
    expect(cockpit).toContain('function saveDocScore(id,o){var m=docScoresBase();');
    expect(cockpit).toContain('function docScores(){');
  });

  it('an entity inherits its region\'s policies (region override applied by scopeRegion)', () => {
    expect(cockpit).toContain('var region=(typeof scopeRegion===\'function\')?scopeRegion(SCOPE):null;');
    expect(cockpit).toContain('if(region&&DEMO_DOC_REGION[region])');
  });

  it('carries per-region document profiles — GDPR for EMEA, SEC/IR for Americas, draft for APAC', () => {
    expect(cockpit).toContain('var DEMO_DOC_REGION={');
    expect(cockpit).toContain("'PR.DS-01':[4,'EMEA Data Protection Policy (GDPR)']");
    expect(cockpit).toContain("'RS.MA-01':[4,'US Incident Response Runbook']");
    expect(cockpit).toContain("'GV.OC-01':[2,'APAC Security Policy (draft)']");
  });
});

describe('Onboarding — per-entity connect/upload with inheritance', () => {
  it('each branch has an "own systems & docs" toggle (default off = inherit)', () => {
    expect(onboarding).toContain('class="e-own"');
    expect(onboarding).toContain('own systems &amp; docs');
  });

  it('the own/inherit choice is persisted per entity', () => {
    expect(onboarding).toContain('var own=!!(r.querySelector(\'.e-own\')&&r.querySelector(\'.e-own\').checked);return {id:id+\'_\'+orgSlug(el),label:el,own:own};');
  });
});
