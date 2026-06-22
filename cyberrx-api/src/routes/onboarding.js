'use strict';

/**
 * routes/onboarding — the redesigned 7-phase onboarding journey (Step 1).
 *   GET  /api/onboarding/session              current (or freshly created) session
 *   POST /api/onboarding/session/advance      { to_phase }   move the cursor
 *   POST /api/onboarding/session/phase        { phase, ...patch }  mark progress
 *   POST /api/onboarding/session/go-live      flip status to 'live'
 *   GET  /api/onboarding/completeness         latest six-dimension breakdown
 *   POST /api/onboarding/completeness/recompute  recompute + persist history
 *
 * See docs/plans/onboarding-redesign-blueprint.md (§8).
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const logger = require('../utils/logger');
const Onboarding = require('../services/OnboardingService');

router.use(optionalJWT, demoOrg);
const orgOf = (req) =>
  req.orgId ||
  req.headers['x-org-id'] ||
  req.query.org_id ||
  req.query.orgId ||
  (req.body && req.body.org_id);

router.get('/session', async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try {
    const session = await Onboarding.getOrCreateSession(orgId);
    res.json({ session, phases: Onboarding.PHASES });
  } catch (err) {
    logger.error('onboarding.session failed', { error: err.message });
    res.status(500).json({ error: 'Failed to load onboarding session.' });
  }
});

router.post('/session/advance', async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  const toPhase = req.body && req.body.to_phase;
  if (!toPhase) return res.status(400).json({ error: 'to_phase is required.' });
  try {
    const session = await Onboarding.advance(orgId, toPhase);
    res.json({ session });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    logger.error('onboarding.advance failed', { error: err.message });
    res.status(500).json({ error: 'Failed to advance onboarding phase.' });
  }
});

router.post('/session/phase', async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  const { phase, ...patch } = req.body || {};
  if (!phase) return res.status(400).json({ error: 'phase is required.' });
  try {
    const session = await Onboarding.markPhase(orgId, phase, patch);
    res.json({ session });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    logger.error('onboarding.markPhase failed', { error: err.message });
    res.status(500).json({ error: 'Failed to update onboarding phase.' });
  }
});

router.post('/session/go-live', async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try {
    const session = await Onboarding.goLive(orgId);
    res.json({ session });
  } catch (err) {
    logger.error('onboarding.goLive failed', { error: err.message });
    res.status(500).json({ error: 'Failed to mark onboarding live.' });
  }
});

router.get('/completeness', async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try {
    const completeness = await Onboarding.getCompleteness(orgId);
    res.json({ completeness });
  } catch (err) {
    logger.error('onboarding.completeness failed', { error: err.message });
    res.status(500).json({ error: 'Failed to load completeness.' });
  }
});

router.post('/completeness/recompute', async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try {
    const completeness = await Onboarding.recomputeCompleteness(orgId);
    res.json({ completeness });
  } catch (err) {
    logger.error('onboarding.recompute failed', { error: err.message });
    res.status(500).json({ error: 'Failed to recompute completeness.' });
  }
});

module.exports = router;
