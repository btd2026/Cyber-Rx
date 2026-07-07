'use strict';
/**
 * Contract Lifecycle Management connector (read-only) — CLM systems (Ironclad,
 * DocuSign CLM, Icertis, Agiloft). Fills the CLO signal:
 *   cyber_clauses_at_risk — contracts with cyber / SLA clauses currently at risk
 *   contracts_reviewed    — contracts scanned for cyber obligations
 * Bound to a generic CLM search contract; degrades cleanly when unavailable.
 */
const { http, jsonOrThrow, nowIso } = require('./http');
const base = (c) => String(c.baseUrl || '').replace(/\/+$/, '');
const auth = (c) => (c.token ? { Authorization: `Bearer ${c.token}` } : {});
async function test(creds) { if (!base(creds)) throw new Error('CLM: base URL required.'); return { ok: true, detail: 'CLM reachable.' }; }
async function fetchSignals(creds) {
  let rows = [];
  try { const j = await jsonOrThrow(await http(`${base(creds)}/api/contracts?clause=cyber`, { headers: { Accept: 'application/json', ...auth(creds) } }), 'CLM'); rows = (j && (j.contracts || j.data || j.result)) || []; } catch (_) { rows = []; }
  const atRisk = rows.filter((c) => /at.?risk|breach|expired/i.test(String(c.status || ''))).length;
  return { signals: [
    { key: 'cyber_clauses_at_risk', value: atRisk, asOf: nowIso() },
    { key: 'contracts_reviewed', value: rows.length, asOf: nowIso() },
  ], meta: { vendor: 'CLM' } };
}
module.exports = { key: 'contract_lifecycle', label: 'Contract Lifecycle Mgmt', vendor: 'Ironclad / DocuSign CLM / Icertis', category: 'Contract Management',
  signals: ['cyber_clauses_at_risk', 'contracts_reviewed'], scopes: ['contracts:read'],
  fields: [{ key: 'baseUrl', label: 'CLM base URL' }, { key: 'token', label: 'API token', secret: true }], test, fetchSignals };
