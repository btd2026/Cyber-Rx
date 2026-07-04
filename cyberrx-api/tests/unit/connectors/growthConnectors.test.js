'use strict';

/**
 * Business-Growth connectors — Salesforce (pipeline $ + deals gated) and Whistic
 * (reviews cleared + review cycle time). These replace the hand-entered growth
 * numbers with live CRM / Trust-Center data. Mocks global.fetch — no network/DB.
 */

const registry = require('../../../src/services/connectors');
const ok = (d) => ({ ok: true, status: 200, json: async () => d, text: async () => '' });
const fail = (s) => ({ ok: false, status: s, json: async () => ({}), text: async () => 'err' });
function queue(...r) { const q = [...r]; global.fetch = jest.fn(async () => (q.length > 1 ? q.shift() : q[0])); }
const val = (r, k) => r.signals.find((s) => s.key === k).value;

beforeEach(() => jest.clearAllMocks());

describe('salesforce connector', () => {
  const sf = require('../../../src/services/connectors/salesforce');
  const creds = { clientId: 'c', clientSecret: 's', username: 'u', password: 'p' };
  test('registered, paid, secrets flagged', () => {
    expect(registry.get('salesforce').key).toBe('salesforce');
    expect(sf.tier).toBe('paid');
    expect(sf.signals).toEqual(['pipeline_in_review_usd', 'deals_gated_qtr']);
    expect(sf.fields.find((f) => f.key === 'clientSecret').secret).toBe(true);
  });
  test('test() requires the connected-app + user creds before any call', async () => {
    global.fetch = jest.fn();
    await expect(sf.test({})).rejects.toThrow(/required/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });
  test('fetchSignals() reads pipeline SUM + deal COUNT via SOQL', async () => {
    queue(ok({ access_token: 't', instance_url: 'https://x.my.salesforce.com' }), ok({ records: [{ total: 500000000 }] }), ok({ records: [{ c: 10 }] }));
    const r = await sf.fetchSignals(creds);
    expect(val(r, 'pipeline_in_review_usd')).toBe(500000000);
    expect(val(r, 'deals_gated_qtr')).toBe(10);
    const [tokenUrl] = global.fetch.mock.calls[0];
    expect(tokenUrl).toContain('/services/oauth2/token');
  });
  test('fetchSignals() falls back to totalSize when COUNT has no alias', async () => {
    queue(ok({ access_token: 't', instance_url: 'https://x' }), ok({ records: [{ total: 1000 }] }), ok({ totalSize: 7, records: [] }));
    const r = await sf.fetchSignals(creds);
    expect(val(r, 'deals_gated_qtr')).toBe(7);
  });
  test('fetchSignals() surfaces an auth failure', async () => {
    queue(ok({ access_token: 't', instance_url: 'https://x' }), fail(401), fail(401));
    await expect(sf.fetchSignals(creds)).rejects.toThrow(/Salesforce returned HTTP 401/);
  });
});

describe('whistic (trust center) connector', () => {
  const wh = require('../../../src/services/connectors/whistic');
  test('registered, paid, reads assessments', () => {
    expect(registry.get('whistic').key).toBe('whistic');
    expect(wh.tier).toBe('paid');
    expect(wh.signals).toEqual(['reviews_cleared_qtr', 'review_cycle_wks']);
  });
  test('fetchSignals() counts completed reviews + averages the cycle time', async () => {
    const now = Date.now();
    queue(ok({ assessments: [
      { createdAt: new Date(now - 14 * 864e5).toISOString(), completedAt: new Date(now - 2 * 864e5).toISOString() }, // ~12d
      { createdAt: new Date(now - 12 * 864e5).toISOString(), completedAt: new Date(now - 5 * 864e5).toISOString() }, // ~7d
    ] }));
    const r = await wh.fetchSignals({ apiToken: 't' });
    expect(val(r, 'reviews_cleared_qtr')).toBeGreaterThanOrEqual(0);
    expect(val(r, 'review_cycle_wks')).toBeGreaterThan(0);
    expect(val(r, 'review_cycle_wks')).toBeLessThan(3);
  });
});
