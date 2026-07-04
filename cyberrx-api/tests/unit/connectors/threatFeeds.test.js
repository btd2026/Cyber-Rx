'use strict';

/**
 * Threat-intel feed enhancements: the paid feeds (Recorded Future / Mandiant /
 * Anomali) now emit threat_actors_json so a live feed repopulates the actor list,
 * and two FREE connectors (AlienVault OTX, CISA KEV) provide a no-cost live
 * option. Mocks global.fetch — no network, no DB.
 */

const registry = require('../../../src/services/connectors');
const ok = (d) => ({ ok: true, status: 200, json: async () => d, text: async () => '' });
const fail = (s) => ({ ok: false, status: s, json: async () => ({}), text: async () => 'err' });
function queue(...r) { const q = [...r]; global.fetch = jest.fn(async () => (q.length > 1 ? q.shift() : q[0])); }
const parseActors = (r) => JSON.parse(r.signals.find((s) => s.key === 'threat_actors_json').value);

beforeEach(() => jest.clearAllMocks());

describe('cost tiers are exposed to the buyer', () => {
  test('paid feeds are tier:paid, free feeds are tier:free', () => {
    const tier = (k) => registry.list().find((c) => c.key === k).tier;
    expect(tier('recordedfuture')).toBe('paid');
    expect(tier('mandiant')).toBe('paid');
    expect(tier('anomali')).toBe('paid');
    expect(tier('otx')).toBe('free');
    expect(tier('cisa')).toBe('free');
  });
});

describe('paid feeds repopulate the actor list (threat_actors_json)', () => {
  test('recordedfuture emits the distinct actors as a JSON signal', async () => {
    const rf = require('../../../src/services/connectors/recordedfuture');
    queue(ok({ data: { results: [
      { entities: [{ type: 'ThreatActor', name: 'FIN7' }] },
      { entities: [{ type: 'ThreatActor', name: 'LockBit' }] },
      { entities: [{ type: 'ThreatActor', name: 'FIN7' }] },
    ] } }));
    const r = await rf.fetchSignals({ apiToken: 't' });
    const actors = parseActors(r);
    expect(actors.map((a) => a.n).sort()).toEqual(['FIN7', 'LockBit']);
    expect(actors[0]).toHaveProperty('t');
    expect(actors[0]).toHaveProperty('m');
  });

  test('mandiant emits active actors with motivation as the type', async () => {
    const m = require('../../../src/services/connectors/mandiant');
    queue(ok({ access_token: 't' }), ok({ threat_actors: [
      { name: 'APT29', is_active: true, motivations: [{ name: 'Espionage' }], description: 'Cozy Bear' },
      { name: 'Old', last_activity_time: '2000-01-01T00:00:00Z' },
    ] }));
    const r = await m.fetchSignals({ keyId: 'k', keySecret: 's' });
    const actors = parseActors(r);
    expect(actors).toHaveLength(1);
    expect(actors[0].n).toBe('APT29');
    expect(actors[0].t).toMatch(/Espionage/);
  });

  test('anomali emits active threat models as actors', async () => {
    const a = require('../../../src/services/connectors/anomali');
    queue(ok({ objects: [{ name: 'Sandworm', status: 'active', description: 'ICS attacker' }, { name: 'X', status: 'inactive' }] }));
    const r = await a.fetchSignals({ username: 'u', apiKey: 'k' });
    const actors = parseActors(r);
    expect(actors.map((x) => x.n)).toEqual(['Sandworm']);
  });
});

describe('free option · AlienVault OTX', () => {
  const otx = require('../../../src/services/connectors/otx');
  test('is registered, free, and requires only an API key', async () => {
    expect(registry.get('otx').key).toBe('otx');
    expect(otx.tier).toBe('free');
    global.fetch = jest.fn();
    await expect(otx.test({})).rejects.toThrow(/API key is required/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });
  test('builds actors from subscribed pulse adversaries', async () => {
    queue(ok({ results: [
      { adversary: 'FIN7', name: 'FIN7 payment fraud campaign' },
      { adversary: 'FIN7', name: 'dup' },
      { adversary: 'LockBit', name: 'LockBit affiliate activity' },
    ] }));
    const r = await otx.fetchSignals({ apiKey: 'free-key' });
    expect(r.signals.find((s) => s.key === 'threat_actors_active').value).toBe(2);
    expect(parseActors(r).map((a) => a.n).sort()).toEqual(['FIN7', 'LockBit']);
  });
});

describe('free option · CISA KEV', () => {
  const cisa = require('../../../src/services/connectors/cisa');
  test('is registered, free, and needs no credentials', () => {
    expect(registry.get('cisa').key).toBe('cisa');
    expect(cisa.tier).toBe('free');
    expect(cisa.fields.every((f) => f.optional)).toBe(true); // no required creds
  });
  test('counts CVEs added to the KEV catalog in the last 30 days', async () => {
    const recent = new Date(Date.now() - 5 * 864e5).toISOString().slice(0, 10);
    const old = '2020-01-01';
    queue(ok({ vulnerabilities: [
      { cveID: 'CVE-1', dateAdded: recent }, { cveID: 'CVE-2', dateAdded: recent }, { cveID: 'CVE-3', dateAdded: old },
    ] }));
    const r = await cisa.fetchSignals({});
    const s = r.signals.find((x) => x.key === 'exploited_cves');
    expect(s.value).toBe(2);
    expect(s.raw.totalKev).toBe(3);
  });
  test('surfaces a clear error if the public feed is empty', async () => {
    queue(ok({ vulnerabilities: [] }));
    await expect(cisa.fetchSignals({})).rejects.toThrow(/no vulnerabilities/i);
  });
});
