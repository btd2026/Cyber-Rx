'use strict';
const express = require('express');
const router = express.Router();
const seeds = require('../services/seeds');
const { authenticateJWT } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

/**
 * Seed Management Routes
 *
 * Administrative endpoints to initialize demo data
 * These routes are protected with authentication and admin permissions
 */

// Apply authentication to all seed routes
router.use(authenticateJWT);

/**
 * POST /api/seeds/demo - Initialize correlation engine demo data
 */
router.post('/demo', requirePermission('admin.seeds.run'), async (req, res) => {
  try {
    const result = await seeds.initCorrelationEngineDemo();
    res.json({
      success: true,
      message: 'Correlation engine demo data initialized successfully',
      data: result
    });
  } catch (err) {
    console.error('Seed initialization error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/seeds/bcbs-states - Initialize BCBS state demo data
 *
 * Request body:
 * {
 *   "states": ["mass", "texas", "virginia"]  // Optional, defaults to all three
 * }
 */
router.post('/bcbs-states', requirePermission('admin.seeds.run'), async (req, res) => {
  try {
    const { states } = req.body;

    // Validate states array if provided
    const validStates = ['mass', 'texas', 'virginia'];
    let statesToSeed = states && Array.isArray(states) && states.length > 0
      ? states.filter(s => validStates.includes(s))
      : validStates;

    if (statesToSeed.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid states provided. Valid options: mass, texas, virginia'
      });
    }

    const result = await seeds.initBCBSStateDemos(statesToSeed);

    res.json({
      success: true,
      message: `BCBS state demo data initialized for: ${statesToSeed.join(', ')}`,
      data: result
    });
  } catch (err) {
    console.error('BCBS seed initialization error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/seeds/:fileName - Run a specific seed file
 */
router.post('/:fileName', requirePermission('admin.seeds.run'), async (req, res) => {
  try {
    const { fileName } = req.params;

    // Validate fileName to prevent path traversal
    if (!fileName.match(/^2026_\\d{2}_\\d{2}_[a-z_]+\\.sql$/)) {
      return res.status(400).json({
        error: 'Invalid seed file name format'
      });
    }

    const result = await seeds.runSeedFile(fileName);
    res.json({
      success: true,
      message: `Seed file ${fileName} executed successfully`,
      data: result
    });
  } catch (err) {
    console.error('Seed execution error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/seeds/status - Check demo tenant status
 */
router.get('/status', async (req, res) => {
  try {
    const exists = await seeds.checkDemoTenant();
    res.json({
      demoTenantExists: exists,
      tenantId: 'demo-bcbs-001'
    });
  } catch (err) {
    console.error('Seed status check error:', err);
    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = router;
