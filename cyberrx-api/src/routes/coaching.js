'use strict';

/**
 * routes/coaching — coaching layer + blind-spot detection over the decision spine.
 *   GET /api/coaching?role=CFO   questions-to-ask + materiality checklist + tabletop, and this role's blind spots
 *   GET /api/coaching/blindspots full blind-spot report (all roles)
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const logger = require('../utils/logger');
const Coaching = require('../services/CoachingService');
const BlindSpot = require('../services/BlindSpotService');
const PeerBenchmark = require('../services/PeerBenchmarkService');

router.use(optionalJWT, demoOrg);
const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId;

router.get('/', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  const role = req.query.role || 'Board';
  try {
    const [coaching, bs] = await Promise.all([Coaching.forRole(orgId, role), BlindSpot.detect(orgId)]);
    // Reuse the blind-spot run for the peer benchmark so we don't recompute the spine.
    const benchmark = await PeerBenchmark.compare(orgId, { blindSpots: bs }).catch(() => null);
    res.json({ coaching, blindSpots: bs.byRole[role] || [], blindSpotSummary: bs.summary, benchmark });
  } catch (e) { logger.warn('coaching failed', { error: e.message }); res.status(500).json({ error: 'Unable to build coaching.' }); }
});

router.get('/blindspots', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await BlindSpot.detect(orgId)); }
  catch (e) { res.status(500).json({ error: 'Unable to detect blind spots.' }); }
});

// Size/industry peer benchmark (modeled reference band) for Blind Spots & Coaching.
router.get('/benchmark', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await PeerBenchmark.compare(orgId)); }
  catch (e) { logger.warn('benchmark failed', { error: e.message }); res.status(500).json({ error: 'Unable to build benchmark.' }); }
});

module.exports = router;
