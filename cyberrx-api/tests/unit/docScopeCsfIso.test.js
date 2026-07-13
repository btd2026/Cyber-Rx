'use strict';

/**
 * Document scope = NIST CSF 2.0 + ISO 27001 only. The platform focuses on those two
 * frameworks, so onboarding no longer offers uploads for documents the cockpit doesn't score
 * against them — SBOM is removed, and the policy-evidence list drops the AI-framework docs
 * (NIST AI RMF, ISO/IEC 42001, AI acceptable-use). Removed from onboarding + backend. Guard.
 */
const fs = require('fs');
const path = require('path');

const onboarding = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/onboarding.html'), 'utf8');
const crownjewels = fs.readFileSync(path.resolve(__dirname, '../../src/routes/crownjewels.js'), 'utf8');
const catalog = fs.readFileSync(path.resolve(__dirname, '../../src/services/InputCatalogService.js'), 'utf8');

describe('Onboarding — document uploads limited to CSF/ISO', () => {
  it('the policy-evidence list offers only NIST CSF 2.0 / ISO 27001 documents (d1–d10)', () => {
    expect(onboarding).toContain("var OB_DOC_TYPES=[{k:'d1',l:'Information Security Policy'}");
    expect(onboarding).toContain("{k:'d10',l:'Data Protection Policy'}]");
    // the AI-framework doc types no longer appear in the CSF/ISO policy-evidence list
    expect(onboarding).not.toContain("{k:'d17'");
    expect(onboarding).not.toContain("{k:'d18'");
    expect(onboarding).not.toContain("{k:'d19'");
  });

  it('removes the SBOM upload section and its wiring entirely', () => {
    expect(onboarding).not.toContain('Software Bill of Materials (SBOM)');
    expect(onboarding).not.toContain("makeRowList('sbomRows'");
    expect(onboarding).not.toContain("['addSbom',SBOM]");
    expect(onboarding).not.toContain('sbom:SBOM.collect()');
  });

  it('removes the AI risk & governance and AI supply-chain document/inventory upload sections', () => {
    expect(onboarding).not.toContain('AI risk &amp; governance');
    expect(onboarding).not.toContain('id="secAiSupply"');
    // the AI document + inventory file inputs are gone
    expect(onboarding).not.toContain('id="aiGovDocFile"');
    expect(onboarding).not.toContain('id="aiGovInvFile"');
    expect(onboarding).not.toContain('type="file" id="aiInvFile"');
  });
});

describe('Backend — SBOM no longer collected or catalogued', () => {
  it('the intake route neither normalizes nor stores an sbom register', () => {
    expect(crownjewels).not.toContain('const sbom = normReg(b.sbom');
    expect(crownjewels).not.toContain('crownJewelRegister, bia, sbom, riskAppetite');
  });

  it('the input catalog drops the SBOM input and its er_thirdparty optional', () => {
    expect(catalog).not.toContain("'SBOM': 'sbom'");
    expect(catalog).not.toContain("optional: ['Third-party Security Ratings', 'SBOM']");
  });

  it('the intake route no longer normalizes or stores AI governance / supply-chain', () => {
    expect(crownjewels).not.toContain('const ai = b.aiGovernance');
    expect(crownjewels).not.toContain('const asc = b.aiSupplyChain');
    expect(crownjewels).not.toContain('governance, aiGovernance, aiSupplyChain, growth');
  });
});
