'use strict';

/**
 * Commvault connector (read-only, Commvault REST API).
 *
 * Fills backup_immutable_pct — the share of storage pools configured as WORM
 * (write-once-read-many) / immutable, Commvault's ransomware-proof control.
 * Auth is the documented /Login flow (returns an Authtoken used in the Authtoken
 * header), then GET /v4/storage/pool. Built to the documented Commvault
 * contract; validate against a real CommServe with a read-only role before
 * relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => `${String(creds.baseUrl || '').replace(/\/+$/, '')}`;

async function token(creds) {
  const r = await http(`${base(creds)}/SearchSvc/CVWebService.svc/Login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ username: creds.username, password: Buffer.from(String(creds.password)).toString('base64') }),
  });
  const j = await jsonOrThrow(r, 'Commvault');
  if (!j.token) throw new Error('Commvault: no auth token returned.');
  return j.token;
}

const isWorm = (p) => !!(p.wormStoragePoolFlag || p.isWormStoragePool || (p.wormStoragePool && p.wormStoragePool !== 0) || (p.storagePoolFlags && /worm/i.test(JSON.stringify(p.storagePoolFlags))));

async function test(creds) {
  if (!base(creds) || !creds.username || !creds.password) throw new Error('Commvault base URL, username and password are required.');
  const tk = await token(creds);
  await jsonOrThrow(await http(`${base(creds)}/v4/storage/pool`, { headers: { Authtoken: tk, Accept: 'application/json' } }), 'Commvault');
  return { ok: true, detail: 'Authenticated to the Commvault REST API.' };
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  const j = await jsonOrThrow(await http(`${base(creds)}/v4/storage/pool`, { headers: { Authtoken: tk, Accept: 'application/json' } }), 'Commvault');
  const pools = j.storagePoolList || j.storagePools || j.pools || [];
  if (!pools.length) throw new Error('Authenticated, but no storage pools were readable — confirm the role can read storage pools.');
  const worm = pools.filter(isWorm).length;
  return { signals: [{ key: 'backup_immutable_pct', value: Math.round((worm / pools.length) * 100), asOf: nowIso(), raw: { pools: pools.length, worm } }], meta: { vendor: 'Commvault' } };
}

module.exports = {
  key: 'commvault', label: 'Commvault', vendor: 'Commvault', category: 'Backup & Disaster Recovery',
  signals: ['backup_immutable_pct'],
  scopes: ['Read-only role — storage pools'],
  fields: [
    { key: 'baseUrl', label: 'Commvault API URL (https://commserve.example.com/commandcenter/api)' },
    { key: 'username', label: 'Username' },
    { key: 'password', label: 'Password', secret: true },
  ],
  test, fetchSignals,
};
