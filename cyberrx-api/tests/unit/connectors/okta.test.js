'use strict';

/**
 * Okta connector (src/services/connectors/okta.js) unit tests.
 * Mocks global.fetch (the http helper calls it) — no network, no DB.
 */

const okta = require('../../../src/services/connectors/okta');
const registry = require('../../../src/services/connectors');

global.fetch = jest.fn();
const ok = (data) => ({ ok: true, status: 200, json: async () => data, text: async () => '' });
const fail = (status) => ({ ok: false, status, json: async () => ({}), text: async () => 'err' });

describe('okta connector', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('exposes safe catalog metadata + is registered', () => {
    expect(okta.key).toBe('okta');
    expect(okta.category).toBe('Identity');
    expect(okta.signals).toContain('mfa_pct');
    expect(okta.fields.find((f) => f.key === 'apiToken').secret).toBe(true);
    expect(registry.get('okta')).toBe(okta);
    expect(registry.list().some((c) => c.key === 'okta')).toBe(true);
  });

  test('test() requires org URL + API token before any network call', async () => {
    await expect(okta.test({})).rejects.toThrow(/required/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('test() authenticates with an SSWS token against the org URL', async () => {
    global.fetch.mockResolvedValueOnce(ok([{ id: 'u1' }]));
    const r = await okta.test({ orgUrl: 'https://acme.okta.com/', apiToken: 'tok' });
    expect(r.ok).toBe(true);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain('https://acme.okta.com/api/v1/users'); // trailing slash trimmed
    expect(opts.headers.Authorization).toBe('SSWS tok');
  });

  test('test() surfaces an auth failure', async () => {
    global.fetch.mockResolvedValueOnce(fail(401));
    await expect(okta.test({ orgUrl: 'https://acme.okta.com', apiToken: 'bad' })).rejects.toThrow(/Okta returned HTTP 401/);
  });

  test('fetchSignals() computes mfa_pct from sampled factor enrollment', async () => {
    global.fetch
      .mockResolvedValueOnce(ok([{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }])) // active users
      .mockResolvedValueOnce(ok([{ status: 'ACTIVE' }]))                                // a enrolled
      .mockResolvedValueOnce(ok([{ status: 'ACTIVE' }, { status: 'ACTIVE' }]))          // b enrolled
      .mockResolvedValueOnce(ok([]))                                                    // c none
      .mockResolvedValueOnce(ok([{ status: 'PENDING_ACTIVATION' }]));                   // d not active
    const r = await okta.fetchSignals({ orgUrl: 'https://acme.okta.com', apiToken: 'tok' });
    const mfa = r.signals.find((s) => s.key === 'mfa_pct');
    expect(mfa).toBeDefined();
    expect(mfa.value).toBe(50); // 2 of 4 enrolled
    expect(mfa.raw).toEqual({ activeUsers: 4, sampled: 4, enrolled: 2 });
    expect(r.meta.vendor).toBe('Okta');
  });

  test('fetchSignals() throws when nothing is readable', async () => {
    global.fetch.mockResolvedValueOnce(ok([])); // zero active users
    await expect(okta.fetchSignals({ orgUrl: 'https://acme.okta.com', apiToken: 'tok' }))
      .rejects.toThrow(/no readable signals/i);
  });
});
