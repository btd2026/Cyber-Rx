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

  it('exposes the model functions', () => {
    expect(ciso).toContain('function neuronControls()');
    expect(ciso).toContain('function neuronLaneRollup()');
    expect(ciso).toContain('function neuronFrameworkProjection(fwKey)');
    expect(ciso).toContain('function neuronFrameworkLanes(fwKey)');
  });
});

describe('Neuron Controls — risk-driver breakdown per framework (dual lens)', () => {
  it('neuronFrameworkLanes splits a framework by adversarial + the five lanes', () => {
    expect(ciso).toContain("var drivers={adversarial:{all:{},ev:{}}};");
    expect(ciso).toContain('NEURON_LANES.forEach(function(L){drivers[L.id]={all:{},ev:{}};});');
    // a control inherits the drivers of the capabilities that evidence it
    expect(ciso).toContain('n.lanes.forEach(function(l){if(drivers[l]){drivers[l].all[id]=1;if(n.deployed)drivers[l].ev[id]=1;}});');
    // drops drivers with no mapped controls
    expect(ciso).toContain('.filter(function(r){return r.controls>0;});');
  });

  it('the view renders the framework × risk-driver matrix', () => {
    expect(ciso).toContain('Risk-driver coverage by framework');
    expect(ciso).toContain('var driverMatrix=');
    expect(ciso).toContain('evidenced by deployed telemetry'); // cells are honest: evidenced / mapped
  });
});

describe('Neuron Controls — effectiveness hook (presence → proven, never faked)', () => {
  const cockpit = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');

  it('reads a measured BAS / purple-team reading from LIVE.control_effectiveness', () => {
    expect(ciso).toContain('function neuronEffectiveness(){return (typeof LIVE!==\'undefined\'&&LIVE&&LIVE.control_effectiveness)||{};}');
    expect(ciso).toContain('var ef=(typeof neuronEffectiveness===\'function\')?neuronEffectiveness()[c.k]:null;');
  });

  it('graduates prevent to proven ONLY when a reading is present (else presence-only)', () => {
    expect(ciso).toContain("? {measured:true,blocked:(ef.blocked!=null?ef.blocked:null)");
    expect(ciso).toContain(': {measured:false}');
    // view: proven bar when measured, presence bar otherwise
    expect(ciso).toContain("axisBar('Prevent · proven',eff.blocked,'good')");
    expect(ciso).toContain("axisBar('Prevent · presence',n.attack.prevent,'blue')");
  });

  it('the demo wires a subset (BAS + purple-team), the rest stay presence-only', () => {
    expect(cockpit).toContain('control_effectiveness:{');
    expect(cockpit).toContain("source:'BAS · Cymulate'");
    expect(cockpit).toContain("source:'Purple-team exercise'");
  });

  it('when no reading exists, the view names the connect path — nothing inferred', () => {
    expect(ciso).toContain('connect a BAS platform (AttackIQ, SafeBreach, Cymulate)');
    expect(ciso).toContain('Nothing is inferred.');
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
