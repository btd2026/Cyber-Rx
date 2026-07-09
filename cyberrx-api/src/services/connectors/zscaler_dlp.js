'use strict';

/**
 * Zscaler DLP connector (read-only, ZIA API-key + session auth).
 *
 * Fills dlp_pct — DLP coverage: the share of Web DLP rules that are ENABLED and
 * enforcing (blocking) out of all configured Web DLP rules. Built to the
 * documented Zscaler Internet Access (ZIA) API contract: obfuscate the API key
 * with the server timestamp, POST {baseUrl}/api/v1/authenticatedSession to get a
 * JSESSIONID cookie, then GET /api/v1/webDlpRules. Validate against a live ZIA
 * tenant with a read-only admin (or OneAPI OAuth client) before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.baseUrl || '').replace(/\/+$/, '');

// Zscaler's documented API-key obfuscation using the current epoch-millis stamp.
function obfuscate(apiKey, ts) {
  const high = ts.slice(-6);
  let low = String(parseInt(high, 10) >> 1);
  while (low.length < 6) low = '0' + low;
  let key = '';
  for (let i = 0; i < high.length; i++) key += apiKey.charAt(parseInt(high.charAt(i), 10));
  for (let j = 0; j < low.length; j++) key += apiKey.charAt(parseInt(low.charAt(j), 10) + 2);
  return key;
}

// Authenticate; return the session cookie to send on subsequent reads.
async function session(creds) {
  const ts = String(Date.now());
  const r = await http(`${base(creds)}/api/v1/authenticatedSession`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ apiKey: obfuscate(creds.apiKey, ts), username: creds.username, password: creds.password, timestamp: ts }),
  });
  if (!r || !r.ok) { let d = ''; try { d = (await r.text()).slice(0, 200); } catch (_) {} throw new Error(`Zscaler DLP returned HTTP ${r ? r.status : '?'}${d ? ` (${d})` : ''}`); }
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  if (!cookie) throw new Error('Zscaler DLP: no session cookie returned.');
  return cookie;
}

// A rule counts as enforcing when it is ENABLED and its action blocks/quarantines
// (or otherwise acts) rather than merely allowing.
const isEnforcing = (rule) => {
  const state = String(rule.state || '').toUpperCase();
  const action = String(rule.action || '').toUpperCase();
  if (state !== 'ENABLED') return false;
  return action !== 'ALLOW';
};

async function test(creds) {
  if (!base(creds) || !creds.apiKey || !creds.username || !creds.password) {
    throw new Error('Zscaler DLP base URL, API key, username and password are required.');
  }
  const cookie = await session(creds);
  await jsonOrThrow(await http(`${base(creds)}/api/v1/webDlpRules`, { headers: { Cookie: cookie, Accept: 'application/json' } }), 'Zscaler DLP');
  return { ok: true, detail: 'Authenticated to the ZIA API.' };
}

async function fetchSignals(creds) {
  const cookie = await session(creds);
  const H = { Cookie: cookie, Accept: 'application/json' };
  const signals = [];
  try {
    const j = await jsonOrThrow(await http(`${base(creds)}/api/v1/webDlpRules`, { headers: H }), 'Zscaler DLP');
    const rules = Array.isArray(j) ? j : (j.rules || j.list || []);
    const total = rules.length;
    if (total > 0) {
      const enforcing = rules.filter(isEnforcing).length;
      signals.push({ key: 'dlp_pct', value: Math.round((enforcing / total) * 100), asOf: nowIso(), raw: { enforcing, total } });
    }
  } catch (e) { if (/HTTP 4|HTTP 5/.test(e.message)) throw e; }
  if (!signals.length) throw new Error('Authenticated, but no Web DLP rules were readable — confirm the admin can read webDlpRules.');
  return { signals, meta: { vendor: 'Zscaler' } };
}

module.exports = {
  key: 'zscaler_dlp', label: 'Zscaler DLP', vendor: 'Zscaler', category: 'Data loss prevention (DLP)',
  signals: ['dlp_pct'],
  scopes: ['dlp.read'],
  fields: [
    { key: 'baseUrl', label: 'ZIA API base URL (https://zsapi.<cloud>.net)' },
    { key: 'apiKey', label: 'API key', secret: true },
    { key: 'username', label: 'Admin username' },
    { key: 'password', label: 'Admin password', secret: true },
  ],
  test, fetchSignals,
};
