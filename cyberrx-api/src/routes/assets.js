'use strict';
const express = require('express');
const router = express.Router();
const ServiceFactory = require('../domains/ServiceFactory');
const { authenticateJWT } = require('../middleware/auth');

/**
 * Assets API Routes
 *
 * CRUD operations for asset entities
 * All routes are authenticated and org-scoped
 */

/**
 * POST /api/assets - Create a new asset
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const service = ServiceFactory.getService('operational');
    const asset = await service.createAsset(req.orgId, req.body);
    res.status(201).json(asset);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ 
      error: err.message || 'Failed to create asset',
      message: err.message 
    });
  }
});

/**
 * GET /api/assets - List all assets for the org
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const service = ServiceFactory.getService('operational');
    const filters = {
      type: req.query.type,
      businessProcessId: req.query.businessProcessId,
      dataClassification: req.query.dataClassification
    };
    const assets = await service.getAssets(req.orgId, filters);
    
    res.json({
      organizationId: req.orgId,
      count: assets.length,
      data: assets
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ 
      error: err.message || 'Failed to list assets',
      message: err.message 
    });
  }
});

/**
 * GET /api/assets/:id - Get a specific asset
 */
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const service = ServiceFactory.getService('operational');
    const asset = await service.getAssetById(req.params.id, req.orgId);
    res.json(asset);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ 
      error: err.message || 'Failed to retrieve asset',
      message: err.message 
    });
  }
});

/**
 * PUT /api/assets/:id - Update an asset
 */
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const service = ServiceFactory.getService('operational');
    const updated = await service.updateAsset(req.params.id, req.orgId, req.body);
    res.json(updated);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ 
      error: err.message || 'Failed to update asset',
      message: err.message 
    });
  }
});

/**
 * DELETE /api/assets/:id - Delete an asset
 */
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const service = ServiceFactory.getService('operational');
    const result = await service.deleteAsset(req.params.id, req.orgId);
    res.json(result);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ 
      error: err.message || 'Failed to delete asset',
      message: err.message 
    });
  }
});

module.exports = router;
