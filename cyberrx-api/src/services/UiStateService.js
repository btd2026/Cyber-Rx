'use strict';

/**
 * UiStateService — per-organization cockpit "where you left off" state, so a
 * user resumes their last seat/tab/view on ANY device (not just the browser
 * that saved it). Low-sensitivity navigation state only — no business data.
 *
 * Shape (all optional): { seat: 'cfo', tabs: { cfo: 2, ciso: 5 }, view: 'os' }
 * Writes merge at the top level (and deep-merge `tabs`) so partial saves — e.g.
 * "just the seat changed" — don't clobber the rest.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');

let ready = false;
async function ensure() {
  if (ready) return;
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS org_ui_state (
      org_id TEXT PRIMARY KEY,
      state JSONB DEFAULT '{}',
      updated_at TIMESTAMPTZ DEFAULT now()
    )`);
    ready = true;
  } catch (e) {
    logger.warn('ui_state table ensure failed', { error: e.message });
  }
}

async function get(orgId) {
  await ensure();
  try {
    const r = await db.query('SELECT state FROM org_ui_state WHERE org_id=$1', [orgId]);
    return (r[0] && r[0].state) || {};
  } catch (e) {
    return {};
  }
}

async function set(orgId, delta) {
  await ensure();
  const cur = await get(orgId);
  const merged = Object.assign({}, cur, delta || {});
  if (delta && delta.tabs && typeof delta.tabs === 'object') {
    merged.tabs = Object.assign({}, cur.tabs || {}, delta.tabs);
  }
  try {
    await db.query(
      `INSERT INTO org_ui_state (org_id, state, updated_at) VALUES ($1,$2,now())
       ON CONFLICT (org_id) DO UPDATE SET state=$2, updated_at=now()`,
      [orgId, JSON.stringify(merged)]
    );
  } catch (e) {
    logger.warn('ui_state write failed', { error: e.message });
  }
  return merged;
}

module.exports = { get, set };
