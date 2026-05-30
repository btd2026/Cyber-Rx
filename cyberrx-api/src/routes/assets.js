'use strict';
const express = require('express');
const router = express.Router();
const { Asset } = require('../models');
const { authenticateJWT } = require('../middleware/auth');

/**
 * Assets API Routes
 *
 * CRUD operations for asset entities
 * All routes are authenticated and org-scoped
 */

// Generate UUID helper
function generateId() {
  return `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * POST /api/assets - Create a new asset
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const {
      name,
      type,
      hostname,
      ipAddress,
      owner,
      description,
      businessProcessIds,
      applicationIds,
      dataClassification,
      cloudProvider,
      location
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Asset name is required' });
    }
    const validTypes = ['server', 'endpoint', 'database', 'cloud', 'API', 'app'];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ error: `Type must be one of: ${validTypes.join(', ')}` });
    }

    const id = generateId();
    const organizationId = req.orgId;

    const asset = await Asset.create({
      id,
      name: name.trim(),
      type,
      organizationId,
      hostname: hostname?.trim() || null,
      ipAddress: ipAddress?.trim() || null,
      owner: owner?.trim() || null,
      description,
      businessProcessIds: businessProcessIds || [],
      applicationIds: applicationIds || [],
      dataClassification: dataClassification || [],
      cloudProvider,
      location
    });

    res.status(201).json(asset);
  } catch (err) {
    console.error('Create asset error:', err.message);
    res.status(500).json({ error: 'Failed to create asset', message: err.message });
  }
});

/**
 * GET /api/assets - List all assets for the org
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const organizationId = req.orgId;
    const { type } = req.query;

    const assets = await Asset.findByOrganization(organizationId, { type });

    res.json({
      organizationId,
      count: assets.length,
      data: assets
    });
  } catch (err) {
    console.error('List assets error:', err.message);
    res.status(500).json({ error: 'Failed to list assets' });
  }
});

/**
 * GET /api/assets/:id - Get a specific asset
 */
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const asset = await Asset.findById(id);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found', id });
    }

    // Verify org access
    if (asset.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this asset' });
    }

    res.json(asset);
  } catch (err) {
    console.error('Get asset error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve asset' });
  }
});

/**
 * PUT /api/assets/:id - Update an asset
 */
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      hostname,
      ipAddress,
      owner,
      description,
      businessProcessIds,
      applicationIds,
      dataClassification,
      cloudProvider,
      location
    } = req.body;

    // Verify ownership first
    const existing = await Asset.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Asset not found', id });
    }
    if (existing.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this asset' });
    }

    const updated = await Asset.update(id, {
      name,
      type,
      hostname,
      ipAddress,
      owner,
      description,
      businessProcessIds,
      applicationIds,
      dataClassification,
      cloudProvider,
      location
    });

    res.json(updated);
  } catch (err) {
    console.error('Update asset error:', err.message);
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

/**
 * DELETE /api/assets/:id - Delete an asset
 */
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership first
    const existing = await Asset.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Asset not found', id });
    }
    if (existing.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this asset' });
    }

    await Asset.delete(id);

    res.json({ message: 'Asset deleted successfully', id });
  } catch (err) {
    console.error('Delete asset error:', err.message);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

module.exports = router;
