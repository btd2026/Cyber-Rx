/**
 * Guards for two Program-Health fixes (CyberRXNew/public/ciso5.js):
 *  1. The "How N controls are evidenced" bar now includes the mapped (crosswalk)
 *     category, so the segments sum to the total instead of leaving it looking empty.
 *  2. Native frameworks (CIS / SOC 2 / HIPAA / ISO) no longer show a flat 0 when the
 *     native engine has no results: a control the engine hasn't concluded falls back to
 *     a clearly-labelled crosswalk READINESS score derived from the evidenced CSF
 *     controls it maps to. Native results always take precedence.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
function grab(n) { const a = src.indexOf('function ' + n + '('); return src.slice(a, src.indexOf('\nfunction ', a + 10)); }

describe('evidence bar includes the mapped (crosswalk) category', () => {
  it('the bar renders a mapped segment and legend entry when mapped>0', () => {
    expect(src).toContain("(_sc.mapped?('<div style=\"width:'+_w(_sc.mapped)");
    expect(src).toContain("(_sc.mapped?('<span><b style=\"color:var(--ink)\">'+_sc.mapped+'</b> mapped (crosswalk)</span>')");
  });
  it('c5fwSrcCounts still tallies mapped separately', () => {
    expect(src).toContain("else if(v==='mapped')m++;");
  });
});

describe('native frameworks fall back to crosswalk readiness (behavioral)', () => {
  function load() {
    global.c5fwMean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    global.controlCmmi = (id) => ({
      'PR.AA-01': { score: 3.0, src: 'system' },
      'PR.AA-02': { score: 4.0, src: 'document' },
      'PR.AA-99': { score: 0, src: 'none' },
    }[id] || { score: 0, src: 'none' });
    // eslint-disable-next-line no-eval
    return eval(grab('caNativeScore') + '\n' + grab('caCrosswalkScore') + '\n;({nat:caNativeScore,cw:caCrosswalkScore})');
  }
  const H = load();

  // mirror the per-control decision in c5fwTree's native branch
  function decide(nat, related) {
    let sc = H.nat(nat); let status; let srcv; let tested; let readiness = false; let mapped = null;
    if (sc != null) { status = nat.assessment_status; srcv = 'native'; tested = true; }
    else { const cw = H.cw(related); if (cw && cw.score != null) { sc = cw.score; srcv = 'mapped'; status = 'Readiness (crosswalk)'; tested = true; readiness = true; mapped = cw.ids; } else { srcv = 'native-pending'; status = nat ? nat.assessment_status : 'Not Tested'; tested = false; } }
    return { sc, src: srcv, status, tested, readiness, mapped };
  }

  it('crosswalk readiness = mean CMMI of the EVIDENCED mapped CSF controls, and returns which ids drove it', () => {
    expect(H.cw(['PR.AA-01', 'PR.AA-02'])).toEqual({ score: 3.5, ids: ['PR.AA-01', 'PR.AA-02'] });
  });
  it('is null when none of the mapped CSF controls are evidenced', () => {
    expect(H.cw(['PR.AA-99'])).toBeNull();
  });
  it('a control with no native result but evidenced map is counted as readiness (not 0), and records the mapped ids', () => {
    const d = decide(null, ['PR.AA-01', 'PR.AA-02']);
    expect(d.tested).toBe(true);
    expect(d.src).toBe('mapped');
    expect(d.readiness).toBe(true);
    expect(d.sc).toBe(3.5);
    expect(d.mapped).toEqual(['PR.AA-01', 'PR.AA-02']); // so the finding can NAME them (not "0 subcategories")
    expect(d.status).toBe('Readiness (crosswalk)');
  });
  it('still Not Tested when neither native nor mapped evidence exists', () => {
    const d = decide(null, ['PR.AA-99']);
    expect(d.tested).toBe(false);
    expect(d.status).toBe('Not Tested');
  });
  it('native results always take precedence over the crosswalk fallback', () => {
    const d = decide({ assessment_status: 'Effective' }, ['PR.AA-01']);
    expect(d.src).toBe('native');
    expect(d.sc).toBe(5);
    expect(d.readiness).toBe(false);
  });
});

describe('the fallback is labelled honestly (not presented as a native audit)', () => {
  it('c5fwTree tags fallback controls src=mapped + readiness=true, native still wins', () => {
    const a = src.indexOf('function c5fwTree(');
    const fn = src.slice(a, src.indexOf('\nfunction ', a + 10));
    expect(fn).toContain("if(sc!=null){ // the native engine concluded this control directly");
    expect(fn).toContain("cw=caCrosswalkScore(it[2],cov)");
    expect(fn).toContain("src='mapped';status='Readiness (crosswalk)';tested=true;readiness=true;");
  });
  it('the footnote explains crosswalk-readiness scoring from the user evidence, and that it is not a certified audit', () => {
    expect(src).toContain('scored by <b>crosswalk readiness</b> from the evidence you provided at onboarding');
    expect(src).toContain('connected tools + reviewed documents');
    expect(src).toContain('not</b> a certified assessment');
    expect(src).toContain('no licensed control text is reproduced');
  });
});

describe('the crosswalk finding names the mapped CSF controls and shows they are evidenced', () => {
  it('the native node records the CSF ids that drove the score (not an empty mapped[])', () => {
    const a = src.indexOf('function c5fwTree(');
    const fn = src.slice(a, src.indexOf('\nfunction ', a + 10));
    expect(fn).toContain('mappedIds=cw.ids;'); // capture the evidenced CSF ids
    expect(fn).toContain('mapped:mappedIds,'); // put them on the node so the finding can name them
  });
  it('the finding lists each mapped CSF control with its own evidence source + score', () => {
    expect(src).toContain('inherits the maturity of the <b>');
    expect(src).toContain('Each of those is evidenced from your connected tools + reviewed documents');
    expect(src).toContain("cc.src==='document'?'📄 document review':cc.src==='system'?'🔌 connected tool'");
  });
});

describe('clicking a mapped native control does not throw (the sel-scope bug)', () => {
  // c5fwSource(node) takes only `node` — it must NOT reference a bare `sel` (which is not in
  // scope there) or clicking a crosswalk-scored SOC2/HIPAA/CIS/ISO control throws and the
  // detail panel breaks. It must read the framework from the FW_SEL global instead.
  it('c5fwSource has no out-of-scope `sel`, and reads FW_SEL for the framework name', () => {
    const a = src.indexOf('function c5fwSource(node)');
    const fn = src.slice(a, src.indexOf('\nfunction ', a + 10));
    expect(fn).not.toMatch(/FW_NAMES\[sel\]/); // the bug: bare `sel` is undefined in c5fwSource
    expect(fn).toContain('FW_NAMES[FW_SEL]'); // fixed: use the global selection
  });
  it('c5fwFinding renders a mapped node without throwing', () => {
    function grab(n) { const i = src.indexOf('function ' + n + '('); return src.slice(i, src.indexOf('\nfunction ', i + 10)); }
    global.C5FW_TARGET = 3.5; global.C5FW_FLOOR = 2.0; global.CMMI_LABELS = { 0: 'None', 3: 'Defined', 5: 'Opt' };
    global.cmmiColor = () => 'ink'; global.c5esc = (s) => String(s == null ? '' : s); global.c5fwCadence = () => 'monthly';
    global.FW_NAMES = { hipaa: 'HIPAA Security Rule' }; global.FW_SEL = 'hipaa'; global.C5_DESIGN = {}; global.designFetch = () => {}; global.fwDeployedIds = () => ({});
    global.controlCmmi = (id) => (/^[A-Z]{2}\.[A-Z]{2}-/.test(id) ? { score: 3.0, src: 'document', doc: { doc: 'Policy.pdf' } } : { score: 0, src: 'none' });
    // eslint-disable-next-line no-eval
    const c5fwFinding = eval([grab('c5fwStatus'), grab('c5fwLvl'), grab('c5fwCol'), grab('c5fwSource'), grab('c5fwFindingData'), grab('c5DesignSection'), grab('c5fwFinding'), '\n;c5fwFinding'].join('\n'));
    const node = { type: 'ctl', id: '308(a)(2)', name: 'Assigned security responsibility', score: 3.0, tested: true, status: 'Readiness (crosswalk)', src: 'mapped', mapped: ['GV.RR-02'], related: ['GV.RR-02'], readiness: true };
    let html = '';
    expect(() => { html = c5fwFinding('hipaa', node); }).not.toThrow();
    expect(html.length).toBeGreaterThan(100);
    ['C5FW_TARGET', 'C5FW_FLOOR', 'CMMI_LABELS', 'cmmiColor', 'c5esc', 'c5fwCadence', 'FW_NAMES', 'FW_SEL', 'C5_DESIGN', 'designFetch', 'fwDeployedIds', 'controlCmmi'].forEach((k) => { delete global[k]; });
  });
});
