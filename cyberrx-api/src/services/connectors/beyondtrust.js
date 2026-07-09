'use strict';

/**
 * BeyondTrust Password Safe connector (read-only, PS-Auth API key session).
 *
 * Fills pam_pct — the share of vaulted (managed) privileged accounts that are
 * under automatic credential management, the self-contained PAM coverage signal
 * for privileged-account rotation. Auth is BeyondTrust's documented app-key
 * flow: an `Authorization: PS-Auth key=<key>; runas=<user>;` header plus a
 * POST /Auth/SignAppin that opens a session, after which the ManagedAccounts /
 * ManagedSystems inventory is read. Built to the documented Password Safe v3
 * API; validate against a real appliance with a read-only API registration and
 * an auditor runAs user before relying on it. (A true discovered-but-unvaulted
 * inventory needs the Discovery/Smart-Rule API; this measures management
 * coverage across the vaulted managed accounts.)
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => `${String(creds.baseUrl || '').replace(/\/+$/, '')}/BeyondTrust/api/public/v3`;

function authH(creds, cookie) {
  const h = { Authorization: `PS-Auth key=${creds.apiKey}; runas=${creds.runAsUser};`, Accept: 'application/json' };
  if (cookie) h.Cookie = cookie;
  return h;
}

async function signIn(creds) {
  const r = await http(`${base(creds)}/Auth/SignAppin`, { method: 'POST', headers: authH(creds) });
  await jsonOrThrow(r, 'BeyondTrust');
  // The SignAppin response sets the session cookie that authorizes later calls.
  return r.headers.get('set-cookie') || '';
}

async function test(creds) {
  if (!creds.baseUrl || !creds.apiKey || !creds.runAsUser) throw new Error('BeyondTrust base URL, API key and runAs user are required.');
  const cookie = await signIn(creds);
  await jsonOrThrow(await http(`${base(creds)}/ManagedSystems`, { headers: authH(creds, cookie) }), 'BeyondTrust');
  return { ok: true, detail: 'Authenticated to the BeyondTrust Password Safe API.' };
}

async function fetchSignals(creds) {
  const cookie = await signIn(creds);
  const H = authH(creds, cookie);
  const signals = [];
  // Automatic-management coverage across vaulted (managed) privileged accounts.
  try {
    const accounts = (await jsonOrThrow(await http(`${base(creds)}/ManagedAccounts`, { headers: H }), 'BeyondTrust')) || [];
    let systems = 0;
    try { systems = ((await jsonOrThrow(await http(`${base(creds)}/ManagedSystems`, { headers: H }), 'BeyondTrust')) || []).length; } catch (_) { /* systems count is context only */ }
    if (Array.isArray(accounts) && accounts.length) {
      const managed = accounts.filter((a) => a.AutoManagementFlag === true || a.autoManagementFlag === true).length;
      signals.push({ key: 'pam_pct', value: Math.round((managed / accounts.length) * 100), asOf: nowIso(), raw: { vaulted: accounts.length, autoManaged: managed, managedSystems: systems } });
    }
  } catch (_) { /* confirm the runAs user can list managed accounts */ }
  if (!signals.length) throw new Error('Authenticated, but no readable signals — confirm the runAs user can list managed accounts.');
  return { signals, meta: { vendor: 'BeyondTrust' } };
}

module.exports = {
  key: 'beyondtrust', label: 'BeyondTrust', vendor: 'BeyondTrust', category: 'Privileged access (PAM)',
  signals: ['pam_pct'],
  scopes: ['Password Safe API registration (read-only)', 'Auditor runAs user — list managed accounts/systems'],
  fields: [
    { key: 'baseUrl', label: 'Appliance base URL (https://pbps.example.com)' },
    { key: 'apiKey', label: 'API registration key', secret: true },
    { key: 'runAsUser', label: 'RunAs Password Safe username' },
  ],
  test, fetchSignals,
};
