'use strict';

const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const DataObjectService = require('../domains/operational/services/DataObjectService');
const DataObjectController = require('../domains/operational/controllers/DataObjectController');
const { DataObject, Asset, BusinessProcess, Control } = require('../models');

/**
 * Data Objects API Routes
 *
 * CRUD operations for data classification
 * All routes are authenticated and org-scoped
 */

// Initialize service and controller
const dataObjectService = new DataObjectService(
  { DataObject, Asset, BusinessProcess, Control },
  console
);
const dataObjectController = new DataObjectController(dataObjectService);

/**
 * GET /api/data-objects
 * Get all data objects with optional filters
 * Query params: type, sensitivity, businessProcessId
 */
router.get('/', authenticateJWT, (req, res) => {
  dataObjectController.getDataObjects(req, res);
});

/**
 * GET /api/data-objects/:id
 * Get single data object by ID
 */
router.get('/:id', authenticateJWT, (req, res) => {
  dataObjectController.getDataObjectById(req, res);
});

/**
 * POST /api/data-objects
 * Create new data object
 * Body: { name, type, sensitivity, recordCount?, description?, residesInSystems[], accessedByApps[], protectedByControls[], retentionPeriod?, dataOwner? }
 */
router.post('/', authenticateJWT, (req, res) => {
  dataObjectController.createDataObject(req, res);
});

/**
 * PUT /api/data-objects/:id
 * Update data object
 */
router.put('/:id', authenticateJWT, (req, res) => {
  dataObjectController.updateDataObject(req, res);
});

/**
 * DELETE /api/data-objects/:id
 * Delete data object
 */
router.delete('/:id', authenticateJWT, (req, res) => {
  dataObjectController.deleteDataObject(req, res);
});

/**
 * GET /api/data-objects/asset/:assetId
 * Get data objects by asset/system
 */
router.get('/asset/:assetId', authenticateJWT, (req, res) => {
  dataObjectController.getDataObjectsByAsset(req, res);
});

/**
 * GET /api/data-objects/application/:applicationId
 * Get data objects by application
 */
router.get('/application/:applicationId', authenticateJWT, (req, res) => {
  dataObjectController.getDataObjectsByApplication(req, res);
});

/**
 * GET /api/data-objects/control/:controlId
 * Get data objects by control
 */
router.get('/control/:controlId', authenticateJWT, (req, res) => {
  dataObjectController.getDataObjectsByControl(req, res);
});

/**
 * GET /api/data-objects/high-value
 * Get high-value data objects (PHI/PII/PCI with Critical/High sensitivity)
 */
router.get('/high-value', authenticateJWT, (req, res) => {
  dataObjectController.getHighValueDataObjects(req, res);
});

/**
 * GET /api/data-objects/summary/classification
 * Get classification summary
 */
router.get('/summary/classification', authenticateJWT, (req, res) => {
  dataObjectController.getClassificationSummary(req, res);
});

/**
 * GET /api/data-objects/process-map
 * Get data process map for visualization
 */
router.get('/process-map', authenticateJWT, (req, res) => {
  dataObjectController.getDataProcessMap(req, res);
});

module.exports = router;
