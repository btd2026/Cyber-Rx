'use strict';

/**
 * TrustArc connector (read-only, TrustArc Individual Rights Management API via
 * OAuth2 client-credentials).
 *
 * Fills dsar_open and dsar_overdue — data-subject requests in flight and those
 * past their statutory response clock. Auth is the documented client-credentials
 * flow, then GET the individual-rights requests. Built to the documented
 * TrustArc contract; validate against a real tenant before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.baseUrl || 'https://api.trustarc.com').replace(/\/+$/, '');
const isOpen = (s) => !['closed', 'completed', 'complete', 'fulfilled', 'rejected', 'cancelled', 'canceled'].includes(String(s || '').toLowerCase());

async function token(creds) {
  const basic = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');
  const r = await http(`${base(creds)}/oauth/token`, {
    method: 'POST', headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });
  const j = await jsonOrThrow(r, 'TrustArc');
  if (!j.access_token) throw new Error('TrustArc: no access token returned.');
  return j.access_token;
}

const reqUrl = (creds) => `${base(creds)}/irm/v1/requests?limit=500`;

async function test(creds) {
  if (!creds.clientId || !creds.clientSecret) throw new Error('TrustArc client ID and client secret are required.');
  const tk = await token(creds);
  await jsonOrThrow(await http(reqUrl(creds), { headers: { Authorization: `Bearer ${tk}`, Accept: 'application/json' } }), 'TrustArc');
  return { ok: true, detail: 'Authenticated to the TrustArc IRM API.' };
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  const j = await jsonOrThrow(await http(reqUrl(creds), { headers: { Authorization: `Bearer ${tk}`, Accept: 'application/json' } }), 'TrustArc');
  const requests = j.requests || j.data || j.items || [];
  const now = Date.now();
  const open = requests.filter((r) => isOpen(r.status || r.state));
  const overdue = open.filter((r) => { const d = Date.parse(r.dueDate || r.deadline || ''); return Number.isFinite(d) && d < now; });
  return { signals: [
    { key: 'dsar_open', value: open.length, asOf: nowIso(), raw: { total: requests.length, open: open.length } },
    { key: 'dsar_overdue', value: overdue.length, asOf: nowIso(), raw: { open: open.length, overdue: overdue.length } },
  ], meta: { vendor: 'TrustArc' } };
}

module.exports = {
  key: 'trustarc', label: 'TrustArc', vendor: 'TrustArc', category: 'Privacy Operations',
  signals: ['dsar_open', 'dsar_overdue'],
  scopes: ['IRM — requests read'],
  fields: [
    { key: 'clientId', label: 'Client ID' },
    { key: 'clientSecret', label: 'Client secret', secret: true },
    { key: 'baseUrl', label: 'API URL (optional — defaults to api.trustarc.com)', optional: true },
  ],
  test, fetchSignals,
};
