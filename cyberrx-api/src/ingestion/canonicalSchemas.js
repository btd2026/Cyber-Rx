'use strict';

/**
 * canonicalSchemas — target field definitions per ingestion source_kind.
 *
 * Framing (enforced downstream): a CMDB yields APPLICATIONS/ASSETS, not business
 * processes. The Function → Process → Sub-process hierarchy comes from a
 * process-inventory source (or the reference model). CMDB business-capability/
 * service tags are captured ONLY to pre-seed crosswalk suggestions.
 */

const SCHEMAS = {
  process_inventory: {
    target: 'process',
    fields: [
      { key: 'function', synonyms: ['business function', 'function', 'domain', 'area', 'capability area'] },
      { key: 'process', synonyms: ['process', 'business process', 'process name', 'name'], required: true },
      { key: 'subprocess', synonyms: ['subprocess', 'sub-process', 'sub process', 'activity', 'task'] },
      { key: 'tier', synonyms: ['tier', 'criticality tier', 'priority', 'bia tier'] },
      { key: 'rto', synonyms: ['rto', 'recovery time objective', 'recovery time', 'max tolerable downtime', 'mtd'] },
      { key: 'criticality', synonyms: ['criticality', 'business criticality', 'impact', 'impact rating'] },
      { key: 'owner', synonyms: ['owner', 'process owner', 'accountable', 'business owner'] },
      // One combined "Function - Process - Sub-process" column is also supported.
      { key: 'fps_combined', synonyms: ['function process subprocess', 'hierarchy', 'breadcrumb', 'path'] },
    ],
  },
  cmdb: {
    target: 'application',
    fields: [
      { key: 'name', synonyms: ['name', 'application', 'application name', 'ci name', 'configuration item', 'service', 'app'], required: true },
      { key: 'owner', synonyms: ['owner', 'application owner', 'support group', 'managed by', 'assignment group'] },
      { key: 'external_ref', synonyms: ['id', 'ci id', 'sys id', 'asset id', 'number', 'external id', 'asset tag'] },
      { key: 'environment', synonyms: ['environment', 'env', 'stage', 'lifecycle'] },
      { key: 'hosting', synonyms: ['hosting', 'platform', 'location', 'cloud', 'datacenter', 'hosting model'] },
      // Used ONLY to pre-seed crosswalk suggestions — never to create processes.
      { key: 'business_capability', synonyms: ['business capability', 'capability', 'business service', 'service offering', 'business application'] },
      { key: 'vendor', synonyms: ['vendor', 'supplier', 'manufacturer', 'provider'] },
    ],
  },
};

module.exports = { SCHEMAS };
