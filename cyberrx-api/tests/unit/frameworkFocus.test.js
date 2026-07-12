'use strict';

/**
 * Framework focus (Phase 3) — the client framework views are scoped to NIST CSF 2.0 +
 * ISO 27001. The 800-53 / CIS / SOC 2 / HIPAA / PCI crosswalks stay in the data model
 * (and the internal-only Nerion Map, which is Nerion IP) but are not offered to clients.
 */
const fs = require('fs');
const path = require('path');

const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');

describe('Framework focus — client selectors show CSF 2.0 + ISO 27001 only', () => {
  it('the framework pill bar offers only CSF and ISO', () => {
    expect(ciso).toContain("var pills='<div class=\"c5fw-pills\">'+[['csf','NIST CSF 2.0'],['iso','ISO 27001']]");
  });

  it('a stale framework selection is coerced back to CSF', () => {
    expect(ciso).toContain("if(FW_SEL!=='csf'&&FW_SEL!=='iso'){window.FW_SEL='csf';}");
  });

  it('the client Neuron Controls projection shows CSF + ISO only', () => {
    expect(ciso).toContain("var FW=[{k:'csf',l:'NIST CSF 2.0'},{k:'iso',l:'ISO 27001'}];");
  });

  it('the internal Nerion Map still carries the full six-framework crosswalk (IP)', () => {
    expect(ciso).toContain("var FW=[{k:'csf',l:'NIST CSF 2.0'},{k:'r53',l:'800-53'},{k:'cis',l:'CIS v8'},{k:'iso',l:'ISO 27001'},{k:'soc2',l:'SOC 2'},{k:'pci',l:'PCI DSS'}];");
    // and the crosswalk data itself is untouched
    expect(ciso).toContain("cis:['6.3','6.4','6.5'],iso:['A.5.17','A.8.5'],soc2:['CC6.1','CC6.2','CC6.3'],pci:['8.3','8.4','8.5']");
  });
});
