/**
 * Guards for the standardized executive detail-view ranking upgrades (ciso5.js):
 *  - a "Why ranked here" section explains the top item (esp. the high-exposure /
 *    0-gap / 0-risk case) instead of leaving it contradictory,
 *  - the ranking table keeps modeled exposure, open control gaps and open risk
 *    scenarios as SEPARATE columns and collapses long risk lists behind <details>,
 *  - "What Nerion found" and the recommended action are driver-aware and dynamic,
 *  - raw formulas stay behind debug mode.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
function grab(name) { const a = src.indexOf('function ' + name + '('); return src.slice(a, src.indexOf('\nfunction ', a + 10)); }

function loadHelpers() {
  global.c5esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // eslint-disable-next-line no-eval
  return eval(grab('c5whyRanked') + '\n' + grab('c5riskCard') + '\n' + grab('c5rankTable') + '\n' + grab('c5foundText')
    + '\n;({why:c5whyRanked,tbl:c5rankTable,found:c5foundText})');
}

describe('Why ranked here — explains the top item, including apparent contradictions', () => {
  const H = loadHelpers();
  it('high exposure with 0 gaps / 0 risks is explained, not left contradictory', () => {
    const w = H.why({ connected: true, ranking: [{ modeledExposure: '$3.4B', openControlGaps: 0, openRiskScenarios: 0 }] });
    expect(w).toMatch(/highest modeled business-value exposure/);
    expect(w).toMatch(/not by an open finding/);
    expect(w).toMatch(/not connected/); // nudge to confirm missing risk/dependency data
  });
  it('ranks on gaps when gaps drive it', () => {
    expect(H.why({ connected: true, ranking: [{ modeledExposure: '$1M', openControlGaps: 5, openRiskScenarios: 0 }] })).toMatch(/most open control gaps/);
  });
  it('ranks on risks when risks drive it', () => {
    expect(H.why({ connected: true, ranking: [{ modeledExposure: '$1M', openControlGaps: 0, openRiskScenarios: 3 }] })).toMatch(/largest connected open-risk set/);
  });
  it('returns empty for a non-ranked metric (section hidden)', () => {
    expect(H.why({ connected: true })).toBe('');
  });
});

describe('Ranking table — separated measures + collapsed risks', () => {
  const H = loadHelpers();
  const tbl = H.tbl({ rankItemLabel: 'Business capability', ranking: [
    { itemName: 'Financial Services', modeledExposure: '$3.4B', openControlGaps: 0, openRiskScenarios: 0, mainDriver: 'Business criticality / modeled value', risks: [] },
    { itemName: 'Hybrid Cloud', modeledExposure: '$900M', openControlGaps: 2, openRiskScenarios: 8, mainDriver: 'Open control gaps + open risks',
      risks: [{ name: 'Public bucket', severity: 'High', exposure: '$40M', service: 'Cloud platform', owner: 'CloudSec', status: 'Open', action: 'Remediate' }] },
  ] });
  it('exposure, gaps and risks are separate columns', () => {
    expect(tbl).toMatch(/Modeled exposure<\/th>/);
    expect(tbl).toMatch(/Open gaps<\/th>/);
    expect(tbl).toMatch(/Open risks<\/th>/);
  });
  it('the top row keeps the three measures distinct (not merged into one string)', () => {
    expect(tbl).toMatch(/<td class="v">\$3\.4B<\/td><td class="src">0<\/td><td class="src">0<\/td>/);
  });
  it('long risk lists collapse behind a native <details> "view details"', () => {
    expect(tbl).toMatch(/<details>/);
    expect(tbl).toMatch(/1 open risk · view details/);
    expect(tbl).toContain('Public bucket'); // present only inside the collapse
    expect(tbl).toContain('Remediate');
  });
});

describe('What Nerion found honours a dynamic override', () => {
  const H = loadHelpers();
  it('uses m.found when supplied', () => {
    expect(H.found({ connected: true, found: 'CUSTOM' })).toBe('CUSTOM');
  });
  it('shows a not-connected message otherwise', () => {
    expect(H.found({ connected: false, connectTool: 'a GRC' })).toMatch(/connect a GRC/);
  });
});

describe('Business Capability metric — driver-aware, contradiction-safe (integration)', () => {
  function runCap(caps) {
    const start = src.indexOf("case 'er_capability':");
    const end = src.indexOf("case 'er_scenarios':", start);
    const body = src.slice(start + "case 'er_capability':".length, end).trim().replace(/^\{/, '').replace(/\}$/, '');
    global.usd = (n) => (n >= 1e9 ? '$' + (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? '$' + Math.round(n / 1e6) + 'M' : '$' + n);
    global.c5esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    global.c5ago = () => '2m ago';
    global.c5obj = (o) => { o.inputs = o.inputs || []; o.sources = o.sources || []; return o; };
    global.LIVE = {};
    global.c5CapSource = () => caps;
    // eslint-disable-next-line no-new-func
    return new Function('id', 'var conn,caps2;' + body)('er_capability');
  }

  it('top item with $ exposure but 0 gaps/0 risks: validates the basis, names the actionable alternative', () => {
    const m = runCap([
      { name: 'Financial Services', exposure_usd: 3.4e9, control_gaps: 0, open_risk: 0, grc_status: 'Adequate', risks: [] },
      { name: 'Hybrid Cloud', exposure_usd: 9e8, control_gaps: 2, open_risk: 8, grc_status: 'Gap',
        risks: [{ title: 'Public bucket', severity: 'High', exposure: 4e7 }, { title: 'Weak IAM', severity: 'Critical', exposure: 6e7 }] },
    ]);
    // separated ranking
    expect(m.ranking[0].modeledExposure).toBe('$3.4B');
    expect(m.ranking[0].openControlGaps).toBe(0);
    expect(m.ranking[0].openRiskScenarios).toBe(0);
    expect(m.ranking[0].mainDriver).toBe('Business criticality / modeled value');
    // dynamic "what found" names the top AND the most-actionable alternative
    expect(m.found).toMatch(/Financial Services carries the highest modeled exposure at \$3\.4B/);
    expect(m.found).toMatch(/0 open control gaps and 0 open risk scenarios/);
    expect(m.found).toMatch(/Hybrid Cloud carries the largest actionable open set/);
    // driver-aware action: validate basis (not "close 0 gaps")
    expect(m.action).toMatch(/Validate Financial Services.+exposure basis/);
    expect(m.action).not.toMatch(/remediate its 0 open control gaps/);
    // audit-defensible caveat present + no raw formula in the executive fields
    expect(m.notProve).toMatch(/does not prove a realised loss/);
  });

  it('top item WITH gaps/risks: prioritises remediation instead', () => {
    const m = runCap([
      { name: 'Payments', exposure_usd: 2e9, control_gaps: 4, open_risk: 3, grc_status: 'Gap', risks: [] },
    ]);
    expect(m.ranking[0].mainDriver).toBe('Open control gaps + open risks');
    expect(m.action).toMatch(/Prioritise Payments: remediate its 4 open control gaps and treat its 3 open risk scenarios/);
  });

  it('nothing connected → honest connect prompt, no hardcoded client conclusion', () => {
    const m = runCap([]);
    expect(m.connected).toBe(false);
    expect(m.displayValue).toBe('—');
    expect(m.action).toMatch(/Connect a Business Capability Map \+ GRC/);
  });
});

describe('drawer wiring — section rendered, table used, formula gated', () => {
  const a = src.indexOf('function c5InspectObj(');
  const fn = src.slice(a, src.indexOf('\nfunction ', a + 400));
  it('surfaces the ranking rationale under "Why it matters now" (via c5whyNow → c5whyRanked)', () => {
    expect(fn).toContain('Why it matters now');
    const w = src.indexOf('function c5whyNow(');
    const wfn = src.slice(w, src.indexOf('\nfunction ', w + 10));
    expect(wfn).toContain('c5whyRanked(m)');
  });
  it('uses the ranking table when a metric supplies m.ranking (now inside a collapsed accordion)', () => {
    expect(fn).toContain('if(m.ranking&&m.ranking.length){_tbl=c5rankTable(m);}');
    expect(fn).toContain("c5acc(m.ranking&&m.ranking.length?'View full ranking':'View evidence'");
  });
  it('raw formula stays behind debug mode (not in the normal executive view)', () => {
    expect(src).toContain('function c5debugOn()');
    expect(fn).toContain('c5debugOn()');
  });
});
