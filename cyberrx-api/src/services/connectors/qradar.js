'use strict';

/**
 * IBM QRadar connector (read-only, SEC token auth). Fills open_incidents (open
 * offenses) and siem_log_sources (configured log sources). Auth is QRadar's
 * documented `SEC: <token>` header against the appliance base URL; the offense
 * count reads the total from the paged `Content-Range` response header. Built to
 * the documented QRadar REST API contract; validate against a real appliance
 * with a read-only authorized service token before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.baseUrl || '').replace(/\/+$/, '');
const authH = (creds) => ({ SEC: creds.token, Accept: 'application/json' });

async function test(creds) {
  if (!creds.baseUrl || !creds.token) throw new Error('QRadar: base URL and a SEC token are required.');
  const r = await http(`${base(creds)}/api/siem/offenses?fields=id`, { headers: { ...authH(creds), Range: 'items=0-0' } });
  if (!r.ok) { let d = ''; try { d = (await r.text()).slice(0, 200); } catch (_) {} throw new Error(`QRadar returned HTTP ${r.status}${d ? ` (${d})` : ''}`); }
  return { ok: true, detail: 'Authenticated to the QRadar REST API.' };
}

async function fetchSignals(creds) {
  const signals = [];
  // Open offenses: request a single item and read the total from Content-Range
  // ("items 0-0/<total>"); fall back to array length if the header is absent.
  const r = await http(`${base(creds)}/api/siem/offenses?filter=${encodeURIComponent('status=OPEN')}&fields=id`,
    { headers: { ...authH(creds), Range: 'items=0-0' } });
  if (!r.ok) { let d = ''; try { d = (await r.text()).slice(0, 200); } catch (_) {} throw new Error(`QRadar returned HTTP ${r.status}${d ? ` (${d})` : ''}`); }
  let total = null;
  const cr = r.headers.get('Content-Range') || r.headers.get('content-range');
  if (cr && cr.includes('/')) { const n = Number(cr.split('/').pop()); if (Number.isFinite(n)) total = n; }
  if (total == null) { try { const arr = await r.json(); if (Array.isArray(arr)) total = arr.length; } catch (_) {} }
  if (total != null) signals.push({ key: 'open_incidents', value: Math.round(total), asOf: nowIso(), raw: {} });
  // Best-effort log-source count from the log-source management API.
  try {
    const sources = await jsonOrThrow(await http(`${base(creds)}/api/config/event_sources/log_source_management/log_sources?fields=id`,
      { headers: authH(creds) }), 'QRadar');
    if (Array.isArray(sources)) signals.push({ key: 'siem_log_sources', value: sources.length, asOf: nowIso(), raw: {} });
  } catch (_) { /* log-source API optional — needs the config read capability */ }
  if (!signals.length) throw new Error('Authenticated, but no readable signals — confirm the token can read offenses.');
  return { signals, meta: { vendor: 'IBM' } };
}

module.exports = {
  key: 'qradar', label: 'IBM QRadar', vendor: 'IBM', category: 'SIEM / Log analytics',
  signals: ['open_incidents', 'siem_log_sources'],
  scopes: ['SIEM (read-only): offenses + log source management'],
  fields: [
    { key: 'baseUrl', label: 'QRadar console URL (https://qradar.example.com)' },
    { key: 'token', label: 'Authorized service token (SEC)', secret: true },
  ],
  test, fetchSignals,
};
