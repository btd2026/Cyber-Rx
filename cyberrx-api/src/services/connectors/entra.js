'use strict';

/**
 * Microsoft Entra ID connector (read-only, OAuth2 client credentials → Graph).
 * Fills mfa_pct (MFA registration coverage) and priv_accts (privileged-role
 * members). Built to the documented Graph contract; validate against a real
 * tenant with read-only app permissions before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

async function token(creds) {
  // One-click OAuth: use the delegated Graph token directly, no client-credentials.
  if (creds && ((creds.oauth && creds.oauth.access_token) || creds.access_token)) {
    return (creds.oauth && creds.oauth.access_token) || creds.access_token;
  }
  const body = new URLSearchParams({
    client_id: creds.clientId, client_secret: creds.clientSecret,
    scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials',
  });
  const r = await http(`https://login.microsoftonline.com/${encodeURIComponent(creds.tenantId)}/oauth2/v2.0/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await jsonOrThrow(r, 'Entra');
  if (!j.access_token) throw new Error('Entra: no access token returned.');
  return j.access_token;
}

async function test(creds) {
  if (!creds.tenantId || !creds.clientId || !creds.clientSecret) throw new Error('Tenant ID, client ID and client secret are required.');
  await token(creds);
  return { ok: true, detail: 'Authenticated to Microsoft Graph.' };
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  const H = { Authorization: `Bearer ${tk}`, Accept: 'application/json' };
  const signals = [];
  // MFA registration coverage.
  try {
    const j = await jsonOrThrow(await http('https://graph.microsoft.com/v1.0/reports/authenticationMethods/userRegistrationDetails?$top=999', { headers: H }), 'Entra');
    const users = j.value || [];
    if (users.length) {
      const mfa = users.filter((u) => u.isMfaRegistered || u.isMfaCapable).length;
      signals.push({ key: 'mfa_pct', value: Math.round((mfa / users.length) * 100), asOf: nowIso(), raw: { users: users.length, mfa } });
    }
  } catch (_) { /* needs Entra ID P1/P2; skip if unavailable */ }
  // Privileged role members.
  try {
    const roles = (await jsonOrThrow(await http('https://graph.microsoft.com/v1.0/directoryRoles', { headers: H }), 'Entra')).value || [];
    let priv = 0;
    for (const role of roles.slice(0, 25)) {
      try { const n = await jsonOrThrow(await http(`https://graph.microsoft.com/v1.0/directoryRoles/${role.id}/members/$count`, { headers: { ...H, ConsistencyLevel: 'eventual' } }), 'Entra'); priv += Number(n) || 0; } catch (_) {}
    }
    if (priv) signals.push({ key: 'priv_accts', value: priv, asOf: nowIso(), raw: { roles: roles.length } });
  } catch (_) {}
  if (!signals.length) throw new Error('Authenticated, but no readable signals — confirm the app has User/AuditLog/RoleManagement read scopes.');
  return { signals, meta: { vendor: 'Microsoft Entra ID' } };
}

module.exports = {
  key: 'entra', label: 'Microsoft Entra ID', vendor: 'Microsoft', category: 'Identity',
  signals: ['mfa_pct', 'priv_accts'],
  scopes: ['User.Read.All', 'AuditLog.Read.All', 'RoleManagement.Read.Directory'],
  fields: [
    { key: 'tenantId', label: 'Directory (tenant) ID' },
    { key: 'clientId', label: 'Application (client) ID' },
    { key: 'clientSecret', label: 'Client secret', secret: true },
  ],
  test, fetchSignals,
};
