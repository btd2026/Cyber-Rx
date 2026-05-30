'use strict';
const express = require('express');
const router = express.Router();
const { BusinessProcess } = require('../models');
const { authenticateJWT } = require('../middleware/auth');

/**
 * Business Processes API Routes
 *
 * CRUD operations for business process entities
 * All routes are authenticated and org-scoped
 */

// Generate UUID helper
function generateId() {
  return `bp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * POST /api/business-processes - Create a new business process
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const {
      name,
      tier,
      criticality,
      owner,
      description,
      supportedBySystems,
      createsDataObjects,
      governedByControls
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Business process name is required' });
    }
    if (!tier || !['Primary', 'Strategic'].includes(tier)) {
      return res.status(400).json({ error: 'Tier must be Primary or Strategic' });
    }
    if (!criticality || !['Critical', 'High', 'Medium', 'Low'].includes(criticality)) {
      return res.status(400).json({ error: 'Criticality must be Critical, High, Medium, or Low' });
    }
    if (!owner || !owner.trim()) {
      return res.status(400).json({ error: 'Owner is required' });
    }

    const id = generateId();
    const organizationId = req.orgId;

    const businessProcess = await BusinessProcess.create({
      id,
      name: name.trim(),
      tier,
      criticality,
      owner: owner.trim(),
      organizationId,
      description,
      supportedBySystems: supportedBySystems || [],
      createsDataObjects: createsDataObjects || [],
      governedByControls: governedByControls || []
    });

    res.status(201).json(businessProcess);
  } catch (err) {
    console.error('Create business process error:', err.message);
    res.status(500).json({ error: 'Failed to create business process', message: err.message });
  }
});

/**
 * GET /api/business-processes - List all business processes for the org
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const organizationId = req.orgId;
    const { tier } = req.query;

    const processes = await BusinessProcess.findByOrganization(organizationId, { tier });

    res.json({
      organizationId,
      count: processes.length,
      data: processes
    });
  } catch (err) {
    console.error('List business processes error:', err.message);
    res.status(500).json({ error: 'Failed to list business processes' });
  }
});

/**
 * GET /api/business-processes/:id - Get a specific business process
 */
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const process = await BusinessProcess.findById(id);

    if (!process) {
      return res.status(404).json({ error: 'Business process not found', id });
    }

    // Verify org access
    if (process.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this business process' });
    }

    res.json(process);
  } catch (err) {
    console.error('Get business process error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve business process' });
  }
});

/**
 * PUT /api/business-processes/:id - Update a business process
 */
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      tier,
      criticality,
      owner,
      description,
      supportedBySystems,
      createsDataObjects,
      governedByControls
    } = req.body;

    // Verify ownership first
    const existing = await BusinessProcess.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Business process not found', id });
    }
    if (existing.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this business process' });
    }

    const updated = await BusinessProcess.update(id, {
      name,
      tier,
      criticality,
      owner,
      description,
      supportedBySystems,
      createsDataObjects,
      governedByControls
    });

    res.json(updated);
  } catch (err) {
    console.error('Update business process error:', err.message);
    res.status(500).json({ error: 'Failed to update business process' });
  }
});

/**
 * DELETE /api/business-processes/:id - Delete a business process
 */
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership first
    const existing = await BusinessProcess.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Business process not found', id });
    }
    if (existing.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this business process' });
    }

    await BusinessProcess.delete(id);

    res.json({ message: 'Business process deleted successfully', id });
  } catch (err) {
    console.error('Delete business process error:', err.message);
    res.status(500).json({ error: 'Failed to delete business process' });
  }
});

module.exports = router;
