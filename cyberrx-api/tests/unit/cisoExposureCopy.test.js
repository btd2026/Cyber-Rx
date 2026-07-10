/**
 * Source-scan guards for the CISO "Cyber Exposure" tab (CyberRXNew/public/ciso5.js).
 *
 * The tab is browser code that renders from many live globals, so instead of executing
 * it we assert the executive-safe WORDING and structure directly in the source: no
 * "removes risk" button, the four updated card labels, the $ figure carries a business
 * label, the decision wording is accelerate-not-funded-conflict, and the evidence
 * panel is wired in.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
// Isolate the Cyber-Exposure tab region: function c5Health() through the start of the
// evidence-panel helper defined right after it (captures the whole render body).
const start = src.indexOf('function c5Health()');
const end = src.indexOf('function c5ExposureEvidence()', start);
const region = start >= 0 && end > start ? src.slice(start, end) : (start >= 0 ? src.slice(start, start + 12000) : '');

describe('Cyber Exposure tab — executive-safe wording', () => {
  it('locates the tab region', () => {
    expect(start).toBeGreaterThan(0);
    expect(region).toContain('Cyber exposure · where is the business most exposed?');
  });

  it('the action button never says the decision removes/eliminates risk', () => {
    expect(region).not.toMatch(/removes '\+ec\.displayValue\+' of risk/);
    expect(region).not.toMatch(/removes .* of risk/);
    expect(region).not.toMatch(/eliminat\w* risk/i);
  });

  it('the action button says it reduces the top exposure, driver-parameterized', () => {
    // driver is data-ranked (c5TopDriver), so button text is composed, not a literal
    expect(region).toContain("'Approve '+c5esc(TD.short)+' remediation — reduce top exposure'");
    expect(region).not.toContain('Approve identity remediation — reduce top exposure');
  });

  it('the bottom line states approval reduces exposure, not removes all risk', () => {
    expect(region).toMatch(/does not remove all cyber risk/);
    expect(region).toMatch(/reduces the top exposure/);
  });

  it('the decision wording is accelerate-execution, not the funded/sign-off conflict', () => {
    expect(region).not.toMatch(/funded and waiting for your sign-off/);
    expect(region).toMatch(/approval is needed to accelerate execution/);
  });

  it('the $ exposure is shown with a modeled business label, never bare', () => {
    // The modeled figure (the data-ranked top driver's value) must carry a business label.
    expect(region).toMatch(/modeled (demo )?(business )?exposure of '\+TD\.displayValue/i);
    // And the basis explanation is pulled in.
    expect(region).toContain('TrustLogic.EXPOSURE_BASIS');
  });

  it('marks the modeled figure as demo when signals are demo', () => {
    expect(region).toMatch(/signalsAreDemo/);
    expect(region).toMatch(/modeled demo exposure/);
  });

  it('renders the evidence-confidence panel', () => {
    expect(region).toContain('c5ExposureEvidencePanel()');
  });
});

describe('Cyber Exposure tab — updated card labels', () => {
  it('uses the four executive card labels', () => {
    expect(src).toContain("name:'Crown jewels requiring CISO attention'");
    expect(src).toContain("name:'Business capability most exposed'");
    expect(src).toContain("name:'Most likely material disruption scenario'");
    expect(src).toContain("name:'Vendors requiring action'");
  });
  it('drops the old overclaiming/verbose labels', () => {
    expect(src).not.toContain("name:'Crown jewels at greatest risk'");
    expect(src).not.toContain("name:'Business capabilities with highest exposure'");
    expect(src).not.toContain("name:'Most likely business disruption scenarios'");
    expect(src).not.toContain("name:'Third-party / supply-chain cyber exposure'");
  });
});

describe('Cyber Exposure tab — evidence source coverage', () => {
  it('the evidence panel lists the six required source reads', () => {
    ['CMDB / asset inventory', 'Cloud IAM / identity source', 'Vulnerability / exposure source',
      'Business capability mapping', 'Vendor risk source', 'Disruption scenario source'].forEach((label) => {
      expect(src).toContain(label);
    });
  });
});
