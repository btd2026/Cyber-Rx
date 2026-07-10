/**
 * CRO seat to the completeness standard — Appetite (02), Trend (03) and Decisions (04).
 * (Vs-other-risks/01 is guarded by croScaleCopy.) Checks the canonical tab contract:
 * derived non-contradicting headlines, inherent-vs-residual + control effectiveness, a
 * per-item breakdown, direction+velocity, leading-indicator KRIs, owner+cadence, the
 * shared identity config, the Decisions convergence strip, Decision 1 (identity) with an
 * honest downside, and Decision 2 = re-baseline appetite.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
function fnOf(n) { const a = src.indexOf('function ' + n + '('); return src.slice(a, src.indexOf('\nfunction ', a + 20)); }
const ap = fnOf('c5crAppetite');
const tr = fnOf('c5crTrend');
const dc = fnOf('c5crDecisions');

describe('CRO 02 Appetite — contract', () => {
  it('headline is derived, never a static "within appetite" while a category card reads over', () => {
    expect(ap).toContain('var head=(reg.appetite<=0)');
    expect(ap).not.toContain("Within appetite overall — but one category is over its limit.',null");
  });
  it('shows inherent → residual with control effectiveness (from the shared register)', () => {
    expect(ap).toContain('reg=c5RiskRegister()');
    expect(ap).toContain('Inherent → residual:');
    expect(ap).toContain('controls remove');
  });
  it('per-category breach matrix with over-by magnitude and a status pill', () => {
    expect(ap).toContain("over by '+usd(mag)");
    expect(ap).toContain("Over limit':'Within");
  });
  it('flags confidence (appetite is self-reported) and pulls the treatment from c5IdFix', () => {
    expect(ap).toContain('appetite self-reported');
    expect(ap).toContain('IDF=c5IdFix()');
    expect(ap).toContain('re-baseline appetite on the post-treatment residual');
  });
  it('has a connected-source footnote', () => {
    expect(ap).toContain("+connN+' sources connected");
  });
});

describe('CRO 03 Trend — contract', () => {
  it('reports direction AND velocity (rate of change), not a single "Baseline" word', () => {
    expect(tr).toContain('velStr=(delta<=0');
    expect(tr).toContain("/qtr ('");
  });
  it('has a leading-indicator (KRI) matrix', () => {
    expect(tr).toContain('Leading indicators (KRIs)');
    expect(tr).toContain('Identity controls deployed (KRI)');
    expect(tr).toContain("sig('patch_pct')");
  });
  it('the ownership register carries owner + action + review cadence', () => {
    expect(tr).toContain('reviewed quarterly');
  });
  it('the decision routes to the shared identity fix', () => {
    expect(tr).toContain("Sponsor the '+c5esc(IDF.short)");
  });
});

describe('CRO 04 Decisions — contract', () => {
  it('opens with the convergence strip (one fix resolves this seat\'s tabs)', () => {
    expect(dc).toContain("c5convergeStrip('cro')");
    expect(src).toContain('function c5convergeStrip(seat)');
  });
  it('Decision 1 is the identity treatment WITH its honest downside (interim exposure)', () => {
    expect(dc).toContain("Treat the '+IDF.short+' gap?");
    expect(dc).toContain("Interim exposure persists across the '+IDF.timeline");
  });
  it('Decision 2 is re-baseline appetite / accept-with-rationale on post-treatment residual', () => {
    expect(dc).toContain('Re-baseline appetite on the post-treatment residual?');
    expect(dc).toContain('Formally accept the interim residual');
  });
  it('keeps the audit-trail promise (no AI/LLM at run-time)', () => {
    expect(dc).toContain('no AI/LLM at run-time');
  });
});

describe('CRO convergence strip helper', () => {
  const cs = fnOf('c5convergeStrip');
  it('reads c5IdFixResolves(seat) and names one column per tab in the seat language', () => {
    expect(cs).toContain('c5IdFixResolves(seat)');
    expect(cs).toContain("resolves '+r.length+' of this seat’s risks");
  });
});
