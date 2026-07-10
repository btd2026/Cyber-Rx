/**
 * CIO seat to standard — 03 Software supply chain (c5ctSupply) + 04 Decisions (c5ctDecisions).
 * (Tech estate/01 + AI/02 guarded by cioTechEstateCopy / cioAiCopy.)
 * Kills the "triaged vs not connected" contradiction with honest 1-of-3-signals coverage,
 * gives the auth-library advisory real detail (CVSS/KEV/blast radius, illustrative until
 * wired), lists SBOM + build-signing as connect-items, adds the EU CRA regulatory note, and
 * brings the Decisions tab to the contract (convergence strip; D1 identity + honest downside;
 * D2 AI governance framework; D3 patch advisory).
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
function fnOf(n) { const a = src.indexOf('function ' + n + '('); return src.slice(a, src.indexOf('\nfunction ', a + 20)); }
const su = fnOf('c5ctSupply');
const dc = fnOf('c5ctDecisions');

describe('CIO 03 Software supply chain — contract', () => {
  it('kills the "triaged" overclaim with an honest 1-of-3-signals headline', () => {
    expect(su).toContain('One of three supply-chain signals is live');
    expect(su).not.toContain('Your dependencies are triaged');
    expect(su).toContain("sigLive+' of 3 signals live");
  });
  it('the auth-library advisory carries CVSS / KEV / blast radius (illustrative until wired)', () => {
    expect(su).toContain('CVSS 9.8 · KEV-listed · blast radius');
    expect(su).toContain('Illustrative until scanner-wired');
  });
  it('SBOM + build-signing render as a connect-list', () => {
    expect(su).toContain('Connect SBOM');
    expect(su).toContain('Connect CI/CD');
  });
  it('adds the EU Cyber Resilience Act regulatory strip', () => {
    expect(su).toContain('EU Cyber Resilience Act (CRA)');
  });
  it('two-button decision: patch advisory + fund the identity fix (shared config)', () => {
    expect(su).toContain('IDF=c5IdFix()');
    expect(su).toContain('Patch the auth-library advisory');
    expect(su).toContain("{mid:IDF.mid,txt:'Fund the identity fix — reduces blast radius'}");
  });
  it('has a connected-source footnote', () => {
    expect(su).toContain("+connN+' sources connected");
  });
});

describe('CIO 04 Decisions — contract', () => {
  it('opens with the convergence strip', () => {
    expect(dc).toContain("c5convergeStrip('cio')");
  });
  it('Decision 1 is the identity fix WITH its honest downside (interim exposure)', () => {
    expect(dc).toContain("Fund the '+IDF.short+' fix?");
    expect(dc).toContain("Interim exposure persists across the '+IDF.timeline");
  });
  it('Decision 2 is standing up the AI governance framework (this seat\'s domain call)', () => {
    expect(dc).toContain('Stand up the AI governance framework?');
    expect(dc).toContain('Formalize — adopt a framework + EU AI Act mapping');
  });
  it('Decision 3 is the urgent tactical auth-library patch', () => {
    expect(dc).toContain('Patch the auth-library advisory?');
    expect(dc).toContain('KEV-listed advisory');
  });
  it('keeps the audit-trail promise (no AI/LLM at run-time)', () => {
    expect(dc).toContain('no AI/LLM at run-time');
  });
});
