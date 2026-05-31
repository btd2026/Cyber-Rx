'use strict';

/**
 * Seed Runner Service
 *
 * Executes SQL seed files for the correlation engine entities
 * Supports: T-108 (Crown Jewels), T-109 (Demo Assets), T-110 (Legal Obligations), T-111 (Threat Scenarios)
 */

const fs = require('fs');
const path = require('path');
const { query } = require('../utils/db');

/**
 * Run a specific seed file
 * @param {string} seedFileName - Name of the seed file (e.g., '2026_06_01_crown_jewels.sql')
 * @returns {Promise<Object>} Result with status and affected rows
 */
async function runSeedFile(seedFileName) {
  const seedPath = path.join(__dirname, '../../seeds', seedFileName);

  if (!fs.existsSync(seedPath)) {
    throw new Error(`Seed file not found: ${seedFileName}`);
  }

  const seedSQL = fs.readFileSync(seedPath, 'utf8');

  // Split by semicolon but ignore comments
  const statements = seedSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'))
    .map(s => s.replace(/--.*$/gm, '').trim()) // Remove inline comments
    .filter(s => s.length > 10); // Filter empty statements

  const results = {
    seedFileName,
    executed: 0,
    errors: [],
    skipped: 0
  };

  for (const statement of statements) {
    try {
      await query(statement);
      results.executed++;
    } catch (err) {
      // Ignore "already exists" type errors
      if (err.message.includes('already exists') ||
          err.message.includes('duplicate key') ||
          err.message.includes('ON CONFLICT')) {
        results.skipped++;
      } else {
        results.errors.push({
          statement: statement.substring(0, 100) + '...',
          error: err.message
        });
      }
    }
  }

  return results;
}

/**
 * Run all correlation engine seeds
 * @returns {Promise<Object>} Summary of all seed operations
 */
async function runAllSeeds() {
  const seedFiles = [
    '2026_06_01_crown_jewels.sql',
    '2026_06_02_demo_assets.sql',
    '2026_06_03_legal_obligations.sql',
    '2026_06_04_threat_scenarios.sql',
    '2026_06_06_bcbs_organizations.sql',
    '2026_06_07_bcbs_vendor_assets.sql',
    '2026_06_08_bcbs_connector_states.sql',
    '2026_06_09_bcbs_evidence_records.sql',
    '2026_06_10_bcbs_correlation_data.sql'
  ];

  const results = {
    total: 0,
    executed: 0,
    skipped: 0,
    errors: [],
    seeds: []
  };

  for (const seedFile of seedFiles) {
    try {
      const result = await runSeedFile(seedFile);
      results.seeds.push(result);
      results.executed += result.executed;
      results.skipped += result.skipped;
      results.errors.push(...result.errors);
      results.total++;
    } catch (err) {
      results.errors.push({
        seedFile,
        error: err.message
      });
      results.total++;
    }
  }

  return results;
}

/**
 * Check if demo tenant exists
 * @returns {Promise<boolean>}
 */
async function checkDemoTenant() {
  const result = await query('SELECT id FROM orgs WHERE id = $1', ['demo-bcbs-001']);
  return result.length > 0;
}

/**
 * Create demo tenant if it doesn't exist
 * @returns {Promise<Object>}
 */
async function ensureDemoTenant() {
  const exists = await checkDemoTenant();

  if (exists) {
    return { created: false, id: 'demo-bcbs-001' };
  }

  await query(`
    INSERT INTO orgs (id, name, type, tier, geographic_coverage, bcbs_affiliated, setup_json)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id) DO NOTHING
  `, [
    'demo-bcbs-001',
    'Blue Cross Blue Shield Demo',
    'Health Plan',
    'Tier 1',
    '["CA", "NY", "TX", "FL", "IL", "PA", "OH", "MI", "GA", "NC"]',
    true,
    '{}'
  ]);

  return { created: true, id: 'demo-bcbs-001' };
}

/**
 * Initialize correlation engine demo data
 * @returns {Promise<Object>}
 */
async function initCorrelationEngineDemo() {
  // First ensure demo tenant exists
  await ensureDemoTenant();

  // Then run all seeds
  const results = await runAllSeeds();

  // Return summary
  return {
    success: results.errors.length === 0,
    tenantId: 'demo-bcbs-001',
    seedsRun: results.total,
    statementsExecuted: results.executed,
    statementsSkipped: results.skipped,
    errors: results.errors
  };
}

/**
 * Initialize BCBS state-specific demo data
 * @param {Array<string>} states - Array of states to seed (e.g., ['mass', 'texas', 'virginia'])
 * @returns {Promise<Object>} Results with org IDs and status
 */
async function initBCBSStateDemos(states = ['mass', 'texas', 'virginia']) {
  const results = {};

  for (const state of states) {
    const orgId = `bcbs-${state}-001`;

    // Run BCBS-specific seeds
    try {
      await runSeedFile('2026_06_06_bcbs_organizations.sql');
      await runSeedFile('2026_06_07_bcbs_vendor_assets.sql');
      await runSeedFile('2026_06_08_bcbs_connector_states.sql');
      await runSeedFile('2026_06_09_bcbs_evidence_records.sql');
      await runSeedFile('2026_06_10_bcbs_correlation_data.sql');

      results[state] = {
        orgId,
        status: 'seeded'
      };
    } catch (err) {
      results[state] = {
        orgId,
        status: 'error',
        error: err.message
      };
    }
  }

  return results;
}

module.exports = {
  runSeedFile,
  runAllSeeds,
  checkDemoTenant,
  ensureDemoTenant,
  initCorrelationEngineDemo,
  initBCBSStateDemos
};
