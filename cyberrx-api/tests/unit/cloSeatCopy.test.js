/**
 * CLO seat — two-tab cockpit (01 Overview + 02 Decisions). The Overview folds the regulatory,
 * contracts and disclosure tabs into one concise page (c5clOverview) with plain-English answers
 * and click-to-source on every box.
 */
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const seats = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit-seats.js'), 'utf8');
const html = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');
function fnOf(n) { const a = src.indexOf('function ' + n + '('); return src.slice(a, src.indexOf('\nfunction ', a + 20)); }

describe('CLO seat — two tabs only (Overview + Decisions)', () => {
  it('the seat body is Overview + Decisions (regulatory/contracts/disclosure folded in)', () => {
    expect(seats).toContain('id="cl-overview"');
    expect(seats).toContain('id="cl-decisions"');
    expect(seats).not.toContain('id="cl-contracts"');
    expect(seats).not.toContain('id="cl-notification"');
  });
  it('the Overview tab reads Overview', () => {
    expect(html).toContain("'Where are we legally exposed — and ready to disclose?':'Overview'");
  });
  it('c5clOverview is wired into the render pipeline', () => {
    expect(src).toContain('function c5clOverview()');
    expect(html).toContain('c5clOverview();');
  });
});

describe('CLO Overview (c5clOverview) — answers name the gap + what we are doing', () => {
  const o = fnOf('c5clOverview');
  it('builds the three legal questions and the decision as click-to-source boxes', () => {
    ["id:'cl_q1'", "id:'cl_q2'", "id:'cl_q3'", "id:'cl_decision'"].forEach(id => expect(o).toContain(id));
  });
  it('names the real regimes and the identity trigger, in plain English', () => {
    expect(o).toContain('SEC disclosure, GDPR/CCPA, DORA, EU AI Act, EU CRA');
    expect(o).toContain('customer-platform identity gap');
  });
  it('reads the shared jurisdiction ruleset and identity fix, and routes to Decisions', () => {
    expect(o).toContain('c5legalRegimes');
    expect(o).toContain('c5IdFix()');
    expect(o).toContain('tabIdx:1');
  });
});
