'use strict';

/**
 * Ivanti Neurons for RBVM connector (read-only, API token → Ivanti Neurons /
 * RiskSense platform REST API). Fills patch_pct — the share of hosts with NO
 * open critical vulnerability — and, where the tenant exposes SLA data,
 * vuln_sla_pct — the share of open, SLA-tracked findings still within SLA (not
 * breached). Counts come from the platform search endpoints, which return
 * { _embedded, page:{ totalElements } }; we request size 1 and read the total.
 *
 * Auth is the documented Ivanti/RiskSense scheme: the raw token in the
 * `Authorization` header (no "Bearer" prefix) against the client-scoped API
 * (POST /api/v1/client/{clientId}/...). Built to the documented contract
 * (https://platform.ivanti.com / RiskSense API docs); the exact search filter
 * field names vary by tenant/version — validate against a live client with a
 * read-only token before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.baseUrl || 'https://platform.ivanti.com').replace(/\/+$/, '');
const authH = (creds) => ({ Authorization: String(creds.token), 'Content-Type': 'application/json', Accept: 'application/json' });

// POST a search with the given filters and return page.totalElements (size 1).
async function searchTotal(creds, resource, filters) {
  const url = `${base(creds)}/api/v1/client/${encodeURIComponent(creds.clientId)}/${resource}/search`;
  const body = JSON.stringify({ filters: filters || [], projection: 'basic', page: 0, size: 1 });
  const j = await jsonOrThrow(await http(url, { method: 'POST', headers: authH(creds), body }), 'Ivanti');
  const n = j && j.page ? Number(j.page.totalElements) : NaN;
  return Number.isFinite(n) ? n : null;
}

const CRIT_OPEN = [
  { field: 'severity', exclusive: false, operator: 'EXACT', value: 'Critical' },
  { field: 'generic_state', exclusive: false, operator: 'EXACT', value: 'open' },
];

async function test(creds) {
  if (!base(creds) || !creds.clientId || !creds.token) {
    throw new Error('Ivanti platform URL, client ID and API token are required.');
  }
  await searchTotal(creds, 'host', []);
  return { ok: true, detail: 'Authenticated to the Ivanti Neurons / RiskSense API.' };
}

async function fetchSignals(creds) {
  const signals = [];
  // patch_pct: hosts with no open critical vuln ÷ total hosts.
  const total = await searchTotal(creds, 'host', []);
  if (total && total > 0) {
    const withCrit = await searchTotal(creds, 'host', CRIT_OPEN);
    if (withCrit != null) {
      const clean = Math.max(0, total - withCrit);
      signals.push({ key: 'patch_pct', value: Math.round((clean / total) * 100), asOf: nowIso(), raw: { totalHosts: total, hostsWithCritical: withCrit } });
    }
  }
  // vuln_sla_pct (optional): open SLA-tracked findings still within SLA ÷ total tracked.
  try {
    const tracked = await searchTotal(creds, 'hostFinding', [
      { field: 'generic_state', exclusive: false, operator: 'EXACT', value: 'open' },
      { field: 'has_sla', exclusive: false, operator: 'EXACT', value: 'true' },
    ]);
    if (tracked && tracked > 0) {
      const breached = await searchTotal(creds, 'hostFinding', [
        { field: 'generic_state', exclusive: false, operator: 'EXACT', value: 'open' },
        { field: 'sla_breached', exclusive: false, operator: 'EXACT', value: 'true' },
      ]);
      if (breached != null) {
        const withinSla = Math.max(0, tracked - breached);
        signals.push({ key: 'vuln_sla_pct', value: Math.round((withinSla / tracked) * 100), asOf: nowIso(), raw: { trackedFindings: tracked, breached } });
      }
    }
  } catch (_) { /* SLA fields not exposed on this tenant — patch_pct still stands */ }
  if (!signals.length) throw new Error('Authenticated, but no host/vulnerability counts were readable — confirm the token can read hosts and findings for this client.');
  return { signals, meta: { vendor: 'Ivanti' } };
}

module.exports = {
  key: 'ivanti', label: 'Ivanti Neurons', vendor: 'Ivanti', category: 'Vulnerability management',
  signals: ['patch_pct', 'vuln_sla_pct'],
  scopes: ['read-only API token (host + finding read)'],
  fields: [
    { key: 'baseUrl', label: 'Platform URL (https://platform.ivanti.com or region host)' },
    { key: 'clientId', label: 'Client ID (numeric RBVM client)' },
    { key: 'token', label: 'API token', secret: true },
  ],
  test, fetchSignals,
};
