'use strict';

/**
 * Dell PowerProtect Data Manager connector (read-only, username/password →
 * PPDM REST API v2 bearer token).
 *
 * Fills backup_immutable_pct — the share of backup copies that are
 * retention-locked (immutable) out of all copies. PPDM issues a bearer token
 * from POST /api/v2/login, then GET /api/v2/copies reports each copy's
 * retention-lock state; backup_immutable_pct = retention-locked ÷ total. Built
 * to the documented PPDM REST API contract; the exact retention-lock field name
 * varies by PPDM version, so validate against a real appliance with a read-only
 * account before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.baseUrl || '').replace(/\/+$/, '');

async function token(creds) {
  const r = await http(`${base(creds)}/api/v2/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ username: creds.username, password: creds.password }),
  });
  const j = await jsonOrThrow(r, 'PowerProtect');
  const tk = j.access_token || j.token;
  if (!tk) throw new Error('PowerProtect: no access token returned.');
  return tk;
}

// PPDM paginates under page.totalElements; a filtered query lets us count
// server-side without reading every copy.
async function count(creds, tk, filter) {
  const q = filter ? `&filter=${encodeURIComponent(filter)}` : '';
  const url = `${base(creds)}/api/v2/copies?pageSize=1${q}`;
  const j = await jsonOrThrow(await http(url, { headers: { Authorization: `Bearer ${tk}`, Accept: 'application/json' } }), 'PowerProtect');
  const n = j && j.page && j.page.totalElements;
  return Number.isFinite(Number(n)) ? Number(n) : null;
}

async function test(creds) {
  if (!base(creds) || !creds.username || !creds.password) {
    throw new Error('PowerProtect base URL, username and password are required.');
  }
  const tk = await token(creds);
  await count(creds, tk, null);
  return { ok: true, detail: 'Authenticated to the PowerProtect Data Manager API.' };
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  const signals = [];
  const total = await count(creds, tk, null);
  let immutable = null;
  try { immutable = await count(creds, tk, 'retentionLock.mode ne "NONE"'); }
  catch (_) { try { immutable = await count(creds, tk, 'retentionLock eq true'); } catch (_) { /* leave null */ } }
  if (Number.isFinite(total) && total > 0 && Number.isFinite(immutable)) {
    signals.push({ key: 'backup_immutable_pct', value: Math.round((immutable / total) * 100), asOf: nowIso(), raw: { immutable, total } });
  }
  if (!signals.length) throw new Error('Authenticated, but copy retention-lock state was not readable — confirm the account can read /api/v2/copies.');
  return { signals, meta: { vendor: 'Dell' } };
}

module.exports = {
  key: 'dell_powerprotect', label: 'Dell PowerProtect Data Manager', vendor: 'Dell', category: 'Backup & disaster recovery',
  signals: ['backup_immutable_pct'],
  scopes: ['copies.read'],
  fields: [
    { key: 'baseUrl', label: 'PPDM base URL (https://ppdm.yourorg.com:8443)' },
    { key: 'username', label: 'PPDM username' },
    { key: 'password', label: 'PPDM password', secret: true },
  ],
  test, fetchSignals,
};
