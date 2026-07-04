'use strict';

/**
 * Wiz connector (read-only, OAuth2 client-credentials → Wiz GraphQL API).
 *
 * Fills cspm_pct — cloud-posture compliance: the share of evaluated
 * configuration-rule checks across the connected cloud estate that PASS. Wiz
 * exposes this through the GraphQL `configurationFindings` aggregation
 * (PASS / FAIL per resource per rule); cspm_pct = pass / (pass + fail).
 *
 * Auth is Wiz's documented client-credentials flow: POST to the auth endpoint
 * (auth.app.wiz.io by default) with a service-account client id/secret and the
 * `wiz-api` audience, then call the tenant GraphQL endpoint with the bearer
 * token. Built to the documented Wiz API contract; validate against a real
 * tenant with a read-only service account before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const authUrl = (creds) => String(creds.authUrl || 'https://auth.app.wiz.io/oauth/token').replace(/\/+$/, '');
const apiUrl = (creds) => String(creds.apiUrl || '').replace(/\/+$/, '');

async function token(creds) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials', client_id: creds.clientId, client_secret: creds.clientSecret,
    audience: creds.audience || 'wiz-api',
  });
  const r = await http(authUrl(creds), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await jsonOrThrow(r, 'Wiz');
  if (!j.access_token) throw new Error('Wiz: no access token returned.');
  return j.access_token;
}

// Aggregate PASS/FAIL configuration findings via GraphQL. Uses the analytics
// count so we never page the full finding set.
const COUNT_QUERY = `query PostureCounts($result: [ConfigurationFindingStatus!]) {
  configurationFindings(filterBy: { result: $result }) { totalCount }
}`;

async function countByResult(creds, tk, result) {
  const r = await http(`${apiUrl(creds)}/graphql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: COUNT_QUERY, variables: { result: [result] } }),
  });
  const j = await jsonOrThrow(r, 'Wiz');
  if (j.errors && j.errors.length) throw new Error(`Wiz GraphQL: ${j.errors[0].message}`);
  const n = j.data && j.data.configurationFindings && j.data.configurationFindings.totalCount;
  return Number.isFinite(Number(n)) ? Number(n) : null;
}

async function test(creds) {
  if (!apiUrl(creds) || !creds.clientId || !creds.clientSecret) {
    throw new Error('Wiz API endpoint URL, client ID and client secret are required.');
  }
  const tk = await token(creds);
  // A minimal GraphQL call confirms the token is accepted by the tenant endpoint.
  await countByResult(creds, tk, 'PASS');
  return { ok: true, detail: 'Authenticated to the Wiz GraphQL API.' };
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  const signals = [];
  try {
    const pass = await countByResult(creds, tk, 'PASS');
    const fail = await countByResult(creds, tk, 'FAIL');
    const total = (pass || 0) + (fail || 0);
    if (total > 0) {
      signals.push({ key: 'cspm_pct', value: Math.round((pass / total) * 100), asOf: nowIso(), raw: { pass, fail, total } });
    }
  } catch (e) { if (/GraphQL/.test(e.message)) throw e; /* else fall through to the no-signal error */ }
  if (!signals.length) throw new Error('Authenticated, but no configuration findings were readable — confirm the service account can read configurationFindings.');
  return { signals, meta: { vendor: 'Wiz' } };
}

module.exports = {
  key: 'wiz', label: 'Wiz', vendor: 'Wiz', category: 'Cloud Security Posture (CSPM)',
  signals: ['cspm_pct'],
  scopes: ['read:configuration_findings'],
  fields: [
    { key: 'apiUrl', label: 'Wiz API endpoint (https://api.<region>.app.wiz.io)' },
    { key: 'clientId', label: 'Service-account client ID' },
    { key: 'clientSecret', label: 'Service-account client secret', secret: true },
    { key: 'authUrl', label: 'Auth URL (optional — defaults to auth.app.wiz.io)', optional: true },
    { key: 'audience', label: 'Audience (optional — defaults to wiz-api)', optional: true },
  ],
  test, fetchSignals,
};
