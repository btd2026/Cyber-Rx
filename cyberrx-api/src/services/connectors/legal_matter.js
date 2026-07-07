'use strict';

/**
 * Legal Matter Management connector (read-only) — matter/e-billing systems
 * (Onit, SimpleLegal, Legal Tracker, HighQ). Fills the Board & CLO signals:
 *   open_cyber_matters   — open matters tagged cyber / privacy
 *   disclosure_pending   — incidents awaiting a disclosure decision
 *   litigation_exposure  — modeled exposure across open cyber matters ($)
 * Bound to a generic matters REST contract; degrades cleanly when unavailable.
 */
const { http, jsonOrThrow, nowIso } = require('./http');
const base = (c) => String(c.baseUrl || '').replace(/\/+$/, '');
const auth = (c) => (c.token ? { Authorization: `Bearer ${c.token}` } : {});
async function test(creds) { if (!base(creds)) throw new Error('Legal Matter Mgmt: base URL required.'); return { ok: true, detail: 'Matter system reachable.' }; }
async function fetchSignals(creds) {
  let rows = [];
  try { const j = await jsonOrThrow(await http(`${base(creds)}/api/matters?tag=cyber`, { headers: { Accept: 'application/json', ...auth(creds) } }), 'Legal'); rows = (j && (j.matters || j.data || j.result)) || []; } catch (_) { rows = []; }
  const open = rows.filter((m) => !/closed|resolved/i.test(String(m.status || '')));
  const exp = open.reduce((s, m) => s + (Number(m.exposure) || 0), 0);
  return { signals: [
    { key: 'open_cyber_matters', value: open.length, asOf: nowIso() },
    { key: 'disclosure_pending', value: open.filter((m) => /disclos/i.test(String(m.type || ''))).length, asOf: nowIso() },
    { key: 'litigation_exposure', value: exp, asOf: nowIso() },
  ], meta: { vendor: 'Legal Matter Mgmt' } };
}
module.exports = { key: 'legal_matter', label: 'Legal Matter Mgmt', vendor: 'Onit / SimpleLegal / Legal Tracker', category: 'Legal Operations',
  signals: ['open_cyber_matters', 'disclosure_pending', 'litigation_exposure'], scopes: ['matters:read'],
  fields: [{ key: 'baseUrl', label: 'Matter system base URL' }, { key: 'token', label: 'API token', secret: true }], test, fetchSignals };
