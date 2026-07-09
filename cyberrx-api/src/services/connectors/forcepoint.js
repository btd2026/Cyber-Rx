'use strict';

/**
 * Forcepoint DLP connector (read-only, Forcepoint Security Manager REST API).
 *
 * Fills dlp_pct — DLP coverage: the share of configured DLP policies that are
 * ENABLED/enforcing out of all configured policies. Built to the documented
 * Forcepoint Security Manager / DLP REST API contract: obtain a bearer token
 * (POST {baseUrl}/dlp/rest/v1/auth/refresh-token, or Basic auth with an API key)
 * then read the policy list. Exact resource paths differ by Security Manager
 * version; validate against a live manager with a read-only account before
 * relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.baseUrl || '').replace(/\/+$/, '');

// Forcepoint accepts either an API key (Basic/Bearer) or username+password to
// mint a bearer token. Prefer the API key when supplied.
async function bearer(creds) {
  if (creds.apiKey) return creds.apiKey;
  const r = await http(`${base(creds)}/dlp/rest/v1/auth/refresh-token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ username: creds.username, password: creds.password }),
  });
  const j = await jsonOrThrow(r, 'Forcepoint DLP');
  const tk = j.access_token || j.token || j.accessToken;
  if (!tk) throw new Error('Forcepoint DLP: no access token returned.');
  return tk;
}

const authH = (tk) => ({ Authorization: `Bearer ${tk}`, Accept: 'application/json' });

const isEnforcing = (p) => {
  const s = String(p.status || p.state || (p.enabled ? 'enabled' : '') || '').toLowerCase();
  return p.enabled === true || s === 'enabled' || s === 'active' || s === 'enforced';
};

async function test(creds) {
  if (!base(creds) || (!creds.apiKey && (!creds.username || !creds.password))) {
    throw new Error('Forcepoint base URL and an API key (or username + password) are required.');
  }
  const tk = await bearer(creds);
  await jsonOrThrow(await http(`${base(creds)}/dlp/rest/v1/policies`, { headers: authH(tk) }), 'Forcepoint DLP');
  return { ok: true, detail: 'Authenticated to the Forcepoint DLP REST API.' };
}

async function fetchSignals(creds) {
  const tk = await bearer(creds);
  const H = authH(tk);
  const signals = [];
  try {
    const j = await jsonOrThrow(await http(`${base(creds)}/dlp/rest/v1/policies`, { headers: H }), 'Forcepoint DLP');
    const policies = Array.isArray(j) ? j : (j.policies || j.value || j.data || []);
    const total = policies.length;
    if (total > 0) {
      const enforcing = policies.filter(isEnforcing).length;
      signals.push({ key: 'dlp_pct', value: Math.round((enforcing / total) * 100), asOf: nowIso(), raw: { enforcing, total } });
    }
  } catch (e) { if (/HTTP 4|HTTP 5/.test(e.message)) throw e; }
  if (!signals.length) throw new Error('Authenticated, but no DLP policies were readable — confirm the account can read DLP policies.');
  return { signals, meta: { vendor: 'Forcepoint' } };
}

module.exports = {
  key: 'forcepoint', label: 'Forcepoint DLP', vendor: 'Forcepoint', category: 'Data loss prevention (DLP)',
  signals: ['dlp_pct'],
  scopes: ['dlp:policies:read'],
  fields: [
    { key: 'baseUrl', label: 'Security Manager base URL (https://fsm.example.com)' },
    { key: 'apiKey', label: 'API key (optional if using username/password)', secret: true, optional: true },
    { key: 'username', label: 'Username (optional if using API key)', optional: true },
    { key: 'password', label: 'Password', secret: true, optional: true },
  ],
  test, fetchSignals,
};
