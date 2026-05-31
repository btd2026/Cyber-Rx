'use strict';
const express = require('express');
const router = express.Router();
const { Risk } = require('../models');
const { authenticateJWT } = require('../middleware/auth');
const { requirePermission, requireAnyPermission } = require('../middleware/rbac');

/**
 * Risks API Routes
 *
 * CRUD operations for risk entities with correlation linkage
 * All routes are authenticated and org-scoped
 */

// Generate UUID helper
function generateId() {
  return `risk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * POST /api/risks - Create a new risk
 */
router.post('/', authenticateJWT, requireAnyPermission(['security.risks.create', 'risk.register.create']), async (req, res) => {
  try {
    const {
      title,
      severity,
      status,
      description,
      likelihood,
      findingId,
      assetId,
      applicationId,
      vendorId,
      businessProcessIds,
      dataObjectIds,
      threatScenarioId,
      frameworkMappings,
      financialExposure,
      costToRemediate,
      legalObligationIds,
      regulatoryCitation,
      executiveOwner,
      remediationOwner,
      evidenceOwner,
      auditEvidenceRequired,
      auditTestIds
    } = req.body;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Risk title is required' });
    }
    const validSeverities = ['Critical', 'High', 'Medium', 'Low'];
    if (!severity || !validSeverities.includes(severity)) {
      return res.status(400).json({ error: `Severity must be one of: ${validSeverities.join(', ')}` });
    }
    const validStatuses = ['open', 'mitigating', 'accepted', 'closed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const id = generateId();
    const organizationId = req.orgId;

    const risk = await Risk.create({
      id,
      title: title.trim(),
      severity,
      status,
      organizationId,
      description,
      likelihood,
      findingId,
      assetId,
      applicationId,
      vendorId,
      businessProcessIds: businessProcessIds || [],
      dataObjectIds: dataObjectIds || [],
      threatScenarioId,
      frameworkMappings: frameworkMappings || [],
      financialExposure,
      costToRemediate,
      legalObligationIds: legalObligationIds || [],
      regulatoryCitation,
      executiveOwner,
      remediationOwner,
      evidenceOwner,
      auditEvidenceRequired,
      auditTestIds: auditTestIds || []
    });

    res.status(201).json(risk);
  } catch (err) {
    console.error('Create risk error:', err.message);
    res.status(500).json({ error: 'Failed to create risk', message: err.message });
  }
});

/**
 * GET /api/risks - List all risks for the org
 */
router.get('/', authenticateJWT, requirePermission('security.risks.view'), async (req, res) => {
  try {
    const organizationId = req.orgId;
    const { severity, status, businessProcessId } = req.query;

    const risks = await Risk.findByOrganization(organizationId, { severity, status });

    // Filter by business process if specified
    let filteredRisks = risks;
    if (businessProcessId) {
      filteredRisks = risks.filter(r =>
        r.businessProcessIds && r.businessProcessIds.includes(businessProcessId)
      );
    }

    res.json({
      organizationId,
      count: filteredRisks.length,
      data: filteredRisks
    });
  } catch (err) {
    console.error('List risks error:', err.message);
    res.status(500).json({ error: 'Failed to list risks' });
  }
});

/**
 * GET /api/risks/high-exposure - Get risks with high financial exposure
 */
router.get('/high-exposure', authenticateJWT, requirePermission('financial.exposure.view'), async (req, res) => {
  try {
    const organizationId = req.orgId;
    const { minExposure } = req.query;

    const minExp = minExposure ? parseFloat(minExposure) : 100000;

    const risks = await Risk.getHighFinancialExposure(organizationId, minExp);

    res.json({
      organizationId,
      minExposure: minExp,
      count: risks.length,
      data: risks
    });
  } catch (err) {
    console.error('Get high-exposure risks error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve high-exposure risks' });
  }
});

/**
 * GET /api/risks/by-business-process/:id - Get risks by business process ID
 */
router.get('/by-business-process/:id', authenticateJWT, requirePermission('security.risks.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.orgId;

    const risks = await Risk.findByBusinessProcessId(id, organizationId);

    res.json({
      organizationId,
      businessProcessId: id,
      count: risks.length,
      data: risks
    });
  } catch (err) {
    console.error('Get risks by business process error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve risks for business process' });
  }
});

/**
 * GET /api/risks/by-asset/:id - Get risks by asset ID
 */
router.get('/by-asset/:id', authenticateJWT, requirePermission('security.risks.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.orgId;

    const risks = await Risk.findByAssetId(id, organizationId);

    res.json({
      organizationId,
      assetId: id,
      count: risks.length,
      data: risks
    });
  } catch (err) {
    console.error('Get risks by asset error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve risks for asset' });
  }
});

/**
 * GET /api/risks/:id - Get a specific risk
 */
router.get('/:id', authenticateJWT, requirePermission('security.risks.view'), async (req, res) => {
  try {
    const { id } = req.params;

    const risk = await Risk.findById(id);

    if (!risk) {
      return res.status(404).json({ error: 'Risk not found', id });
    }

    // Verify org access
    if (risk.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this risk' });
    }

    res.json(risk);
  } catch (err) {
    console.error('Get risk error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve risk' });
  }
});

/**
 * PUT /api/risks/:id - Update a risk
 */
router.put('/:id', authenticateJWT, requireAnyPermission(['security.risks.update', 'risk.register.update']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      severity,
      status,
      description,
      likelihood,
      findingId,
      assetId,
      applicationId,
      vendorId,
      businessProcessIds,
      dataObjectIds,
      threatScenarioId,
      frameworkMappings,
      financialExposure,
      costToRemediate,
      legalObligationIds,
      regulatoryCitation,
      executiveOwner,
      remediationOwner,
      evidenceOwner,
      auditEvidenceRequired,
      auditTestIds
    } = req.body;

    // Verify ownership first
    const existing = await Risk.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Risk not found', id });
    }
    if (existing.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this risk' });
    }

    const updated = await Risk.update(id, {
      title,
      severity,
      status,
      description,
      likelihood,
      findingId,
      assetId,
      applicationId,
      vendorId,
      businessProcessIds,
      dataObjectIds,
      threatScenarioId,
      frameworkMappings,
      financialExposure,
      costToRemediate,
      legalObligationIds,
      regulatoryCitation,
      executiveOwner,
      remediationOwner,
      evidenceOwner,
      auditEvidenceRequired,
      auditTestIds
    });

    res.json(updated);
  } catch (err) {
    console.error('Update risk error:', err.message);
    res.status(500).json({ error: 'Failed to update risk' });
  }
});

/**
 * DELETE /api/risks/:id - Delete a risk
 */
router.delete('/:id', authenticateJWT, requireAnyPermission(['security.risks.delete', 'risk.register.delete']), async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership first
    const existing = await Risk.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Risk not found', id });
    }
    if (existing.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this risk' });
    }

    await Risk.delete(id);

    res.json({ message: 'Risk deleted successfully', id });
  } catch (err) {
    console.error('Delete risk error:', err.message);
    res.status(500).json({ error: 'Failed to delete risk' });
  }
});

module.exports = router;
