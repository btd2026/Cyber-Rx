'use strict';

/**
 * Per-system risk derivation — the last fidelity step of the chain
 * Corporate → Region → Entity → Process → System → Risk → Control. Each individual system's
 * asset class determines the distinct risk set it carries (adversarial ATT&CK-style +
 * non-adversarial operational), and every risk names the capabilities that mitigate it.
 * Combined with assetProvenance (which of those capabilities VALIDLY cover the class), the
 * cockpit shows, per system: this system → these risks → these controls, covered or open.
 * Source-scan guard. (#per-system-risk)
 */
const fs = require('fs');
const path = require('path');

const ciso5 = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');

describe('Per-system risk model — ASSET_RISK_MODEL', () => {
  it('defines a distinct risk set per asset class, not one flat list', () => {
    expect(ciso5).toContain('var ASSET_RISK_MODEL={');
    ['saas:', 'iaas:', 'endpoint:', 'server:', 'identity:', 'data:', 'network:'].forEach((cls) => {
      expect(ciso5).toContain(cls);
    });
  });

  it('carries both adversarial and non-adversarial risks (adv flag), each mapped to mitigating caps', () => {
    // a SaaS system's account-takeover is adversarial and mitigated by mfa/sspm/siem
    expect(ciso5).toContain("{r:'Account takeover / OAuth-token abuse',adv:true,caps:['mfa','sspm','siem']}");
    // a non-adversarial operational risk exists too (vendor dependency, outage, corruption…)
    expect(ciso5).toContain("adv:false");
    expect(ciso5).toContain("caps:['backup']");
  });
});

describe('assetRisks(cj) — derives one system\'s risks → controls', () => {
  it('uses the system\'s own class + criticality (per-system, not aggregate)', () => {
    expect(ciso5).toContain('function assetRisks(cj){');
    expect(ciso5).toContain("var cls=(cj&&cj.class)||'server';var crit=(cj&&cj.tier)||'';");
  });

  it('joins each risk\'s controls to real coverage via assetProvenance (validity-aware)', () => {
    // provenance decides which caps actually, validly cover this asset class
    expect(ciso5).toContain("var pr=(typeof assetProvenance==='function')?assetProvenance(cj):{applicable:[]};");
    expect(ciso5).toContain('covered[a.k]=a.pct;');
    // per control: does it apply to this class, and what is its coverage
    expect(ciso5).toContain("var applies=(typeof capAppliesTo==='function')?capAppliesTo(k,cls):true;");
    expect(ciso5).toContain('coverage:(covered[k]!=null?covered[k]:null),applies:applies');
  });

  it('flags a risk mitigated only when a VALID control has real coverage, and counts open risks', () => {
    expect(ciso5).toContain('var mitigated=controls.some(function(c){return c.applies&&c.coverage!=null;});');
    expect(ciso5).toContain('open:risks.filter(function(r){return !r.mitigated;}).length');
  });
});

describe('Cockpit renders System → Risk → Control per system', () => {
  it('draws a per-system risk block in the telemetry-provenance panel', () => {
    expect(ciso5).toContain('function riskBlock(cj){');
    expect(ciso5).toContain('Risks this system carries');
    expect(ciso5).toContain('System → Risk → Control');
  });

  it('labels each risk adversarial vs operational and shows control coverage / gap chips', () => {
    expect(ciso5).toContain('⚔ ADVERSARIAL');
    expect(ciso5).toContain('⚙ OPERATIONAL');
    expect(ciso5).toContain('function ctrlChip(c){');
    // a valid-but-not-deployed control reads as an open gap for that system
    expect(ciso5).toContain('— gap');
  });
});
