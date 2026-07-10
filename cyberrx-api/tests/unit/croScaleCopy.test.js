/**
 * Source-scan + logic guards for the CRO "Vs other risks" tab (CyberRXNew/public/ciso5.js —
 * c5crScale). The old version hard-coded a "cyber sits mid-pack" headline that contradicted
 * the CYBER RANK card ("1 of 5" — cyber is actually the top principal risk in the demo ERM
 * portfolio). Now the verdict is DERIVED from cyber's rank, so the headline and the card can
 * never disagree; the comparison renders as a clean per-risk matrix; and the identity
 * treatment reads the shared c5IdFix config.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const seats = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit-seats.js'), 'utf8');
const a = src.indexOf('function c5crScale()');
const b = src.indexOf('\nfunction ', a + 20);
const fn = a >= 0 && b > a ? src.slice(a, b) : '';

// mirror the verdict rule for the reconciliation check
function verdict(rank, total) {
  if (rank == null || total <= 1) return 'connect';
  if (rank === 1) return '#1';
  if (rank <= Math.ceil(total / 3)) return 'top';
  if (rank <= Math.ceil((total * 2) / 3)) return 'mid';
  return 'lower';
}

describe('CRO Vs other risks — verdict reconciles with the rank (no contradiction)', () => {
  it('drops the hard-coded "mid-pack" headline', () => {
    expect(fn).not.toContain("'Cyber sits mid-pack among your principal risks — watch its direction.',null");
  });
  it('derives the verdict from cyber rank; rank 1 reads as the #1 principal risk', () => {
    expect(fn).toContain('var verdict=(rank==null||total<=1)');
    expect(fn).toContain("(rank===1)?'Cyber is your #1 principal risk by modeled residual");
    expect(fn).toContain("(rank<=Math.ceil(total*2/3))?'Cyber sits mid-pack"); // mid-pack only in the middle third
  });
  it('logic: 1-of-5 → #1 (matches the card); 3-of-5 → mid-pack; 5-of-5 → lower half', () => {
    expect(verdict(1, 5)).toBe('#1');
    expect(verdict(3, 5)).toBe('mid');
    expect(verdict(5, 5)).toBe('lower');
  });
  it('the seat brief no longer asserts "sits mid-pack" either', () => {
    expect(seats).not.toContain('cyber sits mid-pack among');
  });
});

describe('CRO Vs other risks — clean per-risk matrix (orphan bar-track removed)', () => {
  it('renders a c5prow matrix, not the old c5retbar bar list', () => {
    expect(fn).toContain('class="c5prow" data-c5m=');
    expect(fn).not.toContain('c5retbar');
    expect(fn).not.toContain('<div class="c5rank">');
  });
  it('the matrix has the header row and cyber is highlighted with its rank + share', () => {
    expect(fn).toContain('Principal risks — residual on one enterprise scale');
    expect(fn).toContain('Sorted by residual');
    expect(fn).toContain("You are here · #'+rank");
    expect(fn).toContain("share+'% of enterprise residual");
  });
  it('keeps the three cards (rank / exposure / trend), each drillable', () => {
    expect(fn).toContain("c5card('cr_rank')+c5card('exp_total')+c5card('cr_trend')");
  });
});

describe('CRO Vs other risks — shared identity config + honesty', () => {
  it('pulls the identity treatment cost/owner/timeline from the shared c5IdFix', () => {
    expect(fn).toContain('var P=c5Principal(),IDF=c5IdFix();');
    expect(fn).toContain("IDF.owner+' · '+IDF.timeline");
    expect(fn).toContain("reduces '+IDF.usd");
    expect(fn).toContain('{mid:IDF.mid,txt:IDF.usd?');
  });
  it('never hard-codes the flagged demo dollar figures', () => {
    expect(fn).not.toContain('$382M');
    expect(fn).not.toContain('$817M');
  });
  it('footnote counts connected sources', () => {
    expect(fn).toMatch(/connN=evSrcs\.filter\(function\(s\)\{return s\.connected;\}\)\.length/);
    expect(fn).toContain('sources connected');
  });
});
