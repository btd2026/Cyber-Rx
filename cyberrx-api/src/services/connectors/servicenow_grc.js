'use strict';

/**
 * ServiceNow GRC / Audit Management connector (read-only, Aggregate API).
 *
 * Fills the assurance signals the Internal Audit seat needs:
 *   audit_findings_open   — open audit findings / GRC issues (active=true):
 *                           the current control-gap backlog.
 *   audit_findings_repeat — open findings flagged as recurring across audit
 *                           cycles — the systemic gaps that were closed on paper
 *                           but not in practice.
 *
 * Counts come from the ServiceNow Aggregate API
 *   GET /api/now/stats/{table}?sysparm_count=true&sysparm_query={encoded query}
 * which returns { result: { stats: { count } } } — no row transfer, just a count.
 * Auth is HTTP Basic against the instance (a read-only integration user with the
 * sn_audit / GRC read role). The findings table defaults to `sn_audit_finding`
 * (Audit Management) and is overridable for GRC-Issue deployments; the "repeat"
 * query is overridable because the recurring-finding field varies by instance —
 * if that query is invalid for the instance, its signal is simply omitted rather
 * than failing the whole fetch. Built to the documented ServiceNow REST contract;
 * validate against a real instance with a read-only account before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (c) => String(c.instance || '').replace(/\/+$/, '');
const table = (c) => String(c.table || 'sn_audit_finding').replace(/[^a-z0-9_]/gi, '');
const authHdr = (c) => 'Basic ' + Buffer.from(`${c.username}:${c.password}`).toString('base64');
function hdr(c) { return { Authorization: authHdr(c), Accept: 'application/json' }; }

// Aggregate count for a table + encoded query. Throws on non-2xx (caller decides
// whether to omit the signal or fail).
async function count(creds, query) {
  const url = `${base(creds)}/api/now/stats/${table(creds)}?sysparm_count=true`
    + `&sysparm_query=${encodeURIComponent(query)}`;
  const r = await http(url, { headers: hdr(creds) });
  const j = await jsonOrThrow(r, 'ServiceNow');
  const n = j && j.result && j.result.stats && j.result.stats.count;
  const v = Number(n);
  if (!isFinite(v)) throw new Error('ServiceNow: aggregate API returned no count (check the table name and read role).');
  return v;
}

async function test(creds) {
  if (!creds.instance || !creds.username || !creds.password) {
    throw new Error('ServiceNow instance URL, username and password are required.');
  }
  // Any count against the findings table proves auth + read access to the module.
  const n = await count(creds, 'active=true');
  return { ok: true, detail: `Authenticated to ServiceNow — ${n} open item(s) readable in ${table(creds)}.` };
}

async function fetchSignals(creds) {
  const signals = [];
  // Open findings: universally available on any findings/issue table.
  const open = await count(creds, 'active=true');
  signals.push({ key: 'audit_findings_open', value: open, asOf: nowIso(), raw: { table: table(creds), query: 'active=true' } });
  // Repeat findings: the field varies by instance, so the query is overridable and
  // best-effort — an invalid field just omits the signal, it does not fail the fetch.
  const repeatQuery = creds.repeatQuery || 'active=true^repeat=true';
  try {
    const rep = await count(creds, repeatQuery);
    signals.push({ key: 'audit_findings_repeat', value: rep, asOf: nowIso(), raw: { table: table(creds), query: repeatQuery } });
  } catch (e) { /* recurring-finding field not present on this instance */ }
  return { signals, meta: { vendor: 'ServiceNow GRC', table: table(creds) } };
}

module.exports = {
  key: 'servicenow_grc', label: 'ServiceNow GRC / Audit', vendor: 'ServiceNow', category: 'Audit & GRC (assurance)',
  signals: ['audit_findings_open', 'audit_findings_repeat'],
  scopes: ['sn_audit read', 'GRC issue read'],
  fields: [
    { key: 'instance', label: 'Instance URL (e.g. https://acme.service-now.com)' },
    { key: 'username', label: 'Integration user' },
    { key: 'password', label: 'Password', secret: true },
    { key: 'table', label: 'Findings table (optional — default sn_audit_finding)', optional: true },
    { key: 'repeatQuery', label: 'Repeat-finding query (optional — default active=true^repeat=true)', optional: true },
  ],
  test, fetchSignals,
};
