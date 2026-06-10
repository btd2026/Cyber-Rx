'use strict';

/**
 * Sample Catalog API
 * ------------------
 * POST /api/sample-catalog { profile } — seed the org-scoped application
 * catalog for a healthcare payer profile (backs Setup step 3 "Use Sample
 * Data"). Demo posture: org from JWT -> X-Org-Id -> org_id.
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { optionalJWT, demoOrg } = require('../middleware/auth');
const SampleCatalogService = require('../services/SampleCatalogService');

router.post('/', optionalJWT, demoOrg, async (req, res) => {
  const orgId = req.orgId;
  if (!orgId) {
    return res.status(400).json({ error: 'Organization not specified', message: 'Provide a JWT, X-Org-Id header, or org_id query parameter.' });
  }
  const profile = req.body && req.body.profile;
  try {
    const result = await SampleCatalogService.seed(orgId, profile);
    res.status(201).json({ orgId, ...result });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message, validProfiles: SampleCatalogService.PROFILES });
    logger.error('Sample catalog seed error', { orgId, profile, error: err.message });
    res.status(500).json({ error: 'Failed to import sample catalog', message: err.message });
  }
});

module.exports = router;
