'use strict';

/**
 * Microsoft Sentinel connector (src/services/connectors/sentinel.js) unit tests.
 * Mocks global.fetch (the http helper calls it) — no network, no DB.
 */

const sentinel = require('../../../src/services/connectors/sentinel');
const registry = require('../../../src/services/connectors');

global.fetch = jest.fn();
const ok = (data) => ({ ok: true, status: 200, json: async () => data, text: async () => '' });
const fail = (status) => ({ ok: false, status, json: async () => ({}), text: async () => 'err' });
const tokenResp = () => ok({ access_token: 'tk' });
const creds = { tenantId: 't', clientId: 'c', clientSecret: 's', workspaceId: 'w' };

// A Log Analytics query response with a single PrimaryResult row.
const laResp = (cols, row) => ok({ tables: [{ name: 'PrimaryResult', columns: cols.map((c) => ({ name: c })), rows: [row] }] });

describe('sentinel connector', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('exposes safe catalog metadata + is registered', () => {
    expect(sentinel.key).toBe('sentinel');
    expect(sentinel.category).toBe('SIEM / Detection');
    expect(sentinel.signals).toEqual(expect.arrayContaining(['mttd_hrs', 'mttr_hrs', 'open_incidents']));
    expect(sentinel.fields.find((f) => f.key === 'clientSecret').secret).toBe(true);
    expect(registry.get('sentinel').key).toBe('sentinel'); // wrapped by demo-mode registry
    expect(registry.list().some((c) => c.key === 'sentinel')).toBe(true);
  });

  test('test() requires all OAuth creds + workspace before any network call', async () => {
    await expect(sentinel.test({ tenantId: 't', clientId: 'c', clientSecret: 's' })).rejects.toThrow(/required/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('test() acquires a token then probes the workspace query API', async () => {
    global.fetch
      .mockResolvedValueOnce(tokenResp())
      .mockResolvedValueOnce(laResp(['ok'], [1]));
    const r = await sentinel.test(creds);
    expect(r.ok).toBe(true);
    const [tokUrl] = global.fetch.mock.calls[0];
    expect(tokUrl).toContain('login.microsoftonline.com/t/oauth2/v2.0/token');
    const [qUrl, qOpts] = global.fetch.mock.calls[1];
    expect(qUrl).toContain('api.loganalytics.io/v1/workspaces/w/query');
    expect(qOpts.headers.Authorization).toBe('Bearer tk');
  });

  test('test() surfaces an auth failure from the token endpoint', async () => {
    global.fetch.mockResolvedValueOnce(fail(401));
    await expect(sentinel.test(creds)).rejects.toThrow(/Sentinel returned HTTP 401/);
  });

  test('fetchSignals() maps KQL columns to signals', async () => {
    global.fetch
      .mockResolvedValueOnce(tokenResp())
      .mockResolvedValueOnce(laResp(['open_incidents', 'mttd_hrs', 'mttr_hrs'], [3, 1.25, 18.6]));
    const r = await sentinel.fetchSignals(creds);
    const by = Object.fromEntries(r.signals.map((s) => [s.key, s.value]));
    expect(by.open_incidents).toBe(3);
    expect(by.mttd_hrs).toBe(1.3); // rounded to 1 decimal
    expect(by.mttr_hrs).toBe(18.6);
    expect(r.meta.vendor).toBe('Microsoft Sentinel');
  });

  test('fetchSignals() throws when the workspace returns no rows', async () => {
    global.fetch
      .mockResolvedValueOnce(tokenResp())
      .mockResolvedValueOnce(ok({ tables: [{ name: 'PrimaryResult', columns: [], rows: [] }] }));
    await expect(sentinel.fetchSignals(creds)).rejects.toThrow(/no readable signals/i);
  });
});
