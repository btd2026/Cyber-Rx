'use strict';

/**
 * Veeam Backup & Replication connector (read-only, VBR REST API v1).
 *
 * Fills backup_immutable_pct — the share of backup repositories with
 * immutability (hardened / object-lock) enabled, the ransomware-proof control
 * that lets you recover even if production is encrypted. Auth is the documented
 * OAuth2 password grant against the VBR REST endpoint (port 9419), then GET
 * /api/v1/backupInfrastructure/repositories. Built to the documented VBR
 * contract; validate against a real server with a read-only role before relying
 * on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => `${String(creds.baseUrl || '').replace(/\/+$/, '')}`;
const API_V = '1.1-rev1';

async function token(creds) {
  const body = new URLSearchParams({ grant_type: 'password', username: creds.username, password: creds.password });
  const r = await http(`${base(creds)}/api/oauth2/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-api-version': API_V, Accept: 'application/json' }, body });
  const j = await jsonOrThrow(r, 'Veeam');
  if (!j.access_token) throw new Error('Veeam: no access token returned.');
  return j.access_token;
}

const isImmutable = (r) => !!(r.immutabilityEnabled || (r.repository && r.repository.immutabilityEnabled) || Number(r.makeRecentBackupsImmutableDays) > 0 || (r.immutability && r.immutability.isEnabled));

async function test(creds) {
  if (!base(creds) || !creds.username || !creds.password) throw new Error('Veeam base URL, username and password are required.');
  const tk = await token(creds);
  await jsonOrThrow(await http(`${base(creds)}/api/v1/backupInfrastructure/repositories`, { headers: { Authorization: `Bearer ${tk}`, 'x-api-version': API_V, Accept: 'application/json' } }), 'Veeam');
  return { ok: true, detail: 'Authenticated to the Veeam VBR REST API.' };
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  const j = await jsonOrThrow(await http(`${base(creds)}/api/v1/backupInfrastructure/repositories`, { headers: { Authorization: `Bearer ${tk}`, 'x-api-version': API_V, Accept: 'application/json' } }), 'Veeam');
  const repos = j.data || [];
  if (!repos.length) throw new Error('Authenticated, but no repositories were readable — confirm the role can read backup infrastructure.');
  const immutable = repos.filter(isImmutable).length;
  return { signals: [{ key: 'backup_immutable_pct', value: Math.round((immutable / repos.length) * 100), asOf: nowIso(), raw: { repositories: repos.length, immutable } }], meta: { vendor: 'Veeam' } };
}

module.exports = {
  key: 'veeam', label: 'Veeam Backup & Replication', vendor: 'Veeam', category: 'Backup & Disaster Recovery',
  signals: ['backup_immutable_pct'],
  scopes: ['Veeam Backup Viewer (read-only)'],
  fields: [
    { key: 'baseUrl', label: 'VBR REST URL (https://vbr.example.com:9419)' },
    { key: 'username', label: 'Username' },
    { key: 'password', label: 'Password', secret: true },
  ],
  test, fetchSignals,
};
