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
const SimulatedToolService = require('../services/SimulatedToolService');

const DEMO_ORG_ID = 'blue-cross-blue-shield-of-massachusetts';
const DEMO_ORG_IDS = [
  'blue-cross-blue-shield-of-massachusetts',
  'cigna-healthcare',
  'meridian-health-plan-demo',
];
const SEED_FILES = [
  path.join(__dirname, '..', '..', 'seeds', '2026_06_17_executive_brief_demo.sql'),
  path.join(__dirname, '..', '..', 'seeds', '2026_06_18_simulated_tool_sources.sql'),
  path.join(__dirname, '..', '..', 'seeds', '2026_06_19_multi_org_demo.sql'),
];

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

  // The SQL is fully idempotent (ON CONFLICT DO NOTHING), so always run it —
  // this lets newly-added rows (e.g. assets) land on DBs that were seeded
  // before those rows existed.
  for (const file of SEED_FILES) {
    const sql = fs.readFileSync(file, 'utf8');
    await db.pool.query(sql); // multi-statement simple query
    logger.info('[seedDemo] Demo dataset loaded', { file: path.basename(file) });
  }

  // Sync posture metrics from the simulated live-source tables into
  // metric_inputs for every org that has source data — this is what makes
  // each org's MFA/EDR/phishing/etc. unique and DB-driven.
  const synced = await SimulatedToolService.syncAll();
  logger.info('[seedDemo] Simulated tool metrics synced', { orgs: Object.keys(synced) });

  // Regenerate briefs for every demo org so each shows its own real numbers.
  let briefs = [];
  for (const id of DEMO_ORG_IDS) {
    try {
      await db.query('DELETE FROM executive_briefs WHERE organization_id=$1', [id]);
    } catch (err) {
      logger.warn('[seedDemo] Could not clear existing briefs', { orgId: id, error: err.message });
    }
    const b = await ExecutiveAgentService.generateAll(id);
    if (id === orgId) briefs = b;
    logger.info('[seedDemo] Executive briefs regenerated', {
      orgId: id, count: b.length, mode: ExecutiveAgentService.aiEnabled() ? 'ai' : 'deterministic',
    });
  }
  return briefs;
}

module.exports = { seedExecutiveDemo, DEMO_ORG_ID };
