'use strict';

/**
 * IntegrationScheduler — periodic auto-refresh of connected security-tool feeds.
 *
 * Opt-in via INTEGRATION_SYNC_INTERVAL_MIN (minutes); disabled by default. Runs
 * in-process; on multi-instance deployments each instance runs it (acceptable —
 * sync is idempotent), or point it at a single worker. For exact scheduling use
 * an external cron hitting POST /api/integrations/:key/sync.
 */

const logger = require('../utils/logger');
const db = require('../utils/db');
const Integrations = require('./IntegrationService');

let timer = null;

// Re-sync every currently-connected (org, connector) pair.
async function runOnce() {
  await Integrations.ensureTables();
  let rows = [];
  try { rows = await db.query("SELECT org_id, connector FROM integrations WHERE status='connected'"); }
  catch (e) { logger.debug('scheduler list failed', { error: e.message }); return; }
  for (const r of rows) {
    try { await Integrations.sync(r.org_id, r.connector); }
    catch (e) { logger.warn('integration auto-sync failed', { connector: r.connector, error: e.message }); }
  }
  if (rows.length) logger.info('integration auto-sync complete', { pairs: rows.length });
}

function start() {
  // On by default (every 6h); set INTEGRATION_SYNC_INTERVAL_MIN=0 to disable.
  // No-ops harmlessly until an org connects an integration.
  const min = Number(process.env.INTEGRATION_SYNC_INTERVAL_MIN ?? 360);
  if (!Number.isFinite(min) || min <= 0) { logger.info('integration scheduler disabled (INTEGRATION_SYNC_INTERVAL_MIN=0)'); return; }
  if (timer) clearInterval(timer);
  timer = setInterval(() => { runOnce().catch(() => {}); }, min * 60000);
  if (timer.unref) timer.unref();
  logger.info('integration scheduler started', { everyMinutes: min });
}

function stop() { if (timer) { clearInterval(timer); timer = null; } }

module.exports = { start, stop, runOnce };
