'use strict';

/**
 * Recorded Future connector (read-only, Connect API).
 *
 * Fills threat_actors_active — the number of distinct threat actors currently
 * generating TRIGGERED alerts in the org's Recorded Future watch lists. That is
 * the "who is actively targeting us right now" count the CISO threat panel
 * reads, sourced from real intelligence rather than the industry-modeled
 * baseline.
 *
 * Auth is the documented X-RFToken API-key header. We page the triggered-alert
 * search (/v2/alert/search?triggered=-24h..) and count the distinct threat-actor
 * entities referenced by those alerts. Built to the documented Connect API
 * contract; validate against a real subscription before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.apiUrl || 'https://api.recordedfuture.com').replace(/\/+$/, '');
const authH = (creds) => ({ 'X-RFToken': creds.apiToken, Accept: 'application/json' });

async function test(creds) {
  if (!creds.apiToken) throw new Error('Recorded Future API token is required.');
  await jsonOrThrow(await http(`${base(creds)}/v2/alert/search?limit=1`, { headers: authH(creds) }), 'Recorded Future');
  return { ok: true, detail: 'Authenticated to the Recorded Future Connect API.' };
}

// Pull entity names of a given type from an alert's expanded entity list.
function actorNames(alert) {
  const names = [];
  const buckets = [].concat(alert.entities || [], alert.references || []);
  for (const b of buckets) {
    const ents = [].concat(b.entities || [b]);
    for (const e of ents) {
      const type = String(e.type || (e.entity && e.entity.type) || '').toLowerCase();
      const name = e.name || (e.entity && e.entity.name);
      if (name && (type.includes('threatactor') || type === 'attacker')) names.push(name);
    }
  }
  return names;
}

async function fetchSignals(creds) {
  const H = authH(creds);
  const signals = [];
  try {
    const j = await jsonOrThrow(await http(`${base(creds)}/v2/alert/search?triggered=-24h+to+now&limit=200`, { headers: H }), 'Recorded Future');
    const alerts = (j && (j.data && j.data.results ? j.data.results : j.data)) || [];
    const actors = new Set();
    for (const a of alerts) actorNames(a).forEach((n) => actors.add(n));
    signals.push({ key: 'threat_actors_active', value: actors.size, asOf: nowIso(), raw: { alerts: alerts.length, distinctActors: actors.size } });
  } catch (e) { if (/HTTP 4|HTTP 5/.test(e.message)) throw e; }
  if (!signals.length) throw new Error('Authenticated, but no alert data was readable — confirm the token has Connect API alert access.');
  return { signals, meta: { vendor: 'Recorded Future' } };
}

module.exports = {
  key: 'recordedfuture', label: 'Recorded Future', vendor: 'Recorded Future', category: 'Threat Intelligence',
  signals: ['threat_actors_active'],
  scopes: ['Connect API — alerts read'],
  fields: [
    { key: 'apiToken', label: 'API token', secret: true },
    { key: 'apiUrl', label: 'API URL (optional — defaults to api.recordedfuture.com)', optional: true },
  ],
  test, fetchSignals,
};
