'use strict';

/**
 * Symantec DLP connector (read-only, Symantec DLP REST API, HTTP Basic auth).
 *
 * Fills dlp_pct — DLP coverage: the share of configured detection policies that
 * are ACTIVE/enforcing out of all configured policies. Built to the documented
 * Symantec (Broadcom) DLP Enforce REST API contract — GET
 * {baseUrl}/ProtectManager/webservices/v2/policies (Basic auth with an Enforce
 * console user). Some Enforce versions expose policies under /api/... instead;
 * validate against a live Enforce server with a read-only account before relying
 * on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.baseUrl || '').replace(/\/+$/, '');
const authH = (creds) => ({
  Authorization: `Basic ${Buffer.from(`${creds.username}:${creds.password}`).toString('base64')}`,
  Accept: 'application/json',
});

const POLICIES_PATH = '/ProtectManager/webservices/v2/policies';

const isEnforcing = (p) => {
  const s = String(p.status || p.state || (p.active ? 'active' : '') || '').toLowerCase();
  return p.active === true || s === 'active' || s === 'enabled' || s === 'enforced';
};

async function test(creds) {
  if (!base(creds) || !creds.username || !creds.password) {
    throw new Error('Symantec DLP base URL, username and password are required.');
  }
  await jsonOrThrow(await http(`${base(creds)}${POLICIES_PATH}`, { headers: authH(creds) }), 'Symantec DLP');
  return { ok: true, detail: 'Authenticated to the Symantec DLP REST API.' };
}

async function fetchSignals(creds) {
  const H = authH(creds);
  const signals = [];
  try {
    const j = await jsonOrThrow(await http(`${base(creds)}${POLICIES_PATH}`, { headers: H }), 'Symantec DLP');
    const policies = Array.isArray(j) ? j : (j.policies || j.value || j.data || []);
    const total = policies.length;
    if (total > 0) {
      const enforcing = policies.filter(isEnforcing).length;
      signals.push({ key: 'dlp_pct', value: Math.round((enforcing / total) * 100), asOf: nowIso(), raw: { enforcing, total } });
    }
  } catch (e) { if (/HTTP 4|HTTP 5/.test(e.message)) throw e; }
  if (!signals.length) throw new Error('Authenticated, but no DLP policies were readable — confirm the account can read Enforce policies.');
  return { signals, meta: { vendor: 'Broadcom' } };
}

module.exports = {
  key: 'symantec_dlp', label: 'Symantec DLP', vendor: 'Broadcom', category: 'Data loss prevention (DLP)',
  signals: ['dlp_pct'],
  scopes: ['policy.read'],
  fields: [
    { key: 'baseUrl', label: 'Enforce server base URL (https://enforce.example.com)' },
    { key: 'username', label: 'Enforce console username' },
    { key: 'password', label: 'Password', secret: true },
  ],
  test, fetchSignals,
};
