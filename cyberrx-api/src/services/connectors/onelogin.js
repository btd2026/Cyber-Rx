'use strict';

/**
 * OneLogin connector (read-only, OAuth2 client-credentials → OneLogin API v2).
 *
 * Fills mfa_pct — the share of ACTIVE OneLogin users that have an active OTP
 * (MFA) device. Auth is OneLogin's documented client-credentials flow (POST to
 * https://api.{region}.onelogin.com/auth/oauth2/v2/token with a Basic
 * client-id/secret header), then the v2 API: GET /api/2/users for the directory
 * and GET /api/2/users/{id}/otp_devices per user (sampled to bound calls).
 * Built to the documented OneLogin API contract; validate against a real
 * account with a read-only API credential before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const region = (creds) => String(creds.region || 'us').replace(/^\.+|\/+$/g, '');
const base = (creds) => `https://api.${region(creds)}.onelogin.com`;

async function token(creds) {
  const basic = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');
  const j = await jsonOrThrow(await http(`${base(creds)}/auth/oauth2/v2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credentials' }),
  }), 'OneLogin');
  if (!j.access_token) throw new Error('OneLogin: no access token returned.');
  return j.access_token;
}

async function test(creds) {
  if (!creds.clientId || !creds.clientSecret) throw new Error('OneLogin region, client ID and client secret are required.');
  const tk = await token(creds);
  await jsonOrThrow(await http(`${base(creds)}/api/2/users?limit=1`, { headers: { Authorization: `Bearer ${tk}`, Accept: 'application/json' } }), 'OneLogin');
  return { ok: true, detail: 'Authenticated to the OneLogin API.' };
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  const H = { Authorization: `Bearer ${tk}`, Accept: 'application/json' };
  const signals = [];
  try {
    // status=1 is ACTIVE in the OneLogin user model.
    const all = await jsonOrThrow(await http(`${base(creds)}/api/2/users?limit=200`, { headers: H }), 'OneLogin');
    const users = (Array.isArray(all) ? all : []).filter((u) => u.status == null || Number(u.status) === 1);
    if (users.length) {
      const sample = users.slice(0, 50);
      let enrolled = 0;
      let checked = 0;
      for (const u of sample) {
        try {
          const d = await jsonOrThrow(await http(`${base(creds)}/api/2/users/${u.id}/otp_devices`, { headers: H }), 'OneLogin');
          const devices = (d && d.otp_devices) || [];
          checked += 1;
          if (devices.some((x) => x.active === true || x.needs_trigger === false || x.default === true)) enrolled += 1;
        } catch (_) { /* skip a user whose OTP devices we cannot read */ }
      }
      if (checked) signals.push({ key: 'mfa_pct', value: Math.round((enrolled / checked) * 100), asOf: nowIso(), raw: { activeUsers: users.length, sampled: checked, enrolled } });
    }
  } catch (_) { /* confirm the credential can read users and otp_devices */ }
  if (!signals.length) throw new Error('Authenticated, but no readable signals — confirm the credential can read users and OTP devices.');
  return { signals, meta: { vendor: 'OneLogin' } };
}

module.exports = {
  key: 'onelogin', label: 'OneLogin', vendor: 'OneLogin', category: 'Identity / SSO',
  signals: ['mfa_pct'],
  scopes: ['Read Users'],
  fields: [
    { key: 'region', label: 'OneLogin region (us or eu)' },
    { key: 'clientId', label: 'API client ID' },
    { key: 'clientSecret', label: 'API client secret', secret: true },
  ],
  test, fetchSignals,
};
