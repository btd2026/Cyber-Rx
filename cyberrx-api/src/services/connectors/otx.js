'use strict';

/**
 * AlienVault OTX connector (FREE — requires only a free OTX account + API key).
 *
 * A no-cost live threat-intel option: fills threat_actors_active +
 * threat_actors_json from the adversaries referenced in your subscribed OTX
 * pulses (community + AlienVault threat reports). Auth is the documented
 * X-OTX-API-KEY header. Built to the documented OTX DirectConnect contract;
 * validate against a real account before relying on it.
 *
 * Cost: FREE. Sign up at otx.alienvault.com, copy the API key from your profile.
 */

const { http, jsonOrThrow, nowIso } = require('./http');
const { actorObj, actorsSignal } = require('./threatpack');

const base = (creds) => String(creds.apiUrl || 'https://otx.alienvault.com').replace(/\/+$/, '');
const authH = (creds) => ({ 'X-OTX-API-KEY': creds.apiKey, Accept: 'application/json' });

async function test(creds) {
  if (!creds.apiKey) throw new Error('OTX API key is required (free — from your otx.alienvault.com profile).');
  await jsonOrThrow(await http(`${base(creds)}/api/v1/pulses/subscribed?limit=1`, { headers: authH(creds) }), 'OTX');
  return { ok: true, detail: 'Authenticated to the AlienVault OTX API.' };
}

async function fetchSignals(creds) {
  const j = await jsonOrThrow(await http(`${base(creds)}/api/v1/pulses/subscribed?limit=50`, { headers: authH(creds) }), 'OTX');
  const pulses = j.results || j.pulses || [];
  const byActor = new Map();
  for (const p of pulses) {
    const adv = p.adversary || (Array.isArray(p.targeted_countries) && p.tags && p.tags.find((t) => /apt|group|bear|spider|panda|kitten/i.test(t)));
    if (adv && !byActor.has(adv)) byActor.set(adv, actorObj(adv, 'From OTX community pulse', p.name || 'Referenced in a subscribed OTX threat pulse.'));
  }
  const list = [...byActor.values()];
  if (!pulses.length && !list.length) throw new Error('Authenticated, but no subscribed pulses were readable — subscribe to OTX pulses to populate actors.');
  return { signals: [
    { key: 'threat_actors_active', value: list.length, asOf: nowIso(), raw: { pulses: pulses.length, distinctActors: list.length } },
    actorsSignal(list),
  ], meta: { vendor: 'AlienVault OTX' } };
}

module.exports = {
  key: 'otx', label: 'AlienVault OTX (free)', vendor: 'AT&T / LevelBlue', category: 'Threat Intelligence', tier: 'free',
  signals: ['threat_actors_active', 'threat_actors_json'],
  scopes: ['OTX DirectConnect — subscribed pulses read'],
  fields: [
    { key: 'apiKey', label: 'OTX API key (free — otx.alienvault.com profile)', secret: true },
    { key: 'apiUrl', label: 'API URL (optional — defaults to otx.alienvault.com)', optional: true },
  ],
  test, fetchSignals,
};
