'use strict';
const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const { SecurityService } = require('../domains');

/**
 * Findings API Routes (Refactored with Service Layer)
 *
 * All business logic extracted to SecurityService
 * Routes only handle HTTP concerns (validation, response)
 */

/**
 * POST /api/findings - Create a new finding
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const securityService = new SecurityService(req.models, req.logger);
    const finding = await securityService.createFinding(req.orgId, req.body);
    res.status(201).json(finding);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      error: err.message || 'Failed to create finding',
      ...(err.originalError && { message: err.originalError })
    });
  }
});

/**
 * GET /api/findings - List all findings for the org
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const securityService = new SecurityService(req.models, req.logger);
    const findings = await securityService.getFindings(req.orgId, req.query);
    res.json({
      organizationId: req.orgId,
      count: findings.length,
      data: findings
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message || 'Failed to list findings' });
  }
});

/**
 * GET /api/findings/statistics - Get finding statistics
 */
router.get('/statistics', authenticateJWT, async (req, res) => {
  try {
    const securityService = new SecurityService(req.models, req.logger);
    const stats = await securityService.getFindingStatistics(req.orgId);
    res.json({
      organizationId: req.orgId,
      statistics: stats
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message || 'Failed to retrieve finding statistics' });
  }
});

/**
 * GET /api/findings/repeats - Get repeat findings
 */
router.get('/repeats', authenticateJWT, async (req, res) => {
  try {
    const securityService = new SecurityService(req.models, req.logger);
    const repeats = await securityService.getRepeatFindings(req.orgId);
    res.json({
      organizationId: req.orgId,
      count: repeats.length,
      data: repeats
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message || 'Failed to retrieve repeat findings' });
  }
});

/**
 * GET /api/findings/by-risk/:id - Get findings by risk ID
 */
router.get('/by-risk/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { Finding } = req.models;

    const findings = await Finding.findByRiskId(id, req.orgId);

    res.json({
      organizationId: req.orgId,
      riskId: id,
      count: findings.length,
      data: findings
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message || 'Failed to retrieve findings for risk' });
  }
});

/**
 * GET /api/findings/by-asset/:id - Get findings by asset ID
 */
router.get('/by-asset/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { Finding } = req.models;

    const findings = await Finding.findByAssetId(id, req.orgId);

    res.json({
      organizationId: req.orgId,
      assetId: id,
      count: findings.length,
      data: findings
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message || 'Failed to retrieve findings for asset' });
  }
});

/**
 * GET /api/findings/:id - Get a specific finding
 */
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { Finding } = req.models;

    const finding = await Finding.findById(id);

    if (!finding) {
      return res.status(404).json({ error: 'Finding not found', id });
    }

    // Verify org access
    if (finding.organizationId !== req.orgId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this finding'
      });
    }

    res.json(finding);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message || 'Failed to retrieve finding' });
  }
});

/**
 * PUT /api/findings/:id - Update a finding
 */
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const securityService = new SecurityService(req.models, req.logger);
    const updated = await securityService.updateFinding(id, req.orgId, req.body);
    res.json(updated);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message || 'Failed to update finding' });
  }
});

/**
 * POST /api/findings/:id/mark-repeat - Mark finding as repeat
 */
router.post('/:id/mark-repeat', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { originalFindingId } = req.body;

    if (!originalFindingId) {
      return res.status(400).json({ error: 'Original finding ID is required' });
    }

    const securityService = new SecurityService(req.models, req.logger);
    const updated = await securityService.markAsRepeat(id, originalFindingId, req.orgId);

    res.json(updated);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message || 'Failed to mark finding as repeat' });
  }
});

/**
 * DELETE /api/findings/:id - Delete a finding
 */
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const securityService = new SecurityService(req.models, req.logger);
    const result = await securityService.deleteFinding(id, req.orgId);
    res.json(result);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message || 'Failed to delete finding' });
  }
});

module.exports = router;
