'use strict';

/**
 * Executive Brief demo seeder.
 *
 * Loads a coherent healthcare-payer dataset for the org the running app uses
 * (slug "blue-cross-blue-shield-of-massachusetts") so the executive agent
 * briefs render real, dollar-quantified numbers, then regenerates the briefs
 * from that data.
 *
 * Idempotent. Safe to run repeatedly (the SQL uses ON CONFLICT DO NOTHING).
 * Run via `npm run seed:demo`, or automatically on startup when
 * SEED_DEMO_DATA=true.
 */

const fs = require('fs');
const path = require('path');
const db = require('./db');
const logger = require('./logger');
const ExecutiveAgentService = require('../services/ExecutiveAgentService');

const DEMO_ORG_ID = 'blue-cross-blue-shield-of-massachusetts';
const SEED_FILE = path.join(__dirname, '..', '..', 'seeds', '2026_06_17_executive_brief_demo.sql');

async function orgHasData(orgId) {
  try {
    const rows = await db.query('SELECT 1 FROM risks WHERE organization_id=$1 LIMIT 1', [orgId]);
    return rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * @param {object} opts
 * @param {boolean} opts.force - re-run the SQL even if the org already has data
 * @param {string}  opts.orgId - org id to (re)generate briefs for
 */
async function seedExecutiveDemo({ force = false, orgId = DEMO_ORG_ID } = {}) {
  // Ensure tables exist before seeding.
  await db.init();

  const already = await orgHasData(orgId);
  if (already && !force) {
    logger.info('[seedDemo] Org already has data, skipping SQL load', { orgId });
  } else {
    const sql = fs.readFileSync(SEED_FILE, 'utf8');
    await db.pool.query(sql); // multi-statement simple query
    logger.info('[seedDemo] Demo dataset loaded', { orgId, file: path.basename(SEED_FILE) });
  }

  // Regenerate briefs so they reflect the (now populated) data rather than any
  // previously-cached zero state.
  try {
    await db.query('DELETE FROM executive_briefs WHERE organization_id=$1', [orgId]);
  } catch (err) {
    logger.warn('[seedDemo] Could not clear existing briefs', { error: err.message });
  }
  const briefs = await ExecutiveAgentService.generateAll(orgId);
  logger.info('[seedDemo] Executive briefs regenerated', {
    orgId, count: briefs.length, mode: ExecutiveAgentService.aiEnabled() ? 'ai' : 'deterministic',
  });
  return briefs;
}

module.exports = { seedExecutiveDemo, DEMO_ORG_ID };
