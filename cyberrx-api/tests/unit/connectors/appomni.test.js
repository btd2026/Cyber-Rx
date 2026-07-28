'use strict';

/** AppOmni SSPM connector unit tests — mocks global.fetch. */

const appomni = require('../../../src/services/connectors/appomni');
const registry = require('../../../src/services/connectors');

global.fetch = jest.fn();
const ok = (data) => ({ ok: true, status: 200, json: async () => data, text: async () => '' });
const fail = (status) => ({ ok: false, status, json: async () => ({}), text: async () => 'err' });
const creds = { tenant: 'acme', apiToken: 'tok' };

describe('appomni connector', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('exposes safe catalog metadata + is registered as the SSPM producer', () => {
    expect(appomni.key).toBe('appomni');
    expect(appomni.category).toMatch(/SaaS/i);
    expect(appomni.signals).toContain('sspm_pct');
    expect(appomni.fields.find((f) => f.key === 'apiToken').secret).toBe(true);
    expect(registry.list().some((c) => c.key === 'appomni')).toBe(true);
    // The whole point: something now emits sspm_pct.
    expect(registry.list().some((c) => (c.signals || []).includes('sspm_pct'))).toBe(true);
  });

  test('test() requires an API token before any network call', async () => {
    await expect(appomni.test({})).rejects.toThrow(/API token is required/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('test() authenticates with a bearer token against the tenant host', async () => {
    global.fetch.mockResolvedValueOnce(ok([]));
    const r = await appomni.test(creds);
    expect(r.ok).toBe(true);
    expect(global.fetch.mock.calls[0][0]).toContain('acme.appomni.com');
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
  });

  test('fetchSignals() computes sspm_pct from actively-managed ÷ known apps, plus open findings', async () => {
    global.fetch
      .mockResolvedValueOnce(ok({ results: [
        { name: 'Salesforce', monitoring_status: 'active' },
        { name: 'Workday', monitoring_status: 'active' },
        { name: 'Slack', monitoring_status: 'active' },
        { name: 'Box', status: 'discovered' },      // known but not posture-managed
      ] }))
      .mockResolvedValueOnce(ok({ total: 12 }));
    const r = await appomni.fetchSignals(creds);
    const val = (k) => r.signals.find((s) => s.key === k).value;
    expect(val('sspm_pct')).toBe(75);               // 3 of 4 apps under active posture
    expect(val('sspm_open_findings')).toBe(12);
    expect(r.meta.vendor).toBe('AppOmni');
  });

  test('fetchSignals() still returns sspm_pct when findings are unreadable', async () => {
    global.fetch
      .mockResolvedValueOnce(ok({ results: [
        { name: 'Salesforce', active: true },
        { name: 'GDrive', active: false },
      ] }))
      .mockResolvedValueOnce(fail(403));
    const r = await appomni.fetchSignals(creds);
    expect(r.signals.find((s) => s.key === 'sspm_pct').value).toBe(50);
    expect(r.signals.some((s) => s.key === 'sspm_open_findings')).toBe(false);
  });

  test('fetchSignals() throws when the app inventory call errors', async () => {
    global.fetch.mockResolvedValueOnce(fail(500));
    await expect(appomni.fetchSignals(creds)).rejects.toThrow(/AppOmni returned HTTP 500/);
  });
});
