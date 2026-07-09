'use strict';

/**
 * Google Chronicle / Google SecOps connector (read-only, service-account OAuth2).
 * Fills open_incidents (active detection alerts) and siem_log_sources (ingestion
 * feeds). Auth is Google's documented service-account flow: a locally signed
 * RS256 JWT (node:crypto) exchanged for a bearer at oauth2.googleapis.com/token
 * via the jwt-bearer grant, then regional Chronicle API calls
 * ({region}-chronicle.googleapis.com). Endpoint resource paths follow the
 * documented Chronicle/Backstory API; validate the exact paths against your
 * tenant with a read-only service account before relying on it.
 */

const crypto = require('crypto');
const { http, jsonOrThrow, nowIso } = require('./http');

const SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const base = (creds) => {
  const r = String(creds.region || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  return r && r !== 'us' ? `https://${r}-chronicle.googleapis.com` : 'https://chronicle.googleapis.com';
};
const b64url = (b) => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

async function token(creds) {
  const iat = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: creds.clientEmail, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600,
  }));
  const input = `${head}.${claim}`;
  const key = String(creds.privateKey || '').replace(/\\n/g, '\n');
  const sig = b64url(crypto.createSign('RSA-SHA256').update(input).sign(key));
  const body = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${input}.${sig}` });
  const j = await jsonOrThrow(await http('https://oauth2.googleapis.com/token',
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }), 'Chronicle');
  if (!j.access_token) throw new Error('Chronicle: no access token returned.');
  return j.access_token;
}

async function test(creds) {
  if (!creds.clientEmail || !creds.privateKey) throw new Error('Chronicle: service-account client email and private key are required.');
  const tk = await token(creds);
  // A minimal authenticated read confirms the token is accepted by the tenant.
  await jsonOrThrow(await http(`${base(creds)}/v1/feeds`, { headers: { Authorization: `Bearer ${tk}`, Accept: 'application/json' } }), 'Chronicle');
  return { ok: true, detail: 'Authenticated to the Chronicle API.' };
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  const H = { Authorization: `Bearer ${tk}`, Accept: 'application/json' };
  const signals = [];
  // Active detection alerts over the last 24h → open incident count.
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 3600 * 1000);
    const q = `start_time=${encodeURIComponent(start.toISOString())}&end_time=${encodeURIComponent(end.toISOString())}`;
    const j = await jsonOrThrow(await http(`${base(creds)}/v1/alert/listalerts?${q}`, { headers: H }), 'Chronicle');
    const alerts = (j && (j.alerts || j.alertInfos)) || [];
    if (Array.isArray(alerts)) signals.push({ key: 'open_incidents', value: alerts.length, asOf: nowIso(), raw: {} });
  } catch (_) { /* alert API/scope optional in this tenant */ }
  // Best-effort log-source count from ingestion feeds.
  try {
    const j = await jsonOrThrow(await http(`${base(creds)}/v1/feeds`, { headers: H }), 'Chronicle');
    const feeds = (j && j.feeds) || [];
    if (Array.isArray(feeds)) signals.push({ key: 'siem_log_sources', value: feeds.length, asOf: nowIso(), raw: {} });
  } catch (_) { /* feed management API optional */ }
  if (!signals.length) throw new Error('Authenticated, but no readable signals — confirm the service account can read alerts/feeds.');
  return { signals, meta: { vendor: 'Google' } };
}

module.exports = {
  key: 'chronicle', label: 'Google Chronicle', vendor: 'Google', category: 'SIEM / Log analytics',
  signals: ['open_incidents', 'siem_log_sources'],
  scopes: ['Chronicle API (read-only): alerts + feed management'],
  fields: [
    { key: 'region', label: 'Chronicle region (e.g. us, europe, asia-southeast1)' },
    { key: 'clientEmail', label: 'Service-account client email' },
    { key: 'privateKey', label: 'Service-account private key (PEM)', secret: true },
  ],
  test, fetchSignals,
};
