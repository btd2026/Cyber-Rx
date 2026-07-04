'use strict';

/**
 * Google Security Command Center connector (read-only, SCC REST via a service-
 * account JWT-bearer token).
 *
 * Fills cspm_pct — cloud-posture health from SCC findings grouped by state:
 * the share that are INACTIVE (remediated) vs ACTIVE (open) across the
 * organization. SCC surfaces posture issues as findings, so this is a
 * remediation-rate posture measure (raw counts are attached for transparency).
 * Auth is the documented service-account flow: sign an RS256 JWT assertion with
 * the SA private key, exchange it at oauth2.googleapis.com for an access token
 * (scope cloud-platform), then call SCC. Built to the documented SCC contract;
 * validate against a real org with the Security Center Findings Viewer role
 * before relying on it.
 */

const jwt = require('jsonwebtoken');
const { http, jsonOrThrow, nowIso } = require('./http');

function parseSA(creds) {
  let sa = creds.serviceAccountJson;
  if (typeof sa === 'string') { try { sa = JSON.parse(sa); } catch (_) { throw new Error('Service-account JSON is not valid JSON.'); } }
  if (!sa || !sa.client_email || !sa.private_key) throw new Error('Service-account JSON must include client_email and private_key.');
  return sa;
}

async function token(creds) {
  const sa = parseSA(creds);
  const iat = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    { iss: sa.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform', aud: sa.token_uri || 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600 },
    sa.private_key, { algorithm: 'RS256' },
  );
  const body = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion });
  const j = await jsonOrThrow(await http(sa.token_uri || 'https://oauth2.googleapis.com/token',
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }), 'Google');
  if (!j.access_token) throw new Error('Google: no access token returned.');
  return j.access_token;
}

const groupUrl = (creds) => `https://securitycenter.googleapis.com/v1/organizations/${creds.organizationId}/sources/-/findings:group`;

async function groupByState(creds, tk) {
  const j = await jsonOrThrow(await http(groupUrl(creds), {
    method: 'POST', headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ groupBy: 'state' }),
  }), 'Google SCC');
  let active = 0; let inactive = 0;
  for (const g of (j.groupByResults || [])) {
    const state = g.properties && g.properties.state;
    const n = Number(g.count) || 0;
    if (state === 'ACTIVE') active += n; else if (state === 'INACTIVE') inactive += n;
  }
  return { active, inactive };
}

async function test(creds) {
  if (!creds.serviceAccountJson || !creds.organizationId) throw new Error('Service-account JSON and organization ID are required.');
  const tk = await token(creds);
  await groupByState(creds, tk);
  return { ok: true, detail: 'Authenticated to the Google Security Command Center API.' };
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  const { active, inactive } = await groupByState(creds, tk);
  const total = active + inactive;
  if (total === 0) throw new Error('Authenticated, but no findings were readable — confirm SCC is enabled and the SA has Findings Viewer.');
  return { signals: [{ key: 'cspm_pct', value: Math.round((inactive / total) * 100), asOf: nowIso(), raw: { active, inactive, total } }], meta: { vendor: 'Google Security Command Center' } };
}

module.exports = {
  key: 'gcp', label: 'Google Security Command Center', vendor: 'Google', category: 'Cloud Security Posture (CSPM)',
  signals: ['cspm_pct'],
  scopes: ['roles/securitycenter.findingsViewer'],
  fields: [
    { key: 'organizationId', label: 'GCP organization ID' },
    { key: 'serviceAccountJson', label: 'Service-account key JSON', secret: true },
  ],
  test, fetchSignals,
};
