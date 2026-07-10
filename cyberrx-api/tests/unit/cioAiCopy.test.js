/**
 * Source-scan + logic guards for the CIO "AI" tab (CyberRXNew/public/ciso5.js — c5ctAi),
 * the shared EU AI Act risk taxonomy (C5_AI_RISK), and the CIO decisions config.
 *
 * Central fixes:
 *  - Resolves the old contradiction (headline "shipping under governance" vs a card saying
 *    "framework needed") by separating operational GUARDRAILS from a formal FRAMEWORK.
 *  - The "high-risk uses" number is DERIVED from the per-system matrix (count of High-class
 *    rows), so the card and the matrix can't disagree.
 *  - Adds EU AI Act framing via a shared High/Limited/Minimal taxonomy with consistent
 *    colours; placeholder classes stay conservative and behind the Illustrative badge.
 *  - The CIO's second decision is the AI-governance-framework call (not the COO's recovery
 *    decision the config used to reuse).
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const html = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');
const a = src.indexOf('function c5ctAi()');
const b = src.indexOf('\nfunction ', a + 20);
const fn = a >= 0 && b > a ? src.slice(a, b) : '';

describe('CIO AI — shared EU AI Act risk taxonomy', () => {
  it('C5_AI_RISK defines High/Limited/Minimal with consistent colours + a rank', () => {
    expect(src).toContain("var C5_AI_RISK={High:{col:'crit',rank:0},Limited:{col:'warn',rank:1},Minimal:{col:'good',rank:2}}");
    expect(src).toContain('function c5aiRiskCls(k)');
    expect(src).toContain('function c5aiRiskRank(k)');
  });
  it('the tab uses the shared taxonomy for row colour + risk sort (not ad-hoc)', () => {
    expect(fn).toContain('c5aiRiskCls(s.risk)');
    expect(fn).toContain('c5aiRiskRank(a.risk)-c5aiRiskRank(b.risk)');
  });
});

describe('CIO AI — no contradiction (guardrails ≠ formal framework)', () => {
  it('drops the "shipping under governance" overclaim', () => {
    expect(fn).not.toContain('shipping AI under governance');
    expect(fn).not.toContain('shipping under governance');
  });
  it('the governance card says "In place / Not in place" with a guardrails-vs-policy subtitle', () => {
    expect(fn).toContain("acard('ct_ai_governed','Governance framework',(frameworkInPlace?'In place':'Not in place')");
    expect(fn).toContain('Guardrails operational · policy pending');
  });
  it('the headline states guardrailed-in-practice but framework not yet in place', () => {
    expect(fn).toContain('guardrailed in practice — but a formal governance framework isn’t in place yet');
  });
});

describe('CIO AI — high-risk count derives from the matrix', () => {
  it('highN is the count of High-class rows', () => {
    expect(fn).toContain("highN=systems.filter(function(s){return s.risk==='High';}).length");
  });
  it('the "High-risk uses" card value IS highN (EU AI Act pill)', () => {
    expect(fn).toContain("acard('ct_ai_highrisk','High-risk uses',highN,'EU AI Act','a','warn'");
  });
  it('the headline high-risk phrasing is derived from highN', () => {
    expect(fn).toContain("(highN===1?'one high-risk use':(highN+' high-risk uses'))");
  });
  it('logic: with one High-class system, the derived count is 1', () => {
    const systems = [{ risk: 'High' }, { risk: 'Limited' }, { risk: 'Limited' }, { risk: 'Minimal' }, { risk: 'Minimal' }, { risk: 'Minimal' }];
    expect(systems.filter((s) => s.risk === 'High').length).toBe(1);
  });
  it('the customer-facing high-risk system is NOT down-classed to Minimal (conservative placeholder)', () => {
    // the customer support assistant row must carry risk:'High'
    expect(fn).toMatch(/name:'Customer support assistant'[^}]*risk:'High'/);
    expect(fn).not.toMatch(/name:'Customer support assistant'[^}]*risk:'Minimal'/);
  });
});

describe('CIO AI — structure', () => {
  it('three metric cards, each drillable (data-c5m)', () => {
    expect(fn).toContain("acard('ct_ai_inventory','AI systems',invN,'Self-reported','n','ink','Shadow AI not yet verified','warn')");
    expect(fn).toMatch(/function acard\(mid,title,val,pill,pillCls,valCol,sub,subCol\)\{return '<div class="c5card" data-c5m="'\+mid/);
  });
  it('the AI-systems matrix has the header row and all six systems', () => {
    expect(fn).toContain('AI systems — risk class and governance');
    expect(fn).toContain('Sorted by risk');
    ['Customer support assistant', 'Fraud & risk scoring', 'Third-party vendor models', 'Developer copilot', 'Demand forecasting', 'Marketing content gen'].forEach((s) => expect(fn).toContain(s));
  });
  it('regulatory & data strip (Illustrative) references EU AI Act + the shared identity gap', () => {
    expect(fn).toContain('Regulatory &amp; data:');
    expect(fn).toContain('high-risk use carries EU AI Act obligations');
    expect(fn).toContain("customer-data AI relies on the '+IDF.short+' gap");
    expect(fn).toMatch(/Illustrative/);
  });
  it('two-move decision callout keeps BOTH buttons; identity from the shared config', () => {
    expect(fn).toContain('var IDF=c5IdFix();');
    expect(fn).toContain("c5bl('The decision — two moves'");
    expect(fn).toContain("{mid:IDF.mid,txt:'Secure AI access — fund the identity fix'}");
    expect(fn).toContain("{mid:'ct_ai_governed',txt:'Stand up AI governance framework'}");
  });
  it('removed the standalone data-access / third-party tiles', () => {
    expect(fn).not.toContain("c5tile('ct_ai_dataaccess'");
    expect(fn).not.toContain("c5tile('thirdparty_risk'");
  });
  it('footnote counts connected sources', () => {
    expect(fn).toMatch(/connN=evSrcs\.filter\(function\(s\)\{return s\.connected;\}\)\.length/);
    expect(fn).toContain('sources connected');
  });
});

describe('CIO decisions config — the seat\'s own two calls', () => {
  it('renders identity-fix + AI-governance decisions (not the COO recovery decision)', () => {
    expect(html).toContain('decisions([identityFixDecision(),aiGovernanceDecision()])');
    expect(html).not.toContain("decisions([resilienceDecision('How much recovery resilience do we fund?'");
  });
  it('the second decision is standing up the AI governance framework', () => {
    expect(html).toContain("q:'Stand up the AI governance framework?'");
    expect(html).toContain('Adopt a framework + EU AI Act mapping');
  });
  it('the identity decision pulls cost/timeline/owner from the shared c5IdFix config', () => {
    const idf = html.slice(html.indexOf('function identityFixDecision()'), html.indexOf('function aiGovernanceDecision()'));
    expect(idf).toContain('c5IdFix()');
    expect(idf).toContain('idf.timeline');
    expect(idf).toContain('idf.owner');
  });
});
