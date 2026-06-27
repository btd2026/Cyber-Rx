'use strict';

// Connector registry — the catalog of read-only security-tool integrations.
// Each connector normalizes vendor data into the shared signal registry keys
// that posture/coverage already read.
const REGISTRY = {
  entra: require('./entra'),
  okta: require('./okta'),
  crowdstrike: require('./crowdstrike'),
  tenable: require('./tenable'),
  splunk: require('./splunk'),
  sentinel: require('./sentinel'),
  azure_openai: require('./azure_openai'),
  langsmith: require('./langsmith'),
};

// Public catalog (no secrets, no functions).
function list() {
  return Object.values(REGISTRY).map((c) => ({
    key: c.key, label: c.label, vendor: c.vendor, category: c.category,
    signals: c.signals, scopes: c.scopes,
    fields: c.fields.map((f) => ({ key: f.key, label: f.label, secret: !!f.secret, optional: !!f.optional })),
  }));
}

function get(key) { return REGISTRY[key] || null; }

module.exports = { list, get, REGISTRY };
