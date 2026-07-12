'use strict';

/**
 * Telemetry provenance + asset applicability (Phase 4) — source-scan guard.
 *
 * Answers the CISO's #2 critique ("you show Defender as a source for Salesforce, a SaaS
 * app"). A tool can only EVIDENCE an asset whose class it actually covers: EDR sees
 * endpoints/servers, not SaaS; CSPM sees cloud infra, not SaaS. A deployed-but-inapplicable
 * tool is shown struck-through and NOT credited, and a SaaS app with no SSPM/CASB reads
 * as a gap, not as covered.
 */
const fs = require('fs');
const path = require('path');

const cockpit = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');
const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');

describe('Asset-class applicability matrix', () => {
  it('defines an asset-class taxonomy and a capability→asset-class matrix', () => {
    expect(cockpit).toContain('var ASSET_CLASS_LABEL={saas:');
    expect(cockpit).toContain('var CAP_ASSET_APPLIES={');
    expect(cockpit).toContain('function capAppliesTo(k,cls)');
  });

  it('EDR covers endpoints/servers but NOT SaaS; CSPM covers cloud but NOT SaaS', () => {
    expect(cockpit).toContain("edr:['endpoint','server']");
    expect(cockpit).toContain("cspm:['iaas']");
    // MFA (IdP/SSO) does apply to SaaS
    expect(cockpit).toContain("mfa:['identity','saas','server','endpoint']");
  });

  it('demo crown jewels carry an asset class (billing platform is SaaS / Salesforce)', () => {
    expect(cockpit).toContain("class:'saas', tool:'Salesforce'");
    expect(cockpit).toContain("class:'identity'");
    expect(cockpit).toContain("class:'iaas'");
  });
});

describe('Per-asset provenance — "prove it"', () => {
  it('assetProvenance splits deployed tools into applicable vs not-valid-for-this-class', () => {
    expect(ciso).toContain('function assetProvenance(cj)');
    expect(ciso).toContain('if(applies)applicable.push({k:c.k,name:c.name,tool:c.tool,pct:p});');
    expect(ciso).toContain('else inapplicable.push({k:c.k,name:c.name,tool:c.tool});');
  });

  it('a SaaS asset without an SSPM/CASB reads as a gap; with one it is evidenced', () => {
    // the gap is keyed on the SaaS-appropriate tool (SSPM), not CSPM
    expect(ciso).toContain("cls==='saas'&&!applicable.some(function(a){return a.k==='sspm';})");
    expect(ciso).toContain('SaaS security posture (SSPM / CASB) is not connected');
    // SSPM/CASB is a real capability that applies to SaaS
    expect(cockpit).toContain("sspm:['saas']");
    expect(ciso).toContain("sspm:  {domain:'SaaS Posture'");
  });

  it('the Neuron Controls view renders the provenance panel that refuses Defender-for-Salesforce', () => {
    expect(ciso).toContain('Telemetry provenance by asset');
    expect(ciso).toContain('refuses to claim Defender covers Salesforce');
    // inapplicable chips are struck through
    expect(ciso).toContain('text-decoration:line-through');
  });
});
