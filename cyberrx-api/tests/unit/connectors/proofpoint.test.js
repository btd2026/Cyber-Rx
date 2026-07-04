'use strict';

/** Proofpoint TAP connector unit tests — mocks global.fetch. */

const pp = require('../../../src/services/connectors/proofpoint');
const registry = require('../../../src/services/connectors');

global.fetch = jest.fn();
const ok = (data) => ({ ok: true, status: 200, json: async () => data, text: async () => '' });
const fail = (status) => ({ ok: false, status, json: async () => ({}), text: async () => 'err' });
const creds = { servicePrincipal: 'sp', secret: 'sec' };

describe('proofpoint connector', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('exposes safe catalog metadata + is registered', () => {
    expect(pp.key).toBe('proofpoint');
    expect(pp.category).toBe('Email Security');
    expect(pp.signals).toEqual(['bec_blocked']);
    expect(pp.fields.find((f) => f.key === 'secret').secret).toBe(true);
    expect(registry.list().some((c) => c.key === 'proofpoint')).toBe(true);
  });

  test('test() requires service principal + secret before any network call', async () => {
    await expect(pp.test({})).rejects.toThrow(/required/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('test() authenticates with HTTP Basic against the SIEM API', async () => {
    global.fetch.mockResolvedValueOnce(ok({ messagesBlocked: [] }));
    const r = await pp.test(creds);
    expect(r.ok).toBe(true);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain('/v2/siem/messages/blocked');
    expect(opts.headers.Authorization).toMatch(/^Basic /);
  });

  test('test() surfaces an auth failure', async () => {
    global.fetch.mockResolvedValueOnce(fail(401));
    await expect(pp.test(creds)).rejects.toThrow(/Proofpoint returned HTTP 401/);
  });

  test('fetchSignals() counts impostor (BEC) messages from either shape', async () => {
    global.fetch.mockResolvedValueOnce(ok({ messagesBlocked: [
      { threatsInfoMap: [{ classification: 'impostor' }] },
      { threatsInfoMap: [{ classification: 'malware' }] },
      { messageClassification: 'impostor' },
      { threatsInfoMap: [{ classification: 'phish' }] },
    ] }));
    const r = await pp.fetchSignals(creds);
    const s = r.signals.find((x) => x.key === 'bec_blocked');
    expect(s.value).toBe(2);
    expect(s.raw.blockedTotal).toBe(4);
    expect(r.meta.vendor).toBe('Proofpoint');
  });

  test('fetchSignals() reports zero when nothing is impostor-classified', async () => {
    global.fetch.mockResolvedValueOnce(ok({ messagesBlocked: [{ threatsInfoMap: [{ classification: 'spam' }] }] }));
    const r = await pp.fetchSignals(creds);
    expect(r.signals[0].value).toBe(0);
  });

  test('fetchSignals() surfaces a server error', async () => {
    global.fetch.mockResolvedValueOnce(fail(503));
    await expect(pp.fetchSignals(creds)).rejects.toThrow(/Proofpoint returned HTTP 503/);
  });
});
