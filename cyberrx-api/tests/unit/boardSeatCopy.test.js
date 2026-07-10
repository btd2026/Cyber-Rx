/**
 * Board seat restructured to the proposed set: 01 Oversight / 02 Regulatory & disclosure /
 * 03 Assurance (independent validation) / 04 Decisions (Managed-risk/Trend tabs folded away).
 * Guards the seat body + tab labels, the shared principal-risk register on Oversight, the
 * named disclosure regimes, the independent-assurance provenance lens, and the Decisions
 * convergence strip + Decision 2 (commission independent assurance over cyber reporting).
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const seats = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit-seats.js'), 'utf8');
const html = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');
function fnOf(n) { const a = src.indexOf('function ' + n + '('); return src.slice(a, src.indexOf('\nfunction ', a + 20)); }

describe('Board seat — restructured tab set', () => {
  it('the seat body is Oversight / Regulatory & disclosure / Assurance (no Managed-risk or Trend tab)', () => {
    expect(seats).toContain('Is our cyber oversight sound?');
    expect(seats).toContain('What must we disclose — and are we ready?');
    expect(seats).toContain('Is our cyber reporting independently validated?');
    expect(seats).not.toContain('Is cyber a managed risk this quarter?');
    expect(seats).not.toContain('id="bd-trend"');
  });
  it('the tabs read Oversight / Regulatory & disclosure / Assurance', () => {
    expect(html).toContain("'Is our cyber oversight sound?':'Oversight'");
    expect(html).toContain("'What must we disclose — and are we ready?':'Regulatory & disclosure'");
    expect(html).toContain("'Is our cyber reporting independently validated?':'Assurance'");
  });
});

describe('Board 01 Oversight — principal-risk register', () => {
  const h = fnOf('c5bdHealth');
  it('reads the shared register with inherent → residual, appetite, direction, owner, cadence', () => {
    expect(h).toContain('c5RiskRegister()');
    expect(h).toContain('inherent ');
    expect(h).toContain('residual ');
    expect(h).toContain('reviewed ');
    expect(h).toContain('c5convergeStrip(\'board\')');
  });
  it('the headline is derived from the register (rank + appetite), not hardcoded', () => {
    expect(h).toContain('RR.cyberRank');
    expect(h).toContain('RR.cyberResidual>RR.appetite');
  });
});

describe('Board 02 Regulatory & disclosure — named regimes', () => {
  const m = fnOf('c5bdMaterial');
  it('names the real disclosure regimes and counts them in scope', () => {
    expect(m).toContain('SEC · GDPR/CCPA · DORA · EU AI Act · EU CRA');
    expect(m).toContain('regimes in scope');
    expect(m).toContain('4 business days');
  });
  it('threads the identity fix as the most likely disclosure trigger', () => {
    expect(m).toContain('IDF=c5IdFix()');
  });
});

describe('Board 03 Assurance — independent validation lens', () => {
  const g = fnOf('c5bdGovernance');
  it('shows tool-evidenced vs management-reported vs independently-assured provenance', () => {
    expect(g).toContain('c5Assurance()');
    expect(g).toContain('Tool-evidenced');
    expect(g).toContain('Management-reported');
    expect(g).toContain('Independently assured');
    expect(g).toContain('None yet');
  });
});

describe('Board 04 Decisions — contract', () => {
  const d = fnOf('c5bdDecisions');
  it('opens with the convergence strip and keeps the audit-trail promise', () => {
    expect(d).toContain("c5convergeStrip('board')");
    expect(d).toContain('no AI/LLM at run-time');
  });
  it('Decision 1 is the identity fix with its honest interim-exposure downside', () => {
    expect(d).toContain("management’s '+IDF.short+' action?");
    expect(d).toContain("Interim exposure persists across the '+IDF.timeline");
  });
  it('Decision 2 commissions independent assurance over cyber reporting', () => {
    expect(d).toContain('Commission independent assurance over cyber reporting?');
  });
});
