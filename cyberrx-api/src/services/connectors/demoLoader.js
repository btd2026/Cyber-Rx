'use strict';

const path = require('path');
const fs = require('fs');

const DEMO_DIR = path.resolve(__dirname, '../../../demo-data');

/**
 * Load a demo JSON file for a vendor connector.
 * @param {string} vendor - Connector key (e.g. 'crowdstrike', 'okta')
 * @param {string} file - JSON file name without extension (default 'signals')
 * @returns {Promise<Object>} Parsed JSON matching the connector's real response shape
 */
async function loadDemoJson(vendor, file = 'signals') {
  const filePath = path.join(DEMO_DIR, vendor, `${file}.json`);
  const raw = await fs.promises.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

/**
 * Validate that demo data contains the expected signal keys for a connector.
 * @param {Object} data - The loaded demo JSON
 * @param {string[]} expectedKeys - Signal keys the connector should produce
 * @returns {{ valid: boolean, missing: string[], extra: string[] }}
 */
function validateDemoSignals(data, expectedKeys) {
  const actualKeys = (data.signals || []).map((s) => s.key);
  const missing = expectedKeys.filter((k) => !actualKeys.includes(k));
  const extra = actualKeys.filter((k) => !expectedKeys.includes(k));
  return { valid: missing.length === 0 && extra.length === 0, missing, extra };
}

/**
 * Check whether a demo data file exists for a given vendor.
 * @param {string} vendor - Connector key
 * @param {string} file - JSON file name without extension
 * @returns {boolean}
 */
function hasDemoData(vendor, file = 'signals') {
  return fs.existsSync(path.join(DEMO_DIR, vendor, `${file}.json`));
}

module.exports = { loadDemoJson, validateDemoSignals, hasDemoData };
