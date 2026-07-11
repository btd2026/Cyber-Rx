'use strict';
const express = require('express');
const router = express.Router();
const BusinessProcessService = require('../domains/operational/services/BusinessProcessService');
const BusinessProcessController = require('../domains/operational/controllers/BusinessProcessController');
const { authenticateJWT } = require('../middleware/auth');
const models = require('../models');

/**
 * Business Processes API Routes
 *
 * CRUD operations for business process entities
 * All routes are authenticated and org-scoped
 * Uses service layer for business logic and controller for request/response handling
 */

// Initialize service and controller
const businessProcessService = new BusinessProcessService(models, console);
const businessProcessController = new BusinessProcessController(businessProcessService);

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  console.error('Business process API error:', err.message);

  res.status(statusCode).json({
    error: message,
    ...(err.originalError && { details: err.originalError })
  });
};

/**
 * POST /api/business-processes - Create a new business process
 */
router.post('/', authenticateJWT, (req, res, next) => {
  businessProcessController.createProcess(req, res, next);
}, errorHandler);

/**
 * GET /api/business-processes/summary - Get process summary for organization
 */
router.get('/summary', authenticateJWT, (req, res, next) => {
  businessProcessController.getProcessSummary(req, res, next);
}, errorHandler);

/**
 * GET /api/business-processes/revenue-candidates - Phase B: ranked advisory revenue-criticality
 * candidates for the human confirm step. Registered before /:id so it isn't captured as an id.
 */
router.get('/revenue-candidates', authenticateJWT, (req, res, next) => {
  businessProcessController.getRevenueCandidates(req, res, next);
}, errorHandler);

/**
 * POST /api/business-processes/:id/confirm-revenue - Phase B: record the human confirmation
 * (the crown-jewel derivation gate). Body: { brings_money, financial_impact?, by? }
 */
router.post('/:id/confirm-revenue', authenticateJWT, (req, res, next) => {
  businessProcessController.confirmRevenue(req, res, next);
}, errorHandler);

/**
 * PUT /api/business-processes/:id/systems - Map systems to process
 */
router.put('/:id/systems', authenticateJWT, (req, res, next) => {
  businessProcessController.mapSystems(req, res, next);
}, errorHandler);

/**
 * PUT /api/business-processes/:id/data-objects - Map data objects to process
 */
router.put('/:id/data-objects', authenticateJWT, (req, res, next) => {
  businessProcessController.mapDataObjects(req, res, next);
}, errorHandler);

/**
 * PUT /api/business-processes/:id/controls - Map controls to process
 */
router.put('/:id/controls', authenticateJWT, (req, res, next) => {
  businessProcessController.mapControls(req, res, next);
}, errorHandler);

/**
 * GET /api/business-processes - List all business processes for the org
 */
router.get('/', authenticateJWT, (req, res, next) => {
  businessProcessController.getProcesses(req, res, next);
}, errorHandler);

/**
 * GET /api/business-processes/:id - Get a specific business process
 */
router.get('/:id', authenticateJWT, (req, res, next) => {
  businessProcessController.getProcessById(req, res, next);
}, errorHandler);

/**
 * PUT /api/business-processes/:id - Update a business process
 */
router.put('/:id', authenticateJWT, (req, res, next) => {
  businessProcessController.updateProcess(req, res, next);
}, errorHandler);

/**
 * DELETE /api/business-processes/:id - Delete a business process
 */
router.delete('/:id', authenticateJWT, (req, res, next) => {
  businessProcessController.deleteProcess(req, res, next);
}, errorHandler);

module.exports = router;
