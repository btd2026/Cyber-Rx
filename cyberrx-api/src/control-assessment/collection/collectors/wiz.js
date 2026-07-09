'use strict';
const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');

// Wiz (CC7.1 / CSPM) — pulls scan_coverage_denominator (evaluated cloud
// resources), open_critical_vulns (open CRITICAL configuration findings, i.e.
// FAIL), config_monitoring_enabled (Wiz continuously evaluates config),
// vuln_scan_cadence ('continuous') and remediation_sla_met (true only when no
// critical is open). OAuth2 client-credentials → tenant GraphQL endpoint.
// Documented Wiz GraphQL contract; validate against a live tenant.
const RESOURCE_Q = 'query { cloudResources(first: 0) { totalCount } }';
const FINDING_Q = 'query($s:[ConfigurationSeverity!],$r:[ConfigurationFindingStatus!]){ configurationFindings(filterBy:{severity:$s, result:$r}) { totalCount } }';

async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const apiUrl = String(c.apiUrl || c.api_url || '').replace(/\/+$/, '');
  const cid = c.clientId || c.client_id;
  const sec = c.clientSecret || c.client_secret;
  if (!apiUrl || !cid || !sec) return {};
  let tk;
  try {
    const authUrl = String(c.authUrl || c.auth_url || 'https://auth.app.wiz.io/oauth/token').replace(/\/+$/, '');
    const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: cid, client_secret: sec, audience: c.audience || 'wiz-api' });
    const j = await jsonOrThrow(await H(authUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }), 'Wiz');
    tk = j.access_token; if (!tk) return {};
  } catch (_) { return {}; }
  const gql = async (query, variables) => {
    const j = await jsonOrThrow(await H(apiUrl + '/graphql', { method: 'POST', headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ query, variables }) }), 'Wiz');
    if (j.errors && j.errors.length) throw new Error('Wiz GraphQL: ' + j.errors[0].message);
    return j.data || {};
  };
  const out = {};

  // Evaluated resources → denominator (evaluation is continuous ⇒ cadence + config-monitoring).
  try { const n = ((await gql(RESOURCE_Q)).cloudResources || {}).totalCount; if (Number.isFinite(Number(n))) out.scan_coverage_denominator = Number(n); } catch (_) {}
  // Open critical configuration findings (FAIL) → open_critical_vulns.
  try {
    const n = ((await gql(FINDING_Q, { s: ['CRITICAL'], r: ['FAIL'] })).configurationFindings || {}).totalCount;
    if (Number.isFinite(Number(n))) { out.open_critical_vulns = Number(n); out.config_monitoring_enabled = true; out.vuln_scan_cadence = 'continuous'; }
  } catch (_) {}
  // No open critical ⇒ none past SLA (provable); otherwise omit → control stays partial.
  if (out.open_critical_vulns === 0) out.remediation_sla_met = true;
  return out;
}
module.exports = { key: 'wiz', collect };
