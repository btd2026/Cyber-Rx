'use strict';

/**
 * Attestation intelligence — make a governance control more than a rubber stamp. (1) An LLM
 * pre-screen proposes whether the policy addresses the outcome and flags gaps — a finding a
 * human confirms, NEVER an auto-pass. (2) Indirect telemetry (HRIS RACI, LMS completion, TPRM
 * freshness) corroborates the attestation without claiming to prove the outcome. Guard.
 */
const fs = require('fs');
const path = require('path');
const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');

describe('Attestation intelligence', () => {
  it('harvests indirect corroborating signals where they honestly exist', () => {
    expect(ciso).toContain('function c5IndirectSignal(id){');
    expect(ciso).toContain("source:'HRIS',signal:'Named security roles filled'");
    expect(ciso).toContain("source:'LMS',signal:'Training completion'");
    expect(ciso).toContain("source:'TPRM',signal:'Vendor questionnaire freshness'");
  });
  it('LLM pre-screen is a proposed finding a human confirms, never an auto-pass', () => {
    expect(ciso).toContain('function c5LlmPrescreen(id){');
    expect(ciso).toContain("gaps.push('scope gap — privileged accounts not explicitly covered')");
    expect(ciso).toContain('never an auto-pass');
  });
  it('surfaces the pre-screen marker + indirect signal in the view', () => {
    expect(ciso).toContain('var ai=c5AttestationInsight();');
    expect(ciso).toContain('attestations LLM pre-screened');
    // indirect signal takes the coverage column for attestation controls
    expect(ciso).toContain("var ind=(a.method==='attestation')?c5IndirectSignal(id):null;");
    expect(ciso).toContain('+llmMark');
  });
});
