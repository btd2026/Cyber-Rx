'use strict';

/**
 * Microsoft Entra ID Governance connector (read-only, OAuth2 client-credentials →
 * Microsoft Graph). Fills access_review_pct — access-review decision completion
 * across review instances (identityGovernance/accessReviews) — and
 * dormant_accounts — users with no interactive sign-in in ~90d via
 * signInActivity. Built to the documented Graph contract (app permissions
 * AccessReview.Read.All + AuditLog.Read.All / User.Read.All); validate against a
 * real tenant with a read-only app registration before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const GRAPH = 'https://graph.microsoft.com/v1.0';

async function token(creds) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials', client_id: creds.clientId, client_secret: creds.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
  });
  const r = await http(`https://login.microsoftonline.com/${encodeURIComponent(creds.tenantId)}/oauth2/v2.0/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await jsonOrThrow(r, 'Entra');
  if (!j.access_token) throw new Error('Entra: no access token returned.');
  return j.access_token;
}

async function test(creds) {
  if (!creds.tenantId || !creds.clientId || !creds.clientSecret) {
    throw new Error('Entra tenant ID, client ID and client secret are required.');
  }
  const tk = await token(creds);
  await jsonOrThrow(await http(`${GRAPH}/identityGovernance/accessReviews/definitions?$top=1`, { headers: { Authorization: `Bearer ${tk}`, Accept: 'application/json' } }), 'Entra');
  return { ok: true, detail: 'Authenticated to the Microsoft Graph identity-governance API.' };
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  const H = { Authorization: `Bearer ${tk}`, Accept: 'application/json' };
  const signals = [];
  // Access-review completion — aggregate decisions across current instances.
  const dj = await jsonOrThrow(await http(`${GRAPH}/identityGovernance/accessReviews/definitions?$top=50`, { headers: H }), 'Entra');
  const defs = dj.value || [];
  let completed = 0;
  let total = 0;
  for (const d of defs) {
    try {
      const ij = await jsonOrThrow(await http(`${GRAPH}/identityGovernance/accessReviews/definitions/${d.id}/instances?$top=20`, { headers: H }), 'Entra');
      for (const inst of (ij.value || [])) {
        const decj = await jsonOrThrow(await http(`${GRAPH}/identityGovernance/accessReviews/definitions/${d.id}/instances/${inst.id}/decisions?$top=200`, { headers: H }), 'Entra');
        const decisions = decj.value || [];
        total += decisions.length;
        completed += decisions.filter((x) => x.decision && String(x.decision).toLowerCase() !== 'notreviewed').length;
      }
    } catch (_) { /* skip a definition we can't page */ }
  }
  if (total > 0) {
    signals.push({ key: 'access_review_pct', value: Math.round((completed / total) * 100), asOf: nowIso(), raw: { definitions: defs.length, completed, total } });
  }
  // Dormant accounts — users with no interactive sign-in in ~90d. Optional.
  try {
    const cutoff = Date.now() - 90 * 864e5;
    const uj = await jsonOrThrow(await http(`${GRAPH}/users?$select=id,accountEnabled,signInActivity&$top=500`, { headers: H }), 'Entra');
    const users = uj.value || [];
    const dormant = users.filter((u) => {
      const last = u.signInActivity && (u.signInActivity.lastSignInDateTime || u.signInActivity.lastNonInteractiveSignInDateTime);
      const t = last ? Date.parse(last) : NaN;
      return !last || (Number.isFinite(t) && t < cutoff);
    }).length;
    signals.push({ key: 'dormant_accounts', value: dormant, asOf: nowIso(), raw: { returned: users.length, dormant } });
  } catch (_) { /* confirm AuditLog.Read.All for signInActivity */ }
  if (!signals.length) throw new Error('Authenticated, but no readable signals — confirm access-review definitions exist and the app can read decisions.');
  return { signals, meta: { vendor: 'Microsoft' } };
}

module.exports = {
  key: 'entra_id_gov', label: 'Microsoft Entra ID Governance', vendor: 'Microsoft', category: 'Access governance / IGA',
  signals: ['access_review_pct', 'dormant_accounts'],
  scopes: ['AccessReview.Read.All', 'AuditLog.Read.All', 'User.Read.All'],
  fields: [
    { key: 'tenantId', label: 'Directory (tenant) ID' },
    { key: 'clientId', label: 'Application (client) ID' },
    { key: 'clientSecret', label: 'Client secret', secret: true },
  ],
  test, fetchSignals,
};
