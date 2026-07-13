'use strict';

/**
 * Org structure — regions and countries are PICKED, not typed. Region is a dropdown from a
 * catalog; choosing it auto-fills the primary regulator and pre-selects that region's
 * countries as toggle chips. The hidden .r-countries input keeps collectOrgStructure()
 * unchanged. Source-scan guard.
 */
const fs = require('fs');
const path = require('path');

const onboarding = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/onboarding.html'), 'utf8');

describe('Org structure — region & country dropdowns', () => {
  it('drives regions from a catalog with countries + regulator per region', () => {
    expect(onboarding).toContain('var REGION_OPTIONS=[');
    expect(onboarding).toContain("{label:'EMEA',regime:'GDPR · DORA · NIS2'");
    expect(onboarding).toContain("{label:'APAC',regime:'APPI · PDPA · Privacy Act'");
    expect(onboarding).toContain('function orgRegionMeta(label){');
  });

  it('renders Region as a <select>, not a free-text input', () => {
    expect(onboarding).toContain('<select class="r-name"');
    expect(onboarding).toContain('<option value="">Select region…</option>');
    expect(onboarding).not.toContain('<input class="r-name" placeholder="e.g. EMEA">');
  });

  it('Countries is a click-to-toggle multi-select backed by a hidden input', () => {
    expect(onboarding).toContain('function renderCountryChips(box,hidden,regionLabel,selected){');
    expect(onboarding).toContain('class="chips r-countries-box"');
    expect(onboarding).toContain('<input type="hidden" class="r-countries">');
    // the hidden value is the joined chip selection, so collect stays the same
    expect(onboarding).toContain("hidden.value=Array.prototype.slice.call(box.querySelectorAll('.chip.on')).map(function(s){return s.getAttribute('data-c');}).join(' · ');");
  });

  it('selecting a region auto-fills the regulator and pre-selects its countries', () => {
    expect(onboarding).toContain('if(m&&!reg.value.trim())reg.value=m.regime;');
    expect(onboarding).toContain('renderCountryChips(box,hidden,sel.value,m?m.countries.slice():[]);');
  });

  it('collectOrgStructure still reads the same fields (no downstream contract change)', () => {
    expect(onboarding).toContain('function collectOrgStructure()');
    expect(onboarding).toContain('var label=(c.querySelector(\'.r-name\').value||\'\').trim();');
    expect(onboarding).toContain("countries:(c.querySelector('.r-countries').value||'').trim()");
  });
});
