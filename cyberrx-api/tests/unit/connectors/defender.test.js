'use strict';

/** Defender for Endpoint connector tests — mocks global.fetch (no network/DB). */

const defender = require('../../../src/services/connectors/defender');
const registry = require('../../../src/services/connectors');

global.fetch = jest.fn();
const ok = (data) => ({ ok: true, status: 200, json: async () => data, text: async () => '' });
const fail = (status) => ({ ok: false, status, json: async () => ({}), text: async () => 'err' });
const tokenResp = () => ok({ access_token: 'tk' });
const creds = { tenantId: 't', clientId: 'c', clientSecret: 's' };

describe('defender connector', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('exposes safe catalog metadata + is registered', () => {
    expect(defender.key).toBe('defender');
    expect(defender.category).toBe('EDR / XDR');
    expect(defender.signals).toContain('edr_pct');
    expect(defender.fields.find((f) => f.key === 'clientSecret').secret).toBe(true);
    expect(registry.get('defender')).toBe(defender);
  });

  test('test() requires OAuth creds before any network call', async () => {
    await expect(defender.test({ tenantId: 't' })).rejects.toThrow(/required/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('test() acquires a token then probes the machines API', async () => {
    global.fetch.mockResolvedValueOnce(tokenResp()).mockResolvedValueOnce(ok({ value: [] }));
    const r = await defender.test(creds);
    expect(r.ok).toBe(true);
    expect(global.fetch.mock.calls[1][0]).toContain('api.securitycenter.microsoft.com/api/machines');
    expect(global.fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer tk');
  });

  test('test() surfaces an auth failure', async () => {
    global.fetch.mockResolvedValueOnce(fail(401));
    await expect(defender.test(creds)).rejects.toThrow(/Defender returned HTTP 401/);
  });

  test('fetchSignals() computes edr_pct from onboarded machines', async () => {
    global.fetch.mockResolvedValueOnce(tokenResp()).mockResolvedValueOnce(ok({ value: [
      { onboardingStatus: 'Onboarded' }, { onboardingStatus: 'Onboarded' },
      { onboardingStatus: 'Onboarded' }, { onboardingStatus: 'CanBeOnboarded' },
    ] }));
    const r = await defender.fetchSignals(creds);
    const s = r.signals.find((x) => x.key === 'edr_pct');
    expect(s.value).toBe(75); // 3 of 4
    expect(s.raw).toEqual({ machines: 4, onboarded: 3 });
    expect(r.meta.vendor).toBe('Microsoft Defender for Endpoint');
  });

  test('fetchSignals() throws when nothing is readable', async () => {
    global.fetch.mockResolvedValueOnce(tokenResp()).mockResolvedValueOnce(ok({ value: [] }));
    await expect(defender.fetchSignals(creds)).rejects.toThrow(/no readable signals/i);
  });
});
