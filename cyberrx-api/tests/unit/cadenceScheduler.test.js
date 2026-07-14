'use strict';

/**
 * Control-aware, user-tunable cadence. Each control's assessment cadence has a method default
 * (live continuous, attestation annual); the user sets a global floor and overrides per
 * function or per control underneath — precedence control > function > global > default. Not a
 * blunt "run everything weekly" knob. Captured at onboarding, applied in the cockpit. Guard.
 */
const fs = require('fs');
const path = require('path');

const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const onboarding = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/onboarding.html'), 'utf8');

describe('Cadence — control-aware scheduler', () => {
  it('maps each cadence to a freshness TTL and a per-method default', () => {
    expect(ciso).toContain('var C5_CADENCE_TTL={continuous:0.04,daily:1,weekly:7,monthly:30,quarterly:90,semiannual:182,annual:365}');
    expect(ciso).toContain("function c5MethodDefaultCadence(method){return {live:'continuous',hybrid:'weekly',attestation:'annual'");
  });

  it('resolves the effective cadence with control > function > global > default precedence', () => {
    expect(ciso).toContain('function c5EffectiveCadence(id,method){');
    expect(ciso).toContain("var key=(ov.control&&ov.control[id])||(ov.fn&&ov.fn[fn])||ov.global||c5MethodDefaultCadence(method);");
    // freshness uses the EFFECTIVE ttl, not the fixed method one
    expect(ciso).toContain('var eff=c5EffectiveCadence(id,method);');
    expect(ciso).toContain('var ttl=eff.ttlDays;');
  });

  it('persists overrides per scope and re-renders on change', () => {
    expect(ciso).toContain('function c5SetCadence(scope,val){');
    expect(ciso).toContain("localStorage.setItem('cyberrx_assessment_cadence',JSON.stringify(ov));");
    expect(ciso).toContain('c5SetCadence(sel.getAttribute(\'data-cadence\'),sel.value);c5ContinuousAssessment(host);');
    // global, per-function and per-control selectors all exist
    expect(ciso).toContain("cadSelect('global'");
    expect(ciso).toContain("cadSelect('fn:'+C5_ASSESS_FN");
    expect(ciso).toContain("cadSelect('control:'+id");
  });

  it('onboarding captures the global cadence floor into the same key the cockpit reads', () => {
    expect(onboarding).toContain('Continuous-monitoring cadence');
    expect(onboarding).toContain('id="obCadence"');
    expect(onboarding).toContain("localStorage.setItem('cyberrx_assessment_cadence',JSON.stringify(ov));");
  });
});
