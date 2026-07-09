'use strict';

/**
 * Cisco Duo connector (read-only, Admin API with HMAC-SHA1 request signing).
 *
 * Fills mfa_pct — the share of Duo directory users that have at least one
 * enrolled second factor (a phone or hardware token). Auth is Duo's documented
 * Admin API signing scheme: canonical string = date\nMETHOD\nhost\npath\nparams,
 * HMAC-SHA1 with the secret key (skey), sent as Authorization: Basic
 * base64(ikey:hmac) plus a Date header that MUST match the signed date. Built to
 * the documented Duo Admin API contract; validate against a real tenant with a
 * read-only Admin API credential before relying on it. Note: the signed Date
 * string and the Date header are generated once and reused so they stay
 * byte-identical, as Duo requires.
 */

const crypto = require('crypto');
const { http, jsonOrThrow, nowIso } = require('./http');

const host = (creds) => String(creds.apiHost || '').replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();

// Duo canonical params: keys sorted, RFC-3986 percent-encoded, joined by '&'.
function canonParams(params) {
  const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  return Object.keys(params).sort().map((k) => `${enc(k)}=${enc(params[k])}`).join('&');
}

// Build the Authorization header per Duo's documented signing algorithm.
function authHeader(creds, date, method, path, params) {
  const canon = [date, method.toUpperCase(), host(creds), path, canonParams(params)].join('\n');
  const sig = crypto.createHmac('sha1', String(creds.skey)).update(canon).digest('hex');
  return 'Basic ' + Buffer.from(`${creds.ikey}:${sig}`).toString('base64');
}

async function get(creds, path, params = {}) {
  const date = new Date().toUTCString();
  const qs = canonParams(params);
  const url = `https://${host(creds)}${path}${qs ? `?${qs}` : ''}`;
  const headers = { Date: date, Authorization: authHeader(creds, date, 'GET', path, params), Accept: 'application/json' };
  const j = await jsonOrThrow(await http(url, { headers }), 'Cisco Duo');
  if (j && j.stat && j.stat !== 'OK') throw new Error(`Cisco Duo: ${j.message || 'API error'}`);
  return j;
}

async function test(creds) {
  if (!creds.ikey || !creds.skey || !creds.apiHost) {
    throw new Error('Duo integration key (ikey), secret key (skey) and API host are required.');
  }
  await get(creds, '/admin/v1/users', { limit: '1', offset: '0' });
  return { ok: true, detail: 'Authenticated to the Duo Admin API.' };
}

async function fetchSignals(creds) {
  const signals = [];
  try {
    // Page the directory (bounded) and count users with an enrolled factor.
    let offset = 0;
    let total = 0;
    let enrolled = 0;
    for (let page = 0; page < 10; page += 1) {
      const j = await get(creds, '/admin/v1/users', { limit: '100', offset: String(offset) });
      const users = (j && j.response) || [];
      if (!users.length) break;
      for (const u of users) {
        total += 1;
        const hasPhone = Array.isArray(u.phones) && u.phones.length > 0;
        const hasToken = Array.isArray(u.tokens) && u.tokens.length > 0;
        if (hasPhone || hasToken) enrolled += 1;
      }
      const meta = j.metadata || {};
      if (meta.next_offset == null) break;
      offset = Number(meta.next_offset);
    }
    if (total > 0) signals.push({ key: 'mfa_pct', value: Math.round((enrolled / total) * 100), asOf: nowIso(), raw: { total, enrolled } });
  } catch (e) { if (/Cisco Duo:/.test(e.message)) throw e; /* else fall through to no-signal */ }
  if (!signals.length) throw new Error('Authenticated, but no readable users — confirm the Admin API credential has read access.');
  return { signals, meta: { vendor: 'Cisco' } };
}

module.exports = {
  key: 'duo', label: 'Cisco Duo', vendor: 'Cisco', category: 'Identity / SSO',
  signals: ['mfa_pct'],
  scopes: ['Grant read resource'],
  fields: [
    { key: 'apiHost', label: 'Duo API hostname (api-XXXXXXXX.duosecurity.com)' },
    { key: 'ikey', label: 'Admin API integration key (ikey)' },
    { key: 'skey', label: 'Admin API secret key (skey)', secret: true },
  ],
  test, fetchSignals,
};
