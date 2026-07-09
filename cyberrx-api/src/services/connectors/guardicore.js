'use strict';

/**
 * Akamai Guardicore (Centra) connector (read-only, token auth → Centra API v3).
 *
 * Fills seg_pct — share of agent-managed assets whose agent is in ENFORCEMENT
 * mode (actively applying segmentation rules) vs. total assets that report an
 * enforcement state. Assets in Monitoring/test mode are not enforcing
 * segmentation, so they don't count.
 *
 * Auth: POST {baseUrl}/api/v3.0/authenticate with username/password → bearer
 * token, then the assets inventory. Only assets that expose a readable
 * enforcement mode are counted, so we never fabricate a ratio. Best-effort
 * mapping — validate against a real Centra tenant with a read-only user first.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.baseUrl || '').replace(/\/+$/, '');

async function token(creds) {
  const j = await jsonOrThrow(await http(`${base(creds)}/api/v3.0/authenticate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ username: creds.username, password: creds.password }),
  }), 'Guardicore');
  if (!j.access_token) throw new Error('Guardicore: no access token returned.');
  return j.access_token;
}

// Return whether an asset exposes a readable enforcement mode and whether it enforces.
function enforcement(a) {
  const modes = [a && a.enforcement_mode, a && a.agent && a.agent.enforcement_mode]
    .filter((v) => typeof v === 'string');
  if (modes.length) return { known: true, enforced: modes.some((m) => /enforce/i.test(m)) };
  if (typeof (a && a.is_enforcement_on) === 'boolean') return { known: true, enforced: a.is_enforcement_on === true };
  return { known: false, enforced: false };
}

async function test(creds) {
  if (!creds.baseUrl || !creds.username || !creds.password) {
    throw new Error('Guardicore Centra base URL, username and password are required.');
  }
  await token(creds);
  return { ok: true, detail: 'Authenticated to the Guardicore Centra API.' };
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  const H = { Authorization: `Bearer ${tk}`, Accept: 'application/json' };
  const signals = [];
  let known = 0; let enforced = 0; let offset = 0; let total = Infinity;
  while (offset < total && offset < 20000) {
    const j = await jsonOrThrow(await http(`${base(creds)}/api/v3.0/assets?limit=1000&offset=${offset}`, { headers: H }), 'Guardicore');
    const objects = (j && j.objects) || [];
    total = Number.isFinite(Number(j && j.total_count)) ? Number(j.total_count) : objects.length;
    for (const a of objects) { const e = enforcement(a); if (e.known) { known += 1; if (e.enforced) enforced += 1; } }
    if (!objects.length) break;
    offset += objects.length;
  }
  if (known > 0) signals.push({ key: 'seg_pct', value: Math.round((enforced / known) * 100), asOf: nowIso(), raw: { enforced, evaluated: known, totalAssets: total } });
  if (!signals.length) throw new Error('Authenticated, but no asset reported a readable enforcement mode — confirm agents are deployed and the user can read assets.');
  return { signals, meta: { vendor: 'Akamai' } };
}

module.exports = {
  key: 'guardicore', label: 'Akamai Guardicore', vendor: 'Akamai', category: 'Network segmentation / Zero-Trust',
  signals: ['seg_pct'],
  scopes: ['assets:read'],
  fields: [
    { key: 'baseUrl', label: 'Centra management URL (https://centra.example.com)' },
    { key: 'username', label: 'API username' },
    { key: 'password', label: 'API password', secret: true },
  ],
  test, fetchSignals,
};
