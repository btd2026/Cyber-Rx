'use strict';

/**
 * Abnormal Security connector (read-only, Abnormal REST API).
 *
 * Fills bec_blocked — the count of business-email-compromise / impersonation
 * threats Abnormal detected and remediated over the trailing 30 days. Abnormal
 * specialises in BEC, so its threat log maps directly to the CFO seat's
 * BEC-defense signal. Auth is the documented bearer token, then GET /v1/threats
 * over a date range. Built to the documented Abnormal contract; validate against
 * a real tenant before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.apiUrl || 'https://api.abnormalplatform.com').replace(/\/+$/, '');
const authH = (creds) => ({ Authorization: `Bearer ${creds.token}`, Accept: 'application/json' });

function threatsUrl(creds) {
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  return `${base(creds)}/v1/threats?filter=${encodeURIComponent(`receivedTime gte ${since}`)}&pageSize=1000`;
}

async function test(creds) {
  if (!creds.token) throw new Error('Abnormal API token is required.');
  await jsonOrThrow(await http(`${base(creds)}/v1/threats?pageSize=1`, { headers: authH(creds) }), 'Abnormal');
  return { ok: true, detail: 'Authenticated to the Abnormal Security API.' };
}

async function fetchSignals(creds) {
  const j = await jsonOrThrow(await http(threatsUrl(creds), { headers: authH(creds) }), 'Abnormal');
  const threats = j.threats || j.data || [];
  const count = Number.isFinite(Number(j.total)) ? Number(j.total) : threats.length;
  return { signals: [{ key: 'bec_blocked', value: count, asOf: nowIso(), raw: { windowDays: 30, threats: count } }], meta: { vendor: 'Abnormal Security' } };
}

module.exports = {
  key: 'abnormal', label: 'Abnormal Security', vendor: 'Abnormal', category: 'Email Security',
  signals: ['bec_blocked'],
  scopes: ['Threats — read'],
  fields: [
    { key: 'token', label: 'API token', secret: true },
    { key: 'apiUrl', label: 'API URL (optional — defaults to api.abnormalplatform.com)', optional: true },
  ],
  test, fetchSignals,
};
