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
  const perAssetResult = await perAsset(orgId);
  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    overall, band: band(overall), classes, thin,
    assets: perAssetResult.summary,
    caveat: thin.length ? `Outputs are caveated where data is thin: ${thin.join(', ')}. Connect these sources to raise confidence.` : 'Coverage is sufficient across tracked asset classes.',
  };
}

// ---- per-asset visibility confidence ---------------------------------------
// Class-level coverage (above) answers "do we see this category at all?". This
// answers "how complete is our data on THIS specific asset?" — a 0-100 score
// over the signals we'd expect to have on any tracked asset. Each missing signal
// is a named blind spot, so the score is explainable, not a black box.
//
// Vulnerability telemetry is credited from linked findings (a scanner is
// reporting on the asset), not the vuln_critical/_high counters — those default
// to 0, so "0" can't be distinguished from "never scanned"; presence of a
// finding is the honest signal that something is actually looking at the asset.
const SIGNALS = [
  { key: 'identity', label: 'Locatable (hostname/IP)', weight: 12, has: (a) => !!(a.hostname || a.ip_address) },
  { key: 'ownership', label: 'Owner assigned', weight: 10, has: (a) => !!(a.owner && String(a.owner).trim()) },
  { key: 'criticality', label: 'Criticality rated', weight: 9, has: (a) => !!(a.criticality && String(a.criticality).trim()) },
  { key: 'tier', label: 'Tier classified', weight: 7, has: (a) => !!(a.tier && String(a.tier).trim()) },
  { key: 'process_link', label: 'Linked to a business process', weight: 10, has: (a) => Array.isArray(a.business_process_ids) && a.business_process_ids.length > 0 },
  { key: 'data_class', label: 'Data classification known', weight: 11, has: (a) => Array.isArray(a.data_classification) && a.data_classification.length > 0 },
  { key: 'vuln_telemetry', label: 'Vulnerability telemetry (findings)', weight: 14, has: (a) => (a._findings || 0) > 0 },
  { key: 'patch_telemetry', label: 'Patch telemetry', weight: 14, has: (a) => a.patch_pct != null },
  { key: 'lifecycle', label: 'Lifecycle / end-of-support known', weight: 8, has: (a) => !!a.end_of_support_date },
  { key: 'freshness', label: 'Record refreshed (<90d)', weight: 5, has: (a) => a.updated_at && (Date.now() - new Date(a.updated_at).getTime()) < 90 * 864e5 },
];
const WEIGHT_TOTAL = SIGNALS.reduce((s, x) => s + x.weight, 0);

function assetConfidence(a) {
  const signals = SIGNALS.map((s) => ({ key: s.key, label: s.label, weight: s.weight, present: !!s.has(a) }));
  const earned = signals.reduce((sum, s) => sum + (s.present ? s.weight : 0), 0);
  const confidence = Math.round((earned / WEIGHT_TOTAL) * 100);
  return { confidence, band: band(confidence), signals, missing: signals.filter((s) => !s.present).map((s) => s.label) };
}

async function perAsset(orgId) {
  let rows = [];
  try {
    rows = await db.query(
      `SELECT id, name, type, hostname, ip_address, owner, criticality, tier,
              business_process_ids, data_classification, patch_pct, vuln_critical,
              vuln_high, end_of_support_date, updated_at
         FROM assets WHERE organization_id=$1`, [orgId]);
  } catch (e) { logger.debug('perAsset query degraded', { error: e.message }); }
  // Linked-findings count per asset = "a scanner is actually reporting on it".
  const fmap = {};
  try {
    (await db.query('SELECT asset_id, COUNT(*) n FROM findings WHERE organization_id=$1 AND asset_id IS NOT NULL GROUP BY asset_id', [orgId]))
      .forEach((r) => { fmap[r.asset_id] = Number(r.n) || 0; });
  } catch (_) {}

  const assets = rows.map((a) => {
    const c = assetConfidence({ ...a, _findings: fmap[a.id] || 0 });
    return { id: a.id, name: a.name, type: a.type, hostname: a.hostname || null, confidence: c.confidence, band: c.band, signals: c.signals, missing: c.missing };
  });
  const total = assets.length;
  const mean = total ? Math.round(assets.reduce((s, a) => s + a.confidence, 0) / total) : 0;
  const low = assets.filter((a) => a.confidence < 50);
  // Which signals are most often missing across the fleet — the ingestion to fix first.
  const gapCount = {};
  SIGNALS.forEach((s) => { gapCount[s.label] = 0; });
  assets.forEach((a) => a.missing.forEach((m) => { gapCount[m] = (gapCount[m] || 0) + 1; }));
  const weakestSignals = Object.entries(gapCount).filter(([, n2]) => n2 > 0)
    .sort((x, y) => y[1] - x[1]).slice(0, 3)
    .map(([label, n2]) => ({ label, missingOn: n2, pct: total ? Math.round((n2 / total) * 100) : 0 }));

  const summary = {
    total, mean, band: total ? band(mean) : 'Unknown',
    lowVisibilityCount: low.length,
    lowVisibility: low.sort((a, b) => a.confidence - b.confidence).slice(0, 10).map((a) => ({ id: a.id, name: a.name, confidence: a.confidence, missing: a.missing })),
    weakestSignals,
    caveat: total === 0
      ? 'No asset inventory present — per-asset visibility is unknown. Connect a CMDB or import assets.'
      : low.length
        ? `${low.length} of ${total} assets have thin data (confidence <50%); treat decisions touching them with extra caution.`
        : 'Per-asset data completeness is adequate across the inventory.',
  };
  return { organizationId: orgId, generatedAt: new Date().toISOString(), summary, assets };
}

// Persist the computed score back onto each asset so the substrate carries an
// honest, queryable "how much we see" value (cached snapshot).
async function recompute(orgId) {
  const { assets, summary } = await perAsset(orgId);
  const now = new Date().toISOString();
  for (const a of assets) {
    try {
      await db.query(
        `UPDATE assets SET visibility_confidence=$2, visibility_band=$3, visibility_signals=$4, visibility_computed_at=$5
           WHERE id=$1 AND organization_id=$6`,
        [a.id, a.confidence, a.band, JSON.stringify(a.signals), now, orgId]);
    } catch (e) { logger.debug('visibility persist degraded', { error: e.message }); }
  }
  return { recomputed: assets.length, summary };
}

// A name/hostname → confidence index so the decision spine can caveat a card
// when the affected system itself is thinly monitored.
async function byName(orgId) {
  const { assets, summary } = await perAsset(orgId);
  const idx = {};
  const put = (k, a) => { if (k) idx[String(k).trim().toLowerCase()] = a; };
  assets.forEach((a) => { put(a.name, a); put(a.hostname, a); });
  return { idx, summary };
}

module.exports = { assess, perAsset, recompute, byName, assetConfidence };
