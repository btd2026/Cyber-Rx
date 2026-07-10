/**
 * Tests for the central executive-narrative ENGINE (CyberRXNew/public/execNarrative.js).
 *
 * The browser file is a classic <script> in a "type":"module" tree, so we load it in a
 * vm sandbox (CommonJS `module` shim) and exercise the exact shipped code.
 *
 * These lock the acceptance criteria the engine exists to enforce:
 *  - headlines change when the top exposure driver changes,
 *  - bottom-line text changes when the evidence changes,
 *  - the top exposed process/asset drives the operational narrative (change it → it changes),
 *  - Low / Not-Enough-Evidence evidence prevents confident conclusions (cautious wording),
 *  - missing evidence prompts "connect <sources>",
 *  - demo / mock data is visibly labelled,
 *  - modeled / self-reported / not-connected labels are honoured,
 *  - "No active issue detected in connected telemetry" — never "no issue exists",
 *  - no banned overclaiming phrases are ever emitted.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadService() {
  const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/execNarrative.js'), 'utf8');
  const sandbox = { self: {}, module: { exports: {} } };
  vm.runInNewContext(src, sandbox);
  return (sandbox.module.exports && sandbox.module.exports.generateExecutiveNarrative)
    ? sandbox.module.exports : sandbox.self.ExecNarrative;
}

const EN = loadService();
const gen = EN.generateExecutiveNarrative;

const HIGH = 'High';
function drv(name, extra) { return Object.assign({ name: name, short: name.toLowerCase(), value: '$100M', sourceStatus: 'modeled' }, extra || {}); }

describe('execNarrative engine loads', () => {
  it('exposes the public API', () => {
    ['generateExecutiveNarrative', 'QUESTIONS', 'BANNED', 'hasBanned', 'sourceWord', 'joinList'].forEach((k) => expect(EN[k]).toBeDefined());
  });
});

describe('headlines change when the top exposure driver changes', () => {
  const base = { seat: 'ciso', tab: 'exposure', evidenceConfidence: HIGH };
  it('the headline names topDrivers[0], not a fixed conclusion', () => {
    const a = gen(Object.assign({}, base, { topDrivers: [drv('Identity sprawl in cloud')] }));
    const b = gen(Object.assign({}, base, { topDrivers: [drv('Unpatched internet-facing systems')] }));
    expect(a.headline).toMatch(/Identity sprawl in cloud/);
    expect(b.headline).toMatch(/Unpatched internet-facing systems/);
    expect(a.headline).not.toEqual(b.headline);
    expect(b.headline.toLowerCase()).not.toMatch(/identity/);
  });
  it('the bottom line lists the top three drivers and changes with them', () => {
    const a = gen(Object.assign({}, base, { topDrivers: [drv('Vendor concentration — Acme'), drv('Email and phishing exposure'), drv('Endpoint coverage gaps')] }));
    expect(a.bottomLineBody).toMatch(/Vendor concentration — Acme/);
    expect(a.bottomLineBody).toMatch(/main drivers are .*Email and phishing exposure.* and Endpoint coverage gaps/);
    const b = gen(Object.assign({}, base, { topDrivers: [drv('Email and phishing exposure')] }));
    expect(b.bottomLineBody).not.toEqual(a.bottomLineBody);
  });
});

describe('the top exposed process drives the operational narrative', () => {
  const base = { seat: 'coo', tab: 'resilience', evidenceConfidence: HIGH };
  it('names the top exposed process; change it → the narrative changes', () => {
    const a = gen(Object.assign({}, base, { organizationContext: { top_exposed_process: 'Order-to-cash', has_active_issue: false }, topDrivers: [drv('Vendor concentration')] }));
    const b = gen(Object.assign({}, base, { organizationContext: { top_exposed_process: 'Customer platform', has_active_issue: false }, topDrivers: [drv('Vendor concentration')] }));
    expect(a.headline).toMatch(/Order-to-cash is the critical process to watch/);
    expect(b.headline).toMatch(/Customer platform is the critical process to watch/);
    expect(a.bottomLineBody).toMatch(/Order-to-cash carries the largest cyber-linked operational exposure/);
    expect(a.headline).not.toEqual(b.headline);
  });
  it('answers the COO resilience question', () => {
    const out = gen(Object.assign({}, base, { organizationContext: { top_exposed_process: 'Order-to-cash', has_active_issue: false }, topDrivers: [drv('Vendor concentration')] }));
    expect(out.question).toBe('Can the business keep running through a disruption?');
  });
});

describe('missing evidence prevents confident conclusions', () => {
  it('Not-Enough-Evidence yields a connect-your-sources narrative, never a verdict', () => {
    const out = gen({ seat: 'coo', tab: 'resilience', topDrivers: [], evidenceConfidence: { level: 'Not Enough Evidence', missing: ['Rubrik backup telemetry', 'DR test records'] } });
    expect(out.headline).toMatch(/Not enough evidence to conclude/i);
    expect(out.headline).toMatch(/Rubrik backup telemetry and DR test records/);
    expect(out.bottomLineBody).toMatch(/Not enough evidence to conclude on resilience/);
    expect(out.buttonText).toMatch(/Connect/i);
    expect(out.headline).not.toMatch(/is the largest|critical process to watch/);
  });
  it('not-connected data reports "Not connected", not a conclusion', () => {
    const out = gen({ seat: 'cfo', tab: 'appetite', isNotConnected: true, topDrivers: [drv('Identity sprawl in cloud')], evidenceConfidence: 'Low' });
    expect(out.statusSummary).toBe('Not connected');
    expect(out.headline).toMatch(/Not enough evidence to conclude/i);
  });
  it('Low evidence uses cautious "appears to be", not "is the largest"', () => {
    const low = gen({ seat: 'ciso', tab: 'exposure', topDrivers: [drv('Identity sprawl in cloud')], evidenceConfidence: 'Low' });
    expect(low.headline).toMatch(/appears to be the largest driver/);
    expect(low.headline).not.toMatch(/\bis the largest driver\b/);
  });
  it('High evidence permits the confident "is the largest driver"', () => {
    const hi = gen({ seat: 'ciso', tab: 'exposure', topDrivers: [drv('Identity sprawl in cloud')], evidenceConfidence: HIGH });
    expect(hi.headline).toMatch(/is the largest driver/);
    expect(hi.headline).not.toMatch(/appears to be/);
  });
});

describe('bottom-line text changes when the evidence changes', () => {
  const d = [drv('Identity sprawl in cloud')];
  it('High vs Low evidence produce different bottom lines for the same driver', () => {
    const hi = gen({ seat: 'ciso', tab: 'exposure', topDrivers: d, evidenceConfidence: HIGH });
    const lo = gen({ seat: 'ciso', tab: 'exposure', topDrivers: d, evidenceConfidence: 'Low' });
    expect(hi.bottomLineBody).not.toEqual(lo.bottomLineBody);
    expect(lo.bottomLineBody).toMatch(/Confirm the evidence/);
    expect(hi.bottomLineBody).toMatch(/Recommended action/);
  });
});

describe('demo / mock data is visibly labelled', () => {
  it('demo adds a demo caveat, demo-labels the value, and forces cautious wording', () => {
    const out = gen({ seat: 'cfo', tab: 'appetite', topDrivers: [drv('Identity sprawl in cloud')], evidenceConfidence: HIGH, isDemo: true });
    expect(out.caveats.join(' ')).toMatch(/demo/i);
    expect(out.headline).toMatch(/\$100M demo modeled exposure/);
    expect(out.headline).toMatch(/appears to be/);
  });
  it('mock adds a not-for-reporting caveat', () => {
    const out = gen({ seat: 'cfo', tab: 'appetite', topDrivers: [drv('Identity sprawl in cloud')], evidenceConfidence: HIGH, isMock: true });
    expect(out.caveats.join(' ')).toMatch(/mock/i);
    expect(out.caveats.join(' ')).toMatch(/not for reporting/i);
  });
});

describe('source labels are honoured (modeled / self-reported / not connected)', () => {
  it('self-reported value carries the self-reported label', () => {
    const out = gen({ seat: 'cfo', tab: 'appetite', topDrivers: [drv('Identity sprawl in cloud', { sourceStatus: 'self-reported' })], evidenceConfidence: HIGH });
    expect(out.headline).toMatch(/\$100M self-reported exposure/);
  });
  it('the sourceWord helper maps hints to the exact permitted word', () => {
    expect(EN.sourceWord('manual')).toBe('self-reported');
    expect(EN.sourceWord('not connected')).toBe('not connected');
    expect(EN.sourceWord('computed')).toBe('computed');
    expect(EN.sourceWord(undefined)).toBe('modeled');
  });
});

describe('never asserts "no issue exists" — uses telemetry-scoped wording', () => {
  it('threat tab with no active issue says "No active issue detected in connected telemetry"', () => {
    const out = gen({ seat: 'ciso', tab: 'threats', topDrivers: [drv('Identity sprawl in cloud')], evidenceConfidence: HIGH, organizationContext: { has_active_issue: false } });
    expect(out.headline).toMatch(/No active issue detected in connected telemetry/);
    expect(out.headline).not.toMatch(/no (issue|attack|threat) exists/i);
  });
});

describe('no banned overclaiming phrases are ever emitted', () => {
  const cases = [
    { seat: 'cfo', tab: 'appetite', topDrivers: [drv('Identity sprawl in cloud')], evidenceConfidence: HIGH },
    { seat: 'ciso', tab: 'exposure', topDrivers: [drv('Vendor concentration — Acme')], evidenceConfidence: 'Low' },
    { seat: 'cfo', tab: 'insurance', topDrivers: [], evidenceConfidence: 'Not Enough Evidence', evidenceGaps: ['policy terms'] },
    { seat: 'coo', tab: 'resilience', organizationContext: { top_exposed_process: 'Customer platform', has_active_issue: false }, topDrivers: [drv('Endpoint coverage gaps')], evidenceConfidence: HIGH, isDemo: true },
    { seat: 'ciso', tab: 'threats', topDrivers: [drv('Email and phishing exposure')], evidenceConfidence: HIGH, organizationContext: { has_active_issue: false } }
  ];
  it('never says removes/eliminates/fully protected/guaranteed/no exposure/zero risk', () => {
    cases.forEach((c) => {
      const out = gen(c);
      const blob = [out.headline, out.subtext, out.bottomLineBody, out.recommendedAction, out.buttonText].join(' • ');
      expect(EN.hasBanned(blob)).toBe(false);
    });
  });
});

describe('recommended action + owner and question map', () => {
  it('uses org-supplied recommended action and owner when present', () => {
    const out = gen({ seat: 'coo', tab: 'resilience', organizationContext: { top_exposed_process: 'Customer platform', action_owner: 'COO / CIO', has_active_issue: false }, recommendedActions: [{ text: 'Rehearse an identity-first recovery', owner: 'COO / CIO' }], topDrivers: [drv('Identity sprawl in cloud')], evidenceConfidence: HIGH });
    expect(out.recommendedAction).toBe('Rehearse an identity-first recovery');
    expect(out.bottomLineBody).toMatch(/owner: COO \/ CIO/);
  });
  it('falls back to a generic prompt for an unknown seat/tab', () => {
    const out = gen({ seat: 'cfo', tab: 'nope', topDrivers: [drv('Identity sprawl in cloud')], evidenceConfidence: HIGH });
    expect(out.question).toBe('Where do we stand?');
  });
});
