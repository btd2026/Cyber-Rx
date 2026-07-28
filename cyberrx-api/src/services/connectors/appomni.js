'use strict';

/**
 * AppOmni SSPM connector (read-only API token). Fills sspm_pct — the share of the
 * SaaS applications AppOmni knows about that are under ACTIVE posture management
 * (a live monitored connection), not merely discovered. This is the one control
 * signal that previously had no producer, so SSPM was attested-only. Built to the
 * documented AppOmni REST API contract; validate against a real tenant before
 * relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.baseUrl || (creds.tenant ? `https://${creds.tenant}.appomni.com` : 'https://api.appomni.com')).replace(/\/+$/, '');
const authH = (creds) => ({ Authorization: `Bearer ${creds.apiToken}`, Accept: 'application/json' });

// A known app counts as posture-managed when AppOmni is actively monitoring it
// (an active connection collecting posture), not just discovered/unmanaged.
function isManaged(a) {
  const s = String((a && (a.monitoring_status || a.status)) || '').toLowerCase();
  if (s) return s === 'active' || s === 'monitored' || s === 'connected' || s === 'enabled';
  return a.monitored === true || a.is_monitored === true || a.active === true;
}

async function test(creds) {
  if (!creds.apiToken) throw new Error('An AppOmni API token is required.');
  await jsonOrThrow(await http(`${base(creds)}/api/v1/monitored-apps?limit=1`, { headers: authH(creds) }), 'AppOmni');
  return { ok: true, detail: 'Authenticated to the AppOmni API.' };
}

async function fetchSignals(creds) {
  const H = authH(creds);
  const b = base(creds);
  // The full SaaS inventory AppOmni knows about (monitored + discovered).
  const resp = await jsonOrThrow(await http(`${b}/api/v1/monitored-apps?limit=1000`, { headers: H }), 'AppOmni');
  const apps = Array.isArray(resp) ? resp : (resp.results || resp.data || resp.apps || []);
  if (!apps.length) throw new Error('Authenticated, but AppOmni returned no SaaS applications — confirm the token can read the app inventory.');
  const managed = apps.filter(isManaged).length;
  const signals = [
    { key: 'sspm_pct', value: Math.round((managed / apps.length) * 100), asOf: nowIso(), raw: { apps: apps.length, managed } },
  ];
  // Open posture findings, when the token can read them — provenance only.
  try {
    const f = await jsonOrThrow(await http(`${b}/api/v1/findings?status=open&limit=1`, { headers: H }), 'AppOmni');
    const openCount = f && (f.total != null ? f.total : (f.count != null ? f.count : (Array.isArray(f) ? f.length : null)));
    if (openCount != null && Number.isFinite(Number(openCount))) signals.push({ key: 'sspm_open_findings', value: Number(openCount), asOf: nowIso(), raw: {} });
  } catch (_) { /* findings optional — a token may lack finding-read scope */ }
  return { signals, meta: { vendor: 'AppOmni', apps: apps.length, managed } };
}

module.exports = {
  key: 'appomni', label: 'AppOmni', vendor: 'AppOmni', category: 'SaaS Security Posture',
  signals: ['sspm_pct', 'sspm_open_findings'],
  scopes: ['Read-only API token'],
  fields: [
    { key: 'apiToken', label: 'AppOmni API token', secret: true },
    { key: 'tenant', label: 'Tenant subdomain (e.g. acme → acme.appomni.com)', optional: true },
    { key: 'baseUrl', label: 'API base URL (optional — overrides tenant)', optional: true },
  ],
  test, fetchSignals,
};
