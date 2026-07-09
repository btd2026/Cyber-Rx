'use strict';

/**
 * Palo Alto Cortex XDR connector (read-only, API key headers → XDR public API).
 *
 * Fills edr_pct — the share of known endpoints whose agent is CONNECTED. Uses
 * the documented Endpoints API (POST /public_api/v1/endpoints/get_endpoints/)
 * and counts endpoint_status === 'CONNECTED' vs. total.
 *
 * Auth implemented here is STANDARD authorization: send the raw API key in
 * `Authorization` plus the key id in `x-xdr-auth-id`. For ADVANCED (recommended)
 * auth the `Authorization` value is SHA256(apiKey + nonce + timestamp) sent
 * alongside `x-xdr-nonce` and `x-xdr-timestamp` headers — swap authH for that
 * if the key is provisioned Advanced. Built to the documented Cortex XDR API
 * contract; validate against a real tenant with a read-only key before relying
 * on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => `https://${String(creds.fqdn || '').replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
// Standard auth: raw API key + key id. (Advanced: Authorization = SHA256(apiKey+nonce+timestamp).)
const authH = (creds) => ({
  'x-xdr-auth-id': String(creds.keyId),
  Authorization: creds.apiKey,
  'Content-Type': 'application/json',
  Accept: 'application/json',
});

// POST get_endpoints returns { reply: [ { endpoint_status, ... }, ... ] }.
async function getEndpoints(creds) {
  const url = `${base(creds)}/public_api/v1/endpoints/get_endpoints/`;
  const j = await jsonOrThrow(await http(url, { method: 'POST', headers: authH(creds), body: JSON.stringify({}) }), 'Cortex XDR');
  return (j && Array.isArray(j.reply)) ? j.reply : [];
}

async function test(creds) {
  if (!creds.fqdn || !creds.keyId || !creds.apiKey) throw new Error('Cortex XDR FQDN, key ID and API key are required.');
  await getEndpoints(creds);
  return { ok: true, detail: 'Authenticated to the Cortex XDR public API.' };
}

async function fetchSignals(creds) {
  const signals = [];
  try {
    const eps = await getEndpoints(creds);
    const total = eps.length;
    if (total > 0) {
      const connected = eps.filter((e) => String(e.endpoint_status).toUpperCase() === 'CONNECTED').length;
      signals.push({ key: 'edr_pct', value: Math.round((connected / total) * 100), asOf: nowIso(), raw: { total, connected } });
    }
  } catch (e) { if (/HTTP 4|HTTP 5/.test(e.message)) throw e; /* else fall through */ }
  if (!signals.length) throw new Error('Authenticated, but no endpoints were readable — confirm the API key can view Endpoints.');
  return { signals, meta: { vendor: 'Palo Alto Networks' } };
}

module.exports = {
  key: 'cortexxdr', label: 'Palo Alto Cortex XDR', vendor: 'Palo Alto Networks', category: 'Endpoint / EDR',
  signals: ['edr_pct'],
  scopes: ['Viewer'],
  fields: [
    { key: 'fqdn', label: 'API FQDN (api-xxx.xdr.paloaltonetworks.com)' },
    { key: 'keyId', label: 'API key ID (x-xdr-auth-id)' },
    { key: 'apiKey', label: 'API key', secret: true },
  ],
  test, fetchSignals,
};
