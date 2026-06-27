'use strict';

const { chunkDocument, asHeading } = require('../../src/services/rag/DocumentChunker');

describe('asHeading', () => {
  test('detects markdown, numbered, labeled, and ALL-CAPS headings', () => {
    expect(asHeading('## 4.2 Access Control')).toEqual({ ref: '§4.2', title: 'Access Control' });
    expect(asHeading('4.2 Access Control')).toEqual({ ref: '§4.2', title: 'Access Control' });
    expect(asHeading('Section 4 — Authentication')).toEqual({ ref: '§4', title: 'Authentication' });
    expect(asHeading('ACCESS CONTROL POLICY')).toEqual({ ref: '§access-control-policy', title: 'ACCESS CONTROL POLICY' });
  });
  test('does not treat ordinary numbered prose / list items as headings', () => {
    expect(asHeading('4. The organization shall review all accounts on a quarterly basis as required.')).toBeNull();
    expect(asHeading('This is a normal sentence.')).toBeNull();
    expect(asHeading('')).toBeNull();
  });
});

describe('chunkDocument', () => {
  const DOC = [
    'ACCESS CONTROL POLICY', '',
    'This policy establishes account management requirements.', '',
    '1. Purpose', '',
    'Define how accounts are provisioned, reviewed and deprovisioned.', '',
    '2.1 Provisioning', '',
    'All account requests must be approved by the system owner.', '',
    '2.2 Access Reviews', '',
    'User access is reviewed quarterly. Dormant accounts are disabled after 45 days.',
  ].join('\n');

  test('produces section-tagged chunks that preserve text and order', () => {
    const chunks = chunkDocument(DOC, { maxChars: 400 });
    expect(chunks.length).toBeGreaterThanOrEqual(4);
    // ordinals are dense and increasing
    chunks.forEach((c, i) => expect(c.ordinal).toBe(i));
    // every chunk carries a section ref + non-empty text
    chunks.forEach((c) => { expect(c.section_ref).toMatch(/^§/); expect(c.text.length).toBeGreaterThan(0); });
    const refs = chunks.map((c) => c.section_ref);
    expect(refs).toEqual(expect.arrayContaining(['§1', '§2.1', '§2.2']));
    // a chunk round-trips with its section ref (the spec's Stage-3 test)
    const reviews = chunks.find((c) => c.section_ref === '§2.2');
    expect(reviews.heading).toBe('Access Reviews');
    expect(reviews.text).toMatch(/Dormant accounts are disabled after 45 days/);
  });

  test('preamble before the first heading is captured as §preamble', () => {
    const chunks = chunkDocument(DOC, { maxChars: 400 });
    const pre = chunks.find((c) => c.section_ref.startsWith('§access-control-policy') || c.section_ref === '§preamble');
    expect(pre).toBeDefined();
  });

  test('large sections split into multiple parts with a #part suffix, same base ref', () => {
    const big = '3. Logging\n\n' + Array.from({ length: 12 }, (_, i) => `Sentence number ${i} about audit log retention and monitoring requirements for the platform.`).join(' ');
    const chunks = chunkDocument(big, { maxChars: 200, minChars: 40 });
    const parts = chunks.filter((c) => c.section_ref.startsWith('§3'));
    expect(parts.length).toBeGreaterThan(1);
    parts.forEach((p) => expect(p.section_ref).toMatch(/^§3(#\d+)?$/));
    // concatenated parts preserve the content
    const joined = parts.map((p) => p.text).join(' ');
    expect(joined).toMatch(/Sentence number 0/);
    expect(joined).toMatch(/Sentence number 11/);
  });

  test('handles empty / whitespace input without throwing', () => {
    expect(chunkDocument('')).toEqual([]);
    expect(chunkDocument('   \n\n  ')).toEqual([]);
  });
});
