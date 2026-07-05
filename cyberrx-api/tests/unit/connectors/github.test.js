'use strict';

/** GitHub connector unit tests — mocks global.fetch (no network, no DB). */

const github = require('../../../src/services/connectors/github');
const registry = require('../../../src/services/connectors');

global.fetch = jest.fn();
const ok = (data) => ({ ok: true, status: 200, json: async () => data, text: async () => '' });
const fail = (status) => ({ ok: false, status, json: async () => ({}), text: async () => 'err' });
// A page of N alert objects (GitHub returns arrays, not totals).
const page = (n) => ok(Array.from({ length: n }, (_, i) => ({ number: i })));
const creds = { org: 'acme', token: 'ghp_test' };

describe('github connector', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('exposes safe catalog metadata + is registered', () => {
    expect(github.key).toBe('github');
    expect(github.category).toMatch(/Product Security/i);
    expect(github.signals).toEqual(['code_scanning_open', 'dependabot_critical']);
    expect(github.fields.find((f) => f.key === 'token').secret).toBe(true);
    expect(registry.get('github').key).toBe('github');
    expect(registry.list().some((c) => c.key === 'github')).toBe(true);
  });

  test('test() requires org + token before any network call', async () => {
    await expect(github.test({})).rejects.toThrow(/required/i);
    await expect(github.test({ org: 'acme' })).rejects.toThrow(/required/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('test() authenticates against the org endpoint', async () => {
    global.fetch.mockResolvedValueOnce(ok({ login: 'acme' }));
    const r = await github.test(creds);
    expect(r.ok).toBe(true);
    expect(global.fetch.mock.calls[0][0]).toContain('/orgs/acme');
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer ghp_test');
  });

  test('test() surfaces an auth failure', async () => {
    global.fetch.mockResolvedValueOnce(fail(401));
    await expect(github.test(creds)).rejects.toThrow(/GitHub returned HTTP 401/);
  });

  test('fetchSignals() counts open code-scanning + critical Dependabot alerts', async () => {
    // code-scanning: one short page (5) → count 5; dependabot: one short page (2) → count 2.
    global.fetch.mockResolvedValueOnce(page(5)).mockResolvedValueOnce(page(2));
    const r = await github.fetchSignals(creds);
    const cs = r.signals.find((x) => x.key === 'code_scanning_open');
    const db = r.signals.find((x) => x.key === 'dependabot_critical');
    expect(cs.value).toBe(5);
    expect(db.value).toBe(2);
    expect(r.meta.vendor).toBe('GitHub');
    expect(global.fetch.mock.calls[0][0]).toMatch(/code-scanning\/alerts\?state=open/);
    expect(global.fetch.mock.calls[1][0]).toMatch(/dependabot\/alerts\?state=open&severity=critical/);
  });

  test('fetchSignals() pages a full page then stops on a short page', async () => {
    // code-scanning: 100 (full) then 30 (short) → 130; dependabot disabled (404).
    global.fetch.mockResolvedValueOnce(page(100)).mockResolvedValueOnce(page(30)).mockResolvedValueOnce(fail(404));
    const r = await github.fetchSignals(creds);
    const cs = r.signals.find((x) => x.key === 'code_scanning_open');
    expect(cs.value).toBe(130);
    // Dependabot 404 → its signal is simply omitted, not an error.
    expect(r.signals.find((x) => x.key === 'dependabot_critical')).toBeUndefined();
  });

  test('fetchSignals() throws when neither feature is readable', async () => {
    global.fetch.mockResolvedValueOnce(fail(403)).mockResolvedValueOnce(fail(403));
    await expect(github.fetchSignals(creds)).rejects.toThrow(/neither code-scanning nor Dependabot/i);
  });
});
