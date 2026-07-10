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
  it('the Frameworks peer box previews as a sample until the cohort is live', () => {
    expect(SRC).toContain('Peer benchmark · sample preview');
    expect(SRC).toContain("c5peerLive()?'DTNKShield ›':'Sample ›'");
  });
});
