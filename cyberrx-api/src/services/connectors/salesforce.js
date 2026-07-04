'use strict';

/**
 * Salesforce connector (read-only, REST + SOQL via OAuth2).
 *
 * Fills the Business-Growth money signals so they stop being hand-entered:
 *   pipeline_in_review_usd — open pipeline $ on opportunities gated by a security
 *                            review (the revenue your program clears)
 *   deals_gated_qtr        — count of those opportunities closing this quarter
 *
 * Which opportunities count as "security-gated" is tenant-specific, so both
 * queries are configurable (default: a Security_Review__c checkbox). Auth is the
 * documented OAuth2 password grant with a connected app + a read-only integration
 * user. Built to the documented Salesforce REST/SOQL contract; validate against
 * your org (and adjust the SOQL to your CRM's security-review flag) before relying
 * on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const API_V = 'v59.0';
const DEFAULT_PIPE = 'SELECT SUM(Amount) total FROM Opportunity WHERE IsClosed = false AND Security_Review__c = true';
const DEFAULT_DEALS = 'SELECT COUNT(Id) c FROM Opportunity WHERE IsClosed = false AND Security_Review__c = true AND CloseDate = THIS_QUARTER';

async function token(creds) {
  const loginUrl = String(creds.loginUrl || 'https://login.salesforce.com').replace(/\/+$/, '');
  const body = new URLSearchParams({
    grant_type: 'password', client_id: creds.clientId, client_secret: creds.clientSecret,
    username: creds.username, password: `${creds.password || ''}${creds.securityToken || ''}`,
  });
  const j = await jsonOrThrow(await http(`${loginUrl}/services/oauth2/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }), 'Salesforce');
  if (!j.access_token || !j.instance_url) throw new Error('Salesforce: no access token / instance URL returned.');
  return j;
}

async function soql(auth, q) {
  return jsonOrThrow(await http(`${auth.instance_url}/services/data/${API_V}/query?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${auth.access_token}`, Accept: 'application/json' } }), 'Salesforce');
}

// First numeric value in an aggregate record (alias-agnostic; skips `attributes`).
function firstNum(rec) {
  if (!rec) return null;
  for (const k of Object.keys(rec)) { if (k === 'attributes') continue; const v = Number(rec[k]); if (Number.isFinite(v)) return v; }
  return null;
}

async function test(creds) {
  for (const f of ['clientId', 'clientSecret', 'username', 'password']) {
    if (!creds[f]) throw new Error('Salesforce client ID/secret and integration username/password are required.');
  }
  const auth = await token(creds);
  await soql(auth, 'SELECT Id FROM Opportunity LIMIT 1');
  return { ok: true, detail: 'Authenticated to the Salesforce REST API.' };
}

async function fetchSignals(creds) {
  const auth = await token(creds);
  const signals = [];
  try {
    const j = await soql(auth, creds.pipelineSoql || DEFAULT_PIPE);
    const v = firstNum((j.records || [])[0]);
    if (v != null) signals.push({ key: 'pipeline_in_review_usd', value: Math.round(v), asOf: nowIso(), raw: { source: creds.pipelineSoql ? 'custom' : 'default' } });
  } catch (e) { if (/HTTP 401|HTTP 403/.test(e.message)) throw e; }
  try {
    const j = await soql(auth, creds.dealsSoql || DEFAULT_DEALS);
    const v = firstNum((j.records || [])[0]);
    const count = v != null ? v : (Number.isFinite(Number(j.totalSize)) ? Number(j.totalSize) : null);
    if (count != null) signals.push({ key: 'deals_gated_qtr', value: count, asOf: nowIso(), raw: { source: creds.dealsSoql ? 'custom' : 'default' } });
  } catch (e) { if (/HTTP 401|HTTP 403/.test(e.message)) throw e; }
  if (!signals.length) throw new Error('Authenticated, but no security-gated opportunities were readable — adjust the SOQL to your CRM’s security-review flag.');
  return { signals, meta: { vendor: 'Salesforce' } };
}

module.exports = {
  key: 'salesforce', label: 'Salesforce', vendor: 'Salesforce', category: 'CRM / Revenue', tier: 'paid',
  signals: ['pipeline_in_review_usd', 'deals_gated_qtr'],
  scopes: ['api (read-only integration user) — Opportunity read'],
  fields: [
    { key: 'clientId', label: 'Connected-app consumer key' },
    { key: 'clientSecret', label: 'Connected-app consumer secret', secret: true },
    { key: 'username', label: 'Integration user' },
    { key: 'password', label: 'Password', secret: true },
    { key: 'securityToken', label: 'Security token (appended to password)', secret: true, optional: true },
    { key: 'loginUrl', label: 'Login URL (optional — use test.salesforce.com for a sandbox)', optional: true },
    { key: 'pipelineSoql', label: 'Pipeline SOQL (optional — override for your security-review flag)', optional: true },
    { key: 'dealsSoql', label: 'Deals-gated SOQL (optional)', optional: true },
  ],
  test, fetchSignals,
};
