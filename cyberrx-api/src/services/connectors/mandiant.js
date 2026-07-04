'use strict';

/**
 * Mandiant Advantage Threat Intelligence connector (read-only, MATI API v4).
 *
 * Fills threat_actors_active — the number of distinct threat actors Mandiant is
 * actively tracking with recent activity relevant to the subscription. Auth is
 * the documented client-credentials flow: HTTP Basic (key id + secret) → token,
 * then GET /v4/actor. Built to the documented MATI contract; validate against a
 * real subscription before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');
const { actorObj, actorsSignal } = require('./threatpack');

const base = (creds) => String(creds.apiUrl || 'https://api.intelligence.mandiant.com').replace(/\/+$/, '');

async function token(creds) {
  const basic = Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString('base64');
  const r = await http(`${base(creds)}/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });
  const j = await jsonOrThrow(r, 'Mandiant');
  if (!j.access_token) throw new Error('Mandiant: no access token returned.');
  return j.access_token;
}

async function test(creds) {
  if (!creds.keyId || !creds.keySecret) throw new Error('Mandiant API key ID and secret are required.');
  const tk = await token(creds);
  await jsonOrThrow(await http(`${base(creds)}/v4/actor?limit=1`, { headers: { Authorization: `Bearer ${tk}`, 'X-App-Name': 'cyberrx', Accept: 'application/json' } }), 'Mandiant');
  return { ok: true, detail: 'Authenticated to the Mandiant Advantage API.' };
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  const H = { Authorization: `Bearer ${tk}`, 'X-App-Name': 'cyberrx', Accept: 'application/json' };
  const j = await jsonOrThrow(await http(`${base(creds)}/v4/actor?limit=1000`, { headers: H }), 'Mandiant');
  const actors = j.threat_actors || j.actors || [];
  // "Active" = flagged as active by Mandiant, or updated within the last 90 days.
  const cutoff = Date.now() - 90 * 864e5;
  const isActive = (a) => a.is_active === true || (Date.parse(a.last_activity_time || a.last_updated || '') >= cutoff);
  const activeActors = actors.filter(isActive);
  if (!actors.length) throw new Error('Authenticated, but no actor data was readable — confirm the subscription includes actor intelligence.');
  const list = activeActors.map((a) => actorObj(a.name, [].concat(a.motivations || []).map((m) => m.name || m).slice(0, 2).join(' / ') || 'Threat actor', (a.description || (a.audience || []).map((x) => x.name).join(', ') || 'Actively tracked by Mandiant.')));
  return { signals: [
    { key: 'threat_actors_active', value: activeActors.length, asOf: nowIso(), raw: { actors: actors.length, active: activeActors.length } },
    actorsSignal(list),
  ], meta: { vendor: 'Mandiant' } };
}

module.exports = {
  key: 'mandiant', label: 'Mandiant Advantage', vendor: 'Mandiant (Google)', category: 'Threat Intelligence', tier: 'paid',
  signals: ['threat_actors_active', 'threat_actors_json'],
  scopes: ['MATI — actor intelligence read'],
  fields: [
    { key: 'keyId', label: 'API key ID' },
    { key: 'keySecret', label: 'API key secret', secret: true },
    { key: 'apiUrl', label: 'API URL (optional — defaults to api.intelligence.mandiant.com)', optional: true },
  ],
  test, fetchSignals,
};
