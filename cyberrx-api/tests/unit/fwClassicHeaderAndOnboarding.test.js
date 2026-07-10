/**
 * Guards for the classic Program-Health header cleanup and the onboarding seat list:
 *  - "Final (no watermark)" export → an "Upload Final" button (upload the finalized
 *    report; the auditor pack then exports without the DRAFT watermark),
 *  - "Re-score documents" button removed,
 *  - cleaner button labels,
 *  - onboarding collects only the seats that exist in the cockpit (CTO→CIO; no CPO /
 *    Internal Audit).
 */

const fs = require('fs');
const path = require('path');

const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const onb = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/onboarding.html'), 'utf8');
const cStart = ciso.indexOf('function c5FrameworksClassic(');
const classic = ciso.slice(cStart, ciso.indexOf('\nfunction ', cStart + 10));

describe('classic Program-Health header — Upload Final replaces the no-watermark export', () => {
  it('adds an "Upload Final" button wired to c5fwUploadFinal()', () => {
    expect(classic).toContain('↥ Upload Final');
    expect(classic).toContain('onclick="c5fwUploadFinal()"');
    expect(classic).not.toContain('· Final (no watermark)');
  });
  it('the auditor pack exports with the DRAFT watermark until a final is uploaded', () => {
    expect(classic).toContain('var fin=c5fwFinal()');
    expect(classic).toContain("onclick=\"c5fwExport('+(fin?'true':'false')+')\"");
    expect(classic).toContain("Auditor pack (PPTX'+(fin?'':' · Draft')+')");
  });
  it('shows a "Final on file" state once uploaded', () => {
    expect(classic).toContain('✓ Final on file · ');
  });
  it('uses cleaner button labels (Scorecard + POA&M, no verbose suffixes)', () => {
    expect(classic).toContain('Scorecard + POA&amp;M');
    expect(classic).not.toContain('Control scorecard + POA&amp;M (XLSX)');
  });
});

describe('classic Program-Health header — Re-score documents removed', () => {
  it('the "Re-score documents" button is gone', () => {
    expect(ciso).not.toContain('Re-score documents');
    expect(classic).not.toContain('id="c5reanalyzeBtn"');
  });
  it('the Coverage-stats / evidence copy points to Recompute instead', () => {
    expect(ciso).toContain('↻ Recompute');
  });
});

describe('final-report helpers', () => {
  it('c5fwFinal / c5fwUploadFinal / c5fwClearFinal exist and persist to localStorage', () => {
    expect(ciso).toContain('function c5fwFinal()');
    expect(ciso).toContain('function c5fwUploadFinal()');
    expect(ciso).toContain("localStorage.setItem('cyberrx_report_final'");
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
