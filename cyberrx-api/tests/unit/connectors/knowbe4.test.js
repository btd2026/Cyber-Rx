'use strict';

/** KnowBe4 connector tests — mocks global.fetch (no network/DB). */

const knowbe4 = require('../../../src/services/connectors/knowbe4');
const registry = require('../../../src/services/connectors');

global.fetch = jest.fn();
const ok = (data) => ({ ok: true, status: 200, json: async () => data, text: async () => '' });
const fail = (status) => ({ ok: false, status, json: async () => ({}), text: async () => 'err' });
const creds = { apiToken: 'tok' };

describe('knowbe4 connector', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('exposes safe catalog metadata + is registered', () => {
    expect(knowbe4.key).toBe('knowbe4');
    expect(knowbe4.category).toBe('Security Awareness');
    expect(knowbe4.signals).toEqual(expect.arrayContaining(['training_pct', 'phishing_pct']));
    expect(knowbe4.fields.find((f) => f.key === 'apiToken').secret).toBe(true);
    expect(registry.get('knowbe4').key).toBe('knowbe4'); // wrapped by demo-mode registry
  });

  test('test() requires an API token before any network call', async () => {
    await expect(knowbe4.test({})).rejects.toThrow(/required/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('test() authenticates with a Bearer token against the US host by default', async () => {
    global.fetch.mockResolvedValueOnce(ok({ name: 'Acme' }));
    await knowbe4.test(creds);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe('https://us.api.knowbe4.com/v1/account');
    expect(opts.headers.Authorization).toBe('Bearer tok');
  });

  test('region selects the regional host', async () => {
    global.fetch.mockResolvedValueOnce(ok({ name: 'Acme' }));
    await knowbe4.test({ apiToken: 'tok', region: 'eu' });
    expect(global.fetch.mock.calls[0][0]).toBe('https://eu.api.knowbe4.com/v1/account');
  });

  test('test() surfaces an auth failure', async () => {
    global.fetch.mockResolvedValueOnce(fail(401));
    await expect(knowbe4.test(creds)).rejects.toThrow(/KnowBe4 returned HTTP 401/);
  });

  test('fetchSignals() computes training_pct and phishing_pct', async () => {
    global.fetch
      .mockResolvedValueOnce(ok([
        { status: 'Completed' }, { status: 'Completed' }, { status: 'In Progress' }, { status: 'Not Started' },
      ]))
      .mockResolvedValueOnce(ok([
        { phish_prone_percentage: 10 }, { phish_prone_percentage: 20 },
      ]));
    const r = await knowbe4.fetchSignals(creds);
    const by = Object.fromEntries(r.signals.map((s) => [s.key, s.value]));
    expect(by.training_pct).toBe(50); // 2 of 4
    expect(by.phishing_pct).toBe(15); // avg(10,20)
    expect(r.meta.vendor).toBe('KnowBe4');
  });

  test('fetchSignals() still returns training_pct if phishing data is unavailable', async () => {
    global.fetch
      .mockResolvedValueOnce(ok([{ status: 'Completed' }, { status: 'Past Due' }]))
      .mockResolvedValueOnce(fail(403));
    const r = await knowbe4.fetchSignals(creds);
    expect(r.signals.map((s) => s.key)).toEqual(['training_pct']);
    expect(r.signals[0].value).toBe(50);
  });

  test('fetchSignals() throws when nothing is readable', async () => {
    global.fetch.mockResolvedValueOnce(ok([])).mockResolvedValueOnce(ok([]));
    await expect(knowbe4.fetchSignals(creds)).rejects.toThrow(/no readable signals/i);
  });
});
