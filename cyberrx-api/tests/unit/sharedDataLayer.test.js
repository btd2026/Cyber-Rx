/**
 * Phase 0 — the shared data layer that keeps ~24 cockpit tabs from drifting.
 * Guards single-source constants and the shared accessors every seat reads:
 *  - identity fix ($382M derived, 90–180 days / owner one constant via c5IdFix)
 *  - the 5 critical systems (C5_SYSTEMS, one definition)
 *  - cross-cutting figures (customers, downtime/hr) via C5_XCUT — never retyped
 *  - c5RiskRegister(): inherent/residual/appetite/direction/confidence/owner/cadence
 *  - c5IdFixResolves(seat): the Decisions-tab convergence map, per seat's tabs
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
function grab(n) { const a = src.indexOf('function ' + n + '('); return src.slice(a, src.indexOf('\nfunction ', a + 10)); }

describe('shared constants are single-source (grep proof)', () => {
  const count = (s) => (src.split(s).length - 1);
  it('the identity-fix figures resolve to one constant', () => {
    expect(count('$382M')).toBe(0);          // cost is derived from the exposure model, never hard-coded
    expect(count('90–180 days')).toBe(1);    // only inside c5IdFix
    expect(count('var C5_SYSTEMS=[')).toBe(1); // the five services defined once
  });
  it('the cross-cutting figures resolve to one constant (C5_XCUT)', () => {
    expect(count('40M customers')).toBe(1);  // only inside C5_XCUT
    expect(count('~$12M/hr')).toBe(0);       // downtime/hr is derived via c5xDowntimeHr
    expect(count('~$240M')).toBe(0);         // billing exposure is derived (gap × hourly)
    expect(src).toContain('function c5xDowntimeHr()');
    expect(src).toContain('function c5xCustomers()');
    expect(count('c5xCustomers()')).toBeGreaterThanOrEqual(3); // call sites read the shared source
  });
});

describe('c5RiskRegister — the shared principal-risk register', () => {
  function load() {
    global.c5expModel = () => ({ total: 817e6 });
    global.controlsEffUsd = () => 210e6;
    global.trajInfo = () => ({ two: true, down: true });
    global.LIVE = { portfolio: { creditMarket: 210e6, operational: 140e6, thirdParty: 54e6, compliance: 30e6 }, economics: { appetite: { appetite: 120e6 } } };
    // eslint-disable-next-line no-eval
    return eval(grab('c5RiskRegister') + '\n;c5RiskRegister');
  }
  const reg = load()();
  it('ranks cyber against the other four principal risks (cyber #1 of 5 in the demo)', () => {
    expect(reg.rows).toHaveLength(5);
    expect(reg.cyberRank).toBe(1);
  });
  it('carries inherent / residual / appetite / direction / confidence / owner / cadence per row', () => {
    reg.rows.forEach((r) => {
      ['inherent', 'residual', 'direction', 'confidence', 'owner', 'cadence'].forEach((k) => expect(r[k]).not.toBeUndefined());
    });
  });
  it('cyber inherent = residual + the expected-loss controls remove (inherent > residual)', () => {
    const cyber = reg.rows.find((r) => r.cyber);
    expect(cyber.inherent).toBe(817e6 + 210e6);
    expect(cyber.inherent).toBeGreaterThan(cyber.residual);
    expect(cyber.direction).toBe('Falling');
  });
});

describe('c5IdFixResolves — the Decisions convergence map, per seat', () => {
  // eslint-disable-next-line no-eval
  const c5IdFixResolves = eval(grab('c5IdFixResolves') + '\n;c5IdFixResolves');
  it('returns a per-tab entry for each seat, in that seat\'s tab language', () => {
    ['coo', 'cio', 'cro', 'cfo', 'ceo', 'clo', 'board', 'ciso'].forEach((seat) => {
      const r = c5IdFixResolves(seat);
      expect(Array.isArray(r)).toBe(true);
      expect(r.length).toBeGreaterThanOrEqual(3);
      r.forEach((x) => { expect(x.tab).toBeTruthy(); expect(x.note).toBeTruthy(); });
    });
  });
  it('CEO/CLO/Board use the restructured proposed tab names', () => {
    expect(c5IdFixResolves('board').map((x) => x.tab)).toEqual(['Oversight', 'Regulatory & disclosure', 'Assurance']);
    expect(c5IdFixResolves('ceo').map((x) => x.tab)).toEqual(['Value at risk', 'Crown jewels', 'Trust & disclosure']);
    expect(c5IdFixResolves('clo').map((x) => x.tab)).toEqual(['Regulatory exposure', 'Contracts & liability', 'Incident & disclosure']);
  });
});
