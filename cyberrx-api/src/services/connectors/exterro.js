'use strict';

/**
 * Exterro connector (read-only, Exterro Legal Hold REST API).
 *
 * Fills legal_holds — the number of active litigation holds in Exterro's Legal
 * GRC / Legal Hold module. Auth is the documented API-key bearer token, then GET
 * the legal-hold list filtered to active status. Built to the documented Exterro
 * contract; validate against your instance before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.baseUrl || '').replace(/\/+$/, '');
const authH = (creds) => ({ Authorization: `Bearer ${creds.apiKey}`, Accept: 'application/json' });
const holdsUrl = (creds) => `${base(creds)}/api/v1/legalholds?status=active&limit=500`;
const isActive = (h) => /active|issued|open/i.test(String(h.status || h.state || 'active'));

async function test(creds) {
  if (!base(creds) || !creds.apiKey) throw new Error('Exterro base URL and API key are required.');
  await jsonOrThrow(await http(holdsUrl(creds), { headers: authH(creds) }), 'Exterro');
  return { ok: true, detail: 'Authenticated to the Exterro Legal Hold API.' };
}

async function fetchSignals(creds) {
  const j = await jsonOrThrow(await http(holdsUrl(creds), { headers: authH(creds) }), 'Exterro');
  const holds = j.legalHolds || j.data || j.items || (Array.isArray(j) ? j : []);
  const active = holds.filter(isActive).length;
  return { signals: [{ key: 'legal_holds', value: active, asOf: nowIso(), raw: { holds: holds.length, active } }], meta: { vendor: 'Exterro' } };
}

module.exports = {
  key: 'exterro', label: 'Exterro', vendor: 'Exterro', category: 'Legal Hold / e-Discovery',
  signals: ['legal_holds'],
  scopes: ['Legal Hold — read'],
  fields: [
    { key: 'baseUrl', label: 'Exterro API URL (https://yourorg.exterro.net)' },
    { key: 'apiKey', label: 'API key', secret: true },
  ],
  test, fetchSignals,
};
