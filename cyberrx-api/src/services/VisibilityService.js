'use strict';

/**
 * VisibilityService — per-asset-class "visibility confidence" (enterprise
 * requirement: never present a confident output over thin data). Even large
 * enterprises have incomplete inventories; this reports HOW COMPLETE our own
 * data is per class (assets/identity/vuln/cloud/vendor/data), so the UI can
 * caveat outputs and prioritise ingestion.
 *
 * Confidence heuristic per class: a live connector for that class → high; rows
 * present from upload/ingest → moderate; nothing → low (inferred/thin).
 */

const db = require('../utils/db');
const logger = require('../utils/logger');

async function n(sql, params = []) {
  try { const r = await db.query(sql, params); return Number((r[0] && (r[0].n ?? r[0].count)) || 0); }
  catch (e) { logger.debug('visibility count degraded', { error: e.message }); return 0; }
}
async function connectorKinds(orgId) {
  try { const r = await db.query('SELECT DISTINCT kind FROM connector WHERE org_id=$1', [orgId]); return new Set(r.map((x) => x.kind)); }
  catch (_) { return new Set(); }
}
async function toolKeys(orgId) {
  try { const r = await db.query("SELECT tool_key FROM tool_connections WHERE org_id=$1 AND status='connected'", [orgId]); return new Set(r.map((x) => x.tool_key)); }
  catch (_) { return new Set(); }
}

function score({ rows, connected }) {
  if (connected) return rows ? 90 : 70;       // connector present (live), with/without data yet
  if (rows) return 55;                         // uploaded/ingested, not continuously synced
  return 20;                                   // thin — inferred only
}
const band = (s) => (s >= 80 ? 'High' : s >= 50 ? 'Moderate' : 'Low');

async function assess(orgId) {
  const [conn, tools] = await Promise.all([connectorKinds(orgId), toolKeys(orgId)]);
  const has = (kinds, tks = []) => kinds.some((k) => conn.has(k)) || tks.some((t) => tools.has(t));
  const [assets, ids, vulns, cloud, vendors, dataObj] = await Promise.all([
    n('SELECT COUNT(*) n FROM assets WHERE organization_id=$1', [orgId]),
    n('SELECT COUNT(*) n FROM sim_okta_users WHERE org_id=$1', [orgId]),
    n('SELECT COUNT(*) n FROM findings WHERE organization_id=$1', [orgId]),
    n("SELECT COUNT(*) n FROM assets WHERE organization_id=$1 AND cloud_provider IS NOT NULL", [orgId]),
    n('SELECT COUNT(*) n FROM vendor_risk_signals WHERE organization_id=$1', [orgId]),
    n('SELECT COUNT(*) n FROM data_objects WHERE organization_id=$1', [orgId]),
  ]);
  const classes = [
    { id: 'assets', label: 'Asset inventory (CMDB)', rows: assets, connected: has(['cmdb']) },
    { id: 'identity', label: 'Identity & access', rows: ids, connected: has([], ['okta']) },
    { id: 'vuln', label: 'Vulnerabilities', rows: vulns, connected: has(['vuln'], ['tenable']) },
    { id: 'cloud', label: 'Cloud configuration', rows: cloud, connected: has(['cloud']) },
    { id: 'vendor', label: 'Third-party / vendor', rows: vendors, connected: has(['ratings']) },
    { id: 'data', label: 'Regulated data', rows: dataObj, connected: false },
  ].map((c) => { const s = score(c); return { ...c, confidence: s, band: band(s), hasData: c.rows > 0 }; });
  const overall = Math.round(classes.reduce((a, c) => a + c.confidence, 0) / classes.length);
  const thin = classes.filter((c) => c.confidence < 50).map((c) => c.label);
  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    overall, band: band(overall), classes, thin,
    caveat: thin.length ? `Outputs are caveated where data is thin: ${thin.join(', ')}. Connect these sources to raise confidence.` : 'Coverage is sufficient across tracked asset classes.',
  };
}

module.exports = { assess };
