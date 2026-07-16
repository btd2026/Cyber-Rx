'use strict';

/**
 * Each entity has its OWN posture — Enterprise, Region and Entity roll all the way down to the
 * controls. The continuous assessment is therefore seeded with the cockpit's current SCOPE and
 * biased by that scope's telemetry maturity, so switching entities in the scope bar re-assesses
 * every control instead of showing the same numbers. Source-scan guard.
 */
const fs = require('fs');
const path = require('path');
const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');

describe('Continuous assessment — scope-aware (Enterprise → Region → Entity → control)', () => {
  it('exposes the current cockpit scope with an enterprise fallback', () => {
    expect(ciso).toContain('function c5Scope(){');
    expect(ciso).toContain("if(typeof SCOPE!=='undefined'&&SCOPE)return SCOPE;");
    expect(ciso).toContain("return 'enterprise';");
  });

  it('derives a 0..1 scope maturity from that scope\'s own telemetry', () => {
    expect(ciso).toContain('function c5ScopeMaturity(){');
    expect(ciso).toContain('scopeSignalValues(c5Scope())');
    expect(ciso).toContain("if(/_pct$/.test(k)&&k!=='phishing_pct'&&sv[k]!=null)vals.push(sv[k]);");
    expect(ciso).toContain('return Math.max(0.2,Math.min(1,m/100));');
  });

  it('seeds every control assessment with the SCOPE so entities differ', () => {
    expect(ciso).toContain("var meta=ASSESS_METHOD[method];var hsh=c5hash(c5Scope()+'|'+id);");
  });

  it('biases coverage and verdict by scope maturity — mature entities score higher', () => {
    expect(ciso).toContain("var mat=c5ScopeMaturity();var matAdj=Math.round((mat-0.8)*40);");
    expect(ciso).toContain('var observed=Math.max(35,Math.min(100,100-(hsh%22)+matAdj));');
    expect(ciso).toContain("(hsh%10)<(matAdj<-8?3:1)?'partial':'met'");
  });

  it('drift alerts are scope-seeded too, so each entity has its own prior', () => {
    expect(ciso).toContain("function c5AssessmentPrior(a){var h=c5hash(c5Scope()+'|'+a.id+'|prior');");
  });
});
