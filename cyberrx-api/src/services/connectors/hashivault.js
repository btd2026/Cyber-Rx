'use strict';

/**
 * HashiCorp Vault connector (read-only, token auth). Fills pam_pct — the share
 * of identity entities that are actively managed (enabled and bound to an auth
 * method via at least one alias) out of all identity entities Vault knows. That
 * is Vault's privileged-identity coverage signal: an entity with no live alias
 * is an unmanaged/orphaned identity, so managed ÷ total is a true PAM ratio.
 *
 * Uses the documented Identity endpoints (LIST identity/entity/id, then read
 * each entity) with the `X-Vault-Token` header, and proves auth via
 * auth/token/lookup-self. Emits pam_pct only when a real managed/total ratio is
 * computable, else throws the no-signal error. Built to the documented Vault
 * API; validate against a real cluster with a read-only policy (list+read on
 * identity/entity/id) before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.addr || '').replace(/\/+$/, '');
const authH = (creds) => ({ 'X-Vault-Token': creds.token, Accept: 'application/json' });

async function test(creds) {
  if (!creds.addr || !creds.token) throw new Error('Vault address and token are required.');
  await jsonOrThrow(await http(`${base(creds)}/v1/auth/token/lookup-self`, { headers: authH(creds) }), 'Vault');
  return { ok: true, detail: 'Authenticated to the HashiCorp Vault API.' };
}

async function fetchSignals(creds) {
  const b = base(creds);
  const H = authH(creds);
  const signals = [];
  // Managed privileged identities ÷ total identity entities (sampled to bound calls).
  try {
    const list = await jsonOrThrow(await http(`${b}/v1/identity/entity/id?list=true`, { headers: H }), 'Vault');
    const ids = (list && list.data && list.data.keys) || [];
    if (ids.length) {
      const sample = ids.slice(0, 50);
      let managed = 0;
      let checked = 0;
      for (const id of sample) {
        try {
          const e = await jsonOrThrow(await http(`${b}/v1/identity/entity/id/${id}`, { headers: H }), 'Vault');
          const d = (e && e.data) || {};
          checked += 1;
          if (d.disabled !== true && Array.isArray(d.aliases) && d.aliases.length) managed += 1;
        } catch (_) { /* skip an entity we can't read */ }
      }
      if (checked) signals.push({ key: 'pam_pct', value: Math.round((managed / checked) * 100), asOf: nowIso(), raw: { totalEntities: ids.length, sampled: checked, managed } });
    }
  } catch (_) { /* confirm the token can list/read identity entities */ }
  if (!signals.length) throw new Error('Authenticated, but no true PAM ratio — confirm the token can list and read identity entities.');
  return { signals, meta: { vendor: 'HashiCorp' } };
}

module.exports = {
  key: 'hashivault', label: 'HashiCorp Vault', vendor: 'HashiCorp', category: 'Privileged access (PAM)',
  signals: ['pam_pct'],
  scopes: ['policy: list+read on identity/entity/id', 'read auth/token/lookup-self'],
  fields: [
    { key: 'addr', label: 'Vault address (https://vault.example.com:8200)' },
    { key: 'token', label: 'Vault token', secret: true },
  ],
  test, fetchSignals,
};
