'use strict';

/** OneTrust connector unit tests — mocks global.fetch. */

const ot = require('../../../src/services/connectors/onetrust');
const registry = require('../../../src/services/connectors');

global.fetch = jest.fn();
const ok = (data) => ({ ok: true, status: 200, json: async () => data, text: async () => '' });
const fail = (status) => ({ ok: false, status, json: async () => ({}), text: async () => 'err' });
const token = () => ok({ access_token: 'tk' });
const creds = { baseUrl: 'https://acme.my.onetrust.com', clientId: 'c', clientSecret: 's' };

describe('onetrust connector', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('exposes safe catalog metadata + is registered', () => {
    expect(ot.key).toBe('onetrust');
    expect(ot.category).toBe('Privacy Operations');
    expect(ot.signals).toEqual(['dsar_open', 'dsar_overdue', 'legal_holds']);
    expect(ot.fields.find((f) => f.key === 'clientSecret').secret).toBe(true);
    expect(registry.list().some((c) => c.key === 'onetrust')).toBe(true);
  });

  test('test() requires base URL + client credentials before any network call', async () => {
    await expect(ot.test({})).rejects.toThrow(/required/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('test() authenticates via client-credentials', async () => {
    global.fetch.mockResolvedValueOnce(token()).mockResolvedValueOnce(ok({ content: [] }));
    const r = await ot.test(creds);
    expect(r.ok).toBe(true);
    expect(global.fetch.mock.calls[0][0]).toContain('/oauth/token');
  });

  test('fetchSignals() computes open + overdue DSARs and active legal holds', async () => {
    const now = Date.now();
    global.fetch
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok({ content: [
        { status: 'InProgress', dueDate: new Date(now - 1000).toISOString() }, // open + overdue
        { status: 'InProgress', dueDate: new Date(now + 1e7).toISOString() },  // open, not overdue
        { status: 'Closed', dueDate: new Date(now - 1e7).toISOString() },      // closed → excluded
      ], totalPages: 1 }))
      .mockResolvedValueOnce(ok({ content: [{ status: 'Active' }, { status: 'Active' }, { status: 'Closed' }] }));
    const r = await ot.fetchSignals(creds);
    const val = (k) => r.signals.find((s) => s.key === k).value;
    expect(val('dsar_open')).toBe(2);
    expect(val('dsar_overdue')).toBe(1);
    expect(val('legal_holds')).toBe(2);
    expect(r.meta.vendor).toBe('OneTrust');
  });

  test('fetchSignals() still returns DSAR signals when the incident module is unavailable', async () => {
    global.fetch
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok({ content: [{ status: 'InProgress' }], totalPages: 1 }))
      .mockResolvedValueOnce(fail(404)); // no incident/holds module
    const r = await ot.fetchSignals(creds);
    expect(r.signals.find((s) => s.key === 'dsar_open').value).toBe(1);
    expect(r.signals.some((s) => s.key === 'legal_holds')).toBe(false);
  });
});
