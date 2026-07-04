'use strict';

/** SAP GRC connector unit tests — mocks global.fetch. */

const sap = require('../../../src/services/connectors/sap');
const registry = require('../../../src/services/connectors');

global.fetch = jest.fn();
const ok = (data) => ({ ok: true, status: 200, json: async () => data, text: async () => '' });
const okXml = () => ({ ok: true, status: 200, json: async () => ({}), text: async () => '<edmx/>' });
const fail = (status) => ({ ok: false, status, json: async () => ({}), text: async () => 'err' });
const creds = { baseUrl: 'https://sap.example.com', username: 'u', password: 'p' };

describe('sap grc connector', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('exposes safe catalog metadata + is registered', () => {
    expect(sap.key).toBe('sap');
    expect(sap.category).toMatch(/SOX/);
    expect(sap.signals).toEqual(['sod_conflicts', 'change_pass_pct', 'payment_anomalies']);
    expect(sap.fields.find((f) => f.key === 'password').secret).toBe(true);
    expect(registry.list().some((c) => c.key === 'sap')).toBe(true);
  });

  test('test() requires base URL + credentials before any network call', async () => {
    await expect(sap.test({})).rejects.toThrow(/required/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('test() authenticates with HTTP Basic against the metadata document', async () => {
    global.fetch.mockResolvedValueOnce(okXml());
    const r = await sap.test(creds);
    expect(r.ok).toBe(true);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain('GRAC_RISK_ANALYSIS_SRV/$metadata');
    expect(opts.headers.Authorization).toMatch(/^Basic /);
  });

  test('fetchSignals() computes SoD conflicts, change pass rate, and payment anomalies', async () => {
    global.fetch
      .mockResolvedValueOnce(ok({ d: { results: [{}, {}, {}] } })) // 3 open SoD
      .mockResolvedValueOnce(ok({ d: { results: Array.from({ length: 120 }, (_, i) => ({ Result: i < 113 ? 'Passed' : 'Failed' })) } }))
      .mockResolvedValueOnce(ok({ d: { results: [{}, {}] } })); // 2 BIS alerts
    const r = await sap.fetchSignals(creds);
    const val = (k) => r.signals.find((s) => s.key === k).value;
    expect(val('sod_conflicts')).toBe(3);
    expect(val('change_pass_pct')).toBe(94); // 113/120
    expect(val('payment_anomalies')).toBe(2);
    expect(r.meta.vendor).toBe('SAP GRC');
  });

  test('fetchSignals() still returns SoD conflicts when optional modules are absent', async () => {
    global.fetch
      .mockResolvedValueOnce(ok({ d: { results: [{}] } })) // 1 SoD
      .mockResolvedValueOnce(fail(404))                      // no Process Control
      .mockResolvedValueOnce(fail(404));                     // no BIS
    const r = await sap.fetchSignals(creds);
    expect(r.signals.find((s) => s.key === 'sod_conflicts').value).toBe(1);
    expect(r.signals.some((s) => s.key === 'change_pass_pct')).toBe(false);
    expect(r.signals.some((s) => s.key === 'payment_anomalies')).toBe(false);
  });

  test('fetchSignals() throws when the risk-analysis service denies access', async () => {
    global.fetch
      .mockResolvedValueOnce(fail(403)) // SoD denied → rethrow
      .mockResolvedValueOnce(fail(404))
      .mockResolvedValueOnce(fail(404));
    await expect(sap.fetchSignals(creds)).rejects.toThrow(/SAP GRC returned HTTP 403/);
  });
});
