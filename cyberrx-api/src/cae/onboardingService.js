'use strict';

/**
 * cae/onboardingService — Milestone 2: dynamic tool onboarding.
 *
 * User-facing business logic for: framework selection, tool catalog, connection
 * fields, the secure connect flow, and the live health check. EVERYTHING returned
 * passes through cae/projection — no endpoints, settings JSON, scopes, internal
 * config, validation/scoring logic ever leaves the backend.
 *
 * Secrets go to the existing vault (utils/vault); only a vault reference and the
 * user's NON-secret fields are persisted in cae_connection.
 */

const db = require('../utils/db');
const vault = require('../utils/vault');
const logger = require('../utils/logger');
const { getConnector } = require('./connectorFramework');
const { projectTool, projectConnectorField, projectConnectionStatus } = require('./projection');

// The four supported, independent framework modules (Step 1 of the user flow).
// No cross-framework relationships are ever surfaced.
const FRAMEWORKS = [
  { id: 'nist_csf_2_0', name: 'NIST CSF 2.0' },
  { id: 'nist_800_53', name: 'NIST SP 800-53' },
  { id: 'cis_v8', name: 'CIS Controls v8' },
  { id: 'mitre_attck', name: 'MITRE ATT&CK' },
];

const vaultKey = (connectorId) => `cae:${connectorId}`;

function listFrameworks() { return FRAMEWORKS.map((f) => ({ ...f })); }

async function listCategories() {
  const rows = await db.query('SELECT DISTINCT category FROM cae_tool ORDER BY category');
  return rows.map((r) => r.category);
}

// Tool catalog (optionally by category). User sees category + name + whether a
// connector exists — nothing about which controls a tool validates.
async function listTools(category) {
  const rows = category
    ? await db.query('SELECT category, name, has_connector FROM cae_tool WHERE category=$1 ORDER BY rank, name', [category])
    : await db.query('SELECT category, name, has_connector FROM cae_tool ORDER BY category, rank, name');
  return rows.map(projectTool);
}

// Reconcile the tool-library name (what the user selects) with the connector-
// library name (which can differ, e.g. "Palo Alto Panorama/NGFW" vs
// "Palo Alto Panorama"): exact match first, then a contains-either fuzzy match.
async function connectorForTool(toolName) {
  const exact = await db.query('SELECT * FROM cae_connector_template WHERE tool_name=$1', [toolName]);
  if (exact[0]) return exact[0];
  const tl = String(toolName || '').toLowerCase();
  if (tl.length < 4) return null;
  const all = await db.query('SELECT * FROM cae_connector_template');
  return all.find((c) => {
    const cl = c.tool_name.toLowerCase();
    return cl.includes(tl) || tl.includes(cl);
  }) || null;
}

// Connection-field manifest for a tool. If no connector template exists, the tool
// is collected via manual evidence (no live connector) — surfaced honestly.
async function getConnectionFields(toolName) {
  const conn = await connectorForTool(toolName);
  if (!conn) return { tool_name: toolName, manual: true, fields: [] };
  const fields = await db.query(
    'SELECT * FROM cae_connector_field WHERE connector_id=$1 ORDER BY display_order', [conn.id]);
  return { tool_name: toolName, manual: false, fields: fields.map(projectConnectorField) };
}

// Save a connection: split secret vs non-secret using the field manifest, push
// secrets to the vault, persist only non-secret config + a vault ref. Validates
// required fields + read-only acknowledgement. Returns a projected status.
async function saveConnection(orgId, toolName, submitted = {}) {
  if (!orgId) throw new Error('org required');
  const conn = await connectorForTool(toolName);
  if (!conn) { const e = new Error('manual'); e.code = 'MANUAL'; throw e; }

  const fields = await db.query('SELECT * FROM cae_connector_field WHERE connector_id=$1', [conn.id]);
  const secrets = {}; const nonSecret = {}; const missing = [];
  for (const f of fields) {
    const v = submitted[f.field_key];
    const empty = v == null || v === '' || (f.field_type === 'boolean' && v !== true);
    if (f.required && empty) { missing.push(f.field_key); continue; }
    if (empty) continue;
    if (f.is_secret) secrets[f.field_key] = v;
    else if (f.field_key !== 'read_only_ack') nonSecret[f.field_key] = v;
  }
  if (missing.length) { const e = new Error('missing required fields'); e.code = 'MISSING'; throw e; }

  if (Object.keys(secrets).length) await vault.set(orgId, vaultKey(conn.id), secrets); // vault only
  const id = `${orgId}::${conn.id}`;
  await db.query(
    `INSERT INTO cae_connection (id, org_id, connector_id, tool_name, status, vault_secret_ref, non_secret_config, updated_at)
     VALUES ($1,$2,$3,$4,'connecting',$5,$6,NOW())
     ON CONFLICT (org_id, connector_id) DO UPDATE SET
       status='connecting', vault_secret_ref=EXCLUDED.vault_secret_ref,
       non_secret_config=EXCLUDED.non_secret_config, updated_at=NOW(), last_error_sanitized=NULL`,
    [id, orgId, conn.id, toolName, `cyberrx/${orgId}/${vaultKey(conn.id)}`, JSON.stringify(nonSecret)]);
  return healthCheck(orgId, toolName);
}

// Live, read-only health check. Resolves secrets from the vault, runs the
// connector's check, persists status + a sanitized message. Returns projected status.
async function healthCheck(orgId, toolName) {
  const conn = await connectorForTool(toolName);
  if (!conn) { const e = new Error('manual'); e.code = 'MANUAL'; throw e; }
  const rows = await db.query('SELECT * FROM cae_connection WHERE org_id=$1 AND connector_id=$2', [orgId, conn.id]);
  const connection = rows[0];
  if (!connection) { const e = new Error('not configured'); e.code = 'NOT_FOUND'; throw e; }

  let secrets = {};
  try { secrets = (await vault.get(orgId, vaultKey(conn.id))) || {}; } catch (_) { secrets = {}; }
  const config = connection.non_secret_config || {};

  let result;
  try {
    result = await getConnector(conn).healthCheck({ config, secrets });
  } catch (e) {
    logger.debug('cae healthCheck error', { connector: conn.id }); // no secret/endpoint detail
    result = { ok: false, status: 'failed', message: 'Connection failed. Check the URL, credentials, and required read-only permissions.' };
  }
  await db.query(
    `UPDATE cae_connection SET status=$1, last_error_sanitized=$2, last_health_check=NOW(), updated_at=NOW()
       WHERE org_id=$3 AND connector_id=$4`,
    [result.status, result.ok ? null : result.message, orgId, conn.id]);

  return projectConnectionStatus({
    tool_name: toolName, status: result.status,
    last_error_sanitized: result.ok ? null : result.message, last_health_check: new Date().toISOString(),
  });
}

async function listConnections(orgId) {
  if (!orgId) return [];
  const rows = await db.query(
    `SELECT tool_name, status, last_error_sanitized, last_health_check
       FROM cae_connection WHERE org_id=$1 ORDER BY tool_name`, [orgId]);
  return rows.map(projectConnectionStatus);
}

async function removeConnection(orgId, toolName) {
  const conn = await connectorForTool(toolName);
  if (!conn) return { removed: false };
  try { await vault.delete(orgId, vaultKey(conn.id)); } catch (_) { /* best effort */ }
  await db.query('DELETE FROM cae_connection WHERE org_id=$1 AND connector_id=$2', [orgId, conn.id]);
  return { removed: true };
}

module.exports = {
  listFrameworks, listCategories, listTools, getConnectionFields,
  saveConnection, healthCheck, listConnections, removeConnection,
};
