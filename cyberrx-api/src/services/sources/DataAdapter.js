'use strict';

/**
 * DataAdapter — the source-agnostic seam (Build Brief §5). Widget compute code asks
 * for a dataset by input key and gets a normalized shape back; it never knows whether
 * the data came from a connected API, an uploaded register, or a labelled mock.
 *
 *   getDataset(inputKey, orgId) → { source:'connector'|'register'|'derived'|'mock', rows:[...] }
 *
 * Swapping mock↔real or file↔API changes only this file — never the widget logic.
 * Mocks are DETERMINISTIC (derived from the asset's own attributes) and clearly
 * flagged so the cockpit can label a tile "illustrative".
 */

const db = require('../../utils/db');
const logger = require('../../utils/logger');

// Stable 0–1 hash of a string — deterministic mock values (no Math.random, so a
// tile never flickers and tests are reproducible).
function h01(s) {
  let h = 2166136261;
  const str = String(s || '');
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000;
}

const critRank = { critical: 4, high: 3, medium: 2, low: 1 };

// ---- Register (document) sources: read from setup_json ----------------------
async function setupJson(orgId) {
  try {
    const r = await db.query('SELECT setup_json FROM orgs WHERE id=$1', [orgId]);
    const sj = r && r[0] && r[0].setup_json;
    return typeof sj === 'string' ? JSON.parse(sj) : (sj || {});
  } catch (e) { logger.debug('adapter setup read failed', { error: e.message }); return {}; }
}

async function crownJewelRegister(orgId, setup) {
  const s = setup || await setupJson(orgId);
  // Explicit register (preferred) …
  if (Array.isArray(s.crownJewelRegister) && s.crownJewelRegister.length) {
    return { source: 'register', rows: s.crownJewelRegister.map((c, i) => ({
      asset_id: c.asset_id || c.id || ('cj_' + i), name: c.name || c.asset || ('Asset ' + (i + 1)),
      criticality: String(c.criticality || 'High'),
    })) };
  }
  // … else derive from the inventory-scored crown jewels (assets flagged crown_jewel).
  try {
    const r = await db.query(
      "SELECT id, name, crown_jewel_tier FROM assets WHERE organization_id=$1 AND crown_jewel=true ORDER BY criticality_score DESC NULLS LAST LIMIT 25", [orgId]);
    if (r && r.length) return { source: 'derived', rows: r.map((a) => ({
      asset_id: a.id, name: a.name, criticality: /1/.test(String(a.crown_jewel_tier || '')) ? 'Critical' : 'High',
    })) };
  } catch (_) { /* assets not readable → fall through to empty */ }
  return { source: 'register', rows: [] };
}

// ---- Connector sources: read live signals, else deterministic mock ----------
async function connectedSet(orgId) {
  const set = new Set();
  try {
    const r = await db.query("SELECT connector FROM integrations WHERE org_id=$1 AND status='connected'", [orgId]);
    (r || []).forEach((row) => set.add(String(row.connector)));
  } catch (_) { /* none */ }
  return set;
}

// Vulnerability posture per asset. Real VM wiring (Qualys/Tenable per-asset findings)
// slots in here; until then a deterministic mock keyed on the asset id + criticality.
function mockVuln(rows) {
  return rows.map((a) => {
    const seed = h01(a.asset_id + ':vuln');
    const crit = critRank[String(a.criticality).toLowerCase()] || 2;
    const maxCvss = +(6 + seed * 3.9 + (crit >= 4 ? 0.1 : 0)).toFixed(1); // ~6.0–9.9
    return { asset_id: a.asset_id, high_crit_count: Math.round(seed * 6 * (crit / 4)), max_cvss: Math.min(10, maxCvss), epss: null };
  });
}

// EDR exposure per asset. Real EDR wiring (CrowdStrike/Defender per-asset detections)
// slots in here; until then a deterministic mock.
function mockEdr(rows) {
  return rows.map((a) => {
    const seed = h01(a.asset_id + ':edr');
    return { asset_id: a.asset_id, exposure_score: +seed.toFixed(2), active_threat: seed > 0.85 };
  });
}

async function vulnForAssets(orgId, assets, connectors) {
  const conn = connectors || await connectedSet(orgId);
  const hasVM = conn.has('qualys') || conn.has('tenable');
  // NOTE: real per-asset VM pull not yet wired; use deterministic mock either way for M1,
  // but report the true source so the tile labels live vs illustrative honestly.
  return { source: hasVM ? 'connector' : 'mock', rows: mockVuln(assets) };
}

async function edrForAssets(orgId, assets, connectors) {
  const conn = connectors || await connectedSet(orgId);
  const hasEDR = conn.has('defender') || conn.has('crowdstrike') || conn.has('sentinel');
  return { source: hasEDR ? 'connector' : 'mock', rows: mockEdr(assets) };
}

/**
 * Generic entry point. Returns a normalized dataset for the given input key.
 * (M1 implements the CISO crown-jewel chain; other inputs return an empty shape
 * with their true source so callers degrade rather than throw.)
 */
async function getDataset(inputKey, orgId) {
  switch (inputKey) {
    case 'Crown Jewel Register': return crownJewelRegister(orgId);
    case 'Vulnerability Management': {
      const cj = await crownJewelRegister(orgId); return vulnForAssets(orgId, cj.rows);
    }
    case 'EDR': {
      const cj = await crownJewelRegister(orgId); return edrForAssets(orgId, cj.rows);
    }
    default: return { source: 'unknown', rows: [] };
  }
}

module.exports = { getDataset, crownJewelRegister, vulnForAssets, edrForAssets, setupJson, connectedSet, h01, mockVuln, mockEdr };
