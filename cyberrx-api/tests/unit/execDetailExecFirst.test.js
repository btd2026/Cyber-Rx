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
    'c5severity', 'c5sevColor', 'c5ownerOf', 'c5impactText', 'c5affected', 'c5whyNow', 'c5decisionRows', 'c5InspectObj']
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
