'use strict';

/**
 * Microsoft Defender for Endpoint connector (read-only, OAuth2 client
 * credentials → Microsoft Defender for Endpoint API). Fills edr_pct — endpoint
 * detection coverage = onboarded machines / total known machines. Built to the
 * documented WindowsDefenderATP API contract; validate against a real tenant
 * with Machine.Read.All before relying on it. Mirrors the entra.js OAuth shape.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const RESOURCE = 'https://api.securitycenter.microsoft.com';

async function token(creds) {
  const body = new URLSearchParams({
    client_id: creds.clientId, client_secret: creds.clientSecret,
    scope: `${RESOURCE}/.default`, grant_type: 'client_credentials',
  });
  const r = await http(`https://login.microsoftonline.com/${encodeURIComponent(creds.tenantId)}/oauth2/v2.0/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await jsonOrThrow(r, 'Defender');
  if (!j.access_token) throw new Error('Defender: no access token returned.');
  return j.access_token;
}

async function test(creds) {
  if (!creds.tenantId || !creds.clientId || !creds.clientSecret) throw new Error('Tenant ID, client ID and client secret are required.');
  const tk = await token(creds);
  await jsonOrThrow(await http(`${RESOURCE}/api/machines?$top=1`, { headers: { Authorization: `Bearer ${tk}`, Accept: 'application/json' } }), 'Defender');
  return { ok: true, detail: 'Authenticated to the Defender for Endpoint API.' };
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  const H = { Authorization: `Bearer ${tk}`, Accept: 'application/json' };
  const signals = [];
  // Endpoint onboarding coverage across all known machines.
  try {
    const j = await jsonOrThrow(await http(`${RESOURCE}/api/machines`, { headers: H }), 'Defender');
    const machines = j.value || [];
    if (machines.length) {
      const onboarded = machines.filter((m) => String(m.onboardingStatus).toLowerCase() === 'onboarded').length;
      signals.push({ key: 'edr_pct', value: Math.round((onboarded / machines.length) * 100), asOf: nowIso(), raw: { machines: machines.length, onboarded } });
    }
  } catch (_) { /* confirm the app has Machine.Read.All */ }
  if (!signals.length) throw new Error('Authenticated, but no readable signals — confirm the app can read machines (Machine.Read.All).');
  return { signals, meta: { vendor: 'Microsoft Defender for Endpoint' } };
}

module.exports = {
  key: 'defender', label: 'Microsoft Defender for Endpoint', vendor: 'Microsoft', category: 'EDR / XDR',
  signals: ['edr_pct'],
  scopes: ['Machine.Read.All'],
  fields: [
    { key: 'tenantId', label: 'Directory (tenant) ID' },
    { key: 'clientId', label: 'Application (client) ID' },
    { key: 'clientSecret', label: 'Client secret', secret: true },
  ],
  test, fetchSignals,
};
