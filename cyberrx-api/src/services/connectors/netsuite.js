'use strict';

/**
 * NetSuite connector (read-only, SuiteQL over the REST Query API, OAuth 1.0a
 * token-based authentication).
 *
 * Fills payment_anomalies — the count of vendor-payment exceptions from a
 * SuiteQL query you point at your exceptions logic (duplicate payees, changed
 * bank details, out-of-pattern amounts). Defaults to counting duplicate vendor
 * payments (same entity + amount) in the last 30 days; override `suiteql` to
 * match your controls. Auth is the documented OAuth1 TBA (HMAC-SHA256) with the
 * account realm. Built to the documented SuiteQL contract; validate against a
 * real account with a read-only role before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');
const { authHeader } = require('./oauth1');

const endpoint = (creds) => `https://${creds.accountId.toLowerCase().replace('_', '-')}.suitetalk.api.netsuite.com/services/rest/query/v1/suiteql`;
const DEFAULT_QL = "SELECT COUNT(*) AS c FROM (SELECT entity, foreignamount FROM transaction WHERE type='VendPymt' AND trandate >= (SYSDATE-30) GROUP BY entity, foreignamount HAVING COUNT(*) > 1)";

async function query(creds, ql, nonceSeed) {
  const url = endpoint(creds);
  const { header } = authHeader({
    method: 'POST', url, consumerKey: creds.consumerKey, consumerSecret: creds.consumerSecret,
    tokenKey: creds.tokenId, tokenSecret: creds.tokenSecret, realm: creds.accountId,
    nonce: `cyberrx${nonceSeed}`, timestamp: Math.floor(Date.now() / 1000),
  });
  return jsonOrThrow(await http(url, {
    method: 'POST', headers: { Authorization: header, 'Content-Type': 'application/json', Prefer: 'transient', Accept: 'application/json' },
    body: JSON.stringify({ q: ql }),
  }), 'NetSuite');
}

async function test(creds) {
  for (const f of ['accountId', 'consumerKey', 'consumerSecret', 'tokenId', 'tokenSecret']) {
    if (!creds[f]) throw new Error('NetSuite account ID, consumer key/secret and token ID/secret are required.');
  }
  await query(creds, 'SELECT COUNT(*) AS c FROM transaction WHERE rownum = 1', 'test');
  return { ok: true, detail: 'Authenticated to the NetSuite SuiteQL API.' };
}

async function fetchSignals(creds) {
  const j = await query(creds, creds.suiteql || DEFAULT_QL, 'sig');
  const rows = j.items || [];
  const c = rows.length ? Number(rows[0].c != null ? rows[0].c : Object.values(rows[0])[0]) : 0;
  const value = Number.isFinite(c) ? c : 0;
  return { signals: [{ key: 'payment_anomalies', value, asOf: nowIso(), raw: { query: creds.suiteql ? 'custom' : 'default-duplicate-vendor-payments', count: value } }], meta: { vendor: 'NetSuite' } };
}

module.exports = {
  key: 'netsuite', label: 'NetSuite', vendor: 'Oracle NetSuite', category: 'ERP / SOX ITGC',
  signals: ['payment_anomalies'],
  scopes: ['Read-only role — SuiteQL / transactions'],
  fields: [
    { key: 'accountId', label: 'Account ID (e.g. 1234567 or 1234567_SB1)' },
    { key: 'consumerKey', label: 'Integration consumer key' },
    { key: 'consumerSecret', label: 'Integration consumer secret', secret: true },
    { key: 'tokenId', label: 'Access token ID' },
    { key: 'tokenSecret', label: 'Access token secret', secret: true },
    { key: 'suiteql', label: 'Exceptions SuiteQL (optional — override the default)', optional: true },
  ],
  test, fetchSignals,
};
