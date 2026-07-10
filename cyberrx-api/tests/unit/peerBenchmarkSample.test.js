/**
 * Guards for the peer benchmark being shown as a labelled SAMPLE until the live cohort
 * reaches the minimum client count (k-anonymity). Prospects see a preview of exactly what
 * they'll get; the live comparison unlocks at c5peerMin() clients.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');

function load(opts) {
  opts = opts || {};
  const sb = {};
  sb.window = sb; sb.self = sb; sb.module = { exports: {} };
  sb.localStorage = { getItem: () => null, setItem() {} };
  sb.location = { search: '' };
  sb.requestAnimationFrame = () => {}; sb.setTimeout = () => {};
  sb.PEER_MIN = 5;
  sb.PEER_DATA = opts.cohort || null;      // no live cohort by default
  sb.peerOptin = () => !!opts.optedIn;
  sb.signalsAreDemo = () => true;
  sb.document = { addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
  vm.createContext(sb);
  try { vm.runInContext(SRC, sb); } catch (e) { /* partial */ }
  return sb;
}

describe('peer benchmark — sample until the cohort is live', () => {
  const sb = load();
  it('c5peerLive() is false with no cohort; c5peerMin() defaults to 5', () => {
    expect(sb.c5peerLive()).toBe(false);
    expect(sb.c5peerMin()).toBe(5);
  });
  it('peer median is labelled "sample" and names the 5-client unlock', () => {
    const m = sb.c5get('peer_median');
    expect(m.label).toBe('sample');
    expect(m.displayValue).toMatch(/\(sample\)/);
    expect(m.note).toMatch(/Sample peer benchmark/);
    expect(m.note).toMatch(/5 clients/);
  });
  it('your position is labelled "sample" and previews the live unlock', () => {
    const p = sb.c5get('peer_position');
    expect(p.label).toBe('sample');
    expect(p.note).toMatch(/Sample preview|unlocks at 5 clients/);
  });
});

describe('a live cohort flips the benchmark from sample to computed', () => {
  it('with a sufficient opted-in cohort, peer median reads "computed" (not sample)', () => {
    const sb = load({ optedIn: true, cohort: { sufficient: true, overall: { p50: 3.4 }, overall_values: [3, 3.4, 3.8], n: 8 } });
    expect(sb.c5peerLive()).toBe(true);
    const m = sb.c5get('peer_median');
    expect(m.label).toBe('computed');
    expect(m.displayValue).not.toMatch(/\(sample\)/);
  });
});

describe('peer benchmark UI is clearly marked SAMPLE (source scan)', () => {
  const pStart = SRC.indexOf('function c5Peers()');
  const peers = SRC.slice(pStart, SRC.indexOf('\nfunction ', pStart + 10));
  it('renders a SAMPLE banner explaining the 5-client unlock when not live', () => {
    expect(peers).toContain('var live=c5peerLive(),pmin=c5peerMin()');
    expect(peers).toContain('Sample peer benchmark — a preview of what you');
    expect(peers).toMatch(/unlocks once <b>'\+pmin\+' clients<\/b>/);
    expect(peers).toContain('Sample benchmark — a preview of how you');
  });
  it('tags the median / position cards and footer as sample when not live', () => {
    expect(peers).toMatch(/var sampleTag=live\?'':/);
    expect(peers).toContain("'Peer median'+sampleTag");
    expect(peers).toContain('Sample figures — the live peer benchmark unlocks');
  });
  it('the Frameworks peer box previews as a sample until the cohort is live, named per framework', () => {
    expect(SRC).toContain("Peer benchmark · '+fwShort+' · ");
    expect(SRC).toContain("c5peerLive()?'view comparison':'sample preview'");
    expect(SRC).toContain("c5peerLive()?'DTNKShield ›':'Sample ›'");
  });
});

describe('the Frameworks peer box lives inside the top card, named per framework', () => {
  const cStart = SRC.indexOf('function c5FrameworksClassic(');
  const classic = SRC.slice(cStart, SRC.indexOf('\nfunction ', cStart + 10));
  it('is embedded beside the Reassess row (not a standalone row below the cards)', () => {
    expect(classic.indexOf('var peerBox=')).toBeGreaterThan(0);
    expect(classic.indexOf('var peerBox=')).toBeLessThan(classic.indexOf('var topCard='));
    expect(classic).toContain('flex:1;min-width:300px">\'+peerBox+\'</div>');
    expect(classic).toMatch(/reassessRow\+'<div style="flex:1;min-width:300px">'\+peerBox/);
    expect(classic).not.toMatch(/evBox\+\s*peerBox\+/);
  });
  it('the eyebrow names the selected framework via a short-label map', () => {
    expect(classic).toContain("var fwShort={csf:'NIST CSF 2.0',r53:'NIST 800-53',soc2:'SOC 2',hipaa:'HIPAA',cis:'CIS v8',iso:'ISO 27001'}[sel]");
    expect(classic).toContain("Peer benchmark · '+fwShort+' · ");
  });
});

describe('opening the peer box shows a framework-specific example benchmark', () => {
  it('opens the drill with the framework named in the title', () => {
    expect(SRC).toContain("openDrill('Community benchmark · '+fwName+' · how do we compare?'");
  });
  it('defines an illustrative sample cohort + a sample comparison renderer', () => {
    expect(SRC).toContain('function c5peerSampleData()');
    expect(SRC).toContain('function c5fwPeerSampleHTML(fwName)');
  });
  it('renders the sample immediately in the not-yet-live branch', () => {
    expect(SRC).toContain('body=c5fwPeerSampleHTML(fwName)+');
  });
  it('the sample is labelled SAMPLE, names the framework, and shows the client unlock', () => {
    const s = SRC.indexOf('function c5fwPeerSampleHTML(');
    const fn = SRC.slice(s, SRC.indexOf('\nfunction ', s + 10));
    expect(fn).toContain('Sample preview · ');
    expect(fn).toContain('vs sample cohort');
    expect(fn).toContain('unlocks once <b>');
    expect(fn).toContain("peerBar('Overall',over,S.overall)");
  });
  it('behaviorally renders a framework-named sample with Overall + 6 function bars', () => {
    function grab(name) { const a = SRC.indexOf('function ' + name + '('); return SRC.slice(a, SRC.indexOf('\nfunction ', a + 10)); }
    const code = grab('c5peerSampleData') + '\n' + grab('c5fwPeerSampleHTML');
    const sb = {
      window: { C5FW_OVERALL: 3.3, FW_SNAPSHOT: { overall: 3.3, functions: { Govern: 3.5, Identify: 3.4, Protect: 3.2, Detect: 2.6, Respond: 2.5, Recover: 2.4 } } },
      c5peerMin: () => 5,
      peerBar: (l) => '<BAR ' + l + '>',
      peerPercentileOf: (you, vals) => { const s = vals.filter((x) => !isNaN(x)).sort((a, b) => a - b); return Math.round((s.filter((v) => v <= you).length / s.length) * 100); },
      peerOrdinal: (n) => n + 'th',
      cmmiColor: () => 'good',
    };
    vm.createContext(sb);
    vm.runInContext(code, sb);
    const html = sb.c5fwPeerSampleHTML('CIS Controls v8');
    expect(html).toContain('CIS Controls v8');
    expect(html).toContain('>SAMPLE<');
    expect((html.match(/<BAR/g) || []).length).toBe(7);
  });
});
