'use strict';
const express = require('express');
const router = express.Router();
const CorrelationEngineOptimized = require('../services/CorrelationEngineOptimized');
const { authenticateJWT } = require('../middleware/auth');
const logger = require('../utils/logger');

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

    const narrative = await CorrelationEngineOptimized.generateExecutiveNarrative(
      findingId,
      organizationId
    );

    res.json(narrative);
  } catch (err) {
    logger.error('Generate narrative error:', err.message);
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
 * POST /api/correlation/batch - Batch correlate multiple findings (optimized parallel processing)
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

    const startTime = Date.now();
    const narratives = await CorrelationEngineOptimized.batchCorrelate(findingIds, organizationId);
    const duration = Date.now() - startTime;

    res.json({
      organizationId,
      count: narratives.length,
      durationMs: duration,
      avgPerFinding: Math.round(duration / findingIds.length),
      data: narratives
    });
  } catch (err) {
    logger.error('Batch correlate error:', err.message);
    res.status(500).json({ error: 'Failed to batch correlate findings', message: err.message });
  }
});

/**
 * GET /api/correlation/summary - Get organization risk summary
 */
router.get('/summary', authenticateJWT, async (req, res) => {
  try {
    const organizationId = req.orgId;

    const summary = await CorrelationEngineOptimized.getOrganizationRiskSummary(organizationId);

    res.json(summary);
  } catch (err) {
    logger.error('Get summary error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve organization risk summary', message: err.message });
  }
});

/**
 * GET /api/correlation/performance - Get correlation performance metrics
 */
router.get('/performance', authenticateJWT, async (req, res) => {
  try {
    const organizationId = req.orgId;

    const metrics = CorrelationEngineOptimized.getPerformanceMetrics();
    const cacheStats = await CorrelationEngineOptimized.getCacheStats();

    res.json({
      organizationId,
      metrics,
      cacheStats,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    logger.error('Get performance metrics error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve performance metrics', message: err.message });
  }
});

/**
 * POST /api/correlation/invalidate/:findingId - Invalidate correlation cache for a finding
 */
router.post('/invalidate/:findingId', authenticateJWT, async (req, res) => {
  try {
    const { findingId } = req.params;
    const organizationId = req.orgId;

    // Verify finding belongs to organization
    const finding = await Finding.findById(findingId);
    if (!finding) {
      return res.status(404).json({ error: 'Finding not found' });
    }
    if (finding.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await CorrelationEngineOptimized.invalidateCache(findingId);

    res.json({
      message: 'Cache invalidated',
      findingId,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    logger.error('Invalidate cache error:', err.message);
    res.status(500).json({ error: 'Failed to invalidate cache', message: err.message });
  }
});

module.exports = router;
