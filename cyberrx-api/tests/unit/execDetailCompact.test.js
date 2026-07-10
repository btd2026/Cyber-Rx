/**
 * Guards for the compact executive detail drawer (ciso5.js · c5InspectObj). The default
 * view answers only five things — result, why ranked here, what Nerion found, what it
 * does not prove, recommended action — plus a 3–5 point key-evidence summary. Everything
 * deeper (ranking table, open risks/gaps, sources & freshness, calculation basis) is
 * collapsed into <details class="c5acc"> accordions, and raw formulas stay behind debug.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
function grab(n) { const a = src.indexOf('function ' + n + '('); return src.slice(a, src.indexOf('\nfunction ', a + 10)); }

// Render a metric through c5InspectObj and capture the HTML handed to openDrill.
function renderDrawer(m, opts) {
  opts = opts || {};
  global.c5esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  global.c5icon = () => '<svg></svg>'; global.c5whyIcon = () => 'x'; global.c5ago = () => '2m ago';
  global.c5sqClass = () => 'g'; global.cap = (s) => s; global.signalsAreDemo = () => !!opts.demo;
  global.C5_WHY = {}; global.c5whyPre = (id) => id; global.c5why = (mm) => (mm && mm.why) || 'This measures the thing.';
  global.c5debugOn = () => !!opts.debug;
  let captured = null; global.openDrill = (t, html) => { captured = html; };
  const np = src.slice(src.indexOf('var C5_NOTPROVE='), src.indexOf('function c5notProve('));
  const code = ['c5srcLabelText', 'c5statusText', 'c5notProve', 'c5evConfObj', 'c5foundText', 'c5whyRanked',
    'c5riskCard', 'c5rankTable', 'c5basisText', 'c5srcRow', 'c5acc', 'c5keyEvidence', 'c5keyEvHtml', 'c5InspectObj']
    .map(grab).join('\n');
  // eslint-disable-next-line no-eval
  eval(np + '\n' + code + '\n;c5InspectObj(' + JSON.stringify(m) + ');');
  ['c5esc', 'c5icon', 'c5whyIcon', 'c5ago', 'c5sqClass', 'cap', 'signalsAreDemo', 'C5_WHY', 'c5whyPre', 'c5why', 'c5debugOn', 'openDrill', 'C5_NOTPROVE'].forEach((k) => { delete global[k]; });
  return captured;
}

const RANKED = {
  connected: true, name: 'Business capability most exposed', displayValue: 'Financial Services · $3.4B', label: 'computed', color: 'warn',
  found: 'Nerion found Financial Services carries the highest modeled exposure at $3.4B. It has 0 open control gaps and 0 open risk scenarios. Hybrid Cloud carries the largest actionable open set.',
  ranking: [
    { itemName: 'Financial Services', modeledExposure: '$3.4B', openControlGaps: 0, openRiskScenarios: 0, mainDriver: 'Business criticality / modeled value', risks: [] },
    { itemName: 'Hybrid Cloud', modeledExposure: '$900M', openControlGaps: 2, openRiskScenarios: 8, mainDriver: 'Open control gaps + open risks', risks: [{ name: 'Public bucket', severity: 'High' }] },
  ],
  action: 'Validate Financial Services’ exposure basis.', formula: 'exposure=(gaps+risk)*weight',
  sources: [{ tool: 'Business Capability Map', status: 'Connected', role: 'inventory' }, { tool: 'Risk register', status: 'Not connected', role: 'open risks', missing: 'per-capability risks' }],
};

describe('compact default view shows only the five answers + key evidence + action', () => {
  const H = renderDrawer(RANKED);
  it('shows evidence confidence, why ranked, what found, what not proved', () => {
    expect(H).toContain('Evidence confidence:');
    expect(H).toContain('Why ranked here');
    expect(H).toContain('What Nerion found');
    expect(H).toContain('What Nerion does not prove');
  });
  it('shows a compact key-evidence summary and the recommended action', () => {
    expect(H).toContain('Key evidence');
    expect(H).toMatch(/Modeled exposure[\s\S]*\$3\.4B/);
    expect(H).toContain('Open control gaps');
    expect(H).toContain('Open risk scenarios');
    expect(H).toContain('Recommended action');
  });
  it('explains high exposure with 0 gaps / 0 risks (contradiction-safe)', () => {
    expect(H).toMatch(/highest modeled business-value exposure/);
  });
});

describe('deeper evidence is collapsed by default (accordions)', () => {
  const H = renderDrawer(RANKED);
  const firstDetails = H.indexOf('<details');
  const firstTable = H.indexOf('<table');
  it('the full ranking table is NOT in the default view (no table before the first accordion)', () => {
    expect(firstDetails).toBeGreaterThan(0);
    expect(firstTable).toBeGreaterThan(firstDetails); // table only appears inside/after a <details>
  });
  it('ranking, sources and calculation basis are each in a collapsed accordion', () => {
    expect(H).toContain('class="c5acc"');
    expect(H).toContain('View ranking details');
    expect(H).toContain('View sources and freshness');
    expect(H).toContain('View calculation basis');
  });
  it('the open-risks/gaps accordion appears when the metric supplies gaps', () => {
    const G = renderDrawer(Object.assign({}, RANKED, { gaps: [{ title: 'Untested DR', meaning: 'not exercised', close: 'run a test' }] }));
    expect(G).toContain('View open risks and gaps');
    expect(G).toContain('Untested DR');
    // and it's collapsed — the gap text sits inside a <details>, after the first accordion opens
    expect(G.indexOf('Untested DR')).toBeGreaterThan(G.indexOf('<details'));
  });
  it('accordions are closed by default (no open attribute)', () => {
    expect(H).not.toMatch(/<details class="c5acc" open/);
    expect(H).not.toMatch(/<details class="c5acc"[^>]*\bopen\b/);
  });
  it('the ranking table lands inside the "View ranking details" accordion', () => {
    const acc = H.indexOf('View ranking details');
    const nextAcc = H.indexOf('View sources and freshness'); // next present accordion (no m.gaps here)
    expect(firstTable).toBeGreaterThan(acc);
    expect(firstTable).toBeLessThan(nextAcc); // table sits inside the ranking accordion, before the next one
  });
});

describe('raw formula stays hidden unless debug', () => {
  it('is absent from the normal executive view', () => {
    expect(renderDrawer(RANKED)).not.toContain('exposure=(gaps+risk)*weight');
  });
  it('appears (inside the calculation-basis accordion) only in debug mode', () => {
    const H = renderDrawer(RANKED, { debug: true });
    expect(H).toContain('exposure=(gaps+risk)*weight');
    expect(H).toContain('Formula (admin/debug)');
  });
});

describe('missing evidence → not-enough-evidence language, no fabricated numbers', () => {
  const H = renderDrawer({ connected: false, name: 'Business capability most exposed', displayValue: '—', label: 'computed', color: 'muted', connectTool: 'a Business Capability Map + GRC' });
  it('result shows Not connected and evidence confidence is Not Enough Evidence', () => {
    expect(H).toContain('Not connected');
    expect(H).toContain('Not Enough Evidence');
  });
  it('the action asks to connect the missing source', () => {
    expect(H).toContain('Not enough evidence to conclude');
    expect(H).toContain('a Business Capability Map + GRC');
  });
});

describe('drawer wiring intact (source scan)', () => {
  const a = src.indexOf('function c5InspectObj(');
  const fn = src.slice(a, src.indexOf('\nfunction ', a + 10));
  it('uses c5acc accordions for ranking, sources and calculation basis', () => {
    expect(fn).toContain("c5acc(m.ranking&&m.ranking.length?'View ranking details':'View supporting evidence'");
    expect(fn).toContain("c5acc('View open risks and gaps'");
    expect(fn).toContain("c5acc('View sources and freshness'");
    expect(fn).toContain("c5acc('View calculation basis'");
  });
  it('renders the compact key-evidence summary (not a default table)', () => {
    expect(fn).toContain('c5keyEvHtml(m)');
    expect(src).toContain('function c5keyEvidence(m)');
  });
  it('still opens via openDrill (drill-down preserved)', () => {
    expect(fn).toContain('openDrill(m.name,h)');
  });
});
