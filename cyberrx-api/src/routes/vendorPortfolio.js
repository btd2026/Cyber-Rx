'use strict';

/**
 * routes/vendorPortfolio — the CISO "which third parties could take us down?" feed.
 *
 * The cockpit sends the org's tier-1 / tier-2 vendor list (captured at onboarding via
 * CSV or a TPRM API) plus the chosen monitoring provider. For each vendor we try to
 * read the LIVE rating from that provider's connector — the same score on their portal
 * — normalize every provider's scale to 0–100 (VendorRiskService), rank worst-first
 * and return the top-5 plus portfolio counts. When the provider isn't credentialed we
 * return a clearly-labeled modeled score (live:false) so the panel always renders and
 * never invents a "live" number. Weekly cadence, or on-demand refresh from the client.
 *
 * Mounted at /api/vendors BEFORE the authenticated CRUD router so /portfolio resolves
 * here with demo-friendly auth (optionalJWT + demoOrg).
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const vault = require('../utils/vault');
const logger = require('../utils/logger');
const V = require('../services/VendorRiskService');

router.use(optionalJWT, demoOrg);

// Provider key → monitoring connector (only the security-ratings providers).
let CONNECTORS = {};
try {
  CONNECTORS = {
    securityscorecard: require('../connectors/SecurityScorecardConnector'),
    bitsight: require('../connectors/BitSightConnector'),
    blackkite: require('../connectors/BlackKiteConnector'),
    riskrecon: require('../connectors/RiskReconConnector'),
  };
} catch (_) { CONNECTORS = {}; }

// Map a display name ("Black Kite") to a connector/provider key.
function providerKey(name) {
  const p = String(name || '').toLowerCase().replace(/[^a-z]/g, '');
  if (p.includes('securityscorecard')) return 'securityscorecard';
  if (p.includes('bitsight')) return 'bitsight';
  if (p.includes('blackkite')) return 'blackkite';
  if (p.includes('riskrecon')) return 'riskrecon';
  if (p.includes('upguard')) return 'upguard';
  if (p.includes('panorays')) return 'panorays';
  return p || null;
}

// Deterministic modeled rating (42–98) — stable per vendor name, used only when a
// live rating isn't available. Clearly labeled live:false downstream.
function modeledScore(name) {
  let s = 2166136261 >>> 0;
  const str = String(name || '');
  for (let i = 0; i < str.length; i++) { s ^= str.charCodeAt(i); s = Math.imul(s, 16777619) >>> 0; }
  return 42 + (s % 57);
}

// Pull a normalized 0–100 rating from a provider connector, or null on any failure.
async function livePull(pkey, vendorDomain, orgId) {
  try {
    if (!vendorDomain || !CONNECTORS[pkey]) return null;
    const creds = await vault.get(orgId, pkey);
    if (!creds || !Object.keys(creds).length) return null;
    const Conn = CONNECTORS[pkey];
    const conn = new Conn({ organizationId: orgId });
    const signals = await conn.collectSignals(vendorDomain, vendorDomain, orgId);
    // Find the rating signal — every ratings connector attaches score/grade to rawData.
    const arr = Array.isArray(signals) ? signals : [];
    for (const sig of arr) {
      const rd = (sig && sig.rawData) || {};
      if (rd.score != null) { const n = V.normalizeScore(rd.score, pkey); if (n != null) return n; }
      if (rd.grade != null) { const n = V.normalizeScore(rd.grade, pkey); if (n != null) return n; }
    }
    return null;
  } catch (e) {
    if (logger && logger.debug) logger.debug('vendor live pull failed: ' + e.message);
    return null;
  }
}

// POST /api/vendors/monitor/connect — store the org-level monitoring-provider
// credential in the vault so livePull() can read the provider's real ratings. The
// key never returns to the client. Best-effort: reports connected:false (not a hard
// error) when the vault is unavailable, so the cockpit can fall back to modeled.
router.post('/monitor/connect', async (req, res) => {
  try {
    const orgId = req.orgId || 'demo';
    const body = req.body || {};
    const pkey = providerKey(body.provider);
    const creds = body.credentials || (body.apiKey ? { apiKey: body.apiKey } : {});
    if (!pkey) return res.status(400).json({ error: 'provider required' });
    if (!creds || !Object.keys(creds).length) return res.status(400).json({ error: 'credential required' });
    try {
      await vault.set(orgId, pkey, creds);
    } catch (e) {
      if (logger && logger.warn) logger.warn('vendor monitor vault set failed: ' + e.message);
      return res.json({ connected: false, provider: pkey, reason: 'credential store unavailable' });
    }
    res.json({ connected: true, provider: pkey });
  } catch (e) {
    if (logger && logger.error) logger.error('vendor monitor connect failed: ' + e.message);
    res.status(500).json({ error: 'connect failed' });
  }
});

// POST /api/vendors/portfolio — score + rank the org's tier-1/2 vendors.
router.post('/portfolio', async (req, res) => {
  try {
    const orgId = req.orgId || 'demo';
    const body = req.body || {};
    const pkey = providerKey(body.provider);
    const list = Array.isArray(body.vendors) ? body.vendors.slice(0, 500) : [];
    // Score each vendor: real score in payload wins; else live pull; else modeled.
    const scored = await Promise.all(list.map(async (v) => {
      const name = v.name || v.vendor || '';
      const domain = v.domain || null;
      if (v.score != null || v.grade != null) {
        return { name, domain, tier: v.tier, criticality: v.criticality, score: v.score, grade: v.grade, provider: body.provider, live: !!v.live };
      }
      const live = pkey ? await livePull(pkey, domain, orgId) : null;
      if (live != null) return { name, domain, tier: v.tier, criticality: v.criticality, score: live, provider: body.provider, live: true };
      return { name, domain, tier: v.tier, criticality: v.criticality, score: modeledScore(name), provider: body.provider, live: false };
    }));
    const portfolio = V.scorePortfolio(scored, { provider: body.provider || null, topN: Number(body.topN) || 5 });
    res.json({ ...portfolio, cadence: 'weekly' });
  } catch (e) {
    if (logger && logger.error) logger.error('vendor portfolio failed: ' + e.message);
    res.status(500).json({ error: 'portfolio failed' });
  }
});

module.exports = router;
