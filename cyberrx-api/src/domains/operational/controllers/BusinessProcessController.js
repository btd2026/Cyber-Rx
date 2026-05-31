'use strict';

/**
 * Business Process Controller
 *
 * Handles HTTP request/response processing for business process operations
 * Delegates business logic to BusinessProcessService
 */

class BusinessProcessController {
  constructor(businessProcessService) {
    this.businessProcessService = businessProcessService;
  }

  /**
   * Get all business processes for organization
   * GET /api/business-processes
   */
  async getProcesses(req, res, next) {
    try {
      const organizationId = req.orgId;
      const { tier, criticality, owner } = req.query;

      const filters = {};
      if (tier) filters.tier = tier;
      if (criticality) filters.criticality = criticality;
      if (owner) filters.owner = owner;

      const processes = await this.businessProcessService.getProcesses(organizationId, filters);

      res.json({
        organizationId,
        count: processes.length,
        filters,
        data: processes
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get business process by ID
   * GET /api/business-processes/:id
   */
  async getProcessById(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.orgId;

      const process = await this.businessProcessService.getProcessById(id, organizationId);

      res.json(process);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new business process
   * POST /api/business-processes
   */
  async createProcess(req, res, next) {
    try {
      const organizationId = req.orgId;
      const processData = req.body;

      const process = await this.businessProcessService.createProcess(organizationId, processData);

      res.status(201).json(process);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update business process
   * PUT /api/business-processes/:id
   */
  async updateProcess(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.orgId;
      const processData = req.body;

      const process = await this.businessProcessService.updateProcess(id, organizationId, processData);

      res.json(process);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete business process
   * DELETE /api/business-processes/:id
   */
  async deleteProcess(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.orgId;

      const result = await this.businessProcessService.deleteProcess(id, organizationId);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get business process summary for organization
   * GET /api/business-processes/summary
   */
  async getProcessSummary(req, res, next) {
    try {
      const organizationId = req.orgId;

      const summary = await this.businessProcessService.getProcessSummary(organizationId);

      res.json({
        organizationId,
        ...summary
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Map systems to business process
   * PUT /api/business-processes/:id/systems
   */
  async mapSystems(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.orgId;
      const { systemIds } = req.body;

      if (!Array.isArray(systemIds)) {
        const error = new Error('systemIds must be an array');
        error.statusCode = 400;
        throw error;
      }

      const process = await this.businessProcessService.mapSystems(id, organizationId, systemIds);

      res.json(process);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Map data objects to business process
   * PUT /api/business-processes/:id/data-objects
   */
  async mapDataObjects(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.orgId;
      const { dataObjectIds } = req.body;

      if (!Array.isArray(dataObjectIds)) {
        const error = new Error('dataObjectIds must be an array');
        error.statusCode = 400;
        throw error;
      }

      const process = await this.businessProcessService.mapDataObjects(id, organizationId, dataObjectIds);

      res.json(process);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Map controls to business process
   * PUT /api/business-processes/:id/controls
   */
  async mapControls(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.orgId;
      const { controlIds } = req.body;

      if (!Array.isArray(controlIds)) {
        const error = new Error('controlIds must be an array');
        error.statusCode = 400;
        throw error;
      }

      const process = await this.businessProcessService.mapControls(id, organizationId, controlIds);

      res.json(process);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = BusinessProcessController;
