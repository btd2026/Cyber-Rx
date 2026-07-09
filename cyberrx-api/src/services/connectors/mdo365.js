'use strict';

/**
 * Microsoft Defender for Office 365 connector (read-only, MS Graph OAuth2
 * client-credentials → Microsoft Graph security API).
 *
 * Fills bec_blocked — count of business-email-compromise / phishing /
 * impersonation threats blocked in the last 30 days. Uses the app-only
 * client-credentials flow (login.microsoftonline.com/{tenant}/oauth2/v2.0/token,
 * scope https://graph.microsoft.com/.default) then reads Defender alerts via the
 * documented Graph `security` resource (GET /security/alerts_v2), counting
 * phishing/impersonation/BEC-category alerts. Built to the documented Microsoft
 * Graph contract; the exact threat endpoint/category taxonomy varies by tenant,
 * so validate against a real tenant with SecurityAlert.Read.All before relying
 * on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

async function token(creds) {
  const url = `https://login.microsoftonline.com/${encodeURIComponent(creds.tenantId)}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: 'client_credentials', client_id: creds.clientId, client_secret: creds.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
  });
  const r = await http(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await jsonOrThrow(r, 'Microsoft Graph');
  if (!j.access_token) throw new Error('Microsoft Graph: no access token returned.');
  return j.access_token;
}

const BEC = /(phish|imperson|spoof|business email|bec)/i;

async function alerts(creds, tk, sinceIso) {
  const filter = encodeURIComponent(`createdDateTime ge ${sinceIso}`);
  const url = `https://graph.microsoft.com/v1.0/security/alerts_v2?$filter=${filter}&$top=1000`;
  const j = await jsonOrThrow(await http(url, { headers: { Authorization: `Bearer ${tk}`, Accept: 'application/json' } }), 'Microsoft Graph');
  return (j && j.value) || [];
}

async function test(creds) {
  if (!creds.tenantId || !creds.clientId || !creds.clientSecret) {
    throw new Error('Microsoft tenant ID, client ID and client secret are required.');
  }
  const tk = await token(creds);
  await jsonOrThrow(await http('https://graph.microsoft.com/v1.0/security/alerts_v2?$top=1', { headers: { Authorization: `Bearer ${tk}`, Accept: 'application/json' } }), 'Microsoft Graph');
  return { ok: true, detail: 'Authenticated to the Microsoft Graph security API.' };
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  const signals = [];
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  try {
    const rows = await alerts(creds, tk, since);
    const blocked = rows.filter((a) => BEC.test(`${a.category || ''} ${a.title || ''} ${a.description || ''}`)).length;
    signals.push({ key: 'bec_blocked', value: blocked, asOf: nowIso(), raw: { window: '30d', totalAlerts: rows.length, blocked } });
  } catch (e) { if (/HTTP 4/.test(e.message)) throw e; /* else fall through to no-signal error */ }
  if (!signals.length) throw new Error('Authenticated, but no security alerts were readable — confirm the app has SecurityAlert.Read.All.');
  return { signals, meta: { vendor: 'Microsoft' } };
}

module.exports = {
  key: 'mdo365', label: 'Microsoft Defender for Office 365', vendor: 'Microsoft', category: 'Security awareness & email security',
  signals: ['bec_blocked'],
  scopes: ['SecurityAlert.Read.All'],
  fields: [
    { key: 'tenantId', label: 'Azure AD tenant ID' },
    { key: 'clientId', label: 'App registration client ID' },
    { key: 'clientSecret', label: 'App registration client secret', secret: true },
  ],
  test, fetchSignals,
};
