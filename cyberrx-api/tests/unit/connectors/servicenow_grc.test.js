'use strict';

/** ServiceNow GRC connector unit tests — mocks global.fetch (no network, no DB). */

const snow = require('../../../src/services/connectors/servicenow_grc');
const registry = require('../../../src/services/connectors');

global.fetch = jest.fn();
const ok = (data) => ({ ok: true, status: 200, json: async () => data, text: async () => '' });
const fail = (status) => ({ ok: false, status, json: async () => ({}), text: async () => 'err' });
// Aggregate API returns { result: { stats: { count: "<n>" } } } (count is a string).
const count = (n) => ok({ result: { stats: { count: String(n) } } });
const creds = { instance: 'https://acme.service-now.com', username: 'svc', password: 'pw' };

describe('servicenow_grc connector', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('exposes safe catalog metadata + is registered', () => {
    expect(snow.key).toBe('servicenow_grc');
    expect(snow.category).toMatch(/Audit & GRC/i);
    expect(snow.signals).toEqual(['audit_findings_open', 'audit_findings_repeat']);
    expect(snow.fields.find((f) => f.key === 'password').secret).toBe(true);
    expect(registry.get('servicenow_grc').key).toBe('servicenow_grc');
    expect(registry.list().some((c) => c.key === 'servicenow_grc')).toBe(true);
  });

  test('test() requires instance + username + password before any network call', async () => {
    await expect(snow.test({})).rejects.toThrow(/required/i);
    await expect(snow.test({ instance: 'https://x', username: 'u' })).rejects.toThrow(/required/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('test() hits the aggregate API with Basic auth on the default table', async () => {
    global.fetch.mockResolvedValueOnce(count(14));
    const r = await snow.test(creds);
    expect(r.ok).toBe(true);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/now/stats/sn_audit_finding');
    expect(url).toContain('sysparm_count=true');
    expect(opts.headers.Authorization).toBe('Basic ' + Buffer.from('svc:pw').toString('base64'));
  });

  test('test() surfaces an auth failure', async () => {
    global.fetch.mockResolvedValueOnce(fail(401));
    await expect(snow.test(creds)).rejects.toThrow(/ServiceNow returned HTTP 401/);
  });

  test('fetchSignals() returns open + repeat finding counts', async () => {
    global.fetch.mockResolvedValueOnce(count(14)).mockResolvedValueOnce(count(3));
    const r = await snow.fetchSignals(creds);
    expect(r.signals.find((x) => x.key === 'audit_findings_open').value).toBe(14);
    expect(r.signals.find((x) => x.key === 'audit_findings_repeat').value).toBe(3);
    expect(r.meta.vendor).toBe('ServiceNow GRC');
    // First call = open (active=true); second = repeat query.
    expect(decodeURIComponent(global.fetch.mock.calls[0][0])).toContain('active=true');
    expect(decodeURIComponent(global.fetch.mock.calls[1][0])).toContain('repeat=true');
  });

  test('fetchSignals() omits the repeat signal when the repeat query is invalid', async () => {
    // open OK; repeat query 400 (bad field on this instance) → omit, do not fail.
    global.fetch.mockResolvedValueOnce(count(9)).mockResolvedValueOnce(fail(400));
    const r = await snow.fetchSignals(creds);
    expect(r.signals.find((x) => x.key === 'audit_findings_open').value).toBe(9);
    expect(r.signals.find((x) => x.key === 'audit_findings_repeat')).toBeUndefined();
  });

  test('fetchSignals() honors a custom table + repeat query', async () => {
    global.fetch.mockResolvedValueOnce(count(5)).mockResolvedValueOnce(count(1));
    await snow.fetchSignals({ ...creds, table: 'sn_grc_issue', repeatQuery: 'active=true^u_recurring=true' });
    expect(global.fetch.mock.calls[0][0]).toContain('/api/now/stats/sn_grc_issue');
    expect(decodeURIComponent(global.fetch.mock.calls[1][0])).toContain('u_recurring=true');
  });

  test('fetchSignals() fails when the findings table is unreadable', async () => {
    global.fetch.mockResolvedValueOnce(fail(403));
    await expect(snow.fetchSignals(creds)).rejects.toThrow(/ServiceNow returned HTTP 403/);
  });
});
