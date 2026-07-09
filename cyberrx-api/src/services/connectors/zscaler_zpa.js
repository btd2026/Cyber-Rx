'use strict';

/**
 * Zscaler ZPA connector (read-only, OAuth client-credentials → ZPA API).
 *
 * Fills seg_pct — share of defined application segments that are actually
 * bound to a segment group / access policy (i.e. reachable only through an
 * enforced zero-trust policy) vs. total application segments. ZPA application
 * segments carry a `segmentGroupId`; segments without one are not brokered by
 * an enforced access policy.
 *
 * Auth: POST {baseUrl}/signin with client_id/client_secret (form-encoded) →
 * bearer token, then the mgmtconfig application resource. Built to the
 * documented ZPA API contract; validate against a real tenant with a
 * read-only API client before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.baseUrl || 'https://config.private.zscaler.com').replace(/\/+$/, '');

async function token(creds) {
  const body = new URLSearchParams({ client_id: creds.clientId, client_secret: creds.clientSecret });
  const j = await jsonOrThrow(await http(`${base(creds)}/signin`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body,
  }), 'Zscaler ZPA');
  if (!j.access_token) throw new Error('Zscaler ZPA: no access token returned.');
  return j.access_token;
}

async function test(creds) {
  if (!creds.baseUrl || !creds.customerId || !creds.clientId || !creds.clientSecret) {
    throw new Error('Zscaler ZPA base URL, customer ID, client ID and client secret are required.');
  }
  await token(creds);
  return { ok: true, detail: 'Authenticated to the Zscaler ZPA API.' };
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  const H = { Authorization: `Bearer ${tk}`, Accept: 'application/json' };
  const urlBase = `${base(creds)}/mgmtconfig/v1/admin/customers/${creds.customerId}/application`;
  const signals = [];
  let total = 0; let enforced = 0; let page = 1; let pages = 1;
  do {
    const j = await jsonOrThrow(await http(`${urlBase}?page=${page}&pagesize=500`, { headers: H }), 'Zscaler ZPA');
    const list = (j && j.list) || [];
    for (const app of list) { total += 1; if (app.segmentGroupId) enforced += 1; }
    pages = Number(j && j.totalPages) || 1;
    page += 1;
  } while (page <= pages && page <= 50);
  if (total > 0) signals.push({ key: 'seg_pct', value: Math.round((enforced / total) * 100), asOf: nowIso(), raw: { enforced, total } });
  if (!signals.length) throw new Error('Authenticated, but no application segments were readable — confirm the API client can read application config.');
  return { signals, meta: { vendor: 'Zscaler' } };
}

module.exports = {
  key: 'zscaler_zpa', label: 'Zscaler ZPA', vendor: 'Zscaler', category: 'Network segmentation / Zero-Trust',
  signals: ['seg_pct'],
  scopes: ['application.read'],
  fields: [
    { key: 'baseUrl', label: 'ZPA API base URL (https://config.private.zscaler.com)' },
    { key: 'customerId', label: 'Customer ID' },
    { key: 'clientId', label: 'API client ID' },
    { key: 'clientSecret', label: 'API client secret', secret: true },
  ],
  test, fetchSignals,
};
