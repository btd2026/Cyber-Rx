'use strict';

/**
 * CrowdStrike Falcon connector (read-only OAuth2). Reports managed-host count and
 * derives edr_pct when an asset total is supplied. Built to the documented Falcon
 * API; validate against a real CID before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

async function token(creds) {
  const base = (creds.baseUrl || 'https://api.crowdstrike.com').replace(/\/$/, '');
  const body = new URLSearchParams({ client_id: creds.clientId, client_secret: creds.clientSecret });
  const r = await http(`${base}/oauth2/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await jsonOrThrow(r, 'CrowdStrike');
  if (!j.access_token) throw new Error('CrowdStrike: no access token returned.');
  return { tk: j.access_token, base };
}

async function test(creds) {
  if (!creds.clientId || !creds.clientSecret) throw new Error('Falcon API client ID and secret are required.');
  await token(creds);
  return { ok: true, detail: 'Authenticated to CrowdStrike Falcon.' };
}

async function fetchSignals(creds) {
  const { tk, base } = await token(creds);
  const H = { Authorization: `Bearer ${tk}`, Accept: 'application/json' };
  const j = await jsonOrThrow(await http(`${base}/devices/queries/devices/v1?limit=1`, { headers: H }), 'CrowdStrike');
  const managed = (j.meta && j.meta.pagination && j.meta.pagination.total) || 0;
  const signals = [{ key: 'edr_hosts', value: managed, asOf: nowIso(), raw: {} }];
  const total = Number(creds.assetTotal) || 0;
  if (total > 0) signals.push({ key: 'edr_pct', value: Math.min(100, Math.round((managed / total) * 100)), asOf: nowIso(), raw: { managed, total } });
  return { signals, meta: { vendor: 'CrowdStrike Falcon', managed } };
}

module.exports = {
  key: 'crowdstrike', label: 'CrowdStrike Falcon', vendor: 'CrowdStrike', category: 'Endpoint (EDR)',
  signals: ['edr_pct', 'edr_hosts'],
  scopes: ['Hosts: READ'],
  fields: [
    { key: 'clientId', label: 'Falcon API client ID' },
    { key: 'clientSecret', label: 'Falcon API secret', secret: true },
    { key: 'baseUrl', label: 'API base URL (e.g. https://api.us-2.crowdstrike.com)', optional: true },
    { key: 'assetTotal', label: 'Total managed-endpoint estimate (for coverage %)', optional: true },
  ],
  test, fetchSignals,
};
