/**
 * Source-scan guards for the CEO "Decisions" tab + the shared decision object.
 *   - CEO card wording / options / evidence: CyberRXNew/public/ciso5.js (c5ceDecisions)
 *   - Shared decision object: ciso5.js (c5dec / c5decDefaultAlts)
 *   - Shared renderer + record/workflow: CyberRXNew/public/cockpit.html
 *     (decisions() meta strip + consequence + data-req; wireChoose() rationale prompt,
 *      audit snapshot, per-option workflow).
 */

const fs = require('fs');
const path = require('path');

const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const cock = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');

const ceoStart = ciso.indexOf('function c5ceDecisions()');
const ceo = ciso.slice(ceoStart, ciso.indexOf('/* ================= CRO seat', ceoStart));
const decFn = ciso.slice(ciso.indexOf('function c5dec(pfx'), ciso.indexOf('function c5decisions('));
const ask = ciso.slice(ciso.indexOf('function c5AskModel(seat)'), ciso.indexOf('function c5AskModel(seat)') + 2400);

describe('CEO Decisions — page purpose & wording', () => {
  it('locates the tab', () => {
    expect(ceo).toContain('what needs my sign-off');
    // driver is data-ranked (c5TopDriver → TD.short), not a hard-coded "identity"
    expect(ceo).toContain('var TD=c5TopDriver()');
    // the decision frames the choice as approve / defer / accept the residual exposure,
    // titled from the computed driver (not a hard-coded "identity")
    expect(ceo).toContain("One fix converges across the business — approve it, and approve how cyber is told to the board.");
    expect(ceo).toContain("modeled exposure tied to customer-platform '+TD.short+' risk");
    expect(ceo).not.toContain('approve identity remediation now, defer it');
  });
  it('titles the decision from the computed driver, not a hard-coded identity string', () => {
    expect(ceo).toContain("Approve customer-platform '+TD.short+' remediation");
    expect(ceo).not.toContain("'Approve customer-platform identity remediation'");
    expect(ceo).not.toContain('Back it');
    expect(ceo).not.toContain('Back the identity fix');
  });
  it('does not use "-$382M risk"-style wording; labels modeled exposure by the computed driver', () => {
    expect(ceo).not.toMatch(/[-−]'\+ec\.displayValue\+' risk/);
    expect(ceo).not.toMatch(/removes the largest single exposure/i);
    expect(ceo).toContain('Modeled exposure');
    expect(ceo).toContain("modeled exposure tied to customer-platform '+TD.short+' risk");
  });
  it('shows the modeled-exposure basis and evidence confidence', () => {
    expect(ceo).toContain('Estimated business exposure tied to customer-platform services dependent on affected identity controls.');
    expect(ceo).toContain('evidenceConfidence');
  });
  it('keeps technical framework IDs / CMMI off the CEO card', () => {
    expect(ceo).not.toMatch(/\bCMMI\b/);
    expect(ceo).not.toMatch(/PR\.[A-Z]{2}|ID\.AM/);
  });
});

describe('CEO Decisions — three options with consequences', () => {
  it('offers approve / defer / accept-residual-risk', () => {
    expect(ceo).toContain('Approve remediation now');
    expect(ceo).toContain('Defer to next planning cycle');
    expect(ceo).toContain('Accept residual risk with rationale');
  });
  it('marks the recommendation', () => {
    expect(ceo).toContain("recommendation:'Approve remediation now'");
  });
  it('each option states its consequence', () => {
    expect(ceo).toContain('Opens a tracked remediation project and begins modeled-exposure-reduction tracking.');
    expect(ceo).toContain('Records the decision as deferred; exposure remains open until the next planning cycle.');
    expect(ceo).toContain('Creates a risk-acceptance record with rationale, owner and review date.');
  });
  it('deferral requires a rationale; risk acceptance requires rationale + review date', () => {
    // defer option
    expect(ceo).toMatch(/Defer to next planning cycle'[\s\S]{0,400}req:true/);
    // accept option
    expect(ceo).toMatch(/Accept residual risk with rationale'[\s\S]{0,400}req:true,reqRisk:true/);
  });
});

describe('shared decision object (c5dec)', () => {
  it('carries consequence / req / reqRisk / btn per option and a meta block', () => {
    expect(decFn).toContain('consequence:o.consequence');
    expect(decFn).toContain('req:!!o.req');
    expect(decFn).toContain('reqRisk:!!o.reqRisk');
    expect(decFn).toContain('meta:meta||null');
  });
  it('default alternatives use consistent deferral / risk-acceptance language + consequences', () => {
    const alts = ciso.slice(ciso.indexOf('function c5decDefaultAlts'), ciso.indexOf('function c5dec(pfx'));
    expect(alts).toContain('Accept residual risk with rationale');
    expect(alts).toContain('Records the deferral and keeps the exposure open until the next planning cycle.');
    expect(alts).toContain('Creates a formal risk-acceptance record with rationale, owner and review date.');
  });
});

describe('risk-acceptance card is about the exposure, not the asset', () => {
  it('titles it "Residual risk decision — <x> exposure"', () => {
    expect(ask).toMatch(/title:'Residual risk decision — '\+name\+' exposure'/);
    expect(ask).toMatch(/title:'Residual risk decision — '\+sn\+' exposure'/);
    expect(ask).not.toContain("title:'Risk acceptance — '+name");
  });
});

describe('shared renderer + record (cockpit.html)', () => {
  it('renders a meta strip (recommendation / modeled exposure / evidence confidence)', () => {
    expect(cock).toContain('<b>Recommended:</b> ');
    expect(cock).toMatch(/m\.exposureLabel\|\|'Modeled exposure'/);
    expect(cock).toContain('Evidence confidence: <b>');
  });
  it('renders per-option consequence and passes workflow flags to the button', () => {
    expect(cock).toContain('<b>If you choose this:</b> ');
    expect(cock).toMatch(/o\.req\?' data-req="1"'/);
    expect(cock).toMatch(/o\.reqRisk\?' data-reqrisk="1"'/);
    expect(cock).toMatch(/data-exp="'\+String\(exp\)/);
  });
  it('wireChoose requires a rationale for defer/accept and a review date for accept', () => {
    expect(cock).toMatch(/if\(req&&!rationale\)\{.*window\.prompt/);
    expect(cock).toMatch(/if\(reqRisk&&!reviewDate\)\{.*window\.prompt/);
    expect(cock).toMatch(/if\(!rationale\)return/);
  });
  it('snapshots exposure / evidence / source into the decision record (audit trail)', () => {
    expect(cock).toContain('exposureAtDecision:btn.dataset.exp');
    expect(cock).toContain('evidenceAtDecision:btn.dataset.ev');
    expect(cock).toContain('sourceAtDecision:btn.dataset.src');
  });
  it('triggers a different workflow per option — only commit opens a project', () => {
    expect(cock).toContain("var kind=reqRisk?'accept':req?'defer':'commit'");
    expect(cock).toMatch(/if\(kind==='commit'&&!rec\.ticket&&.*pushDecision\(dec\)/);
  });
});
