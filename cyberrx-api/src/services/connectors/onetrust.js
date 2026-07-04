'use strict';

/**
 * OneTrust connector (read-only, Privacy Rights Automation + Data Subject
 * Request API via OAuth2 client-credentials).
 *
 * Fills three privacy-operations signals the CLO seat reads:
 *   dsar_open     — data-subject requests currently in flight (not closed)
 *   dsar_overdue  — open requests whose statutory response clock has passed
 *   legal_holds   — active legal / litigation holds (from the incident module)
 *
 * OneTrust's DSAR API exposes request queues at /api/datasubject/v2/requests
 * with a status and a dueDate; overdue = open AND dueDate < now. Legal holds
 * come from the Incident & Breach module (/api/incident/v2/holds); it is
 * best-effort — if that module is not licensed we still report the DSAR
 * signals. Built to the documented OneTrust contract; validate against a real
 * tenant before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.baseUrl || '').replace(/\/+$/, '');

async function token(creds) {
  const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: creds.clientId, client_secret: creds.clientSecret });
  const r = await http(`${base(creds)}/api/access/v1/oauth/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await jsonOrThrow(r, 'OneTrust');
  if (!j.access_token) throw new Error('OneTrust: no access token returned.');
  return j.access_token;
}

const OPEN_STATUSES = ['created', 'inprogress', 'in_progress', 'in progress', 'onhold', 'on_hold', 'pending', 'submitted', 'received'];
const isOpen = (s) => !['closed', 'completed', 'complete', 'rejected', 'cancelled', 'canceled', 'fulfilled'].includes(String(s || '').toLowerCase());

async function fetchRequests(creds, tk) {
  // Page the DSAR request queue (bounded to keep call count sane).
  const out = [];
  const H = { Authorization: `Bearer ${tk}`, Accept: 'application/json' };
  for (let page = 0; page < 20; page += 1) {
    const j = await jsonOrThrow(await http(`${base(creds)}/api/datasubject/v2/requests?page=${page}&size=200`, { headers: H }), 'OneTrust');
    const rows = (j && (j.content || j.data || j.requests)) || [];
    out.push(...rows);
    const totalPages = j && (j.totalPages != null ? j.totalPages : (rows.length < 200 ? page + 1 : page + 2));
    if (!rows.length || page + 1 >= totalPages) break;
  }
  return out;
}

async function test(creds) {
  if (!base(creds) || !creds.clientId || !creds.clientSecret) throw new Error('OneTrust base URL, client ID and client secret are required.');
  const tk = await token(creds);
  await jsonOrThrow(await http(`${base(creds)}/api/datasubject/v2/requests?page=0&size=1`, { headers: { Authorization: `Bearer ${tk}`, Accept: 'application/json' } }), 'OneTrust');
  return { ok: true, detail: 'Authenticated to the OneTrust API.' };
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  const signals = [];
  const now = Date.now();
  const requests = await fetchRequests(creds, tk);
  const open = requests.filter((r) => isOpen(r.status || r.stage || r.workflowStatus));
  const overdue = open.filter((r) => {
    const due = r.dueDate || r.responseDueDate || r.deadline;
    const d = due ? Date.parse(due) : NaN;
    return Number.isFinite(d) && d < now;
  });
  signals.push({ key: 'dsar_open', value: open.length, asOf: nowIso(), raw: { total: requests.length, open: open.length } });
  signals.push({ key: 'dsar_overdue', value: overdue.length, asOf: nowIso(), raw: { open: open.length, overdue: overdue.length } });
  // Legal holds — best effort; a missing/unlicensed module must not fail the sync.
  try {
    const H = { Authorization: `Bearer ${tk}`, Accept: 'application/json' };
    const j = await jsonOrThrow(await http(`${base(creds)}/api/incident/v2/holds?page=0&size=200`, { headers: H }), 'OneTrust');
    const holds = (j && (j.content || j.data || j.holds)) || [];
    const active = holds.filter((h) => isOpen(h.status)).length;
    signals.push({ key: 'legal_holds', value: active, asOf: nowIso(), raw: { total: holds.length, active } });
  } catch (_) { /* incident module not available — DSAR signals still returned */ }
  return { signals, meta: { vendor: 'OneTrust' } };
}

module.exports = {
  key: 'onetrust', label: 'OneTrust', vendor: 'OneTrust', category: 'Privacy Operations',
  signals: ['dsar_open', 'dsar_overdue', 'legal_holds'],
  scopes: ['datasubject:read', 'incident:read'],
  fields: [
    { key: 'baseUrl', label: 'OneTrust base URL (https://yourorg.my.onetrust.com)' },
    { key: 'clientId', label: 'Client ID' },
    { key: 'clientSecret', label: 'Client secret', secret: true },
  ],
  test, fetchSignals,
};
