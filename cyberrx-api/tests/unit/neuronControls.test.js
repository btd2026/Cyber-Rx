'use strict';

/**
 * Neuron Controls — the capability-centric control layer (source-scan guard).
 *
 * A security capability is measured once from live telemetry, scored against both
 * risk lenses (adversarial ATT&CK prevent/detect + the five non-adversarial lanes),
 * and projected onto every framework control it maps to. "Measure once, report
 * everywhere." These guards lock the model shape and the honesty rails.
 */
const fs = require('fs');
const path = require('path');

const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');

describe('Neuron Controls — registry & risk lenses', () => {
  it('defines the five non-adversarial lanes', () => {
    ['outage_dr', 'data_corruption', 'insider', 'third_party_supply_chain', 'privacy_regulatory']
      .forEach((id) => expect(ciso).toContain("id:'" + id + "'"));
  });

  it('carries a per-capability crosswalk that ADDS CIS / ISO / SOC 2 / PCI control IDs', () => {
    expect(ciso).toContain('var NEURON_XWALK={');
    // control IDs only — a sample across the external frameworks
    expect(ciso).toContain("cis:['6.3','6.4','6.5']");      // MFA → CIS
    expect(ciso).toContain("iso:['A.5.17','A.8.5']");        // MFA → ISO 27001
    expect(ciso).toContain("soc2:['CC6.1','CC6.2','CC6.3']"); // MFA → SOC 2
    expect(ciso).toContain("pci:['8.3','8.4','8.5']");        // MFA → PCI
  });

  it('reuses CAP_FRAMEWORK for CSF/800-53 rather than duplicating them', () => {
    expect(ciso).toContain('csf:(fw&&fw.csf)||[],r53:(fw&&fw.r53)||[]');
  });

  it('exposes the three model functions', () => {
    expect(ciso).toContain('function neuronControls()');
    expect(ciso).toContain('function neuronLaneRollup()');
    expect(ciso).toContain('function neuronFrameworkProjection(fwKey)');
  });
});

describe('Neuron Controls — honesty rails', () => {
  it('evidence class is live (automated) / hybrid (telemetry + human) / none — never faked', () => {
    expect(ciso).toContain("var evidence=!deployed?'none':(ceil>=5?'live':'hybrid');");
  });

  it('prevent = control presence, detect = detection coverage (not proven effectiveness)', () => {
    expect(ciso).toContain('var prevent=(x.role===\'prevent\'||x.role===\'both\')?frac:0;');
    expect(ciso).toContain('var detect=(x.role===\'detect\'||x.role===\'both\')?frac:0;');
    expect(ciso).toContain('control presence'); // rendered caveat
  });
});

describe('Neuron Controls — surfaced as a framework subtab (additive, no route removed)', () => {
  it('adds a Neuron Controls subtab alongside Classic and Nerion’s View', () => {
    expect(ciso).toContain('data-phtab="neuron">Neuron Controls');
    expect(ciso).toContain("else if(tab==='neuron'){c5NeuronControls(body);}");
    // the existing tabs are untouched
    expect(ciso).toContain('data-phtab="classic">Classic View');
    expect(ciso).toContain('data-phtab="nerion">Nerion');
  });
});
