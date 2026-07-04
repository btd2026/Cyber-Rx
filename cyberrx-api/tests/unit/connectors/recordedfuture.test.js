'use strict';

/** Recorded Future connector unit tests — mocks global.fetch. */

const rf = require('../../../src/services/connectors/recordedfuture');
const registry = require('../../../src/services/connectors');

global.fetch = jest.fn();
const ok = (data) => ({ ok: true, status: 200, json: async () => data, text: async () => '' });
const fail = (status) => ({ ok: false, status, json: async () => ({}), text: async () => 'err' });
const creds = { apiToken: 'tok' };

describe('recordedfuture connector', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('exposes safe catalog metadata + is registered', () => {
    expect(rf.key).toBe('recordedfuture');
    expect(rf.category).toBe('Threat Intelligence');
    expect(rf.signals).toEqual(['threat_actors_active', 'threat_actors_json']);
    expect(rf.fields.find((f) => f.key === 'apiToken').secret).toBe(true);
    expect(registry.list().some((c) => c.key === 'recordedfuture')).toBe(true);
  });

  test('test() requires an API token before any network call', async () => {
    await expect(rf.test({})).rejects.toThrow(/required/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('test() authenticates with the X-RFToken header', async () => {
    global.fetch.mockResolvedValueOnce(ok({ data: { results: [] } }));
    const r = await rf.test(creds);
    expect(r.ok).toBe(true);
    expect(global.fetch.mock.calls[0][1].headers['X-RFToken']).toBe('tok');
  });

  test('test() surfaces an auth failure', async () => {
    global.fetch.mockResolvedValueOnce(fail(401));
    await expect(rf.test(creds)).rejects.toThrow(/Recorded Future returned HTTP 401/);
  });

  test('fetchSignals() counts DISTINCT active threat actors across triggered alerts', async () => {
    global.fetch.mockResolvedValueOnce(ok({ data: { results: [
      { entities: [{ type: 'ThreatActor', name: 'APT29' }] },
      { entities: [{ type: 'ThreatActor', name: 'APT29' }] },            // duplicate — counted once
      { entities: [{ type: 'Malware', name: 'X' }, { type: 'ThreatActor', name: 'Scattered Spider' }] },
    ] } }));
    const r = await rf.fetchSignals(creds);
    const s = r.signals.find((x) => x.key === 'threat_actors_active');
    expect(s.value).toBe(2);
    expect(s.raw).toEqual({ alerts: 3, distinctActors: 2 });
    expect(r.meta.vendor).toBe('Recorded Future');
  });

  test('fetchSignals() surfaces a server error', async () => {
    global.fetch.mockResolvedValueOnce(fail(500));
    await expect(rf.fetchSignals(creds)).rejects.toThrow(/Recorded Future returned HTTP 500/);
  });
});
