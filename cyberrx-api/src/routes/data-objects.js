'use strict';
const express = require('express');
const router = express.Router();
const { DataObject } = require('../models');
const { authenticateJWT } = require('../middleware/auth');

/**
 * Data Objects API Routes
 *
 * CRUD operations for data object entities (PHI/PII/PCI classification)
 * All routes are authenticated and org-scoped
 */

// Generate UUID helper
function generateId() {
  return `do_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * POST /api/data-objects - Create a new data object
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const {
      name,
      type,
      sensitivity,
      recordCount,
      description,
      residesInSystems,
      accessedByApps,
      protectedByControls,
      retentionPeriod,
      dataOwner
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Data object name is required' });
    }
    const validTypes = ['PHI', 'PII', 'PCI', 'Financial', 'Legal', 'Confidential'];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ error: `Type must be one of: ${validTypes.join(', ')}` });
    }
    const validSensitivity = ['Critical', 'High', 'Medium', 'Low'];
    if (!sensitivity || !validSensitivity.includes(sensitivity)) {
      return res.status(400).json({ error: `Sensitivity must be one of: ${validSensitivity.join(', ')}` });
    }

    const id = generateId();
    const organizationId = req.orgId;

    const dataObject = await DataObject.create({
      id,
      name: name.trim(),
      type,
      sensitivity,
      organizationId,
      recordCount,
      description,
      residesInSystems: residesInSystems || [],
      accessedByApps: accessedByApps || [],
      protectedByControls: protectedByControls || [],
      retentionPeriod,
      dataOwner
    });

    res.status(201).json(dataObject);
  } catch (err) {
    console.error('Create data object error:', err.message);
    res.status(500).json({ error: 'Failed to create data object', message: err.message });
  }
});

/**
 * GET /api/data-objects - List all data objects for the org
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const organizationId = req.orgId;
    const { type, sensitivity } = req.query;

    const dataObjects = await DataObject.findByOrganization(organizationId, { type, sensitivity });

    res.json({
      organizationId,
      count: dataObjects.length,
      data: dataObjects
    });
  } catch (err) {
    console.error('List data objects error:', err.message);
    res.status(500).json({ error: 'Failed to list data objects' });
  }
});

/**
 * GET /api/data-objects/high-value - Get high-value data objects (PHI/PII with Critical/High sensitivity)
 */
router.get('/high-value', authenticateJWT, async (req, res) => {
  try {
    const organizationId = req.orgId;

    const highValueData = await DataObject.getHighValueDataObjects(organizationId);

    res.json({
      organizationId,
      count: highValueData.length,
      data: highValueData
    });
  } catch (err) {
    console.error('Get high-value data objects error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve high-value data objects' });
  }
});

/**
 * GET /api/data-objects/:id - Get a specific data object
 */
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const dataObject = await DataObject.findById(id);

    if (!dataObject) {
      return res.status(404).json({ error: 'Data object not found', id });
    }

    // Verify org access
    if (dataObject.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this data object' });
    }

    res.json(dataObject);
  } catch (err) {
    console.error('Get data object error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve data object' });
  }
});

/**
 * PUT /api/data-objects/:id - Update a data object
 */
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      sensitivity,
      recordCount,
      description,
      residesInSystems,
      accessedByApps,
      protectedByControls,
      retentionPeriod,
      dataOwner
    } = req.body;

    // Verify ownership first
    const existing = await DataObject.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Data object not found', id });
    }
    if (existing.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this data object' });
    }

    const updated = await DataObject.update(id, {
      name,
      type,
      sensitivity,
      recordCount,
      description,
      residesInSystems,
      accessedByApps,
      protectedByControls,
      retentionPeriod,
      dataOwner
    });

    res.json(updated);
  } catch (err) {
    console.error('Update data object error:', err.message);
    res.status(500).json({ error: 'Failed to update data object' });
  }
});

/**
 * DELETE /api/data-objects/:id - Delete a data object
 */
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership first
    const existing = await DataObject.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Data object not found', id });
    }
    if (existing.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this data object' });
    }

    await DataObject.delete(id);

    res.json({ message: 'Data object deleted successfully', id });
  } catch (err) {
    console.error('Delete data object error:', err.message);
    res.status(500).json({ error: 'Failed to delete data object' });
  }
});

module.exports = router;
