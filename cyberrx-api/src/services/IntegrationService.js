'use strict';

/**
 * IntegrationService — connect, sync and track read-only security-tool feeds.
 *
 * On sync a connector returns normalized signals; we upsert their values into
 * metric_inputs (the table posture already reads) and record provenance in
 * signal_sync (source, freshness). Credentials are vaulted per tenant. This is
 * what turns the dashboard's modeled/demo signals into 'live' (Workstream A's
 * coverage meter reflects it automatically).
 */

const db = require('../utils/db');
const logger = require('../utils/logger');
const vault = require('../utils/vault');
const Connectors = require('./connectors');
const EvidenceAdapter = require('./EvidenceAdapterService');

const FRESH_DAYS = 7;

async function ensureTables() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS signal_sync (
      org_id TEXT NOT NULL, key TEXT NOT NULL, source TEXT, value TEXT,
      as_of TIMESTAMPTZ, status TEXT, PRIMARY KEY (org_id, key))`);
    await db.query(`CREATE TABLE IF NOT EXISTS integrations (
      org_id TEXT NOT NULL, connector TEXT NOT NULL, status TEXT, last_sync TIMESTAMPTZ,
      signal_count INT DEFAULT 0, error TEXT, PRIMARY KEY (org_id, connector))`);
  } catch (e) { logger.debug('integration ensureTables failed', { error: e.message }); }
}

async function upsertInput(orgId, key, value) {
  // No assumption about metric_inputs PK — replace the org's row for this key.
  try {
    await db.query('DELETE FROM metric_inputs WHERE org_id=$1 AND key=$2', [orgId, key]);
    await db.query('INSERT INTO metric_inputs (org_id, key, value) VALUES ($1,$2,$3)', [orgId, key, String(value)]);
  } catch (e) { logger.debug('metric_inputs upsert failed', { key, error: e.message }); }
}

async function upsertSignal(orgId, key, source, value, asOf) {
  try {
    await db.query(
      `INSERT INTO signal_sync (org_id, key, source, value, as_of, status) VALUES ($1,$2,$3,$4,$5,'fresh')
       ON CONFLICT (org_id, key) DO UPDATE SET source=EXCLUDED.source, value=EXCLUDED.value, as_of=EXCLUDED.as_of, status='fresh'`,
      [orgId, key, source, String(value), asOf || new Date().toISOString()]);
  } catch (e) { logger.debug('signal_sync upsert failed', { key, error: e.message }); }
}

async function setStatus(orgId, connector, status, signalCount, error) {
  try {
    await db.query(
      `INSERT INTO integrations (org_id, connector, status, last_sync, signal_count, error) VALUES ($1,$2,$3,NOW(),$4,$5)
       ON CONFLICT (org_id, connector) DO UPDATE SET status=EXCLUDED.status, last_sync=NOW(), signal_count=EXCLUDED.signal_count, error=EXCLUDED.error`,
      [orgId, connector, status, signalCount || 0, error || null]);
  } catch (e) { logger.debug('integration setStatus failed', { error: e.message }); }
}

// Connect: validate creds, vault them, then run a first sync.
async function connect(orgId, key, creds) {
  const c = Connectors.get(key);
  if (!c) throw new Error(`Unknown connector: ${key}`);
  await c.test(creds); // throws on bad creds (skipped in demo mode by wrapper)
  if (!c.demoMode) await vault.set(orgId, `integration:${key}`, creds).catch(() => {});
  return sync(orgId, key);
}

// Sync: pull signals with the vaulted creds and write them through.
async function sync(orgId, key) {
  await ensureTables();
  const c = Connectors.get(key);
  if (!c) throw new Error(`Unknown connector: ${key}`);
  const creds = c.demoMode ? {} : await vault.get(orgId, `integration:${key}`).catch(() => null);
  if (!creds && !c.demoMode) throw new Error(`${c.label} is not connected.`);
  try {
    const { signals } = await c.fetchSignals(creds || {});
    for (const s of signals) { await upsertInput(orgId, s.key, s.value); await upsertSignal(orgId, s.key, c.label, s.value, s.asOf); }
    await setStatus(orgId, key, 'connected', signals.length, null);
    // Project the signals into the evidence ledger as control evidence (best
    // effort — never fail a sync because evidence projection hiccuped).
    let evidence = 0;
    try { ({ recorded: evidence } = await EvidenceAdapter.recordSignals(orgId, { connectorKey: key, label: c.label, signals })); }
    catch (e) { logger.warn(`Evidence projection failed for ${key}: ${e.message}`); }
    return { connector: key, status: 'connected', signals: signals.map((s) => ({ key: s.key, value: s.value })), evidenceRows: evidence };
  } catch (e) {
    await setStatus(orgId, key, 'error', 0, e.message);
    throw e;
  }
}

async function disconnect(orgId, key) {
  await ensureTables();
  const c = Connectors.get(key);
  await vault.delete(orgId, `integration:${key}`).catch(() => {});
  // Mark this connector's signals stale (don't delete history of values).
  try { if (c) await db.query(`UPDATE signal_sync SET status='stale' WHERE org_id=$1 AND source=$2`, [orgId, c.label]); } catch (_) {}
  try { await db.query('DELETE FROM integrations WHERE org_id=$1 AND connector=$2', [orgId, key]); } catch (_) {}
  return { connector: key, status: 'disconnected' };
}

// Catalog + per-connector status for the admin UI.
async function listForOrg(orgId) {
  await ensureTables();
  const status = {};
  try { (await db.query('SELECT * FROM integrations WHERE org_id=$1', [orgId])).forEach((r) => { status[r.connector] = r; }); } catch (_) {}
  return Connectors.list().map((c) => {
    const s = status[c.key] || {};
    return { ...c, connected: s.status === 'connected', status: s.status || 'not_connected',
      lastSync: s.last_sync || null, signalCount: s.signal_count || 0, error: s.error || null };
  });
}

// Provenance map for posture: key → { source, asOf, fresh }.
async function sourcesForOrg(orgId) {
  await ensureTables();
  const map = {};
  try {
    (await db.query('SELECT key, source, as_of, status FROM signal_sync WHERE org_id=$1', [orgId])).forEach((r) => {
      const fresh = r.status === 'fresh' && r.as_of && (Date.now() - new Date(r.as_of).getTime()) < FRESH_DAYS * 864e5;
      map[r.key] = { source: r.source, asOf: r.as_of, fresh };
    });
  } catch (_) {}
  return map;
}

module.exports = { connect, sync, disconnect, listForOrg, sourcesForOrg, ensureTables };
