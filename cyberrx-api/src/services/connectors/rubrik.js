'use strict';

/**
 * Rubrik connector (read-only, Rubrik CDM REST v1).
 *
 * Fills the BCP/DR-readiness signals the CIO / COO seats read:
 *   backup_immutable_pct — share of protected objects on a retention-locked
 *                          (immutable / ransomware-proof) SLA domain
 *   rpo_minutes          — tightest configured backup frequency across SLAs
 *                          that actually protect objects (the recovery-point
 *                          objective the estate can meet)
 *   dr_test_days         — days since the last recovery event (a real restore /
 *                          DR test, not an assumed one)
 *
 * Auth uses a Rubrik API token as a bearer credential (recommended for service
 * accounts); if a username/password is supplied instead we open a session at
 * /api/v1/session and use the returned token. Built to the documented Rubrik
 * CDM contract; validate against a real cluster with a read-only role before
 * relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => `${String(creds.clusterUrl || '').replace(/\/+$/, '')}`;

async function bearer(creds) {
  if (creds.apiToken) return creds.apiToken;
  if (creds.username && creds.password) {
    const r = await http(`${base(creds)}/api/v1/session`, {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${creds.username}:${creds.password}`).toString('base64')}`, Accept: 'application/json' },
    });
    const j = await jsonOrThrow(r, 'Rubrik');
    const tk = j && (j.token || (j.session && j.session.token));
    if (!tk) throw new Error('Rubrik: no session token returned.');
    return tk;
  }
  throw new Error('Rubrik API token (or username + password) is required.');
}

const authH = (tk) => ({ Authorization: `Bearer ${tk}`, Accept: 'application/json' });

// Convert an SLA frequency descriptor to minutes; return the tightest.
function slaRpoMinutes(sla) {
  const mins = [];
  const push = (unit, freq) => {
    const f = Number(freq) || 1;
    const u = String(unit || '').toLowerCase();
    if (u.startsWith('minute')) mins.push(f);
    else if (u.startsWith('hour')) mins.push(f * 60);
    else if (u.startsWith('daily') || u.startsWith('day')) mins.push(f * 1440);
    else if (u.startsWith('week')) mins.push(f * 10080);
  };
  if (Array.isArray(sla.frequencies)) sla.frequencies.forEach((x) => push(x.timeUnit || x.unit, x.frequency));
  else if (sla.frequencies && typeof sla.frequencies === 'object') {
    Object.entries(sla.frequencies).forEach(([unit, v]) => push(unit, v && v.frequency));
  }
  return mins.length ? Math.min(...mins) : null;
}

function isRetentionLocked(sla) {
  return !!(sla.isRetentionLockedSla || sla.retentionLockMode === 'Compliance' || (sla.retentionLock && sla.retentionLock !== 'NoLock'));
}

async function test(creds) {
  if (!base(creds)) throw new Error('Rubrik cluster URL is required.');
  const tk = await bearer(creds);
  await jsonOrThrow(await http(`${base(creds)}/api/v1/sla_domain?limit=1`, { headers: authH(tk) }), 'Rubrik');
  return { ok: true, detail: 'Authenticated to the Rubrik CDM API.' };
}

async function fetchSignals(creds) {
  const tk = await bearer(creds);
  const H = authH(tk);
  const signals = [];
  // SLA domains → immutable coverage + tightest RPO.
  try {
    const j = await jsonOrThrow(await http(`${base(creds)}/api/v1/sla_domain?limit=200`, { headers: H }), 'Rubrik');
    const slas = (j && j.data) || [];
    let total = 0; let locked = 0; let rpo = null;
    for (const s of slas) {
      const objs = Number(s.numProtectedObjects) || 0;
      total += objs;
      if (isRetentionLocked(s)) locked += objs;
      if (objs > 0) { const m = slaRpoMinutes(s); if (m != null) rpo = rpo == null ? m : Math.min(rpo, m); }
    }
    if (total > 0) signals.push({ key: 'backup_immutable_pct', value: Math.round((locked / total) * 100), asOf: nowIso(), raw: { protectedObjects: total, immutableObjects: locked } });
    if (rpo != null) signals.push({ key: 'rpo_minutes', value: rpo, asOf: nowIso(), raw: { tightestSlaMinutes: rpo } });
  } catch (e) { if (/HTTP 4|HTTP 5/.test(e.message)) throw e; }
  // Last recovery event → DR-test recency.
  try {
    const j = await jsonOrThrow(await http(`${base(creds)}/api/v1/event?event_type=Recovery&limit=1&order_by_time=desc`, { headers: H }), 'Rubrik');
    const rows = (j && (j.data || j.result)) || [];
    const t = rows.length ? (rows[0].time || rows[0].eventDate || (rows[0].latestEvent && rows[0].latestEvent.time)) : null;
    const ms = t ? Date.parse(t) : NaN;
    if (Number.isFinite(ms)) signals.push({ key: 'dr_test_days', value: Math.max(0, Math.round((Date.now() - ms) / 864e5)), asOf: nowIso(), raw: { lastRecovery: t } });
  } catch (_) { /* recovery events not readable — backup signals still returned */ }
  if (!signals.length) throw new Error('Authenticated, but no SLA or recovery data was readable — confirm the role can read SLA domains and events.');
  return { signals, meta: { vendor: 'Rubrik' } };
}

module.exports = {
  key: 'rubrik', label: 'Rubrik', vendor: 'Rubrik', category: 'Backup & Disaster Recovery',
  signals: ['backup_immutable_pct', 'rpo_minutes', 'dr_test_days'],
  scopes: ['Read-only role — SLA domains + events'],
  fields: [
    { key: 'clusterUrl', label: 'Cluster / RSC URL (https://rubrik.example.com)' },
    { key: 'apiToken', label: 'API token (service account)', secret: true, optional: true },
    { key: 'username', label: 'Username (if not using an API token)', optional: true },
    { key: 'password', label: 'Password (if not using an API token)', secret: true, optional: true },
  ],
  test, fetchSignals,
};
