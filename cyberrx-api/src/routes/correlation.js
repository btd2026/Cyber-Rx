'use strict';
const express = require('express');
const router = express.Router();
const CorrelationEngine = require('../services/CorrelationEngine');
const { authenticateJWT } = require('../middleware/auth');

/**
 * Correlation Engine API Routes
 *
 * Generates executive narratives from technical findings
 * All routes are authenticated and org-scoped
 */

/**
 * POST /api/correlation/narrative/:findingId - Generate executive narrative for a finding
 */
router.post('/narrative/:findingId', authenticateJWT, async (req, res) => {
  try {
    const { findingId } = req.params;
    const organizationId = req.orgId;

    const narrative = await CorrelationEngine.generateExecutiveNarrative(
      findingId,
      organizationId
    );

    res.json(narrative);
  } catch (err) {
    console.error('Generate narrative error:', err.message);
    if (err.message === 'Finding not found') {
      return res.status(404).json({ error: 'Finding not found' });
    }
    if (err.message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.status(500).json({ error: 'Failed to generate executive narrative', message: err.message });
  }
});

/**
 * POST /api/correlation/batch - Batch correlate multiple findings
 */
router.post('/batch', authenticateJWT, async (req, res) => {
  try {
    const { findingIds } = req.body;
    const organizationId = req.orgId;

    if (!findingIds || !Array.isArray(findingIds)) {
      return res.status(400).json({ error: 'findingIds array is required' });
    }

    if (findingIds.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 findings per batch' });
    }

    const narratives = await CorrelationEngine.batchCorrelate(findingIds, organizationId);

    res.json({
      organizationId,
      count: narratives.length,
      data: narratives
    });
  } catch (err) {
    console.error('Batch correlate error:', err.message);
    res.status(500).json({ error: 'Failed to batch correlate findings', message: err.message });
  }
});

/**
 * GET /api/correlation/summary - Get organization risk summary
 */
router.get('/summary', authenticateJWT, async (req, res) => {
  try {
    const organizationId = req.orgId;

    const summary = await CorrelationEngine.getOrganizationRiskSummary(organizationId);

    res.json(summary);
  } catch (err) {
    console.error('Get summary error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve organization risk summary', message: err.message });
  }
});

module.exports = router;
