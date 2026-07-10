/**
 * Source-scan + logic guards for the CIO "Tech estate" tab (CyberRXNew/public/ciso5.js —
 * c5ctTech), the shared C5_SYSTEMS / c5IdFix source, and the persona-label fix.
 *
 * Central reconciliations:
 *  - The persona header reads the SAME source as the nav (the active seat button), and
 *    C5SEAT no longer mislabels cio as CTO — so header and nav can't disagree.
 *  - The "Critical vulns open" total is the sum of the per-platform matrix rows and equals
 *    the live signal (the customer platform absorbs the balance), so the aggregate and the
 *    breakdown can never contradict each other (the "18 next to Strong, unexplained" bug).
 *  - The five systems and the identity-fix cost/timeline/owner come from ONE shared source.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const a = src.indexOf('function c5ctTech()');
const b = src.indexOf('\nfunction ', a + 20);
const fn = a >= 0 && b > a ? src.slice(a, b) : '';

describe('CIO persona label — header reads the same source as the nav', () => {
  it('C5SEAT no longer labels cio as CTO', () => {
    const line = src.slice(src.indexOf('var C5SEAT='), src.indexOf('var C5SEAT=') + 400);
    expect(line).toContain("cio:{ic:'cpu',nm:'CIO'}");
    expect(line).not.toContain("nm:'CTO'");
  });
  it('c5seatLabel reads the active nav seat button text (single source), header uses it', () => {
    expect(src).toContain("function c5seatLabel(id)");
    expect(src).toContain("document.querySelector('.seat[data-seat=\"'+id+'\"]')");
    const hdr = src.slice(src.indexOf('function c5seatHeader()'), src.indexOf('function c5seatHeader()') + 400);
    expect(hdr).toContain('var nm=c5seatLabel(id);');
    expect(hdr).toContain("' · CISO briefing'"); // subtitle for non-CISO seats
  });
  it('the visible CTO copy is now CIO', () => {
    expect(src).toContain("'CIO read.");
    expect(src).toContain('Decisions for the CIO · what needs your call?');
    expect(src).not.toContain("'CTO read.");
  });
});

describe('CIO Tech estate — shared source of truth', () => {
  it('C5_SYSTEMS + c5sysLabel + c5IdFix exist as the single shared source', () => {
    expect(src).toContain('var C5_SYSTEMS=[');
    expect(src).toContain('function c5sysLabel(key,override)');
    expect(src).toContain('function c5IdFix()');
  });
  it('c5IdFix derives cost from the live exposure model (top driver), with fixed timeline/owner', () => {
    const idf = src.slice(src.indexOf('function c5IdFix()'), src.indexOf('function c5IdFix()') + 500);
    expect(idf).toContain('c5TopDriver()');
    expect(idf).toContain("timeline:'90–180 days'");
    expect(idf).toContain("owner:'CISO / CIO'");
  });
  it('the tab reads the shared config, never retyping the identity cost/timeline/owner', () => {
    expect(fn).toContain('var IDF=c5IdFix();');
    expect(fn).toContain("IDF.owner+' · '+IDF.timeline");
    expect(fn).toContain('idUsd=IDF.usd||');
  });
});

describe('CIO Tech estate — vuln reconciliation (aggregate = sum of the matrix)', () => {
  it('the estate total is DERIVED as the sum of per-platform rows', () => {
    expect(fn).toContain('totalVulns=platforms.reduce(function(s,p){return s+p.vulns;},0)');
  });
  it('total reconciles to the LIVE signal; the at-risk platform absorbs the balance', () => {
    expect(fn).toContain('liveTotal=cv.connected?(parseInt(String(cv.displayValue).replace(/[^0-9]/g,\'\'),10)||0):null');
    expect(fn).toContain('custVulns=(liveTotal!=null)?Math.max(0,liveTotal-othersSum):11');
  });
  it('the concentration is the at-risk platform count, shown red on the vulns card', () => {
    expect(fn).toContain('concVulns=atP?atP.vulns:0');
    expect(fn).toContain("concVulns+' on the '+c5sysLabel('customer').toLowerCase()");
    expect(fn).toContain("'crit')"); // red subtitle colour
  });
  it('reconciliation math: live 18→(18 total, 11 concentration); 22→(22, 15); null→(18, 11)', () => {
    const others = 3 + 2 + 2 + 0;
    const calc = (live) => {
      const cust = live != null ? Math.max(0, live - others) : 11;
      return { total: [cust, 3, 2, 2, 0].reduce((s, x) => s + x, 0), cust };
    };
    expect(calc(18)).toEqual({ total: 18, cust: 11 });
    expect(calc(22)).toEqual({ total: 22, cust: 15 });
    expect(calc(null)).toEqual({ total: 18, cust: 11 });
  });
});

describe('CIO Tech estate — structure', () => {
  it('header: breadcrumb + a data-driven headline/support line', () => {
    expect(fn).toContain('Technology risk · is our stack secure and modern?');
    expect(fn).toContain('identity architecture is the biggest gap');
    expect(fn).toContain("cleanN+' of '+platforms.length+' core platforms are clean");
  });
  it('three metric cards (platform health / critical vulns / modernization), each drillable', () => {
    expect(fn).toContain("tcard('ct_platform_health','Platform health'");
    expect(fn).toContain("tcard('ct_critical_vulns','Critical vulns open',totalVulns");
    expect(fn).toContain("tcard('ct_modernization','Modernization'");
    expect(fn).toMatch(/function tcard\(mid,title,val,pill,pillCls,valCol,sub,subCol\)\{return '<div class="c5card" data-c5m="'\+mid/);
  });
  it('estate matrix maps platforms to the shared systems, status per row, sorted by risk', () => {
    expect(fn).toContain('Estate by platform — security and modernization');
    expect(fn).toContain('Sorted by risk');
    ['customer', 'fulfillment'].forEach((k) => expect(fn).toContain("c5sysLabel('" + k + "')"));
    expect(fn).toContain("function stTxt(k){return k==='atrisk'?'At risk'");
    expect(fn).toContain("vCol=(p.vulns>=10?'crit':'muted')");
  });
  it('architecture-gap strip (Live + modeled) pulls $ from the shared config', () => {
    expect(fn).toContain('The architecture gap:');
    expect(fn).toContain('identity sprawl in cloud');
    expect(fn).toContain("idUsd+' exposure");
    expect(fn).toContain('Live + modeled');
  });
  it('decision callout keeps the Fund-identity button wired to the shared driver', () => {
    expect(fn).toContain("c5bl('The decision'");
    expect(fn).toContain("{mid:IDF.mid,txt:'Fund the identity fix — closes the gap'}");
    expect(fn).toContain('Same fix that surfaces on Supply chain and Decisions');
  });
  it('removed the old standalone second-row tiles and old bottom-line copy', () => {
    expect(fn).not.toContain("c5tile('ct_appsec'");
    expect(fn).not.toContain("c5tile('ct_techdebt'");
    expect(fn).not.toContain('Fix the architecture gap in your top platform');
  });
  it('footnote counts connected sources', () => {
    expect(fn).toMatch(/connN=evSrcs\.filter\(function\(s\)\{return s\.connected;\}\)\.length/);
    expect(fn).toContain('sources connected');
  });
});
