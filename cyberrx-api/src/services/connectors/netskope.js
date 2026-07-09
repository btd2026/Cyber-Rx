'use strict';

/**
 * Netskope connector (read-only, Netskope REST API v2 token auth).
 *
 * Fills dlp_pct — DLP coverage: the share of Real-time Protection policy rules
 * that reference a DLP profile and are ENABLED/enforcing out of all configured
 * rules. Built to the documented Netskope REST API v2 contract: authenticate
 * with the `Netskope-Api-Token` header against https://{tenant}.goskope.com, then
 * GET /api/v2/policy/npa/rules (or the DLP profile list). Exact policy resource
 * paths vary by tenant edition; validate against a live tenant with a read-only
 * API token before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.baseUrl || '').replace(/\/+$/, '');
const authH = (creds) => ({ 'Netskope-Api-Token': creds.token, Accept: 'application/json' });

const RULES_PATH = '/api/v2/policy/npa/rules';

const isEnforcing = (r) => {
  const s = String(r.enabled != null ? (r.enabled ? 'enabled' : 'disabled') : (r.status || r.state || '')).toLowerCase();
  return r.enabled === true || s === 'enabled' || s === 'active' || s === '1';
};

async function test(creds) {
  if (!base(creds) || !creds.token) throw new Error('Netskope tenant base URL and API token are required.');
  await jsonOrThrow(await http(`${base(creds)}${RULES_PATH}`, { headers: authH(creds) }), 'Netskope');
  return { ok: true, detail: 'Authenticated to the Netskope REST API v2.' };
}

async function fetchSignals(creds) {
  const H = authH(creds);
  const signals = [];
  try {
    const j = await jsonOrThrow(await http(`${base(creds)}${RULES_PATH}`, { headers: H }), 'Netskope');
    const rules = Array.isArray(j) ? j : (j.data || j.rules || j.result || []);
    const total = rules.length;
    if (total > 0) {
      const enforcing = rules.filter(isEnforcing).length;
      signals.push({ key: 'dlp_pct', value: Math.round((enforcing / total) * 100), asOf: nowIso(), raw: { enforcing, total } });
    }
  } catch (e) { if (/HTTP 4|HTTP 5/.test(e.message)) throw e; }
  if (!signals.length) throw new Error('Authenticated, but no policy rules were readable — confirm the token can read policy rules.');
  return { signals, meta: { vendor: 'Netskope' } };
}

module.exports = {
  key: 'netskope', label: 'Netskope', vendor: 'Netskope', category: 'Data loss prevention (DLP)',
  signals: ['dlp_pct'],
  scopes: ['policy:read'],
  fields: [
    { key: 'baseUrl', label: 'Tenant base URL (https://<tenant>.goskope.com)' },
    { key: 'token', label: 'REST API v2 token', secret: true },
  ],
  test, fetchSignals,
};
