'use strict';

/**
 * Ping Identity (PingOne) connector (read-only, OAuth2 client-credentials).
 *
 * Fills mfa_pct — the share of ACTIVE PingOne users that have an enrolled,
 * active MFA device. Auth is PingOne's documented worker-app client-credentials
 * flow (POST to https://auth.pingone.{region}/{envId}/as/token), then the
 * Management API at https://api.pingone.{region}/v1/environments/{envId}.
 * MFA coverage is read per-user from the /users/{id}/devices collection
 * (sampled to bound the call count). Built to the documented PingOne API
 * contract; validate against a real environment with a read-only worker
 * credential before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const region = (creds) => String(creds.region || 'com').replace(/^\.+|\/+$/g, '');
const authUrl = (creds) => `https://auth.pingone.${region(creds)}/${creds.envId}/as/token`;
const apiBase = (creds) => `https://api.pingone.${region(creds)}/v1/environments/${creds.envId}`;

async function token(creds) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials', client_id: creds.clientId, client_secret: creds.clientSecret,
  });
  const j = await jsonOrThrow(await http(authUrl(creds), {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body,
  }), 'Ping Identity');
  if (!j.access_token) throw new Error('Ping Identity: no access token returned.');
  return j.access_token;
}

async function test(creds) {
  if (!creds.envId || !creds.clientId || !creds.clientSecret) {
    throw new Error('PingOne region, environment ID, client ID and client secret are required.');
  }
  const tk = await token(creds);
  await jsonOrThrow(await http(`${apiBase(creds)}/users?limit=1`, { headers: { Authorization: `Bearer ${tk}`, Accept: 'application/json' } }), 'Ping Identity');
  return { ok: true, detail: 'Authenticated to the PingOne Management API.' };
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  const H = { Authorization: `Bearer ${tk}`, Accept: 'application/json' };
  const signals = [];
  try {
    // enabled eq true selects active users; SCIM filter is documented for /users.
    const filter = encodeURIComponent('enabled eq true');
    const page = await jsonOrThrow(await http(`${apiBase(creds)}/users?filter=${filter}&limit=200`, { headers: H }), 'Ping Identity');
    const users = (page && page._embedded && page._embedded.users) || [];
    if (users.length) {
      const sample = users.slice(0, 50);
      let enrolled = 0;
      let checked = 0;
      for (const u of sample) {
        try {
          const d = await jsonOrThrow(await http(`${apiBase(creds)}/users/${u.id}/devices`, { headers: H }), 'Ping Identity');
          const devices = (d && d._embedded && d._embedded.devices) || [];
          checked += 1;
          if (devices.some((x) => String(x.status).toUpperCase() === 'ACTIVE')) enrolled += 1;
        } catch (_) { /* skip a user whose devices we cannot read */ }
      }
      if (checked) signals.push({ key: 'mfa_pct', value: Math.round((enrolled / checked) * 100), asOf: nowIso(), raw: { activeUsers: users.length, sampled: checked, enrolled } });
    }
  } catch (_) { /* confirm the worker app can read users and MFA devices */ }
  if (!signals.length) throw new Error('Authenticated, but no readable signals — confirm the worker app can read users and MFA devices.');
  return { signals, meta: { vendor: 'Ping Identity' } };
}

module.exports = {
  key: 'ping', label: 'Ping Identity', vendor: 'Ping Identity', category: 'Identity / SSO',
  signals: ['mfa_pct'],
  scopes: ['p1:read:user', 'p1:read:device'],
  fields: [
    { key: 'region', label: 'PingOne region tld (com, eu, ca, asia, au)' },
    { key: 'envId', label: 'PingOne environment ID' },
    { key: 'clientId', label: 'Worker app client ID' },
    { key: 'clientSecret', label: 'Worker app client secret', secret: true },
  ],
  test, fetchSignals,
};
