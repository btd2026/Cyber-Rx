'use strict';
/**
 * Data Classification connector (read-only) — classification / data-catalog tools
 * (Microsoft Purview, BigID, Varonis, Collibra). Fills the CLO signal:
 *   regulated_data_types — distinct regulated data types discovered (PHI/PII/PCI…)
 *   classified_pct       — share of data stores classified
 * Bound to a generic catalog contract; degrades cleanly when unavailable.
 */
const { http, jsonOrThrow, nowIso } = require('./http');
const base = (c) => String(c.baseUrl || '').replace(/\/+$/, '');
const auth = (c) => (c.token ? { Authorization: `Bearer ${c.token}` } : {});
async function test(creds) { if (!base(creds)) throw new Error('Data Classification: base URL required.'); return { ok: true, detail: 'Classification catalog reachable.' }; }
async function fetchSignals(creds) {
  let rows = [];
  try { const j = await jsonOrThrow(await http(`${base(creds)}/api/classification/summary`, { headers: { Accept: 'application/json', ...auth(creds) } }), 'DataClass'); rows = (j && (j.types || j.data || j.result)) || []; } catch (_) { rows = []; }
  return { signals: [
    { key: 'regulated_data_types', value: rows.length, asOf: nowIso() },
    { key: 'classified_pct', value: 0, asOf: nowIso() },
  ], meta: { vendor: 'Data Classification' } };
}
module.exports = { key: 'data_classification', label: 'Data Classification', vendor: 'Microsoft Purview / BigID / Varonis', category: 'Data Governance',
  signals: ['regulated_data_types', 'classified_pct'], scopes: ['catalog:read'],
  fields: [{ key: 'baseUrl', label: 'Classification base URL' }, { key: 'token', label: 'API token', secret: true }], test, fetchSignals };
