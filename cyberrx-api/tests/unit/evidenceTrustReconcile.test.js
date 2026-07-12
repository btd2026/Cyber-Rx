'use strict';

/**
 * Two trust fixes (source-scan guards):
 *
 *  1. A document that matched ZERO of a control's expected attributes is NOT evidence.
 *     Before, controlCmmi() read the doc's CMMI even when 0 attributes were present, so a
 *     control with no tool coverage (e.g. DE.CM-02) rendered "Deficiency 1.0 · 0 of 1
 *     attributes" citing a policy that does not govern it. It must fall through to tool
 *     telemetry or "not evidenced" instead.
 *
 *  2. The cockpit crown-jewel headline counted PROVISIONAL candidates, so it read "9"
 *     while onboarding (which promotes only confirmed-revenue jewels) showed "6". c5Services
 *     must count only confirmed (non-provisional) jewels, and surface provisional ones
 *     separately so the number can never drift from onboarding.
 */
const fs = require('fs');
const path = require('path');

const cockpit = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');
const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');

describe('trust fix 1 — a zero-attribute document is not evidence', () => {
  it('controlCmmi nulls the doc score when no expected attribute is present', () => {
    expect(cockpit).toContain('var docHasEvidence=ds&&(Array.isArray(ds.attrs)&&ds.attrs.length');
    expect(cockpit).toContain('ds.attrs.some(function(a){return a.found;})');
    expect(cockpit).toContain('var docS=(ds&&docHasEvidence)?Number(ds.cmmi):null;');
  });
  it('the document reference is dropped too, so a non-governing PDF is not cited', () => {
    expect(cockpit).toContain('ds=docHasEvidence?ds:null;');
  });
});

describe('trust fix 2 — crown-jewel count matches onboarding (confirmed only)', () => {
  it('c5Services filters provisional candidates out of the headline count', () => {
    expect(ciso).toContain('var cj=cjAll.filter(function(c){return !c.provisional;});');
    expect(ciso).toContain('var provisional=cjAll.filter(function(c){return c.provisional;}).length;');
  });
  it('the denominator equals the confirmed list actually shown (no counts.crown_jewels drift)', () => {
    expect(ciso).toContain('var total=list.length;');
    expect(ciso).toContain('provisional:provisional,candidateTotal:cjAll.length');
  });
  it('the model still exposes the provisional count so any view can label it', () => {
    // The count fix (c5Services filtering provisional) is the substance and survives.
    // The narrative clause that labelled provisional candidates lived on the CEO/CFO
    // exec seats, which were retired in the persona-seat prune — so we assert the model
    // still CARRIES the provisional count rather than the deleted seat copy.
    expect(ciso).toContain('provisional:provisional,candidateTotal:cjAll.length');
  });
});
