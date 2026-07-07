'use strict';

/**
 * InputCatalogService — the input → widget → readiness backbone (Build Brief §4).
 *
 * ONE catalog of the inputs the dashboards need, each mapped to the cockpit widgets
 * that depend on it and to the concrete evidence that satisfies it (a connected
 * integration OR a provided register in setup_json). It answers:
 *   • per-input status: connected | provided | missing | invalid
 *   • per-widget gating: satisfied? if not, which inputs are missing
 *   • per-role readiness: "connecting X unlocks N widgets"
 *
 * Pure mapping + a thin status resolver. The resolver takes an injected `context`
 * ({ connectors:Set, setup:object, counts:object }) so it is unit-testable without a
 * DB; `statusFor(orgId)` builds that context from Postgres.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');

// A required input → the integration connector keys that satisfy it (any one).
const CONNECTOR_KEYS = {
  'CMDB': ['servicenow', 'cmdb'],
  'EDR': ['defender', 'crowdstrike', 'sentinel'],
  'GRC': ['sap', 'archer', 'servicenow_grc'],
  'Incident Mgmt / ITSM': ['servicenow', 'jira'],
  'Service Mapping': ['servicenow_svcmap'],
  'SIEM': ['splunk', 'sentinel'],
  'SOAR': ['splunk_soar', 'xsoar'],
  'Third-party Security Ratings': ['securityscorecard', 'bitsight'],
  'Threat Intelligence': ['recordedfuture', 'otx', 'cisa', 'mandiant', 'anomali'],
  'Vendor Risk / TPRM': ['auditboard', 'onetrust', 'processunity', 'tprm'],
  'Vulnerability Management': ['qualys', 'tenable'],
};

// A required input that is a document/register → the setup_json field that holds it.
const DOCUMENT_FIELDS = {
  'Crown Jewel Register': 'crownJewelRegister',
  'BIA (Business Impact Analysis)': 'bia',
  'Business Capability Map': 'capabilities',
  'SBOM': 'sbom',
};

// Inputs that ship with the product (no customer action) → always satisfied.
const BUILTIN = new Set(['MITRE ATT&CK', 'Aggregated Cyber Risk Model']);

// CISO widgets and the inputs each requires (Sheet 1, CISO). `optional` inputs
// improve a widget but don't gate it. The four er_* ids match live cockpit tiles.
const WIDGETS = {
  ciso: [
    { id: 'er_crown', label: 'Crown jewels at greatest risk', requires: ['Crown Jewel Register', 'CMDB', 'Vulnerability Management', 'EDR'] },
    { id: 'er_capability', label: 'Business capabilities with highest exposure', requires: ['Business Capability Map'], optional: ['GRC'] },
    { id: 'er_scenarios', label: 'Most likely business disruption scenarios', requires: ['Threat Intelligence', 'BIA (Business Impact Analysis)'], optional: ['MITRE ATT&CK'] },
    { id: 'er_thirdparty', label: 'Third-party / supply-chain cyber exposure', requires: ['Vendor Risk / TPRM'], optional: ['Third-party Security Ratings', 'SBOM'] },
    { id: 'protection_effectiveness', label: 'Business areas well protected', requires: ['GRC'] },
    { id: 'cyber_operations', label: 'Active business-impacting incidents', requires: ['SIEM', 'Incident Mgmt / ITSM'], optional: ['SOAR'] },
    { id: 'executive_actions', label: 'Highest-value remediation actions', requires: ['GRC'] },
  ],
};

/** All distinct inputs a role's widgets reference (required or optional). */
function inputsForRole(role) {
  const seen = new Set();
  (WIDGETS[role] || []).forEach((w) => {
    (w.requires || []).forEach((i) => seen.add(i));
    (w.optional || []).forEach((i) => seen.add(i));
  });
  return Array.from(seen);
}

/** Classify an input by type. */
function typeOf(input) {
  if (BUILTIN.has(input)) return 'builtin';
  if (DOCUMENT_FIELDS[input]) return 'document';
  if (CONNECTOR_KEYS[input]) return 'connector';
  return 'unknown';
}

/**
 * Status of one input given a resolved context.
 * @param {string} input
 * @param {{connectors:Set<string>, setup:object, invalid?:Set<string>}} ctx
 * @returns {'connected'|'provided'|'missing'|'invalid'}
 */
function statusOf(input, ctx) {
  const c = ctx || {};
  if (BUILTIN.has(input)) return 'connected';
  if (c.invalid && c.invalid.has(input)) return 'invalid';
  const doc = DOCUMENT_FIELDS[input];
  if (doc) {
    const v = c.setup ? c.setup[doc] : null;
    const present = Array.isArray(v) ? v.length > 0 : (v != null && v !== '');
    return present ? 'provided' : 'missing';
  }
  const keys = CONNECTOR_KEYS[input];
  if (keys) {
    const conn = c.connectors || new Set();
    return keys.some((k) => conn.has(k)) ? 'connected' : 'missing';
  }
  return 'missing';
}

const SATISFIED = new Set(['connected', 'provided']);

/**
 * Readiness for a role from an injected context (pure — no DB).
 * @returns {{role, widgets:[{id,label,satisfied,missing[],inputs[]}], inputs:[{input,type,status,widgets[]}], readinessPct}}
 */
function readinessFrom(role, ctx) {
  const defs = WIDGETS[role] || [];
  const widgetsByInput = {};
  defs.forEach((w) => (w.requires || []).forEach((i) => { (widgetsByInput[i] = widgetsByInput[i] || []).push(w.id); }));

  const widgets = defs.map((w) => {
    const missing = (w.requires || []).filter((i) => !SATISFIED.has(statusOf(i, ctx)));
    return { id: w.id, label: w.label, satisfied: missing.length === 0, missing, inputs: (w.requires || []).concat(w.optional || []) };
  });

  const inputs = inputsForRole(role).map((input) => ({
    input, type: typeOf(input), status: statusOf(input, ctx), widgets: widgetsByInput[input] || [],
  }));

  const satisfiedCount = widgets.filter((w) => w.satisfied).length;
  const readinessPct = widgets.length ? Math.round((satisfiedCount / widgets.length) * 100) : 0;
  return { role, widgets, inputs, readinessPct };
}

/** Build the org's status context from Postgres (connectors + setup_json). */
async function contextFor(orgId) {
  const connectors = new Set();
  const invalid = new Set();
  let setup = {};
  try {
    const r = await db.query("SELECT connector FROM integrations WHERE org_id=$1 AND status='connected'", [orgId]);
    (r || []).forEach((row) => connectors.add(String(row.connector)));
  } catch (e) { logger.debug('readiness connectors read failed', { error: e.message }); }
  try {
    const r = await db.query('SELECT setup_json FROM orgs WHERE id=$1', [orgId]);
    const sj = r && r[0] && r[0].setup_json;
    setup = typeof sj === 'string' ? JSON.parse(sj) : (sj || {});
    // A document present but flagged invalid at upload time gates like missing.
    const val = setup && setup.document_validation;
    if (val && typeof val === 'object') Object.keys(val).forEach((k) => { if (val[k] === 'invalid') invalid.add(k); });
  } catch (e) { logger.debug('readiness setup read failed', { error: e.message }); }
  // CMDB is also satisfied by an onboarding inventory import (assets present).
  try {
    const r = await db.query('SELECT COUNT(*)::int AS n FROM assets WHERE organization_id=$1', [orgId]);
    if (r && r[0] && Number(r[0].n) > 0) connectors.add('cmdb');
  } catch (_) { /* no assets table access → leave as-is */ }
  return { connectors, setup, invalid };
}

/** Full readiness for a role, resolving the org's real state. */
async function readiness(orgId, role) {
  const ctx = await contextFor(orgId);
  return readinessFrom(role, ctx);
}

module.exports = {
  CONNECTOR_KEYS, DOCUMENT_FIELDS, BUILTIN, WIDGETS,
  inputsForRole, typeOf, statusOf, readinessFrom, contextFor, readiness,
};
