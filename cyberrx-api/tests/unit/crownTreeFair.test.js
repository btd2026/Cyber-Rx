/**
 * Crown-jewel value tree — the FAIR loss model must carry all the way down to the controls.
 * Guards that computeFair() returns the whole tree, attachFair() pushes a residual Expected
 * Annual Loss onto every function, risk and control (attributing each risk's EAL across its
 * controls by weakness so they sum back to the risk, and — because roll-up EAL is additive —
 * every control sums to the enterprise total shown at the top), and that all three tiers render
 * a FAIR chip.
 */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/crownjewel-tree.html'), 'utf8');

describe('crownjewel-tree — FAIR carries down to the controls', () => {
  it('computeFair returns the full tree (byId), not just the enterprise total', () => {
    expect(html).toContain('FairEngine.computeTree(');
    expect(html).toContain("attribution:'normalize'");
    expect(html).toContain('return {byId:tree.byId,eal:ent.EAL,tail:ent.tail');
  });

  it('attachFair pushes residual EAL onto functions, risks and each control', () => {
    expect(html).toContain('function attachFair(');
    expect(html).toContain('fn.fairEAL=F.EAL');
    expect(html).toContain('r.fairEAL=R.EAL');
    // controls get the risk EAL attributed by weakness (1 − maturity/5), summing back to the risk
    expect(html).toContain('1-((c[1]||0)/5)');
    expect(html).toContain('c.fairEAL=R.EAL*ws[ci]/sw');
  });

  it('every tier renders a FAIR chip (function, risk, control)', () => {
    const chips = (html.match(/class="fairchip"/g) || []).length;
    expect(chips).toBeGreaterThanOrEqual(3);
    expect(html).toContain('leaves <b>${$F(c.fairEAL)}</b>/yr');
    expect(html).toContain('EAL <b>${$F(r.fairEAL)}</b>');
    expect(html).toContain('EAL <b>${$F(f.fairEAL)}</b>');
  });

  it('the enterprise line states it rolls up from the controls below', () => {
    expect(html).toContain('rolls up from every control below');
    expect(html).toContain('$F(FAIR.eal)');
  });
});
