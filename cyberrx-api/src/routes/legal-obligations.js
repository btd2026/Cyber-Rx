'use strict';
const express = require('express');
const router = express.Router();
const { LegalObligation } = require('../models');
const { authenticateJWT } = require('../middleware/auth');

/**
 * Legal Obligations API Routes
 *
 * CRUD operations for legal obligation entities (CLO model)
 * All routes are authenticated and org-scoped
 */

// Generate UUID helper
function generateId() {
  return `lo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * POST /api/legal-obligations - Create a new legal obligation
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const {
      name,
      source,
      citation,
      notificationTimeline,
      applicability,
      penalties,
      description,
      maxPenaltyAmount,
      jurisdiction
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Legal obligation name is required' });
    }
    const validSources = ['HIPAA', 'CMS', 'State', 'NAIC', 'Contract'];
    if (!source || !validSources.includes(source)) {
      return res.status(400).json({ error: `Source must be one of: ${validSources.join(', ')}` });
    }

    const id = generateId();
    const organizationId = req.orgId;

    const obligation = await LegalObligation.create({
      id,
      name: name.trim(),
      source,
      organizationId,
      citation,
      notificationTimeline,
      applicability: applicability || [],
      penalties: penalties || [],
      description,
      maxPenaltyAmount,
      jurisdiction
    });

    res.status(201).json(obligation);
  } catch (err) {
    console.error('Create legal obligation error:', err.message);
    res.status(500).json({ error: 'Failed to create legal obligation', message: err.message });
  }
});

/**
 * GET /api/legal-obligations - List all legal obligations for the org
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const organizationId = req.orgId;
    const { source } = req.query;

    const obligations = await LegalObligation.findByOrganization(organizationId, { source });

    res.json({
      organizationId,
      count: obligations.length,
      data: obligations
    });
  } catch (err) {
    console.error('List legal obligations error:', err.message);
    res.status(500).json({ error: 'Failed to list legal obligations' });
  }
});

/**
 * GET /api/legal-obligations/urgent - Get obligations with urgent notification requirements
 */
router.get('/urgent', authenticateJWT, async (req, res) => {
  try {
    const organizationId = req.orgId;

    const urgent = await LegalObligation.getUrgentObligations(organizationId);

    res.json({
      organizationId,
      count: urgent.length,
      data: urgent
    });
  } catch (err) {
    console.error('Get urgent obligations error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve urgent obligations' });
  }
});

/**
 * GET /api/legal-obligations/hipaa - Get HIPAA obligations
 */
router.get('/hipaa', authenticateJWT, async (req, res) => {
  try {
    const organizationId = req.orgId;

    const hipaa = await LegalObligation.getHIPAAObligations(organizationId);

    res.json({
      organizationId,
      count: hipaa.length,
      data: hipaa
    });
  } catch (err) {
    console.error('Get HIPAA obligations error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve HIPAA obligations' });
  }
});

/**
 * GET /api/legal-obligations/:id - Get a specific legal obligation
 */
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const obligation = await LegalObligation.findById(id);

    if (!obligation) {
      return res.status(404).json({ error: 'Legal obligation not found', id });
    }

    // Verify org access
    if (obligation.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this legal obligation' });
    }

    res.json(obligation);
  } catch (err) {
    console.error('Get legal obligation error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve legal obligation' });
  }
});

/**
 * PUT /api/legal-obligations/:id - Update a legal obligation
 */
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      source,
      citation,
      notificationTimeline,
      applicability,
      penalties,
      description,
      maxPenaltyAmount,
      jurisdiction
    } = req.body;

    // Verify ownership first
    const existing = await LegalObligation.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Legal obligation not found', id });
    }
    if (existing.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this legal obligation' });
    }

    const updated = await LegalObligation.update(id, {
      name,
      source,
      citation,
      notificationTimeline,
      applicability,
      penalties,
      description,
      maxPenaltyAmount,
      jurisdiction
    });

    res.json(updated);
  } catch (err) {
    console.error('Update legal obligation error:', err.message);
    res.status(500).json({ error: 'Failed to update legal obligation' });
  }
});

/**
 * DELETE /api/legal-obligations/:id - Delete a legal obligation
 */
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership first
    const existing = await LegalObligation.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Legal obligation not found', id });
    }
    if (existing.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this legal obligation' });
    }

    await LegalObligation.delete(id);

    res.json({ message: 'Legal obligation deleted successfully', id });
  } catch (err) {
    console.error('Delete legal obligation error:', err.message);
    res.status(500).json({ error: 'Failed to delete legal obligation' });
  }
});

module.exports = router;
