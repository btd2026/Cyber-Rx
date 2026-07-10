/**
 * CEO seat restructured to the proposed set: 01 Value at risk / 02 Crown jewels /
 * 03 Trust & disclosure / 04 Decisions. Guards the seat body (hosts), the tab labels,
 * the two new tabs to the contract, the SEC disclosure lens on Trust, and the Decisions
 * convergence strip + Decision 2 (approve the board/disclosure narrative).
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const seats = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit-seats.js'), 'utf8');
const html = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');
function fnOf(n) { const a = src.indexOf('function ' + n + '('); return src.slice(a, src.indexOf('\nfunction ', a + 20)); }

describe('CEO seat — restructured tab set + wiring', () => {
  it('the seat body uses the new hosts (value / crown / trust), not the old strategic host', () => {
    expect(seats).toContain('id="ce-value"');
    expect(seats).toContain('id="ce-crown"');
    expect(seats).toContain('id="ce-trust"');
    expect(seats).not.toContain('id="ce-strategic"');
  });
  it('the tabs read Value at risk / Crown jewels / Trust & disclosure', () => {
    expect(html).toContain("'What is our cyber value at risk?':'Value at risk'");
    expect(html).toContain("'Which crown jewels are exposed?':'Crown jewels'");
    expect(html).toContain("'Are we protecting trust — and ready to disclose?':'Trust & disclosure'");
  });
  it('the new renderers exist and are in the render pipeline', () => {
    expect(src).toContain('function c5ceValue()');
    expect(src).toContain('function c5ceCrown()');
    expect(html).toContain('c5ceValue();c5ceCrown();');
  });
});

describe('CEO 01 Value at risk — contract', () => {
  const v = fnOf('c5ceValue');
  it('frames cyber value against enterprise value + a strategic-objectives matrix', () => {
    expect(v).toContain('Strategic objectives — cyber value at risk');
    expect(v).toContain('O=c5Objectives()');
  });
  it('has the identity convergence strip, a shared-config decision, and a source footnote', () => {
    expect(v).toContain('IDF=c5IdFix()');
    expect(v).toContain('Approve the identity fix — protects value');
    expect(v).toContain("+connN+' sources connected");
  });
});

describe('CEO 02 Crown jewels — contract', () => {
  const c = fnOf('c5ceCrown');
  it('shows the revenue-engine matrix + concentration = actionability, on the shared config', () => {
    expect(c).toContain('Crown-jewel revenue engines');
    expect(c).toContain('Concentration:');
    expect(c).toContain('IDF=c5IdFix()');
  });
});

describe('CEO 03 Trust & disclosure — regulatory lens', () => {
  const t = fnOf('c5ceTrust');
  it('adds SEC material-incident (4-business-day) disclosure readiness', () => {
    expect(t).toContain('Disclosure readiness:');
    expect(t).toContain('SEC material-incident 8-K clock: 4 business days');
  });
});

describe('CEO 04 Decisions — contract', () => {
  const d = fnOf('c5ceDecisions');
  it('opens with the convergence strip', () => {
    expect(d).toContain("c5convergeStrip('ceo')");
  });
  it('Decision 2 is approving the board / disclosure narrative', () => {
    expect(d).toContain('Approve the board & disclosure narrative for cyber posture?');
  });
  it('keeps the audit-trail promise (no AI/LLM at run-time)', () => {
    expect(d).toContain('no AI/LLM at run-time');
  });
});
