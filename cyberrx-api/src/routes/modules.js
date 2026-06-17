'use strict';

/**
 * routes/modules — exposes the core module registry + health.
 *   GET /api/modules   the five core modules, their entry points, and status
 */

const express = require('express');
const router = express.Router();
const { optionalJWT } = require('../middleware/auth');
const registry = require('../modules');

router.get('/', optionalJWT, (req, res) => {
  res.json({ modules: registry.health(), llmEnabled: !!process.env.ANTHROPIC_API_KEY });
});

module.exports = router;
