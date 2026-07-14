'use strict';

/**
 * The flat "Operating regions" chip picker is retired — regions are captured by the
 * Regions & entities structure now. Removed from onboarding (UI, state, payload) and the
 * backend derives the CLO-jurisdiction regions from the org structure instead. Guard.
 */
const fs = require('fs');
const path = require('path');

const onboarding = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/onboarding.html'), 'utf8');
const crownjewels = fs.readFileSync(path.resolve(__dirname, '../../src/routes/crownjewels.js'), 'utf8');

describe('Operating-regions picker removed', () => {
  it('no flat regions chip picker or REGIONS state remains in onboarding', () => {
    expect(onboarding).not.toContain('id="regions"');
    expect(onboarding).not.toContain('data-r="US"');
    expect(onboarding).not.toContain('regions:REGIONS');
    expect(onboarding).not.toContain('var PROC=[],APP=[],RISK=[],REGIONS=[];');
  });

  it('the backend derives jurisdiction regions from the org structure, not a flat field', () => {
    expect(crownjewels).not.toContain('regions: Array.isArray(b.regions)');
    expect(crownjewels).toContain('Array.isArray(b.org_structure) ? b.org_structure : []');
    expect(crownjewels).toContain('if (r && r.label) out.push(String(r.label));');
  });
});
