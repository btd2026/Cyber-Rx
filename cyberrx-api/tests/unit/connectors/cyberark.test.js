'use strict';

/** CyberArk connector tests — mocks global.fetch (no network/DB). */

const cyberark = require('../../../src/services/connectors/cyberark');
const registry = require('../../../src/services/connectors');

global.fetch = jest.fn();
const ok = (data) => ({ ok: true, status: 200, json: async () => data, text: async () => '' });
const fail = (status) => ({ ok: false, status, json: async () => ({}), text: async () => 'err' });
const logonResp = () => ok('session-token'); // Logon returns the token as a JSON string
const creds = { pvwaUrl: 'https://pvwa.example.com', username: 'svc', password: 'pw' };

describe('cyberark connector', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('exposes safe catalog metadata + is registered', () => {
    expect(cyberark.key).toBe('cyberark');
    expect(cyberark.category).toBe('Privileged Access (PAM)');
    expect(cyberark.signals).toContain('pam_pct');
    expect(cyberark.fields.find((f) => f.key === 'password').secret).toBe(true);
    expect(registry.get('cyberark').key).toBe('cyberark'); // wrapped by demo-mode registry
  });

  test('test() requires PVWA URL + credentials before any network call', async () => {
    await expect(cyberark.test({ pvwaUrl: 'https://x' })).rejects.toThrow(/required/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('test() logs on then probes accounts with the session token', async () => {
    global.fetch.mockResolvedValueOnce(logonResp()).mockResolvedValueOnce(ok({ value: [], count: 0 }));
    const r = await cyberark.test(creds);
    expect(r.ok).toBe(true);
    const [logonUrl] = global.fetch.mock.calls[0];
    expect(logonUrl).toBe('https://pvwa.example.com/PasswordVault/API/auth/Cyberark/Logon');
    const [acctUrl, acctOpts] = global.fetch.mock.calls[1];
    expect(acctUrl).toContain('/PasswordVault/API/Accounts');
    expect(acctOpts.headers.Authorization).toBe('session-token');
  });

  test('test() surfaces an auth failure from logon', async () => {
    global.fetch.mockResolvedValueOnce(fail(403));
    await expect(cyberark.test(creds)).rejects.toThrow(/CyberArk returned HTTP 403/);
  });

  test('fetchSignals() computes pam_pct from auto-managed accounts', async () => {
    global.fetch.mockResolvedValueOnce(logonResp()).mockResolvedValueOnce(ok({ value: [
      { secretManagement: { automaticManagementEnabled: true } },
      { secretManagement: { automaticManagementEnabled: true } },
      { secretManagement: { automaticManagementEnabled: false } },
      { secretManagement: { automaticManagementEnabled: false } },
    ], count: 4 }));
    const r = await cyberark.fetchSignals(creds);
    const s = r.signals.find((x) => x.key === 'pam_pct');
    expect(s.value).toBe(50); // 2 of 4 auto-managed
    expect(s.raw).toEqual({ vaulted: 4, autoManaged: 2 });
    expect(r.meta.vendor).toBe('CyberArk');
  });

  test('fetchSignals() throws when no accounts are readable', async () => {
    global.fetch.mockResolvedValueOnce(logonResp()).mockResolvedValueOnce(ok({ value: [], count: 0 }));
    await expect(cyberark.fetchSignals(creds)).rejects.toThrow(/no readable signals/i);
  });
});
