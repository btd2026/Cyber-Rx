'use strict';

/**
 * Microsoft Purview connector (read-only, MS Graph OAuth2 client-credentials).
 *
 * Fills dlp_pct — DLP coverage: the share of Data Loss Prevention policies that
 * are ENFORCING (mode = enable, i.e. actively blocking/enforcing) out of all
 * configured DLP policies. Built to the documented Microsoft Graph security DLP
 * contract (beta) — GET /security/dataLossPreventionPolicies. The beta shape may
 * change; validate against a real tenant with a read-only app registration
 * (SecurityEvents.Read.All / InformationProtectionPolicy.Read.All) before relying
 * on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const GRAPH = 'https://graph.microsoft.com/beta';

async function token(creds) {
  const url = `https://login.microsoftonline.com/${encodeURIComponent(creds.tenantId)}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: 'client_credentials', client_id: creds.clientId, client_secret: creds.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
  });
  const r = await http(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await jsonOrThrow(r, 'Microsoft Purview');
  if (!j.access_token) throw new Error('Microsoft Purview: no access token returned.');
  return j.access_token;
}

const authH = (tk) => ({ Authorization: `Bearer ${tk}`, Accept: 'application/json' });

// A DLP policy is "enforcing" when its mode actively applies actions (block/
// enforce) rather than test/audit-only. Graph exposes this as `mode`.
const isEnforcing = (p) => {
  const m = String(p.mode || p.state || '').toLowerCase();
  return m === 'enable' || m === 'enforce' || m === 'enabled' || m === 'active';
};

async function test(creds) {
  if (!creds.tenantId || !creds.clientId || !creds.clientSecret) {
    throw new Error('Microsoft Purview tenant ID, client ID and client secret are required.');
  }
  const tk = await token(creds);
  await jsonOrThrow(await http(`${GRAPH}/security/dataLossPreventionPolicies`, { headers: authH(tk) }), 'Microsoft Purview');
  return { ok: true, detail: 'Authenticated to the Microsoft Graph DLP API.' };
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  const H = authH(tk);
  const signals = [];
  try {
    const j = (await jsonOrThrow(await http(`${GRAPH}/security/dataLossPreventionPolicies`, { headers: H }), 'Microsoft Purview')) || {};
    const policies = j.value || [];
    const total = policies.length;
    if (total > 0) {
      const enforcing = policies.filter(isEnforcing).length;
      signals.push({ key: 'dlp_pct', value: Math.round((enforcing / total) * 100), asOf: nowIso(), raw: { enforcing, total } });
    }
  } catch (e) { if (/HTTP 4|HTTP 5/.test(e.message)) throw e; }
  if (!signals.length) throw new Error('Authenticated, but no DLP policies were readable — confirm the app can read dataLossPreventionPolicies.');
  return { signals, meta: { vendor: 'Microsoft' } };
}

module.exports = {
  key: 'purview', label: 'Microsoft Purview', vendor: 'Microsoft', category: 'Data loss prevention (DLP)',
  signals: ['dlp_pct'],
  scopes: ['InformationProtectionPolicy.Read.All', 'SecurityEvents.Read.All'],
  fields: [
    { key: 'tenantId', label: 'Directory (tenant) ID' },
    { key: 'clientId', label: 'Application (client) ID' },
    { key: 'clientSecret', label: 'Client secret', secret: true },
  ],
  test, fetchSignals,
};
