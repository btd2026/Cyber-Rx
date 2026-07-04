'use strict';

/**
 * Microsoft Defender for Cloud connector (read-only, Azure Resource Manager
 * REST via OAuth2 client-credentials).
 *
 * Fills cspm_pct — cloud-posture compliance derived from the Microsoft Cloud
 * Security Benchmark assessments on the subscription: the share of resource
 * assessments whose status is Healthy vs Unhealthy (Security Center
 * assessments API). Auth is the documented Entra client-credentials flow
 * (login.microsoftonline.com → ARM token, scope management.azure.com). Built to
 * the documented ARM contract; validate against a real subscription with a
 * Reader role before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

async function token(creds) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials', client_id: creds.clientId, client_secret: creds.clientSecret,
    scope: 'https://management.azure.com/.default',
  });
  const r = await http(`https://login.microsoftonline.com/${creds.tenantId}/oauth2/v2.0/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await jsonOrThrow(r, 'Azure');
  if (!j.access_token) throw new Error('Azure: no access token returned.');
  return j.access_token;
}

const assessUrl = (creds) => `https://management.azure.com/subscriptions/${creds.subscriptionId}/providers/Microsoft.Security/assessments?api-version=2021-06-01`;

async function test(creds) {
  if (!creds.tenantId || !creds.clientId || !creds.clientSecret || !creds.subscriptionId) {
    throw new Error('Azure tenant ID, client ID, client secret and subscription ID are required.');
  }
  const tk = await token(creds);
  await jsonOrThrow(await http(assessUrl(creds), { headers: { Authorization: `Bearer ${tk}`, Accept: 'application/json' } }), 'Azure');
  return { ok: true, detail: 'Authenticated to the Azure Defender for Cloud API.' };
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  let url = assessUrl(creds); let healthy = 0; let unhealthy = 0; let pages = 0;
  while (url && pages < 10) {
    const j = await jsonOrThrow(await http(url, { headers: { Authorization: `Bearer ${tk}`, Accept: 'application/json' } }), 'Azure');
    for (const a of (j.value || [])) {
      const code = a.properties && a.properties.status && a.properties.status.code;
      if (code === 'Healthy') healthy += 1; else if (code === 'Unhealthy') unhealthy += 1;
    }
    url = j.nextLink || null; pages += 1;
  }
  const total = healthy + unhealthy;
  if (total === 0) throw new Error('Authenticated, but no assessments were readable — confirm Defender for Cloud is enabled and the app has Reader on the subscription.');
  return { signals: [{ key: 'cspm_pct', value: Math.round((healthy / total) * 100), asOf: nowIso(), raw: { healthy, unhealthy, total } }], meta: { vendor: 'Microsoft Defender for Cloud' } };
}

module.exports = {
  key: 'azure', label: 'Microsoft Defender for Cloud', vendor: 'Microsoft', category: 'Cloud Security Posture (CSPM)',
  signals: ['cspm_pct'],
  scopes: ['Reader (subscription) — Microsoft.Security/assessments read'],
  fields: [
    { key: 'tenantId', label: 'Directory (tenant) ID' },
    { key: 'clientId', label: 'Application (client) ID' },
    { key: 'clientSecret', label: 'Client secret', secret: true },
    { key: 'subscriptionId', label: 'Subscription ID' },
  ],
  test, fetchSignals,
};
