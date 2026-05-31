'use strict';

/**
 * Data Object Controller
 *
 * Handles HTTP requests for data classification
 */

class DataObjectController {
  constructor(dataObjectService) {
    this.service = dataObjectService;
  }

  /**
   * GET /api/data-objects
   * Get all data objects with optional filters
   */
  async getDataObjects(req, res) {
    try {
      const { type, sensitivity, businessProcessId } = req.query;
      const filters = {};

      if (type) filters.type = type;
      if (sensitivity) filters.sensitivity = sensitivity;
      if (businessProcessId) filters.businessProcessId = businessProcessId;

      const dataObjects = await this.service.getDataObjects(req.orgId, filters);

      res.json({
        success: true,
        data: dataObjects,
        count: dataObjects.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/data-objects/:id
   * Get single data object by ID
   */
  async getDataObjectById(req, res) {
    try {
      const { id } = req.params;
      const dataObject = await this.service.getDataObjectById(id, req.orgId);

      if (!dataObject) {
        return res.status(404).json({
          success: false,
          error: 'Data object not found'
        });
      }

      res.json({
        success: true,
        data: dataObject
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/data-objects
   * Create new data object
   */
  async createDataObject(req, res) {
    try {
      const dataObject = await this.service.createDataObject(req.orgId, req.body);

      res.status(201).json({
        success: true,
        data: dataObject
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * PUT /api/data-objects/:id
   * Update data object
   */
  async updateDataObject(req, res) {
    try {
      const { id } = req.params;
      const dataObject = await this.service.updateDataObject(id, req.orgId, req.body);

      res.json({
        success: true,
        data: dataObject
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/data-objects/:id
   * Delete data object
   */
  async deleteDataObject(req, res) {
    try {
      const { id } = req.params;
      const result = await this.service.deleteDataObject(id, req.orgId);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/data-objects/asset/:assetId
   * Get data objects by asset/system
   */
  async getDataObjectsByAsset(req, res) {
    try {
      const { assetId } = req.params;
      const dataObjects = await this.service.getDataObjectsByAsset(assetId, req.orgId);

      res.json({
        success: true,
        data: dataObjects,
        count: dataObjects.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/data-objects/application/:applicationId
   * Get data objects by application
   */
  async getDataObjectsByApplication(req, res) {
    try {
      const { applicationId } = req.params;
      const dataObjects = await this.service.getDataObjectsByApplication(applicationId, req.orgId);

      res.json({
        success: true,
        data: dataObjects,
        count: dataObjects.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/data-objects/control/:controlId
   * Get data objects by control
   */
  async getDataObjectsByControl(req, res) {
    try {
      const { controlId } = req.params;
      const dataObjects = await this.service.getDataObjectsByControl(controlId, req.orgId);

      res.json({
        success: true,
        data: dataObjects,
        count: dataObjects.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/data-objects/high-value
   * Get high-value data objects
   */
  async getHighValueDataObjects(req, res) {
    try {
      const dataObjects = await this.service.getHighValueDataObjects(req.orgId);

      res.json({
        success: true,
        data: dataObjects,
        count: dataObjects.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/data-objects/summary/classification
   * Get classification summary
   */
  async getClassificationSummary(req, res) {
    try {
      const summary = await this.service.getClassificationSummary(req.orgId);

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/data-objects/process-map
   * Get data process map for visualization
   */
  async getDataProcessMap(req, res) {
    try {
      const processMap = await this.service.getDataProcessMap(req.orgId);

      res.json({
        success: true,
        data: processMap
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = DataObjectController;
