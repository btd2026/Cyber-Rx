'use strict';

/** Rubrik connector unit tests — mocks global.fetch. */

const rubrik = require('../../../src/services/connectors/rubrik');
const registry = require('../../../src/services/connectors');

global.fetch = jest.fn();
const ok = (data) => ({ ok: true, status: 200, json: async () => data, text: async () => '' });
const fail = (status) => ({ ok: false, status, json: async () => ({}), text: async () => 'err' });
const creds = { clusterUrl: 'https://rubrik.example.com', apiToken: 'tok' };

describe('rubrik connector', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('exposes safe catalog metadata + is registered', () => {
    expect(rubrik.key).toBe('rubrik');
    expect(rubrik.category).toMatch(/Backup/);
    expect(rubrik.signals).toEqual(['backup_immutable_pct', 'rpo_minutes', 'dr_test_days']);
    expect(rubrik.fields.find((f) => f.key === 'apiToken').secret).toBe(true);
    expect(registry.list().some((c) => c.key === 'rubrik')).toBe(true);
  });

  test('test() requires a cluster URL + a credential before any network call', async () => {
    await expect(rubrik.test({})).rejects.toThrow(/cluster URL is required/i);
    await expect(rubrik.test({ clusterUrl: 'https://r' })).rejects.toThrow(/token.*required/i);
  });

  test('test() authenticates with a bearer API token', async () => {
    global.fetch.mockResolvedValueOnce(ok({ data: [] }));
    const r = await rubrik.test(creds);
    expect(r.ok).toBe(true);
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
  });

  test('fetchSignals() computes immutable %, tightest RPO, and DR-test recency', async () => {
    global.fetch
      .mockResolvedValueOnce(ok({ data: [
        { numProtectedObjects: 400, isRetentionLockedSla: true, frequencies: [{ timeUnit: 'Hourly', frequency: 4 }] },
        { numProtectedObjects: 100, frequencies: [{ timeUnit: 'Minutes', frequency: 15 }] },
      ] }))
      .mockResolvedValueOnce(ok({ data: [{ time: new Date(Date.now() - 48 * 864e5).toISOString() }] }));
    const r = await rubrik.fetchSignals(creds);
    const val = (k) => r.signals.find((s) => s.key === k).value;
    expect(val('backup_immutable_pct')).toBe(80); // 400 of 500 objects on a locked SLA
    expect(val('rpo_minutes')).toBe(15);           // tightest configured frequency
    expect(val('dr_test_days')).toBe(48);
    expect(r.meta.vendor).toBe('Rubrik');
  });

  test('fetchSignals() still returns backup signals when recovery events are unreadable', async () => {
    global.fetch
      .mockResolvedValueOnce(ok({ data: [{ numProtectedObjects: 10, isRetentionLockedSla: true, frequencies: [{ timeUnit: 'Daily', frequency: 1 }] }] }))
      .mockResolvedValueOnce(fail(403));
    const r = await rubrik.fetchSignals(creds);
    expect(r.signals.find((s) => s.key === 'backup_immutable_pct').value).toBe(100);
    expect(r.signals.some((s) => s.key === 'dr_test_days')).toBe(false);
  });

  test('fetchSignals() throws when SLA data errors out', async () => {
    global.fetch.mockResolvedValueOnce(fail(500)).mockResolvedValueOnce(fail(500));
    await expect(rubrik.fetchSignals(creds)).rejects.toThrow(/Rubrik returned HTTP 500/);
  });
});
