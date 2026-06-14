'use strict';

/**
 * Connector abstraction — ALL external data (CMDB, EASM, ratings, vuln,
 * control-evidence) flows through this vendor-neutral interface. Connectors are
 * optional and pluggable. A connector is a DATA SOURCE; it is NOT a third-party
 * dependency-graph node (see third_party_dependency).
 *
 * Interface:
 *   kind      'cmdb' | 'easm' | 'ratings' | 'vuln' | 'evidence'
 *   provider  'servicenow' | 'bmc_helix' | 'device42' | 'generic' | ...
 *   testConnection(config) -> { ok, detail }
 *   describeSchema(sourceKind) -> [field names]      // for the mapping UI
 *   fetch(sourceKind, config, cursor?) -> { rows: [obj], nextCursor? }
 *
 * fetch() returns rows in the SAME shape the file parsers produce, so the
 * IngestionService maps/ingests connector data through one pipeline.
 */

// Generic, configurable HTTP connector: GET a JSON endpoint, pull an array out
// of `config.recordsPath` (dot path). Provider connectors extend this with
// default endpoints/field hints.
const GenericHttp = {
  kind: 'cmdb', provider: 'generic',
  async testConnection(config) {
    if (!config || !config.url) return { ok: false, detail: 'url is required' };
    return { ok: true, detail: 'configuration present (live check performed at fetch time)' };
  },
  describeSchema() { return []; }, // discovered from the first fetch
  async fetch(sourceKind, config = {}) {
    if (!config.url) throw new Error('GenericHttp requires config.url');
    const headers = config.headers || {};
    const res = await fetch(config.url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    const path = (config.recordsPath || '').split('.').filter(Boolean);
    let arr = path.reduce((o, k) => (o == null ? o : o[k]), body);
    if (!Array.isArray(arr)) arr = Array.isArray(body) ? body : (Object.values(body || {}).find(Array.isArray) || []);
    const rows = arr.filter((x) => x && typeof x === 'object');
    return { rows };
  },
};

// Provider scaffolds — pre-set kind/provider and known default record paths.
// Field mapping still goes through the schema-agnostic mapper, so these work
// even when an instance's schema is customized. Fleshed out per deployment.
const ServiceNowCmdb = { ...GenericHttp, provider: 'servicenow', defaults: { recordsPath: 'result' } };
const BmcHelixCmdb = { ...GenericHttp, provider: 'bmc_helix', defaults: { recordsPath: 'entries' } };
const Device42Cmdb = { ...GenericHttp, provider: 'device42', defaults: { recordsPath: 'Devices' } };

const REGISTRY = {
  generic: GenericHttp,
  servicenow: ServiceNowCmdb,
  bmc_helix: BmcHelixCmdb,
  device42: Device42Cmdb,
};

function getConnector(provider) { return REGISTRY[provider] || GenericHttp; }

module.exports = { getConnector, REGISTRY, GenericHttp };
