'use strict';

/**
 * CmdbConnector — the connector interface intake uses to pull an application
 * inventory from a CMDB (Step 3, "enter a CMDB key for a direct pull"). Each
 * connector implements:
 *
 *   test(config)            -> { ok, message }            // credential / reachability check
 *   pullApplications(config)-> [{ name, owner, vendor, hosting, dataClassification,
 *                                 businessServices[], externalRef, source:'inventory' }]
 *
 * pullApplications returns normalized rows the IngestionService persists. The
 * `businessServices` / supported-capability fields are the structured linkage the
 * Step-3 confidence cascade uses as tier-(a) "inventory" evidence (high confidence)
 * before falling back to LLM semantic matching.
 *
 * Modeled on the existing Jira connector pattern in ProjectPortfolioService.
 */

const ServiceNowConnector = require('./ServiceNowConnector');

const REGISTRY = {
  servicenow: ServiceNowConnector,
  // bmc_helix, jira_assets, … register here as they are built.
};

function get(system) {
  const key = String(system || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const C = REGISTRY[key] || REGISTRY[Object.keys(REGISTRY).find((k) => key.includes(k)) || ''];
  if (!C) { const e = new Error(`No CMDB connector for "${system}". Supported: ${Object.keys(REGISTRY).join(', ')}.`); e.code = 'NO_CONNECTOR'; throw e; }
  return C;
}

async function test(system, config) { return get(system).test(config); }
async function pullApplications(system, config) { return get(system).pullApplications(config); }

module.exports = { get, test, pullApplications, supported: () => Object.keys(REGISTRY) };
