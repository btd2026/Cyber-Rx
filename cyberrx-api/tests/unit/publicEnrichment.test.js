'use strict';

/**
 * PublicEnrichmentService — offline guardrail tests. The LLM path needs a key;
 * here we verify the numeric coercion and the no-key/no-name behavior (never
 * fabricates a value).
 */

const { enrich, num } = require('../../src/services/PublicEnrichmentService');

describe('public enrichment', () => {
  test('num coerces dollar/comma strings and rejects junk', () => {
    expect(num('$4,200,000,000')).toBe(4200000000);
    expect(num('8000')).toBe(8000);
    expect(num(null)).toBeNull();
    expect(num('n/a')).toBeNull();
    expect(num(0)).toBeNull();
  });

  test('empty name returns no fields (never fabricates)', async () => {
    const r = await enrich('');
    expect(r.fields).toEqual({});
    expect(r.source).toBe('none');
  });

  test('with no ANTHROPIC_API_KEY, returns no prefill (no made-up numbers)', async () => {
    const prev = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const r = await enrich('Acme Health Plan');
    expect(r.fields).toEqual({});
    expect(r.source).toBe('none');
    expect(r.disclaimer).toMatch(/unavailable/i);
    if (prev !== undefined) process.env.ANTHROPIC_API_KEY = prev;
  });
});
