'use strict';

/**
 * Cisco Secure Workload (Tetration) connector (read-only, HMAC-SHA256 OpenAPI).
 *
 * Fills seg_pct — share of workloads whose agent is in ENFORCEMENT (actively
 * applying micro-segmentation rules) vs. total known workloads. Workloads in
 * visibility-only/analysis mode are not enforcing segmentation.
 *
 * Auth is the documented Cisco Secure Workload OpenAPI signing scheme: each
 * request carries `Id` (api key), `Timestamp`, `Content-Type`, and an
 * `Authorization` = base64(HMAC-SHA256(secret, canonical-string)) header. Built
 * to the documented OpenAPI contract; validate against a real cluster with a
 * read-only API key (SW/scopes read) before relying on it.
 */

const crypto = require('crypto');
const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.baseUrl || '').replace(/\/+$/, '');
const ts = () => `${new Date().toISOString().slice(0, 19)}+0000`;

// Canonical string: METHOD\nURI\nbodyChecksum\nContent-Type\nTimestamp\n
function signedHeaders(creds, method, uri, body) {
  const timestamp = ts();
  const contentType = 'application/json';
  const checksum = body ? crypto.createHash('sha256').update(body).digest('hex') : '';
  const message = `${method}\n${uri}\n${checksum}\n${contentType}\n${timestamp}\n`;
  const sig = crypto.createHmac('sha256', String(creds.apiSecret || '')).update(message).digest('base64');
  return { Id: creds.apiKey, Timestamp: timestamp, 'Content-Type': contentType, Authorization: sig, Accept: 'application/json' };
}

async function get(creds, uri) {
  return jsonOrThrow(await http(`${base(creds)}${uri}`, { headers: signedHeaders(creds, 'GET', uri, null) }), 'Cisco Secure Workload');
}

function isEnforced(w) {
  if (!w || typeof w !== 'object') return false;
  if (w.enforcement_enabled === true) return true;
  if (String(w.enforcement_mode || '').toLowerCase() === 'enforced') return true;
  if (w.agent && w.agent.enforcement_enabled === true) return true;
  return false;
}

async function test(creds) {
  if (!creds.baseUrl || !creds.apiKey || !creds.apiSecret) {
    throw new Error('Cisco Secure Workload base URL, API key and secret are required.');
  }
  await get(creds, '/openapi/v1/workload');
  return { ok: true, detail: 'Authenticated to the Cisco Secure Workload OpenAPI.' };
}

async function fetchSignals(creds) {
  const signals = [];
  const res = await get(creds, '/openapi/v1/workload');
  const list = Array.isArray(res) ? res : (res && (res.results || res.workloads)) || [];
  if (Array.isArray(list) && list.length) {
    const enforced = list.filter(isEnforced).length;
    signals.push({ key: 'seg_pct', value: Math.round((enforced / list.length) * 100), asOf: nowIso(), raw: { enforced, total: list.length } });
  }
  if (!signals.length) throw new Error('Authenticated, but no readable workloads — confirm the API key has a read scope on workload inventory.');
  return { signals, meta: { vendor: 'Cisco' } };
}

module.exports = {
  key: 'cisco_workload', label: 'Cisco Secure Workload', vendor: 'Cisco', category: 'Network segmentation / Zero-Trust',
  signals: ['seg_pct'],
  scopes: ['sensor_management:read', 'app_policy_management:read'],
  fields: [
    { key: 'baseUrl', label: 'Cluster URL (https://cluster.example.com)' },
    { key: 'apiKey', label: 'API key (Id)' },
    { key: 'apiSecret', label: 'API secret', secret: true },
  ],
  test, fetchSignals,
};
