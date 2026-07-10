/**
 * CFO seat completion — Decisions convergence strip + honest downside, and the ROI-tab
 * source footnote. (Appetite/01, ROI/02, Insurance/03 already honest and guarded by
 * cfoAppetiteCopy / cfoRoiCopy / cfoInsuranceCopy; those tabs were already near-contract.)
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
function fnOf(n) { const a = src.indexOf('function ' + n + '('); return src.slice(a, src.indexOf('\nfunction ', a + 20)); }
const dc = fnOf('c5cfDecisions');
const roi = fnOf('c5cfRoi');

describe('CFO 04 Decisions — contract', () => {
  it('opens with the convergence strip', () => {
    expect(dc).toContain("c5convergeStrip('cfo')");
    expect(dc).toContain('IDF=c5IdFix()');
  });
  it('Decision 1 is the identity fix WITH its honest downside (interim exposure)', () => {
    expect(dc).toContain("Fund the '+IDF.short+' fix?");
    expect(dc).toContain("Interim exposure persists across the '+IDF.timeline");
  });
  it('Decision 2 remains the CFO transfer-vs-reduce call (close the insurance gap)', () => {
    expect(dc).toContain('Close the insurance gap');
  });
  it('keeps the audit-trail promise (no AI/LLM at run-time)', () => {
    expect(dc).toContain('no AI/LLM at run-time');
  });
});

describe('CFO 02 ROI — source footnote', () => {
  it('reports how many of the two ROI inputs are connected (honest partial coverage)', () => {
    expect(roi).toContain('roiInputsN=[redConn,haveSpend].filter(Boolean).length');
    expect(roi).toContain("of 2 ROI inputs connected");
  });
});
