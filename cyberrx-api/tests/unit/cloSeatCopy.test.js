/**
 * CLO seat restructured to the proposed set: 01 Regulatory exposure / 02 Contracts &
 * liability / 03 Incident & disclosure readiness / 04 Decisions (Privacy folded away).
 * Guards the seat body + tab labels, the contract additions (insurance adequacy; legal
 * hold/privilege/defensibility; regulatory register with the named regimes), and the
 * Decisions convergence strip + Decision 2 (close the top regulatory/insurance gap).
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const seats = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit-seats.js'), 'utf8');
const html = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');
function fnOf(n) { const a = src.indexOf('function ' + n + '('); return src.slice(a, src.indexOf('\nfunction ', a + 20)); }

describe('CLO seat — restructured tab set', () => {
  it('the seat body is Regulatory / Contracts & liability / Incident & disclosure (no Privacy tab)', () => {
    expect(seats).toContain('Which contracts and liabilities are at risk?');
    expect(seats).toContain('Are we ready for incident disclosure?');
    expect(seats).not.toContain('id="cl-privacy"');
  });
  it('the tabs read Regulatory exposure / Contracts & liability / Incident & disclosure', () => {
    expect(html).toContain("'Where are we exposed by jurisdiction?':'Regulatory exposure'");
    expect(html).toContain("'Which contracts and liabilities are at risk?':'Contracts & liability'");
    expect(html).toContain("'Are we ready for incident disclosure?':'Incident & disclosure'");
  });
});

describe('CLO 01 Regulatory exposure — register + regimes', () => {
  const r = fnOf('c5clRegulatory');
  it('names the real regulatory regimes and counts them in the footnote', () => {
    expect(r).toContain('SEC cyber disclosure · GDPR/CCPA · DORA · EU AI Act · EU CRA');
    expect(r).toContain('regimes in scope');
  });
});

describe('CLO 02 Contracts & liability — contract', () => {
  const c = fnOf('c5clContracts');
  it('adds an insurance-coverage-adequacy-vs-tail row and a source footnote', () => {
    expect(c).toContain('Insurance coverage adequacy vs modeled tail');
    expect(c).toContain('IDF=c5IdFix()');
    expect(c).toContain("+connN+' sources connected");
  });
});

describe('CLO 03 Incident & disclosure readiness — contract', () => {
  const n = fnOf('c5clNotification');
  it('is reframed to incident & disclosure and adds legal hold / privilege / defensibility', () => {
    expect(n).toContain('Incident & disclosure readiness');
    expect(n).toContain('Legal hold · privilege · defensibility');
    expect(n).toContain('IDF=c5IdFix()');
  });
});

describe('CLO 04 Decisions — contract', () => {
  const d = fnOf('c5clDecisions');
  it('opens with the convergence strip and keeps the audit-trail promise', () => {
    expect(d).toContain("c5convergeStrip('clo')");
    expect(d).toContain('no AI/LLM at run-time');
  });
  it('Decision 1 is the identity fix with its honest downside', () => {
    expect(d).toContain("Support the '+IDF.short+' fix?");
    expect(d).toContain("Interim exposure persists across the '+IDF.timeline");
  });
  it('Decision 2 is closing the top regulatory-obligation / insurance-adequacy gap', () => {
    expect(d).toContain('Close the top regulatory-obligation or insurance-adequacy gap?');
  });
});
