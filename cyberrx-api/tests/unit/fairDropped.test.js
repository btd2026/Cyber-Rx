'use strict';

/**
 * FAIR is dropped (Phase 2 of the CISO-feedback transformation) — source-scan guard.
 *
 * A single modeled loss dollar (ALE / tail / VaR) misled — the CISO's "$2B modeled vs
 * $20M actual". The modeled-loss SEED is removed; what remains is factual (revenue,
 * board appetite + disclosure-materiality threshold, the real insurance policy), and the
 * control story is told through COVERAGE + proven effectiveness, never a modeled dollar.
 */
const fs = require('fs');
const path = require('path');

const cockpit = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');
const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');

describe('FAIR dropped — the modeled-loss seed is gone', () => {
  it('demoLive economics no longer seeds ALE / tail / VaR', () => {
    expect(cockpit).not.toContain('ale:817e6');
    expect(cockpit).not.toContain('tail:1.6e9');
    expect(cockpit).not.toContain('var:1.6e9');
    expect(cockpit).not.toContain('ratios:{pct_of_revenue');
    expect(cockpit).toContain('FAIR loss modeling (ALE / tail / VaR) is intentionally DROPPED');
  });

  it('keeps the factual figures (revenue, appetite, insurance policy, materiality threshold)', () => {
    expect(cockpit).toContain('revenue:63e9');
    expect(cockpit).toContain('appetite:{appetite:500e6}');
    expect(cockpit).toContain('insurance:{limit:1.2e9, premium:25e6, retention:10e6}');
    expect(cockpit).toContain('materiality:{value:53e6}'); // board disclosure threshold, factual
  });

  it('controlsEffUsd returns 0 without an ALE (no fabricated modeled dollar)', () => {
    expect(cockpit).toContain('if(ale<=0)return 0;');
  });
});

describe('FAIR dropped — the control story is reframed to coverage', () => {
  it('the Controls tab ranks by coverage, not modeled exposure reduction', () => {
    expect(ciso).toContain("'Controls with live coverage'");
    expect(ciso).toContain('Your controls, ranked by coverage from your connected tools');
    expect(ciso).toContain('Ranked by measured control coverage');
    // the old modeled-dollar headlines are gone from the rendered controls tab
    expect(ciso).not.toContain("' of modeled exposure, ranked by value delivered'");
    expect(ciso).not.toContain("+'</b> modeled reduction · '");
  });

  it('decisions raise coverage rather than reduce modeled exposure', () => {
    expect(ciso).toContain('raises measured coverage');
    expect(ciso).toContain('Raises control coverage · improves ');
  });
});
