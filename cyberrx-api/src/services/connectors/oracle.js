'use strict';

/**
 * Oracle Risk Management Cloud connector (read-only, Oracle Fusion REST).
 *
 * Fills sod_conflicts — open segregation-of-duties incidents from Oracle
 * Advanced Access Controls (the SOX access-risk control). Auth is HTTP Basic
 * against the Fusion REST endpoint with a read-only user, then GET the SoD /
 * access-control incidents resource filtered to open status. Built to the
 * documented Fusion REST contract; the incident resource path varies by pod /
 * release, so validate (and adjust `resource`) against your instance before
 * relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.baseUrl || '').replace(/\/+$/, '');
const authH = (creds) => ({ Authorization: `Basic ${Buffer.from(`${creds.username}:${creds.password}`).toString('base64')}`, Accept: 'application/json' });
const resource = (creds) => creds.resource || '/fscmRestApi/resources/11.13.18.05/accessControlIncidents';
const url = (creds) => `${base(creds)}${resource(creds)}?q=IncidentStatus=OPEN&onlyData=true&limit=500`;

async function test(creds) {
  if (!base(creds) || !creds.username || !creds.password) throw new Error('Oracle base URL, username and password are required.');
  await jsonOrThrow(await http(url(creds), { headers: authH(creds) }), 'Oracle');
  return { ok: true, detail: 'Authenticated to the Oracle Risk Management Cloud API.' };
}

async function fetchSignals(creds) {
  const j = await jsonOrThrow(await http(url(creds), { headers: authH(creds) }), 'Oracle');
  const items = j.items || j.value || [];
  const count = Number.isFinite(Number(j.totalResults)) ? Number(j.totalResults) : items.length;
  return { signals: [{ key: 'sod_conflicts', value: count, asOf: nowIso(), raw: { openIncidents: count } }], meta: { vendor: 'Oracle Risk Management Cloud' } };
}

module.exports = {
  key: 'oracle', label: 'Oracle Risk Management Cloud', vendor: 'Oracle', category: 'ERP / SOX ITGC',
  signals: ['sod_conflicts'],
  scopes: ['Fusion read-only — access-control incidents'],
  fields: [
    { key: 'baseUrl', label: 'Fusion base URL (https://yourpod.fa.ocs.oraclecloud.com)' },
    { key: 'username', label: 'Read-only user' },
    { key: 'password', label: 'Password', secret: true },
    { key: 'resource', label: 'Incidents resource path (optional — override per release)', optional: true },
  ],
  test, fetchSignals,
};
