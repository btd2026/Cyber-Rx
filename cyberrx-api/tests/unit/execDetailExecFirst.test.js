/**
 * Guards for the executive-first detail drawer (ciso5.js · c5InspectObj). The moment a
 * number alarms a leader they ask: what does this mean, who's affected, how urgent, who
 * owns it, by when, is a decision needed, what's the next action. The default view must
 * answer those FIRST — header facts (severity/owner/ETA/evidence confidence), business
 * impact, executive summary, an explicit decision section, then the recommended action —
 * with all technical evidence/formulas/rankings collapsed.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
function grab(n) { const a = src.indexOf('function ' + n + '('); return src.slice(a, src.indexOf('\nfunction ', a + 10)); }

function render(m, opts) {
  opts = opts || {};
  global.c5esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  global.c5icon = () => '<svg></svg>'; global.c5whyIcon = () => 'x'; global.c5ago = () => '2m';
  global.c5sqClass = () => 'g'; global.cap = (s) => s; global.signalsAreDemo = () => !!opts.demo;
  global.C5_WHY = {}; global.c5whyPre = (id) => id; global.c5why = (mm) => (mm && mm.why) || 'It bears on the program.';
  global.c5debugOn = () => !!opts.debug;
  let out = null; global.openDrill = (t, html) => { out = html; };
  const np = src.slice(src.indexOf('var C5_NOTPROVE='), src.indexOf('function c5notProve('));
  const bundle = ['c5srcLabelText', 'c5statusText', 'c5notProve', 'c5evConfObj', 'c5foundText', 'c5whyRanked',
    'c5riskCard', 'c5rankTable', 'c5basisText', 'c5srcRow', 'c5acc', 'c5keyEvidence', 'c5keyEvHtml',
    'c5severity', 'c5sevColor', 'c5ownerSeat', 'c5ownerOf', 'c5etaOf', 'c5impactText', 'c5affected', 'c5whyNow', 'c5decisionRows', 'c5InspectObj']
    .map(grab).join('\n');
  // eslint-disable-next-line no-eval
  eval(np + '\n' + bundle + '\n;c5InspectObj(' + JSON.stringify(m) + ');');
  ['c5esc', 'c5icon', 'c5whyIcon', 'c5ago', 'c5sqClass', 'cap', 'signalsAreDemo', 'C5_WHY', 'c5whyPre', 'c5why', 'c5debugOn', 'openDrill', 'C5_NOTPROVE'].forEach((k) => { delete global[k]; });
  return out;
}

const CRIT = {
  id: 'er_capability', connected: true, name: 'Business capability most exposed', displayValue: 'FinServ · $3.4B', color: 'crit',
  found: 'Nerion found FinServ most exposed.',
  ranking: [{ itemName: 'FinServ', modeledExposure: '$3.4B', openControlGaps: 0, openRiskScenarios: 0, mainDriver: 'Business criticality' }],
  action: 'Validate exposure basis.', expected: 'Confirmed basis.', formula: 'x*y',
  sources: [{ tool: 'Cap map', status: 'Connected' }],
};

describe('the default view leads with the executive facts', () => {
  const H = render(CRIT);
  it('header carries severity, owner, ETA/due and evidence confidence', () => {
    expect(H).toContain('Severity');
    expect(H).toContain('Owner');
    expect(H).toContain('ETA / due');
    expect(H).toContain('Evidence confidence');
  });
  it('owner is inferred as a ROLE from the domain (never a client name)', () => {
    expect(H).toMatch(/Owner<\/div><div[^>]*>CISO/); // er_ → CISO
  });
  it('shows business impact and an executive summary (means / affected / why now)', () => {
    expect(H).toContain('Business impact:');
    expect(H).toContain('What this means');
    expect(H).toContain('Who / what is affected');
    expect(H).toContain('Why it matters now');
  });
  it('a leader can scan it — no table or raw formula in the default view', () => {
    const firstDetails = H.indexOf('<details');
    expect(H.indexOf('<table')).toBeGreaterThan(firstDetails); // table only inside an accordion
    expect(H).not.toContain('x*y'); // formula gated to debug
  });
});

describe('the decision section is always explicit', () => {
  it('critical → "Decision needed now"', () => {
    expect(render(CRIT)).toContain('Decision needed now');
  });
  it('warning + threshold → shows the exact threshold clearly', () => {
    const H = render({ id: 'coo_recovery', connected: true, name: 'Recovery readiness', displayValue: '2 SPOFs', color: 'warn', found: '2 SPOFs.', decisionThreshold: 'If recovery exceeds 3 hours, approve customer communication.', action: 'Test recovery.' });
    expect(H).toContain('Decision needed if this worsens');
    expect(H).toContain('If recovery exceeds 3 hours, approve customer communication.');
    expect(H).toMatch(/Owner<\/div><div[^>]*>COO/); // coo_ → COO
  });
  it('healthy → explicit "No executive decision needed now"', () => {
    const H = render({ id: 'ceo_trust', connected: true, name: 'Customer trust', displayValue: 'Strong', color: 'good', found: 'Trust strong.' });
    expect(H).toContain('No executive decision needed now');
  });
});

describe('missing evidence never reads as a confident conclusion', () => {
  const H = render({ id: 'ais_x', connected: false, name: 'AI systems', displayValue: '—', color: 'muted', connectTool: 'a model registry' });
  it('severity + evidence confidence read Not enough evidence', () => {
    expect(H).toMatch(/Severity<\/div><div[^>]*>Not enough evidence/);
    expect(H).toContain('Not Enough Evidence');
  });
  it('the action asks to connect, not a verdict', () => {
    expect(H).toContain('Not enough evidence to conclude');
    expect(H).toContain('a model registry');
  });
});

describe('derivation helpers exist and are override-friendly (source scan)', () => {
  it('severity / owner / impact / affected / whyNow / decision helpers are defined', () => {
    ['c5severity', 'c5ownerOf', 'c5impactText', 'c5affected', 'c5whyNow', 'c5decisionRows'].forEach((fnname) => {
      expect(src).toContain('function ' + fnname + '(');
    });
  });
  it('every field is overridable per metric (m.severity / m.owner / m.impact / m.affected / m.whyNow / m.decision*)', () => {
    expect(src).toContain('if(m&&m.severity)return m.severity;');
    expect(src).toContain('if(m&&m.owner)return m.owner;');
    expect(src).toContain('if(m&&m.impact)return m.impact;');
    expect(src).toContain('if(m&&m.affected)return m.affected;');
    expect(src).toContain('if(m&&m.whyNow)return m.whyNow;');
    expect(src).toContain("rows.push(['Decision needed now',m.decision,'crit']);");
    expect(src).toContain("rows.push(['Decision needed if this worsens',m.decisionThreshold,'warn']);");
  });
});

describe('authored risk narrative (vendors) is accurate and data-driven', () => {
  function runVendors(v, sbom) {
    const start = src.indexOf("case 'er_thirdparty':");
    const end = src.indexOf("case 'exp_total':", start);
    const body = src.slice(start + "case 'er_thirdparty':".length, end).trim().replace(/^\{/, '').replace(/\}$/, '');
    global.c5esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    global.c5ago = () => '2m'; global.usd = (n) => '$' + n; global.capColor = () => 'warn';
    global.vendorUrl = () => null; global.vendorDomain = () => '';
    global.c5obj = (o) => { o.inputs = o.inputs || []; o.sources = o.sources || []; return o; };
    global.LIVE = { sbom: sbom || [] };
    global.c5vendors = () => v;
    // eslint-disable-next-line no-new-func
    const m = new Function('id', 'var conn,Vtp;' + body)('er_thirdparty');
    ['c5esc', 'c5ago', 'usd', 'capColor', 'vendorUrl', 'vendorDomain', 'c5obj', 'LIVE', 'c5vendors'].forEach((k) => { delete global[k]; });
    return m;
  }
  it('business impact = what could go wrong (names the weakest vendor, from data)', () => {
    const m = runVendors({ seed: [1], worst: { name: 'Acme Cloud', score: 41 }, atRisk: [{}, {}], vs: { vendor: 'SecurityScorecard' }, p: { vendors: [{ name: 'Acme Cloud', score: 41 }] } }, [{ critical_vulns: 2 }]);
    expect(m.impact).toMatch(/attacker inherits a path into the services it supports/);
    expect(m.impact).toContain('Acme Cloud'); // dynamic — not hard-coded
    expect(m.impact).toContain('41/100');
  });
  it('what-this-means = consequences · who-affected = services/systems · why-now = residual risk', () => {
    const m = runVendors({ seed: [1], worst: { name: 'Acme Cloud', score: 41 }, atRisk: [{}, {}, {}], vs: null, p: { vendors: [{ name: 'Acme Cloud', score: 41 }] } });
    expect(m.found).toMatch(/could disrupt the business service it supports, or be used to reach your data/);
    expect(m.affected).toMatch(/business services your flagged suppliers support/);
    expect(m.whyNow).toMatch(/residual risk keeps rising/);
    expect(m.whyNow).toContain('Acme Cloud');
  });
  it('the generic why-now fallback is risk-framed (residual risk), not a bland status', () => {
    const w = src.indexOf('function c5whyNow(');
    const fn = src.slice(w, src.indexOf('\nfunction ', w + 10));
    expect(fn).toMatch(/residual risk stays elevated/);
    expect(fn).toMatch(/residual risk keeps rising toward the critical range/);
  });
});

describe('Owner and ETA/Due come from real sources, honestly', () => {
  function bundle() {
    global.c5esc = (s) => String(s == null ? '' : s);
    global.SEAT_NAMES = { ciso: 'Jane Doe', cfo: '' };
    global.c5SeatNameOf = (seat) => global.SEAT_NAMES[seat] || '';
    // eslint-disable-next-line no-eval
    const api = eval(grab('c5ownerSeat') + '\n' + grab('c5ownerOf') + '\n' + grab('c5etaOf')
      + '\n;({seat:c5ownerSeat,owner:c5ownerOf,eta:c5etaOf})');
    return api;
  }
  it('owner = the named leader of the accountable seat (from onboarding), else the role', () => {
    const A = bundle();
    expect(A.owner({ id: 'er_thirdparty' })).toBe('Jane Doe · CISO'); // ciso seat has a name
    expect(A.owner({ id: 'cf_roi' })).toBe('CFO'); // cfo has no name → role
    expect(A.owner({ id: 'x', owner: 'Named Owner' })).toBe('Named Owner'); // explicit override
    delete global.c5esc; delete global.SEAT_NAMES; delete global.c5SeatNameOf;
  });
  it('owner falls back to the seat currently being viewed, not a fabricated name', () => {
    global.c5esc = (s) => String(s == null ? '' : s); global.c5SeatNameOf = () => ''; global.CUR = 'coo';
    // eslint-disable-next-line no-eval
    const A = eval(grab('c5ownerSeat') + '\n' + grab('c5ownerOf') + '\n;({owner:c5ownerOf})');
    expect(A.owner({ id: 'weird_metric' })).toBe('COO'); // CUR seat
    delete global.c5esc; delete global.c5SeatNameOf; delete global.CUR;
  });
  it('ETA/due comes from a real date (explicit or a gap due), else null → "Not scheduled"', () => {
    global.c5esc = (s) => String(s == null ? '' : s);
    // eslint-disable-next-line no-eval
    const eta = eval(grab('c5etaOf') + '\n;c5etaOf');
    expect(eta({ due: '30 days' })).toBe('30 days');
    expect(eta({ gaps: [{}, { due: 'Q3' }] })).toBe('Q3');
    expect(eta({})).toBeNull(); // no fabricated deadline
    delete global.c5esc;
  });
  it('the header renders "Not scheduled" (not a bare —) when there is no due date', () => {
    const H = render(CRIT); // no m.due, no gaps
    expect(H).toContain('Not scheduled');
    expect(H).toContain('The remediation / decision due date'); // source explained in the chip tooltip
  });
});
