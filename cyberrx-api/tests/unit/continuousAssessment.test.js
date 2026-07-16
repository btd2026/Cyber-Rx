'use strict';

/**
 * Honest continuous assessment of all 106 NIST CSF 2.0 controls. The claim is NOT "all 106
 * automated" (governance outcomes have no sensor) — it's "all 106 continuously assessed on a
 * cadence, honest about the method." Every control scores on three independent axes never
 * collapsed into one number — verdict, assurance, freshness — plus a coverage denominator.
 * The anti-vanity summary counts by assurance tier, tracks expiring evidence, and never
 * excludes the policy controls. Source-scan guard.
 */
const fs = require('fs');
const path = require('path');

const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');

describe('Continuous assessment — the honest model', () => {
  it('classifies every control by base assessment method (live / hybrid / doc)', () => {
    expect(ciso).toContain('var CSF_BASE_METHOD=(function(){');
    // the three buckets are all present
    expect(ciso).toContain('var g={live:[');
    expect(ciso).toContain('hybrid:[');
    expect(ciso).toContain('doc:[');
  });

  it('gives each method a control-aware cadence + freshness TTL, not one global knob', () => {
    expect(ciso).toContain('var ASSESS_METHOD={');
    expect(ciso).toContain("live:{label:'Live telemetry',assurance:'machine-verified',cadence:'Continuous',ttlDays:1");
    expect(ciso).toContain("hybrid:{label:'Hybrid · human-confirmed',assurance:'machine-evidenced · human-confirmed',cadence:'Weekly',ttlDays:7");
    expect(ciso).toContain("attestation:{label:'Attestation + artifact',assurance:'attested',cadence:'Annual',ttlDays:365");
    expect(ciso).toContain("awaiting:{label:'Awaiting a source'");
    // the LLM pre-screen is a proposed finding, never an auto-pass
    expect(ciso).toContain('never an auto-pass');
  });

  it('scores a control on three axes + coverage, never one collapsed number', () => {
    expect(ciso).toContain('function c5ControlAssessment(id){');
    // verdict is graded (partial is essential), never binary
    expect(ciso).toContain("verdict=sig>=85?'met':(sig>=55?'partial':'not_met');");
    expect(ciso).toContain("if(method==='awaiting')verdict='not_assessed';");
    // freshness decays past TTL — an expired attestation is NOT passing
    expect(ciso).toContain("lastDays>ttl?'expired':(lastDays>ttl*0.75?'expiring':'healthy')");
    // coverage carries observed vs known population
    expect(ciso).toContain('coverage={observed:observed,known:known,pct:');
    // assurance drives confidence so a person's assertion can't read "high confidence"
    expect(ciso).toContain("confidence=method==='live'?'high'");
  });

  it('the summary is anti-vanity — counts by tier, expiring, and unassessed; policy controls included', () => {
    expect(ciso).toContain('function c5AssessmentSummary(){');
    expect(ciso).toContain('s.continuouslyVerified=s.live;s.humanConfirmed=s.hybrid;s.attested=s.attestation;');
    expect(ciso).toContain('s.expiringSoon=s.expiring+s.expired;');
    expect(ciso).toContain('s.machineVerifiable=s.live+s.hybrid;');
  });

  it('renders the honest view and wires it as its own Program Health tab', () => {
    expect(ciso).toContain('function c5ContinuousAssessment(host){');
    // subtitle now carries the active framework label (NIST CSF 2.0 by default)
    expect(ciso).toContain("'+c5AssessFwCfg().label+' controls, continuously assessed — never point-in-time.");
    expect(ciso).toContain("data-phtab=\"assess\">Continuous assessment</button>");
    // assess is the default Program-Health tab; it sets the CSF framework before rendering
    expect(ciso).toContain("else{C5_ASSESS_FW='csf';c5ContinuousAssessment(body);}");
  });
});
