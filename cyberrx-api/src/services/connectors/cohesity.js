'use strict';

/**
 * Cohesity connector (read-only, Cohesity DataProtect REST API).
 *
 * Fills backup_immutable_pct — the share of protection policies that enforce
 * DataLock (WORM / retention lock), Cohesity's immutability control against
 * ransomware. Auth is the documented API-key header (or username/password →
 * access token). Reads /v2/data-protect/policies and counts policies whose
 * retention has a DataLock/lock config. Built to the documented Cohesity
 * contract; validate against a real cluster with a viewer role before relying
 * on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => `${String(creds.baseUrl || '').replace(/\/+$/, '')}`;

async function authHeaders(creds) {
  if (creds.apiKey) return { 'apiKey': creds.apiKey, Accept: 'application/json' };
  const r = await http(`${base(creds)}/irisservices/api/v1/public/accessTokens`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: creds.username, password: creds.password, domain: creds.domain || 'LOCAL' }),
  });
  const j = await jsonOrThrow(r, 'Cohesity');
  if (!j.accessToken) throw new Error('Cohesity: no access token returned.');
  return { Authorization: `Bearer ${j.accessToken}`, Accept: 'application/json' };
}

const hasDataLock = (p) => {
  const ro = p.retentionOptions || (p.retention && p.retention) || {};
  if (ro.datalockConfig || ro.dataLockConfig || ro.lockConfig) return true;
  const backup = (p.backupPolicy && p.backupPolicy.regular) || {};
  return !!(backup.retention && (backup.retention.dataLockConfig || backup.retention.datalockConfig));
};

async function test(creds) {
  if (!base(creds) || (!creds.apiKey && !(creds.username && creds.password))) {
    throw new Error('Cohesity base URL and an API key (or username + password) are required.');
  }
  const H = await authHeaders(creds);
  await jsonOrThrow(await http(`${base(creds)}/v2/data-protect/policies`, { headers: H }), 'Cohesity');
  return { ok: true, detail: 'Authenticated to the Cohesity DataProtect API.' };
}

async function fetchSignals(creds) {
  const H = await authHeaders(creds);
  const j = await jsonOrThrow(await http(`${base(creds)}/v2/data-protect/policies`, { headers: H }), 'Cohesity');
  const policies = j.policies || [];
  if (!policies.length) throw new Error('Authenticated, but no protection policies were readable — confirm the role can read policies.');
  const locked = policies.filter(hasDataLock).length;
  return { signals: [{ key: 'backup_immutable_pct', value: Math.round((locked / policies.length) * 100), asOf: nowIso(), raw: { policies: policies.length, dataLocked: locked } }], meta: { vendor: 'Cohesity' } };
}

module.exports = {
  key: 'cohesity', label: 'Cohesity', vendor: 'Cohesity', category: 'Backup & Disaster Recovery',
  signals: ['backup_immutable_pct'],
  scopes: ['Viewer — DataProtect policies read'],
  fields: [
    { key: 'baseUrl', label: 'Cohesity cluster URL (https://cohesity.example.com)' },
    { key: 'apiKey', label: 'API key', secret: true, optional: true },
    { key: 'username', label: 'Username (if not using an API key)', optional: true },
    { key: 'password', label: 'Password (if not using an API key)', secret: true, optional: true },
    { key: 'domain', label: 'Domain (optional, defaults to LOCAL)', optional: true },
  ],
  test, fetchSignals,
};
