'use strict';

/** Wiz connector unit tests — mocks global.fetch (no network, no DB). */

const wiz = require('../../../src/services/connectors/wiz');
const registry = require('../../../src/services/connectors');

global.fetch = jest.fn();
const ok = (data) => ({ ok: true, status: 200, json: async () => data, text: async () => '' });
const fail = (status) => ({ ok: false, status, json: async () => ({}), text: async () => 'err' });
const token = () => ok({ access_token: 'tk' });
const count = (n) => ok({ data: { configurationFindings: { totalCount: n } } });
const creds = { apiUrl: 'https://api.us1.app.wiz.io', clientId: 'c', clientSecret: 's' };

describe('wiz connector', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('exposes safe catalog metadata + is registered', () => {
    expect(wiz.key).toBe('wiz');
    expect(wiz.category).toMatch(/CSPM/);
    expect(wiz.signals).toEqual(['cspm_pct']);
    expect(wiz.fields.find((f) => f.key === 'clientSecret').secret).toBe(true);
    expect(registry.get('wiz').key).toBe('wiz');
    expect(registry.list().some((c) => c.key === 'wiz')).toBe(true);
  });

  test('test() requires endpoint + client credentials before any network call', async () => {
    await expect(wiz.test({})).rejects.toThrow(/required/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('test() authenticates via client-credentials then probes GraphQL', async () => {
    global.fetch.mockResolvedValueOnce(token()).mockResolvedValueOnce(count(10));
    const r = await wiz.test(creds);
    expect(r.ok).toBe(true);
    expect(global.fetch.mock.calls[0][0]).toContain('/oauth/token');
    expect(global.fetch.mock.calls[1][0]).toContain('/graphql');
  });

  test('test() surfaces an auth failure', async () => {
    global.fetch.mockResolvedValueOnce(fail(401));
    await expect(wiz.test(creds)).rejects.toThrow(/Wiz returned HTTP 401/);
  });

  test('fetchSignals() computes cspm_pct = pass / (pass + fail)', async () => {
    global.fetch.mockResolvedValueOnce(token()).mockResolvedValueOnce(count(8200)).mockResolvedValueOnce(count(1800));
    const r = await wiz.fetchSignals(creds);
    const s = r.signals.find((x) => x.key === 'cspm_pct');
    expect(s.value).toBe(82);
    expect(s.raw).toEqual({ pass: 8200, fail: 1800, total: 10000 });
    expect(r.meta.vendor).toBe('Wiz');
  });

  test('fetchSignals() surfaces a GraphQL error', async () => {
    global.fetch.mockResolvedValueOnce(token()).mockResolvedValueOnce(ok({ errors: [{ message: 'forbidden' }] }));
    await expect(wiz.fetchSignals(creds)).rejects.toThrow(/Wiz GraphQL: forbidden/);
  });

  test('fetchSignals() throws when there are zero findings', async () => {
    global.fetch.mockResolvedValueOnce(token()).mockResolvedValueOnce(count(0)).mockResolvedValueOnce(count(0));
    await expect(wiz.fetchSignals(creds)).rejects.toThrow(/no configuration findings/i);
  });
});
