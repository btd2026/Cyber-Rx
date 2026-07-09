'use strict';

/**
 * Illumio connector (read-only, HTTP Basic auth → Illumio PCE API v2).
 *
 * Fills seg_pct — share of workloads under FULL enforcement (deny-by-default
 * segmentation) vs. total managed workloads. Illumio's PCE exposes each
 * workload's `enforcement_mode` (idle / visibility_only / selective / full);
 * only 'full' (and legacy 'enforced') actually enforces segmentation.
 *
 * Auth is Basic with an API key id:secret pair against {pce}/api/v2. Built to
 * the documented Illumio PCE API contract; validate against a real PCE with a
 * read-only API key before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => `${String(creds.pceUrl || '').replace(/\/+$/, '')}/api/v2`;
const authH = (creds) => ({
  Authorization: `Basic ${Buffer.from(`${creds.apiKeyId}:${creds.apiKeySecret}`).toString('base64')}`,
  Accept: 'application/json',
});
const ENFORCED = new Set(['full', 'enforced']);

async function test(creds) {
  if (!creds.pceUrl || !creds.orgId || !creds.apiKeyId || !creds.apiKeySecret) {
    throw new Error('Illumio PCE URL, org ID, API key ID and secret are required.');
  }
  await jsonOrThrow(await http(`${base(creds)}/orgs/${creds.orgId}/workloads?max_results=1`, { headers: authH(creds) }), 'Illumio');
  return { ok: true, detail: 'Authenticated to the Illumio PCE API.' };
}

async function fetchSignals(creds) {
  const signals = [];
  const workloads = (await jsonOrThrow(
    await http(`${base(creds)}/orgs/${creds.orgId}/workloads?max_results=10000`, { headers: authH(creds) }),
    'Illumio',
  )) || [];
  if (Array.isArray(workloads) && workloads.length) {
    const enforced = workloads.filter((w) => ENFORCED.has(String(w.enforcement_mode || '').toLowerCase())).length;
    signals.push({ key: 'seg_pct', value: Math.round((enforced / workloads.length) * 100), asOf: nowIso(), raw: { enforced, total: workloads.length } });
  }
  if (!signals.length) throw new Error('Authenticated, but no readable workloads — confirm the API key can list workloads for this org.');
  return { signals, meta: { vendor: 'Illumio' } };
}

module.exports = {
  key: 'illumio', label: 'Illumio', vendor: 'Illumio', category: 'Network segmentation / Zero-Trust',
  signals: ['seg_pct'],
  scopes: ['workload.read'],
  fields: [
    { key: 'pceUrl', label: 'PCE URL (https://pce.example.com:8443)' },
    { key: 'orgId', label: 'Organization ID (e.g. 1)' },
    { key: 'apiKeyId', label: 'API key ID' },
    { key: 'apiKeySecret', label: 'API key secret', secret: true },
  ],
  test, fetchSignals,
};
