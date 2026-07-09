'use strict';

/**
 * Mimecast connector (read-only, OAuth2 client-credentials → Mimecast 2.0 API).
 *
 * Fills bec_blocked — count of business-email-compromise / impersonation
 * messages blocked in the last 30 days. Mimecast 2.0 issues a bearer token from
 * the client-credentials endpoint, then the Impersonation Protect logs endpoint
 * (POST /api/ttp/impersonation/get-logs) returns messages held/blocked by the
 * impersonation (BEC) policy. Built to the documented Mimecast 2.0 API contract;
 * validate against a real tenant with a read-only application before relying on
 * it (exact log field/path may need confirmation against your account).
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const TOKEN_URL = 'https://api.services.mimecast.com/oauth/token';
const LOGS_URL = 'https://api.services.mimecast.com/api/ttp/impersonation/get-logs';

async function token(creds) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials', client_id: creds.clientId, client_secret: creds.clientSecret,
  });
  const r = await http(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await jsonOrThrow(r, 'Mimecast');
  if (!j.access_token) throw new Error('Mimecast: no access token returned.');
  return j.access_token;
}

// Impersonation Protect logs over a window; the API pages under meta.pagination.
async function impersonationLogs(creds, tk, fromIso, toIso) {
  const r = await http(LOGS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ data: [{ from: fromIso, to: toIso, taggedMalicious: true }] }),
  });
  const j = await jsonOrThrow(r, 'Mimecast');
  const first = j.data && j.data[0];
  return (first && (first.impersonationLogs || first.logs)) || [];
}

async function test(creds) {
  if (!creds.clientId || !creds.clientSecret) throw new Error('Mimecast client ID and client secret are required.');
  await token(creds);
  return { ok: true, detail: 'Authenticated to the Mimecast 2.0 API.' };
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  const signals = [];
  const to = nowIso();
  const from = new Date(Date.now() - 30 * 864e5).toISOString();
  try {
    const logs = await impersonationLogs(creds, tk, from, to);
    const blocked = logs.filter((l) => {
      const a = String(l.action || l.definition || '').toLowerCase();
      return a === 'hold' || a === 'block' || a === 'blockedwarning' || l.taggedMalicious === true;
    }).length;
    signals.push({ key: 'bec_blocked', value: blocked, asOf: nowIso(), raw: { window: '30d', total: logs.length, blocked } });
  } catch (e) { if (/HTTP 4/.test(e.message)) throw e; /* else fall through to no-signal error */ }
  if (!signals.length) throw new Error('Authenticated, but no impersonation logs were readable — confirm the application can read Impersonation Protect logs.');
  return { signals, meta: { vendor: 'Mimecast' } };
}

module.exports = {
  key: 'mimecast', label: 'Mimecast', vendor: 'Mimecast', category: 'Security awareness & email security',
  signals: ['bec_blocked'],
  scopes: ['ttp.impersonation.read'],
  fields: [
    { key: 'clientId', label: 'Mimecast application client ID' },
    { key: 'clientSecret', label: 'Mimecast application client secret', secret: true },
  ],
  test, fetchSignals,
};
