/**
 * Behavioral tests for the standardized executive detail drawer (CyberRXNew/public/
 * ciso5.js — c5InspectObj + helpers). The whole browser file is loaded in a vm sandbox;
 * c5InspectObj renders into a stubbed openDrill so we can assert the produced HTML.
 *
 * Locks the COMPACT default structure and evidence-transparency rules:
 *  Default view = Result + evidence confidence · Why ranked / What found / What not proved ·
 *  Key evidence · Recommended action. Deeper evidence (ranking table, open risks/gaps,
 *  Sources & freshness, calculation basis) is collapsed into <details class="c5acc">
 *  accordions. Raw formulas are hidden from normal users and shown only in admin/debug
 *  mode. All text is data-driven.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');

function render(m, opts) {
  opts = opts || {};
  const sandbox = {};
  sandbox.signalsAreDemo = () => !!opts.demo;
  let captured = '';
  sandbox.openDrill = (t, h) => { captured = h; };
  sandbox.document = { addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
  sandbox.window = sandbox; sandbox.self = sandbox;
  sandbox.module = { exports: {} };
  sandbox.localStorage = { getItem: (k) => (opts.debug && k === 'cyberrx_debug' ? '1' : null), setItem() {} };
  sandbox.location = { search: '' };
  sandbox.requestAnimationFrame = () => {}; sandbox.setTimeout = () => {};
  vm.createContext(sandbox);
  try { vm.runInContext(SRC, sandbox); } catch (e) { /* partial load ok */ }
  sandbox.c5InspectObj(m);
  return captured;
}

const AIML = {
  id: 'ais_aiml', name: 'AI/ML systems', label: 'self-reported', connected: true,
  displayValue: '7 AI/ML systems · 1 posture gap', color: 'warn',
  action: 'Approve and publish the AI Acceptable Use Policy.', owner: 'Security / AI Governance', due: '30 days', expected: 'Closes 1 AI governance posture gap.',
  sources: [
    { tool: 'AI asset inventory / model registry', lastRefresh: '7/9/2026 8:44 PM', role: 'System inventory', status: 'Connected' },
    { tool: 'AI-SPM', status: 'Not connected', role: 'Posture validation', missing: 'Live posture telemetry' }
  ],
  formula: 'ai_risk per system = posture_gaps * data_sensitivity * model_access'
};

describe('detail drawer — standardized sections', () => {
  const H = render(AIML);
  it('shows the Result with a source label', () => {
    expect(H).toContain('>Result<');
    expect(H).toContain('7 AI/ML systems · 1 posture gap');
    expect(H).toContain('Self-reported');
  });
  it('shows Evidence confidence as a header chip with the level', () => {
    expect(H).toMatch(/Evidence confidence<\/div><div[^>]*>(High|Medium|Low|Not Enough Evidence|Demo)/);
  });
  it('shows the finding under "What this means", data-driven', () => {
    expect(H).toContain('What this means');
    expect(H).toContain('Nerion found 7 AI/ML systems · 1 posture gap');
  });
  it('keeps "what this does not prove" (collapsed in calculation basis)', () => {
    expect(H).toContain('What this does not prove');
    expect(H).toContain('AI-SPM'); // the ais_ not-prove statement
    expect(H.indexOf('AI-SPM')).toBeGreaterThan(H.indexOf('<details')); // inside an accordion
  });
  it('shows Recommended action with owner / due / expected result', () => {
    expect(H).toContain('Recommended action');
    expect(H).toContain('Approve and publish the AI Acceptable Use Policy.');
    expect(H).toContain('Owner: Security / AI Governance');
    expect(H).toContain('Due: 30 days');
    expect(H).toContain('Expected result: Closes 1 AI governance posture gap.');
  });
  it('collapses Sources into an accordion (status/last-refresh/role/missing preserved)', () => {
    expect(H).toContain('View sources');
    expect(H).toContain('as of 7/9/2026 8:44 PM');
    expect(H).toContain('role: Posture validation');
    expect(H).toContain('missing: Live posture telemetry');
    expect(H).toContain('Not connected');
    // sources are not in the default view — they sit inside a <details>
    expect(H.indexOf('as of 7/9/2026 8:44 PM')).toBeGreaterThan(H.indexOf('<details'));
  });
  it('collapses the plain-English calculation basis into an accordion', () => {
    expect(H).toContain('View calculation basis');
  });
});

describe('detail drawer — Open gaps section', () => {
  it('renders gaps with title / meaning / how-to-close / owner / due when supplied', () => {
    const H = render(Object.assign({}, AIML, { gaps: [{ title: 'AI Acceptable Use Policy not in force', meaning: 'No approved policy governs AI use.', close: 'Approve and publish the AI Acceptable Use Policy.', owner: 'AI Governance', due: '30 days' }] }));
    expect(H).toContain('View open risks and gaps'); // collapsed accordion
    expect(H).toContain('AI Acceptable Use Policy not in force');
    expect(H).toContain('How to close: Approve and publish the AI Acceptable Use Policy.');
    expect(H).toContain('Owner: AI Governance');
  });
  it('hides the open-risks/gaps accordion when there are no gaps', () => {
    const H = render(AIML);
    expect(H).not.toContain('View open risks and gaps');
  });
});

describe('detail drawer — raw formulas are hidden from normal users', () => {
  it('does not show the raw formula by default', () => {
    const H = render(AIML);
    expect(H).not.toContain('posture_gaps * data_sensitivity');
    expect(H).not.toContain('Formula (admin/debug)');
  });
  it('shows the raw formula only in admin/debug mode', () => {
    const H = render(AIML, { debug: true });
    expect(H).toContain('Formula (admin/debug)');
    expect(H).toContain('posture_gaps * data_sensitivity');
  });
});

describe('detail drawer — missing evidence & labelling', () => {
  it('a not-connected metric shows Not Enough Evidence + connect-to-validate, not a verdict', () => {
    const H = render({ id: 'ais_aiml', name: 'AI/ML systems', label: 'self-reported', connected: false, displayValue: '—', color: 'muted', connectTool: 'your AI model registry' });
    expect(H).toContain('Not Enough Evidence');
    expect(H).toContain('connect');
    expect(H).toContain('Not connected');
    expect(H).not.toMatch(/Nerion found \d/);
  });
  it('demo data is labelled Demo', () => {
    const H = render(AIML, { demo: true });
    expect(H).toMatch(/Evidence confidence<\/div><div[^>]*>Demo/);
  });
  it('self-reported evidence cannot read High confidence', () => {
    const H = render(AIML);
    expect(H).not.toMatch(/Evidence confidence<\/div><div[^>]*>High/);
  });
});

describe('detail drawer — data-driven, not hard-coded', () => {
  it('the finding and action change when the metric changes (top gap changes)', () => {
    const a = render(Object.assign({}, AIML, { displayValue: '3 vendors · 1 SPOF', action: 'Validate vendor recovery evidence.', name: 'Vendor recovery' }));
    const b = render(Object.assign({}, AIML, { displayValue: '5 systems · 2 gaps', action: 'Close identity recovery gap.', name: 'Identity recovery' }));
    expect(a).toContain('Nerion found 3 vendors · 1 SPOF');
    expect(a).toContain('Validate vendor recovery evidence.');
    expect(b).toContain('Nerion found 5 systems · 2 gaps');
    expect(b).toContain('Close identity recovery gap.');
    expect(a).not.toEqual(b);
  });
});

describe('detail drawer — source labels are one of the allowed values', () => {
  const ALLOWED = ['Live', 'Computed', 'Modeled', 'Manual', 'Self-reported', 'Demo', 'Mock', 'Not Connected'];
  ['live', 'computed', 'modeled', 'self-reported', 'manual'].forEach((lbl) => {
    it('label "' + lbl + '" maps to an allowed source label', () => {
      const H = render(Object.assign({}, AIML, { label: lbl }));
      const m = H.match(/text-transform:uppercase;letter-spacing:.05em">([^<]+)<\/div>/);
      expect(m).not.toBeNull();
      expect(ALLOWED).toContain(m[1]);
    });
  });
});

describe('detail drawer — card click wiring still works (source scan)', () => {
  it('the global data-c5m click handler still routes to c5Inspect → c5InspectObj', () => {
    expect(SRC).toMatch(/document\.addEventListener\('click',function\(e\)\{[^]*?data-c5m[^]*?c5Inspect\(/);
    expect(SRC).toContain('function c5Inspect(id){var m=c5get(id);if(!m)return;c5InspectObj(m);}');
  });
});
