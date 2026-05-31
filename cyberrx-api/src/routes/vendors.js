'use strict';
const express = require('express');
const router = express.Router();
const ServiceFactory = require('../domains/ServiceFactory');
const { authenticateJWT } = require('../middleware/auth');

/**
 * Vendors API Routes
 *
 * CRUD operations for vendor entities
 * All routes are authenticated and org-scoped
 */

/**
 * POST /api/vendors - Create a new vendor
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const service = ServiceFactory.getService('operational');
    const vendor = await service.createVendor(req.orgId, req.body);
    res.status(201).json(vendor);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ 
      error: err.message || 'Failed to create vendor',
      message: err.message 
    });
  }
});

/**
 * GET /api/vendors - List all vendors for the org
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const service = ServiceFactory.getService('operational');
    const filters = {
      tier: req.query.tier,
      riskRating: req.query.riskRating,
      category: req.query.category
    };
    const vendors = await service.getVendors(req.orgId, filters);
    
    res.json({
      organizationId: req.orgId,
      count: vendors.length,
      data: vendors
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ 
      error: err.message || 'Failed to list vendors',
      message: err.message 
    });
  }
});

/**
 * GET /api/vendors/summary - Get vendor risk summary
 */
router.get('/summary', authenticateJWT, async (req, res) => {
  try {
    const service = ServiceFactory.getService('operational');
    const summary = await service.getRiskSummary(req.orgId);
    res.json(summary);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ 
      error: err.message || 'Failed to get risk summary',
      message: err.message 
    });
  }
});

/**
 * GET /api/vendors/expiring - Get vendors with expiring contracts
 */
router.get('/expiring', authenticateJWT, async (req, res) => {
  try {
    const service = ServiceFactory.getService('operational');
    const days = parseInt(req.query.days) || 90;
    const vendors = await service.getExpiringContracts(req.orgId, days);
    
    res.json({
      organizationId: req.orgId,
      days,
      count: vendors.length,
      data: vendors
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ 
      error: err.message || 'Failed to get expiring contracts',
      message: err.message 
    });
  }
});

/**
 * GET /api/vendors/:id - Get a specific vendor
 */
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const service = ServiceFactory.getService('operational');
    const vendor = await service.getVendorById(req.params.id, req.orgId);
    res.json(vendor);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ 
      error: err.message || 'Failed to retrieve vendor',
      message: err.message 
    });
  }
});

/**
 * PUT /api/vendors/:id - Update a vendor
 */
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const service = ServiceFactory.getService('operational');
    const updated = await service.updateVendor(req.params.id, req.orgId, req.body);
    res.json(updated);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ 
      error: err.message || 'Failed to update vendor',
      message: err.message 
    });
  }
});

/**
 * DELETE /api/vendors/:id - Delete a vendor
 */
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const service = ServiceFactory.getService('operational');
    const result = await service.deleteVendor(req.params.id, req.orgId);
    res.json(result);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ 
      error: err.message || 'Failed to delete vendor',
      message: err.message 
    });
  }
});

/**
 * POST /api/vendors/:id/assess - Assess vendor risk
 */
router.post('/:id/assess', authenticateJWT, async (req, res) => {
  try {
    const service = ServiceFactory.getService('operational');
    const assessment = await service.assessVendorRisk(req.params.id, req.orgId);
    res.json(assessment);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ 
      error: err.message || 'Failed to assess vendor risk',
      message: err.message 
    });
  }
});

/**
 * PUT /api/vendors/:id/processes - Map vendor to business processes
 */
router.put('/:id/processes', authenticateJWT, async (req, res) => {
  try {
    const { processIds } = req.body;
    
    if (!Array.isArray(processIds)) {
      return res.status(400).json({ error: 'processIds must be an array' });
    }
    
    const service = ServiceFactory.getService('operational');
    const updated = await service.mapToProcesses(req.params.id, req.orgId, processIds);
    res.json(updated);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ 
      error: err.message || 'Failed to map vendor to processes',
      message: err.message 
    });
  }
});

module.exports = router;
