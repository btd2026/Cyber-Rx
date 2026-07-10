/**
 * Guards for the onboarding document-upload UI + compliance-frameworks changes:
 *  - the big dashed drop-zone (.drop) is restyled to a compact upload button (matching
 *    the register cards' "Upload CSV" style),
 *  - the uploaded-document list is collapsible,
 *  - the "Compliance frameworks in scope" selector drops HITRUST / CMMC and adds
 *    NIST SP 800-53 + CIS v8.
 */

const fs = require('fs');
const path = require('path');

const onb = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/onboarding.html'), 'utf8');
const scope = onb.slice(onb.indexOf('id="scopeFrameworks"'), onb.indexOf('id="scopeFrameworks"') + 900);

describe('onboarding upload UI — compact button, not a big drop-zone', () => {
  it('.drop is restyled to an inline-flex button (no big dashed box)', () => {
    const css = onb.slice(onb.indexOf('.drop{'), onb.indexOf('.drop{') + 260);
    expect(css).toContain('display:inline-flex');
    expect(css).not.toContain('dashed');
    expect(css).toContain('background:var(--blue)');
  });
  it('the subtitle ("click to browse") is hidden in the compact button', () => {
    expect(onb).toContain('.drop .s{display:none}');
  });
  it('keeps drag-and-drop wiring via the shared wireDrop helper', () => {
    expect(onb).toContain('function wireDrop(dropId,fileId,handler)');
    expect(onb).toMatch(/wireDrop\('dropRisk','fileRisk'/);
  });
});

describe('onboarding — uploaded-document list is collapsible', () => {
  it('renders a collapse toggle that hides the document rows', () => {
    expect(onb).toContain('id="obDocToggle"');
    expect(onb).toContain('window.__obDocCollapsed');
    expect(onb).toMatch(/document'\+\(docs\.length>1\?'s':''\)\+' uploaded/);
  });
  it('auto-collapses once the list grows past a few documents', () => {
    expect(onb).toMatch(/window\.__obDocCollapsed=docs\.length>3/);
  });
});

describe('onboarding — Compliance frameworks in scope', () => {
  it('removes HITRUST and CMMC from the framework selector', () => {
    expect(scope).not.toContain('value="HITRUST"');
    expect(scope).not.toContain('value="CMMC"');
  });
  it('adds NIST SP 800-53 and CIS v8', () => {
    expect(scope).toContain('value="NIST SP 800-53"');
    expect(scope).toContain('value="CIS v8"');
  });
  it('keeps the other frameworks (SOC 2, ISO 27001, FedRAMP, PCI DSS, HIPAA, NIST CSF)', () => {
    ['SOC 2', 'ISO 27001', 'FedRAMP', 'PCI DSS', 'HIPAA', 'NIST CSF'].forEach((f) => {
      expect(scope).toContain('value="' + f + '"');
    });
  });
});
