'use strict';

/**
 * routes/peer — the DTNKSHIELD anonymous peer benchmark. The ONLY place the product
 * reaches out over the network: opted-in organizations submit anonymized scores and
 * read back cohort aggregates. Nothing identifying is stored (see PeerCohortService
 * .sanitize). Aggregates are gated by k-anonymity (min cohort). When
 * DTNKSHIELD_PEER_URL is set, this instance forwards to the dedicated DTNKSHIELD
 * cloud collector; otherwise it stores in this deployment's peer_scores table.
 */

const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const logger = require('../utils/logger');
const Peer = require('../services/PeerCohortService');

const PROXY = (process.env.DTNKSHIELD_PEER_URL || '').replace(/\/+$/, '');

async function ensureTable() {
  await db.query(`CREATE TABLE IF NOT EXISTS peer_scores (
    client_id TEXT PRIMARY KEY,
    industry TEXT, region TEXT, size_band TEXT,
    overall_cmmi REAL, function_cmmi JSONB,
    updated_at TIMESTAMPTZ DEFAULT now()
  )`);
}

// POST /api/peer/submit — one anonymized row per participant (client_id), latest wins.
router.post('/submit', async (req, res) => {
  try {
    const s = Peer.sanitize(req.body || {});
    if (s.overall_cmmi == null) return res.status(400).json({ error: 'overall_cmmi required' });
    const cid = String((req.body && req.body.client_id) || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || ('anon_' + Date.now());
    if (PROXY) {
      const r = await fetch(PROXY + '/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...s, client_id: cid }) });
      return res.status(r.status).json(await r.json().catch(() => ({ ok: r.ok })));
    }
    await ensureTable();
    await db.query(
      `INSERT INTO peer_scores (client_id, industry, region, size_band, overall_cmmi, function_cmmi, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6, now())
       ON CONFLICT (client_id) DO UPDATE SET industry=EXCLUDED.industry, region=EXCLUDED.region,
         size_band=EXCLUDED.size_band, overall_cmmi=EXCLUDED.overall_cmmi, function_cmmi=EXCLUDED.function_cmmi, updated_at=now()`,
      [cid, s.industry, s.region, s.size_band, s.overall_cmmi, JSON.stringify(s.function_cmmi)]
    );
    res.json({ ok: true });
  } catch (e) {
    if (logger && logger.error) logger.error('peer submit failed: ' + e.message);
    res.status(500).json({ error: 'submit failed' });
  }
});

// GET /api/peer/benchmark?industry=&size= — cohort aggregates (k-anonymity gate).
router.get('/benchmark', async (req, res) => {
  try {
    if (PROXY) {
      const u = new URL(PROXY + '/benchmark');
      Object.keys(req.query).forEach((k) => u.searchParams.set(k, String(req.query[k])));
      const r = await fetch(u.toString());
      return res.status(r.status).json(await r.json().catch(() => ({ sufficient: false })));
    }
    await ensureTable();
    const industry = String(req.query.industry || '').trim().toLowerCase().slice(0, 40);
    const size = String(req.query.size || '').trim().toLowerCase().slice(0, 20);
    const where = [], params = [];
    if (industry) { params.push(industry); where.push('industry=$' + params.length); }
    if (size && size !== 'unknown') { params.push(size); where.push('size_band=$' + params.length); }
    const rows = await db.query('SELECT overall_cmmi, function_cmmi FROM peer_scores' + (where.length ? (' WHERE ' + where.join(' AND ')) : ''), params);
    const norm = rows.map((r) => ({ overall_cmmi: r.overall_cmmi, function_cmmi: typeof r.function_cmmi === 'string' ? JSON.parse(r.function_cmmi) : (r.function_cmmi || {}) }));
    res.json({ ...Peer.aggregate(norm), industry: industry || 'all', size_band: size || 'all' });
  } catch (e) {
    // Never fail hard — the client shows "not enough peers yet".
    res.json({ n: 0, sufficient: false, minCohort: Peer.MIN_COHORT });
  }
});

module.exports = router;
