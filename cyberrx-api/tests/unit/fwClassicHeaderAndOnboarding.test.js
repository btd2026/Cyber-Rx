/**
 * Guards for the classic Program-Health header layout (matches the reference design) and
 * the onboarding seat list:
 *  - top card = framework pills · reassess · last-assessed (+ documents-reviewed link) ·
 *    Auditor pack (PPTX) / Final / Scorecard + POA&M,
 *  - inline "How N controls are evidenced" bar + "Close the gap" (with Re-score button),
 *  - onboarding collects only the seats that exist in the cockpit (CTO→CIO; no CPO /
 *    Internal Audit).
 */

const fs = require('fs');
const path = require('path');

const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const onb = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/onboarding.html'), 'utf8');
const cStart = ciso.indexOf('function c5FrameworksClassic(');
const classic = ciso.slice(cStart, ciso.indexOf('\nfunction ', cStart + 10));

describe('classic Program-Health header — export buttons', () => {
  it('has Auditor pack (PPTX), Final (no-watermark export), and Scorecard + POA&M', () => {
    expect(classic).toContain('>Auditor pack (PPTX)</button>');
    expect(classic).toMatch(/onclick="c5fwExport\(true\)"[^>]*>Final<\/button>/);
    expect(classic).toContain('>Scorecard + POA&amp;M</button>');
  });
  it('does not use the reverted "Upload Final" / drawer experiments', () => {
    expect(ciso).not.toContain('Upload Final');
    expect(ciso).not.toContain('function c5fwUploadFinal');
    expect(ciso).not.toContain('function c5FwEvidenceStats');
    expect(classic).not.toContain('Coverage stats');
    expect(classic).not.toContain('c5fwStatsBtn');
  });
  it('shows a last-assessed line with a "N documents reviewed" link', () => {
    expect(classic).toContain('Last assessed <b>');
    expect(classic).toContain('id="c5docsLink"');
    expect(classic).toMatch(/docN\+' documents reviewed/);
  });
});

describe('classic Program-Health header — inline evidence box + close the gap', () => {
  it('renders the "How N controls are evidenced" bar inline (not in a drawer)', () => {
    expect(classic).toContain("How '+_tot+' controls are evidenced");
    expect(classic).toContain('live telemetry');
    expect(classic).toContain('policy');
    expect(classic).toContain('not evidenced');
  });
  it('renders "Close the gap" with the upload/connect steps and a Re-score button', () => {
    expect(classic).toContain('Close the gap');
    expect(classic).toMatch(/g\.kind==='d'\?'↥ Upload':'⚡ Connect'/);
    expect(classic).toContain('id="c5reanalyzeBtn"');
    expect(classic).toContain('↻ Re-score documents');
  });
  it('is ordered top card → cards → evidence box', () => {
    expect(classic).toContain('topCard+\n    cards+\n    evBox+');
  });
});

describe('onboarding leadership seats match the cockpit seats', () => {
  it('the technology seat is labelled CIO (not CTO), keyed data-seat="cio"', () => {
    expect(onb).toContain('<label>CIO</label><input class="seatname" data-seat="cio"');
    expect(onb).not.toMatch(/<label>CTO<\/label>/);
  });
  it('removes the CPO seat', () => {
    expect(onb).not.toMatch(/data-seat="cpo"/);
    expect(onb).not.toContain('Chief Product Officer');
  });
  it('removes the Internal Audit seat', () => {
    expect(onb).not.toMatch(/data-seat="audit"/);
    expect(onb).not.toContain('Chief Audit Executive');
  });
  it('keeps the cockpit seats (ceo/cfo/ciso/coo/cio/clo/cro)', () => {
    ['ceo', 'cfo', 'ciso', 'coo', 'cio', 'clo', 'cro'].forEach((s) => {
      expect(onb).toMatch(new RegExp('data-seat="' + s + '"'));
    });
  });
});
