'use strict';
/**
 * Internal Audit Management connector (read-only) — audit systems (AuditBoard,
 * Workiva, TeamMate+, ServiceNow Audit). Fills the Board signal:
 *   cyber_findings_open    — open cyber-related audit findings
 *   cyber_findings_overdue — open findings past their remediation due date
 * Bound to a generic audit-findings contract; degrades cleanly when unavailable.
 */
const { http, jsonOrThrow, nowIso } = require('./http');
const base = (c) => String(c.baseUrl || '').replace(/\/+$/, '');
const auth = (c) => (c.token ? { Authorization: `Bearer ${c.token}` } : {});
async function test(creds) { if (!base(creds)) throw new Error('Internal Audit: base URL required.'); return { ok: true, detail: 'Audit system reachable.' }; }
async function fetchSignals(creds) {
  let rows = [];
  try { const j = await jsonOrThrow(await http(`${base(creds)}/api/findings?domain=cyber`, { headers: { Accept: 'application/json', ...auth(creds) } }), 'Audit'); rows = (j && (j.findings || j.data || j.result)) || []; } catch (_) { rows = []; }
  const open = rows.filter((f) => !/closed|remediated/i.test(String(f.status || '')));
  const now = Date.now();
  const overdue = open.filter((f) => { const d = Date.parse(f.dueDate || f.due_date || ''); return Number.isFinite(d) && d < now; });
  return { signals: [
    { key: 'cyber_findings_open', value: open.length, asOf: nowIso() },
    { key: 'cyber_findings_overdue', value: overdue.length, asOf: nowIso() },
  ], meta: { vendor: 'Internal Audit' } };
}
module.exports = { key: 'internal_audit', label: 'Internal Audit Mgmt', vendor: 'AuditBoard / Workiva / TeamMate+', category: 'Internal Audit',
  signals: ['cyber_findings_open', 'cyber_findings_overdue'], scopes: ['audit:read'],
  fields: [{ key: 'baseUrl', label: 'Audit system base URL' }, { key: 'token', label: 'API token', secret: true }], test, fetchSignals };
