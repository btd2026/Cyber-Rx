/**
 * Source-scan + logic guards for the COO "Vendors" tab (CyberRXNew/public/ciso5.js —
 * c5coSupply + the shared c5vendorMatrix + the coo_spof metric). Rebuilt around a
 * vendor-to-critical-process matrix that answers "Which vendors could stop us?".
 *
 * The central fix: the "single point of failure" count is DERIVED from the matrix (count
 * of rows whose status resolves to 'single'), and the coo_spof metric derives from the
 * SAME matrix — so the card value and the finding can never contradict each other again
 * (the old bug showed "0 SPOF" while telling the COO to mitigate one). Vendors are shown
 * by CATEGORY, never real company names. Row status is computed, never hard-coded.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const a = src.indexOf('function c5coSupply()');
const b = src.indexOf('\nfunction ', a + 20);
const fn = a >= 0 && b > a ? src.slice(a, b) : '';
const ms = src.indexOf('function c5vendorMatrix()');
const me = src.indexOf('\nfunction ', ms + 20);
const matrixFn = ms >= 0 ? src.slice(ms, me) : '';
// c5vendorMatrix pulls its process labels from the shared C5_SYSTEMS source via c5sysLabel,
// so evaluate them together (single-source consistency across seats).
const sysDef = src.slice(src.indexOf('var C5_SYSTEMS=['), src.indexOf('function c5IdFix('));
// eslint-disable-next-line no-eval
const c5vendorMatrix = eval('(function(){' + sysDef + '\nreturn (' + matrixFn + ');})()');
const spofM = src.slice(src.indexOf("case 'coo_spof':"), src.indexOf("case 'coo_spof':") + 1600);

describe('COO Vendors — the contradiction is fixed (SPOF derived from the matrix)', () => {
  it('the SPOF card value is spofN, derived from matrix rows with status "single"', () => {
    expect(fn).toContain("spofN=VM.filter(function(r){return r.status==='single';}).length");
    expect(fn).toContain("vcard('coo_spof','Single point of failure',spofN,'Computed','r'");
  });
  it('the coo_spof metric derives from the SAME shared matrix, not top_vendor_blast>=2', () => {
    expect(spofM).toContain('c5vendorMatrix()');
    expect(spofM).not.toContain('systems.length>=2');
  });
  it('c5vendorMatrix computes exactly ONE single point (cloud host on the customer platform)', () => {
    const VM = c5vendorMatrix();
    const single = VM.filter((r) => r.status === 'single');
    expect(single).toHaveLength(1);
    expect(single[0].cat).toBe('Cloud hosting provider');
    expect(single[0].proc).toBe('Customer platform');
  });
  it('matrix status is COMPUTED (no failover on a critical service ⇒ single), sorted by risk', () => {
    expect(matrixFn).toContain("r.status=(r.crit&&noFailover)?'single':(r.crit&&weak)?'watch':'ok'");
    const VM = c5vendorMatrix();
    expect(VM.map((r) => r.status)).toEqual(['single', 'watch', 'ok', 'ok', 'ok']);
  });
});

describe('COO Vendors — header & question', () => {
  it('asks "which vendors could stop us?" with the supply-chain breadcrumb', () => {
    expect(fn).toContain('Supply chain & third parties · which vendors could stop us?');
  });
  it('the headline names the single point of failure and its process (wired, not hard-coded)', () => {
    expect(fn).toContain('is a single point of failure for ');
    expect(fn).toContain("sp0?sp0.proc.toLowerCase()");
  });
  it('the supporting line reports the computed counts (tier-1, critical-touch, spof)', () => {
    expect(fn).toContain("'Of '+tier1+' Tier-1 vendors, '+criticalTouch+' touch a critical service and '+spofN");
  });
});

describe('COO Vendors — three metric cards', () => {
  it('Tier-1 card (self-reported) shows the count and how many touch a critical service', () => {
    expect(fn).toContain("vcard('coo_tier1','Tier-1 vendors',tier1,'Self-reported','n','ink',criticalTouch+' touch a critical service')");
  });
  it('Flagged card is Modeled/amber, wired to the at-risk vendor count', () => {
    expect(fn).toContain("vcard('thirdparty_risk','Flagged for watch',flaggedN,'Modeled','a'");
    expect(fn).toContain('flaggedN=flaggedConn?V.atRisk.length');
  });
  it('SPOF card is Computed/red; each card keeps data-c5m drill-through', () => {
    expect(fn).toContain("'Computed','r'");
    expect(fn).toMatch(/function vcard\(mid,title,val,pill,pillCls,valCol,sub\)\{return '<div class="c5card" data-c5m="'\+mid/);
  });
});

describe('COO Vendors — the concentration matrix (centerpiece)', () => {
  it('has the header row: left title + right "Sorted by risk to operations"', () => {
    expect(fn).toContain('Vendors under critical services — rating and failover');
    expect(fn).toContain('Sorted by risk to operations');
  });
  it('uses vendor CATEGORY labels, never real company names', () => {
    ['Cloud hosting provider', 'Logistics (3PL)', 'Payment processor', 'Identity provider', 'ERP / financials'].forEach((c) => expect(matrixFn).toContain(c));
  });
  it('maps vendors to the SAME critical services via the shared C5_SYSTEMS source (no drift)', () => {
    // process labels are pulled from the single shared source, not retyped
    ['customer', 'supply', 'payments', 'financial'].forEach((k) => expect(matrixFn).toContain("c5sysLabel('" + k + "')"));
    // and the shared source defines those canonical labels once
    ['Customer platform', 'Supply chain', 'Payments processing', 'Financial close'].forEach((p) => expect(sysDef).toContain(p));
    // resolved at runtime, the matrix rows carry the shared labels
    const procs = c5vendorMatrix().map((r) => r.proc);
    expect(procs).toContain('Customer platform');
    expect(procs).toContain('Financial close');
  });
  it('each row shows rating + trend arrow and a computed status pill; drills to the vendor', () => {
    expect(fn).toContain("r.grade+' '+arrow(r.trend)");
    expect(fn).toContain("function stTxt(s){return s==='single'?'Single point':s==='watch'?'Watch':'OK'");
    expect(fn).toContain('data-c5m="thirdparty_risk"');
  });
});

describe('COO Vendors — impact strip, decision callout, footnote', () => {
  it('Illustrative impact strip reuses the Resilience/Recovery hourly figure', () => {
    expect(fn).toContain('If the cloud host fails:');
    expect(fn).toContain('no failover for the customer platform');
    // hourly + customers now come from the shared cross-cutting source (single-source)
    expect(fn).toContain('c5xDowntimeHr().str');
    expect(fn).toContain('c5xCustomers()');
    expect(fn).toMatch(/Illustrative/);
  });
  it('decision callout keeps BOTH buttons wired (mitigate vendor + fund identity)', () => {
    expect(fn).toContain("c5bl('The decision — two moves'");
    expect(fn).toContain("{mid:'thirdparty_risk',txt:'Mitigate the vendor dependency'}");
    expect(fn).toContain("{mid:TD.mid,txt:'Fund '+c5esc(TD.short)+' — limits blast radius'}");
    expect(fn).toContain('the same work on the Resilience and Recovery tabs');
  });
  it('footnote counts connected sources', () => {
    expect(fn).toMatch(/connN=evSrcs\.filter\(function\(s\)\{return s\.connected;\}\)\.length/);
    expect(fn).toContain("sources connected");
  });
  it('labels demo values and does not reintroduce the old contradictory copy', () => {
    expect(fn).toMatch(/var demo=\(typeof signalsAreDemo/);
    expect(fn).not.toContain('Reduce the one dependency that touches your critical process.');
    expect(fn).not.toContain('c5rank'); // old real-name vendor list is gone
  });
});
