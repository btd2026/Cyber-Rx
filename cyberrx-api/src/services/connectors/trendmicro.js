'use strict';

/**
 * Trend Micro Vision One connector (read-only, Bearer token → Vision One API).
 *
 * Fills edr_pct — the share of known endpoints whose endpoint-security agent
 * component is ACTIVE/running. Uses the documented endpointSecurity endpoints
 * inventory (GET /v3.0/endpointSecurity/endpoints; some tenants expose the same
 * data at /v3.0/eiqs/endpoints) and counts endpoints reporting an on/running
 * agent vs. total. Built to the documented Vision One API contract; validate
 * against a real tenant with a read-only API key before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.baseUrl || 'https://api.xdr.trendmicro.com').replace(/\/+$/, '');
const authH = (creds) => ({ Authorization: `Bearer ${creds.token}`, Accept: 'application/json' });

// GET endpoint inventory → { items: [ ... ] } (paged; first page is enough for a ratio).
async function listEndpoints(creds) {
  const H = authH(creds);
  const paths = ['/v3.0/endpointSecurity/endpoints', '/v3.0/eiqs/endpoints'];
  let lastErr;
  for (const p of paths) {
    try {
      const j = await jsonOrThrow(await http(`${base(creds)}${p}?top=1000`, { headers: H }), 'Trend Micro');
      return (j && Array.isArray(j.items)) ? j.items : [];
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Trend Micro: no endpoint inventory endpoint reachable.');
}

// An endpoint counts as healthy if any agent/component reports a running/on state.
function isActive(ep) {
  const status = String(ep.agentUpdateStatus || ep.status || ep.eppAgent && ep.eppAgent.status || '').toLowerCase();
  const comps = Array.isArray(ep.componentUpdatePolicy) ? ep.componentUpdatePolicy : (ep.protectionManager ? [ep.protectionManager] : []);
  if (/on|running|active|connected|normal/.test(status)) return true;
  return comps.some((c) => /on|running|active|enabled/.test(String((c && (c.status || c.state)) || '').toLowerCase()));
}

async function test(creds) {
  if (!creds.token) throw new Error('Trend Micro Vision One API token is required.');
  await listEndpoints(creds);
  return { ok: true, detail: 'Authenticated to the Trend Micro Vision One API.' };
}

async function fetchSignals(creds) {
  const signals = [];
  try {
    const eps = await listEndpoints(creds);
    const total = eps.length;
    if (total > 0) {
      const active = eps.filter(isActive).length;
      signals.push({ key: 'edr_pct', value: Math.round((active / total) * 100), asOf: nowIso(), raw: { total, active } });
    }
  } catch (e) { if (/HTTP 4|HTTP 5/.test(e.message)) throw e; /* else fall through */ }
  if (!signals.length) throw new Error('Authenticated, but no endpoints were readable — confirm the key has Endpoint Inventory (view) permission.');
  return { signals, meta: { vendor: 'Trend Micro' } };
}

module.exports = {
  key: 'trendmicro', label: 'Trend Micro Vision One', vendor: 'Trend Micro', category: 'Endpoint / EDR',
  signals: ['edr_pct'],
  scopes: ['Endpoint Inventory: View'],
  fields: [
    { key: 'baseUrl', label: 'Regional API base (https://api.xdr.trendmicro.com)' },
    { key: 'token', label: 'API token', secret: true },
  ],
  test, fetchSignals,
};
