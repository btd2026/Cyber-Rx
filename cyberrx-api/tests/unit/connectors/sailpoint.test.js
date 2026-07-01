'use strict';

/**
 * SailPoint connector (src/services/connectors/sailpoint.js) unit tests.
 * Mocks global.fetch (the http helper calls it) — no network, no DB.
 */

const sailpoint = require('../../../src/services/connectors/sailpoint');
const registry = require('../../../src/services/connectors');

global.fetch = jest.fn();
const ok = (data) => ({ ok: true, status: 200, json: async () => data, text: async () => '' });
const fail = (status) => ({ ok: false, status, json: async () => ({}), text: async () => 'err' });
const tokenResp = () => ok({ access_token: 'tk' });
const creds = { tenant: 'acme', clientId: 'c', clientSecret: 's' };

describe('sailpoint connector', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('exposes safe catalog metadata + is registered', () => {
    expect(sailpoint.key).toBe('sailpoint');
    expect(sailpoint.category).toBe('Identity Governance');
    expect(sailpoint.signals).toContain('access_review_pct');
    expect(sailpoint.fields.find((f) => f.key === 'clientSecret').secret).toBe(true);
    expect(registry.get('sailpoint').key).toBe('sailpoint'); // wrapped by demo-mode registry
    expect(registry.list().some((c) => c.key === 'sailpoint')).toBe(true);
  });

  test('test() requires tenant/baseUrl + client id/secret before any network call', async () => {
    await expect(sailpoint.test({ clientId: 'c', clientSecret: 's' })).rejects.toThrow(/required/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('test() acquires a token from the tenant then probes campaigns', async () => {
    global.fetch
      .mockResolvedValueOnce(tokenResp())
      .mockResolvedValueOnce(ok([]));
    const r = await sailpoint.test(creds);
    expect(r.ok).toBe(true);
    const [tokUrl] = global.fetch.mock.calls[0];
    expect(tokUrl).toBe('https://acme.api.identitynow.com/oauth/token');
    const [campUrl, campOpts] = global.fetch.mock.calls[1];
    expect(campUrl).toContain('https://acme.api.identitynow.com/v3/certification-campaigns');
    expect(campOpts.headers.Authorization).toBe('Bearer tk');
  });

  test('baseUrl overrides tenant and trailing slash is trimmed', async () => {
    global.fetch
      .mockResolvedValueOnce(tokenResp())
      .mockResolvedValueOnce(ok([]));
    await sailpoint.test({ baseUrl: 'https://custom.example.com/', clientId: 'c', clientSecret: 's' });
    expect(global.fetch.mock.calls[0][0]).toBe('https://custom.example.com/oauth/token');
  });

  test('test() surfaces an auth failure from the token endpoint', async () => {
    global.fetch.mockResolvedValueOnce(fail(401));
    await expect(sailpoint.test(creds)).rejects.toThrow(/SailPoint returned HTTP 401/);
  });

  test('fetchSignals() computes access_review_pct across active campaigns', async () => {
    global.fetch
      .mockResolvedValueOnce(tokenResp())
      .mockResolvedValueOnce(ok([
        { id: '1', completedCertifications: 120, totalCertifications: 150 },
        { id: '2', completedCertifications: 30, totalCertifications: 50 },
      ]));
    const r = await sailpoint.fetchSignals(creds);
    const s = r.signals.find((x) => x.key === 'access_review_pct');
    expect(s.value).toBe(75); // (120+30) / (150+50) = 150/200
    expect(s.raw).toEqual({ campaigns: 2, completed: 150, total: 200 });
    expect(r.meta.vendor).toBe('SailPoint');
  });

  test('fetchSignals() throws when there are no campaign totals', async () => {
    global.fetch
      .mockResolvedValueOnce(tokenResp())
      .mockResolvedValueOnce(ok([]));
    await expect(sailpoint.fetchSignals(creds)).rejects.toThrow(/no readable signals/i);
  });
});
