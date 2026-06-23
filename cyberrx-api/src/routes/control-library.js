'use strict';

/**
 * routes/control-library — read access to the unified control library and its
 * cross-framework projection (Step 2).
 *   GET /api/control-library/frameworks            the 7 compliance frameworks
 *   GET /api/control-library/controls[?domain=]    library controls + mapping counts
 *   GET /api/control-library/controls/:id          one control + its crosswalk
 *   GET /api/control-library/coverage              mapping reach per framework
 *   GET /api/control-library/coverage/:framework   mapping reach for one framework
 *
 * See docs/plans/onboarding-redesign-blueprint.md (§8).
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const logger = require('../utils/logger');
const Library = require('../services/ControlLibraryService');

router.use(optionalJWT, demoOrg);

router.get('/frameworks', (req, res) => {
  res.json({ frameworks: Library.listFrameworks() });
});

router.get('/controls', async (req, res) => {
  try {
    const controls = await Library.listControls({ domain: req.query.domain });
    res.json({ controls });
  } catch (err) {
    logger.error('control-library.controls failed', { error: err.message });
    res.status(500).json({ error: 'Failed to load control library.' });
  }
});

router.get('/controls/:id', async (req, res) => {
  try {
    const control = await Library.getControl(req.params.id);
    if (!control) return res.status(404).json({ error: 'Control not found.' });
    res.json({ control });
  } catch (err) {
    logger.error('control-library.control failed', { error: err.message });
    res.status(500).json({ error: 'Failed to load control.' });
  }
});

router.get('/coverage', async (req, res) => {
  try {
    const coverage = await Library.coverageAll();
    res.json({ coverage });
  } catch (err) {
    logger.error('control-library.coverage failed', { error: err.message });
    res.status(500).json({ error: 'Failed to compute coverage.' });
  }
});

router.get('/coverage/:framework', async (req, res) => {
  try {
    const coverage = await Library.coverageByFramework(req.params.framework);
    res.json({ coverage });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    logger.error('control-library.coverage.one failed', { error: err.message });
    res.status(500).json({ error: 'Failed to compute coverage.' });
  }
});

module.exports = router;
