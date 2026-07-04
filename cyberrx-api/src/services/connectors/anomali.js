'use strict';

/**
 * Anomali ThreatStream connector (read-only, ThreatStream API v2).
 *
 * Fills threat_actors_active — the number of distinct active threat actors in
 * the org's ThreatStream, from the actor model endpoint. Auth is the documented
 * apikey header (`Authorization: apikey <user>:<key>`), then GET
 * /api/v1/threat_model_search or /api/v1/actor. Built to the documented
 * ThreatStream contract; validate against a real tenant before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.apiUrl || 'https://api.threatstream.com').replace(/\/+$/, '');
const authH = (creds) => ({ Authorization: `apikey ${creds.username}:${creds.apiKey}`, Accept: 'application/json' });

async function test(creds) {
  if (!creds.username || !creds.apiKey) throw new Error('Anomali username and API key are required.');
  await jsonOrThrow(await http(`${base(creds)}/api/v1/actor/?limit=1`, { headers: authH(creds) }), 'Anomali');
  return { ok: true, detail: 'Authenticated to the Anomali ThreatStream API.' };
}

async function fetchSignals(creds) {
  const j = await jsonOrThrow(await http(`${base(creds)}/api/v1/actor/?limit=1000&status=active`, { headers: authH(creds) }), 'Anomali');
  const objects = j.objects || j.results || [];
  // Distinct active actors by name (status filter applied server-side; guard client-side too).
  const names = new Set();
  for (const a of objects) {
    if (a.status && String(a.status).toLowerCase() !== 'active') continue;
    if (a.name) names.add(a.name);
  }
  const meta = j.meta || {};
  const count = names.size || (Number.isFinite(Number(meta.total_count)) ? Number(meta.total_count) : 0);
  if (!objects.length && !count) throw new Error('Authenticated, but no actor data was readable — confirm the key can read threat models.');
  return { signals: [{ key: 'threat_actors_active', value: count, asOf: nowIso(), raw: { returned: objects.length, distinctActive: names.size } }], meta: { vendor: 'Anomali' } };
}

module.exports = {
  key: 'anomali', label: 'Anomali ThreatStream', vendor: 'Anomali', category: 'Threat Intelligence',
  signals: ['threat_actors_active'],
  scopes: ['ThreatStream — threat models read'],
  fields: [
    { key: 'username', label: 'ThreatStream username / email' },
    { key: 'apiKey', label: 'API key', secret: true },
    { key: 'apiUrl', label: 'API URL (optional — defaults to api.threatstream.com)', optional: true },
  ],
  test, fetchSignals,
};
