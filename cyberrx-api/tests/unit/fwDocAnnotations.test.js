/**
 * Source-scan guards for the document-review annotations shown inside the framework
 * control detail window (CyberRXNew/public/ciso5.js — c5fwSource, document branch).
 * A document-evidenced control must open the source reference AND show the analyzed
 * policy's annotations inline: each expected attribute with its verbatim evidence quote
 * (or the reason it's missing), all data-driven from node.doc.attrs.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');
const a = src.indexOf('function c5fwSource(node)');
const b = src.indexOf('function c5OpenDocsReviewAt', a);
const fn = a >= 0 && b > a ? src.slice(a, b) : '';

describe('framework control detail — document reference & annotations', () => {
  it('locates c5fwSource', () => { expect(a).toBeGreaterThan(0); });

  it('opens the source document reference (not just a bare "view") from the detail window', () => {
    expect(fn).toContain('data-c5docopen="');
    expect(fn).toContain('→ open the uploaded document');
    expect(fn).not.toContain('→ view in document review');
  });

  it('renders the analyzed-policy attributes inline as annotations', () => {
    expect(fn).toMatch(/var attrs=\(node\.doc&&Array\.isArray\(node\.doc\.attrs\)\)\?node\.doc\.attrs:\[\]/);
    expect(fn).toContain('c5fw-annos');
    expect(fn).toMatch(/attrs\.map\(function\(a\)\{/);
  });

  it('shows the verbatim evidence quote for a satisfied attribute (the annotation)', () => {
    expect(fn).toMatch(/ok&&a\.evidence/);
    expect(fn).toContain('“'); // quoted evidence
    expect(fn).toMatch(/String\(a\.evidence\)\.slice\(0,240\)/);
  });

  it('shows the reason (or a complete-and-re-score prompt) for a missing attribute', () => {
    expect(fn).toMatch(/a\.reasoning\?String\(a\.reasoning\)/);
    expect(fn).toContain('Not found in the analyzed policy');
  });

  it('marks each attribute found (✓) or missing (✗) with a status colour', () => {
    expect(fn).toMatch(/ok\?'✓ ':'✗ '/);
    expect(fn).toMatch(/var ok=!!a\.found,cc=ok\?'good':'crit'/);
  });

  it('still summarises attributes present, data-driven', () => {
    expect(fn).toMatch(/presentN=attrs\.filter\(function\(a\)\{return a\.found;\}\)\.length/);
    expect(fn).toMatch(/presentN\+' of '\+attrs\.length\+' attributes present'/);
  });

  it('the jump button is wired to open the document review scrolled to the control', () => {
    expect(src).toContain("host.querySelectorAll('[data-c5docjump]')");
    expect(src).toMatch(/function c5OpenDocsReviewAt\(cid\)\{/);
    expect(src).toMatch(/getElementById\('c5doc-'\+cid\)/);
  });
});

describe('demo document scores carry attributes with verbatim evidence', () => {
  const cock = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');
  const seed = cock.slice(cock.indexOf('function demoDocAttrs('), cock.indexOf('function seedDemoDocScores(') + 600);
  it('demoDocAttrs supplies evidence for found attributes and a reason for missing ones', () => {
    expect(seed).toContain('function demoDocAttrs(cmmi)');
    expect(seed).toMatch(/if\(found\)\{o\.evidence=a\.ev;\}else\{o\.reasoning=/);
    expect(seed).toContain('This policy establishes the requirements and responsibilities');
  });
  it('seedDemoDocScores now seeds real attrs (not an empty list)', () => {
    expect(seed).toContain('var attrs=demoDocAttrs(sample[id])');
    expect(seed).toContain('attrs:attrs');
    expect(seed).not.toMatch(/attrs:\[\]\}\)/);
  });
  it('which attributes are found scales with the control maturity (honest gaps)', () => {
    expect(seed).toMatch(/var found=cmmi>=a\.min/);
    expect(seed).toMatch(/min:4/); // higher-maturity attributes only present at higher CMMI
  });
});
