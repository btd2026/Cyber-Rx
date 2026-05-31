'use strict';
const express = require('express');
const router = express.Router();
const { Finding } = require('../models');
const { authenticateJWT } = require('../middleware/auth');
const { requirePermission, requireAnyPermission, requireAllPermissions } = require('../middleware/rbac');

/**
 * Findings API Routes
 *
 * CRUD operations for finding entities with correlation linkage
 * Supports repeat detection
 * All routes are authenticated and org-scoped
 */

// Generate UUID helper
function generateId() {
  return `find_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * POST /api/findings - Create a new finding
 */
router.post('/', authenticateJWT, requirePermission('security.findings.create'), async (req, res) => {
  try {
    const {
      title,
      description,
      severity,
      status,
      discoveredDate,
      riskId,
      assetId,
      applicationId,
      businessProcessId,
      isRepeat,
      originalFindingId,
      repeatCount,
      remediationPlan,
      targetDate,
      owner,
      source,
      sourceRef,
      tool,
      metadata
    } = req.body;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Finding title is required' });
    }
    const validSeverities = ['Critical', 'High', 'Medium', 'Low', 'Info'];
    if (!severity || !validSeverities.includes(severity)) {
      return res.status(400).json({ error: `Severity must be one of: ${validSeverities.join(', ')}` });
    }
    const validStatuses = ['open', 'in_progress', 'resolved', 'closed', 'false_positive', 'risk_accepted'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }
    if (!discoveredDate) {
      return res.status(400).json({ error: 'Discovered date is required' });
    }

    // Check for similar existing findings (repeat detection)
    const similar = await Finding.findSimilar({
      organizationId: req.orgId,
      title,
      assetId,
      tool
    });

    let finalIsRepeat = isRepeat || false;
    let finalOriginalFindingId = originalFindingId;
    let finalRepeatCount = repeatCount || 0;

    // Auto-detect repeats based on similarity
    if (similar && similar.length > 0 && !isRepeat) {
      const bestMatch = similar[0];
      // Simple similarity check - in production, use more sophisticated algorithm
      if (bestMatch.title.toLowerCase() === title.toLowerCase() &&
          bestMatch.assetId === assetId &&
          bestMatch.tool === tool) {
        finalIsRepeat = true;
        finalOriginalFindingId = bestMatch.id;
        finalRepeatCount = (bestMatch.repeatCount || 0) + 1;
      }
    }

    const id = generateId();
    const organizationId = req.orgId;

    const finding = await Finding.create({
      id,
      title: title.trim(),
      description,
      severity,
      status,
      organizationId,
      discoveredDate,
      riskId,
      assetId,
      applicationId,
      businessProcessId,
      isRepeat: finalIsRepeat,
      originalFindingId: finalOriginalFindingId,
      repeatCount: finalRepeatCount,
      remediationPlan,
      targetDate,
      owner,
      source,
      sourceRef,
      tool,
      metadata
    });

    // If detected as repeat, update original finding's repeat count
    if (finalIsRepeat && finalOriginalFindingId && finalOriginalFindingId !== id) {
      await Finding.markAsRepeat(id, finalOriginalFindingId);
    }

    res.status(201).json(finding);
  } catch (err) {
    console.error('Create finding error:', err.message);
    res.status(500).json({ error: 'Failed to create finding', message: err.message });
  }
});

/**
 * GET /api/findings - List all findings for the org
 */
router.get('/', authenticateJWT, requirePermission('security.findings.view'), async (req, res) => {
  try {
    const organizationId = req.orgId;
    const { severity, status, assetId, businessProcessId, isRepeat } = req.query;

    const findings = await Finding.findByOrganization(organizationId, {
      severity,
      status,
      assetId,
      businessProcessId,
      isRepeat: isRepeat === 'true' ? true : (isRepeat === 'false' ? false : undefined)
    });

    res.json({
      organizationId,
      count: findings.length,
      data: findings
    });
  } catch (err) {
    console.error('List findings error:', err.message);
    res.status(500).json({ error: 'Failed to list findings' });
  }
});

/**
 * GET /api/findings/statistics - Get finding statistics
 */
router.get('/statistics', authenticateJWT, requirePermission('security.findings.view'), async (req, res) => {
  try {
    const organizationId = req.orgId;

    const stats = await Finding.getStatistics(organizationId);

    res.json({
      organizationId,
      statistics: stats
    });
  } catch (err) {
    console.error('Get finding statistics error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve finding statistics' });
  }
});

/**
 * GET /api/findings/repeats - Get repeat findings
 */
router.get('/repeats', authenticateJWT, requirePermission('security.findings.view'), async (req, res) => {
  try {
    const organizationId = req.orgId;

    const repeats = await Finding.findRepeats(organizationId);

    res.json({
      organizationId,
      count: repeats.length,
      data: repeats
    });
  } catch (err) {
    console.error('Get repeat findings error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve repeat findings' });
  }
});

/**
 * GET /api/findings/by-risk/:id - Get findings by risk ID
 */
router.get('/by-risk/:id', authenticateJWT, requirePermission('security.findings.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.orgId;

    const findings = await Finding.findByRiskId(id, organizationId);

    res.json({
      organizationId,
      riskId: id,
      count: findings.length,
      data: findings
    });
  } catch (err) {
    console.error('Get findings by risk error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve findings for risk' });
  }
});

/**
 * GET /api/findings/by-asset/:id - Get findings by asset ID
 */
router.get('/by-asset/:id', authenticateJWT, requirePermission('security.findings.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.orgId;

    const findings = await Finding.findByAssetId(id, organizationId);

    res.json({
      organizationId,
      assetId: id,
      count: findings.length,
      data: findings
    });
  } catch (err) {
    console.error('Get findings by asset error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve findings for asset' });
  }
});

/**
 * GET /api/findings/:id - Get a specific finding
 */
router.get('/:id', authenticateJWT, requirePermission('security.findings.view'), async (req, res) => {
  try {
    const { id } = req.params;

    const finding = await Finding.findById(id);

    if (!finding) {
      return res.status(404).json({ error: 'Finding not found', id });
    }

    // Verify org access
    if (finding.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this finding' });
    }

    res.json(finding);
  } catch (err) {
    console.error('Get finding error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve finding' });
  }
});

/**
 * PUT /api/findings/:id - Update a finding
 */
router.put('/:id', authenticateJWT, requirePermission('security.findings.update'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      severity,
      status,
      discoveredDate,
      riskId,
      assetId,
      applicationId,
      businessProcessId,
      isRepeat,
      originalFindingId,
      repeatCount,
      remediationPlan,
      targetDate,
      owner,
      source,
      sourceRef,
      tool,
      metadata
    } = req.body;

    // Verify ownership first
    const existing = await Finding.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Finding not found', id });
    }
    if (existing.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this finding' });
    }

    const updated = await Finding.update(id, {
      title,
      description,
      severity,
      status,
      discoveredDate,
      riskId,
      assetId,
      applicationId,
      businessProcessId,
      isRepeat,
      originalFindingId,
      repeatCount,
      remediationPlan,
      targetDate,
      owner,
      source,
      sourceRef,
      tool,
      metadata
    });

    res.json(updated);
  } catch (err) {
    console.error('Update finding error:', err.message);
    res.status(500).json({ error: 'Failed to update finding' });
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

    // Verify ownership first
    const existing = await Finding.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Finding not found', id });
    }
    if (existing.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this finding' });
    }

    // Also verify original finding access
    const original = await Finding.findById(originalFindingId);
    if (!original || original.organizationId !== req.orgId) {
      return res.status(400).json({ error: 'Original finding not found or not accessible' });
    }

    const updated = await Finding.markAsRepeat(id, originalFindingId);

    res.json(updated);
  } catch (err) {
    console.error('Mark finding as repeat error:', err.message);
    res.status(500).json({ error: 'Failed to mark finding as repeat' });
  }
});

/**
 * DELETE /api/findings/:id - Delete a finding
 */
router.delete('/:id', authenticateJWT, requirePermission('security.findings.delete'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership first
    const existing = await Finding.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Finding not found', id });
    }
    if (existing.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this finding' });
    }

    await Finding.delete(id);

    res.json({ message: 'Finding deleted successfully', id });
  } catch (err) {
    console.error('Delete finding error:', err.message);
    res.status(500).json({ error: 'Failed to delete finding' });
  }
});

module.exports = router;
