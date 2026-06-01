'use strict';

const BaseService = require('../../BaseService');

/**
 * Business Process Service
 *
 * Handles all business process management operations:
 * - CRUD operations for business processes
 * - Process-to-system mapping
 * - Process-to-data mapping
 * - Process-to-control mapping
 * - Process enrichment with operational metrics
 */
class BusinessProcessService extends BaseService {
  constructor(models, logger) {
    super(models, logger);
    this.businessProcessModel = models.BusinessProcess;
  }

  /**
   * Get business processes with filters
   * @param {string} orgId - Organization ID
   * @param {Object} filters - Query filters
   * @param {string} filters.tier - Filter by tier (Primary/Strategic)
   * @param {string} filters.criticality - Filter by criticality (Critical/High/Medium/Low)
   * @param {string} filters.owner - Filter by owner role
   * @returns {Promise<Array>} Enriched business processes
   */
  async getProcesses(orgId, filters = {}) {
    this.logInfo('Fetching business processes', { orgId, filters });

    try {
      const processes = await this.businessProcessModel.findByOrganization(orgId, filters);

      // Apply additional filters that aren't in the model
      let filtered = processes;
      if (filters.criticality) {
        filtered = filtered.filter(p => p.criticality === filters.criticality);
      }
      if (filters.owner) {
        filtered = filtered.filter(p => p.owner === filters.owner);
      }

      // Enrich with operational metrics
      return this.enrichProcesses(filtered);
    } catch (error) {
      this.handleError(error, 'fetching business processes');
    }
  }

  /**
   * Get business process by ID
   * @param {string} id - Business process ID
   * @param {string} orgId - Organization ID
   * @returns {Promise<Object>} Enriched business process
   */
  async getProcessById(id, orgId) {
    this.logInfo('Fetching business process by ID', { id, orgId });

    try {
      const process = await this.businessProcessModel.findById(id);

      if (!process) {
        const error = new Error('Business process not found');
        error.statusCode = 404;
        throw error;
      }

      // Verify organization access
      this.verifyOrgAccess(process, orgId, 'Business process');

      // Enrich with operational metrics
      const enriched = this.enrichProcesses([process]);
      return enriched[0];
    } catch (error) {
      this.handleError(error, 'fetching business process');
    }
  }

  /**
   * Create business process
   * @param {string} orgId - Organization ID
   * @param {Object} data - Process data
   * @returns {Promise<Object>} Created business process
   */
  async createProcess(orgId, data) {
    this.logInfo('Creating business process', { orgId, name: data.name });

    try {
      // Validate required fields
      const name = this.validateRequiredString(data.name, 'Business process name');
      const tier = this.validateEnum(data.tier, ['Primary', 'Strategic'], 'Tier');
      const criticality = this.validateEnum(
        data.criticality,
        ['Critical', 'High', 'Medium', 'Low'],
        'Criticality'
      );
      const owner = this.validateRequiredString(data.owner, 'Owner');

      // Validate owner role
      const validOwners = ['CIO', 'CISO', 'CFO', 'CRO', 'CTO', 'CSO', 'COO', 'CEO', 'CLO', 'CMO'];
      this.validateEnum(owner, validOwners, 'Owner role');

      // Generate ID
      const id = this.generateProcessId();

      // Create business process
      const process = await this.businessProcessModel.create({
        id,
        name: this.sanitize(name),
        tier,
        criticality,
        owner: this.sanitize(owner),
        organizationId: orgId,
        description: data.description || null,
        supportedBySystems: data.supportedBySystems || [],
        createsDataObjects: data.createsDataObjects || [],
        governedByControls: data.governedByControls || []
      });

      this.logInfo('Business process created successfully', { id });

      // Enrich with operational metrics
      const enriched = this.enrichProcesses([process]);
      return enriched[0];
    } catch (error) {
      this.handleError(error, 'creating business process');
    }
  }

  /**
   * Update business process
   * @param {string} id - Business process ID
   * @param {string} orgId - Organization ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated business process
   */
  async updateProcess(id, orgId, data) {
    this.logInfo('Updating business process', { id });

    try {
      // Verify access
      const existing = await this.businessProcessModel.findById(id);
      this.verifyOrgAccess(existing, orgId, 'Business process');

      // Validate enum fields if provided
      const updateData = { ...data };

      if (data.tier !== undefined) {
        updateData.tier = this.validateEnum(data.tier, ['Primary', 'Strategic'], 'Tier');
      }

      if (data.criticality !== undefined) {
        updateData.criticality = this.validateEnum(
          data.criticality,
          ['Critical', 'High', 'Medium', 'Low'],
          'Criticality'
        );
      }

      if (data.owner !== undefined) {
        const validOwners = ['CIO', 'CISO', 'CFO', 'CRO', 'CTO', 'CSO', 'COO', 'CEO', 'CLO', 'CMO'];
        updateData.owner = this.validateEnum(data.owner, validOwners, 'Owner role');
      }

      if (data.name !== undefined) {
        updateData.name = this.validateRequiredString(data.name, 'Business process name');
      }

      // Sanitize string fields
      if (updateData.name) {
        updateData.name = this.sanitize(updateData.name);
      }
      if (updateData.description) {
        updateData.description = this.sanitize(updateData.description);
      }

      // Update process
      const updated = await this.businessProcessModel.update(id, updateData);

      this.logInfo('Business process updated successfully', { id });

      // Enrich with operational metrics
      const enriched = this.enrichProcesses([updated]);
      return enriched[0];
    } catch (error) {
      this.handleError(error, 'updating business process');
    }
  }

  /**
   * Delete business process
   * @param {string} id - Business process ID
   * @param {string} orgId - Organization ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteProcess(id, orgId) {
    this.logInfo('Deleting business process', { id });

    try {
      // Verify access
      const existing = await this.businessProcessModel.findById(id);
      this.verifyOrgAccess(existing, orgId, 'Business process');

      // Delete
      await this.businessProcessModel.delete(id);

      this.logInfo('Business process deleted successfully', { id });
      return { message: 'Business process deleted successfully', id };
    } catch (error) {
      this.handleError(error, 'deleting business process');
    }
  }

  /**
   * Get business process summary for organization
   * @param {string} orgId - Organization ID
   * @returns {Promise<Object>} Process summary statistics
   */
  async getProcessSummary(orgId) {
    this.logInfo('Fetching business process summary', { orgId });

    try {
      const processes = await this.businessProcessModel.findByOrganization(orgId);

      const summary = {
        total: processes.length,
        byTier: {
          Primary: processes.filter(p => p.tier === 'Primary').length,
          Strategic: processes.filter(p => p.tier === 'Strategic').length
        },
        byCriticality: {
          Critical: processes.filter(p => p.criticality === 'Critical').length,
          High: processes.filter(p => p.criticality === 'High').length,
          Medium: processes.filter(p => p.criticality === 'Medium').length,
          Low: processes.filter(p => p.criticality === 'Low').length
        },
        byOwner: {},
        averageControlCoverage: 0,
        averageRiskCount: 0,
        processesNeedingAttention: 0
      };

      // Calculate owner distribution
      processes.forEach(p => {
        summary.byOwner[p.owner] = (summary.byOwner[p.owner] || 0) + 1;
      });

      // Calculate averages
      if (processes.length > 0) {
        const totalControls = processes.reduce((sum, p) => {
          return sum + (p.governedByControls?.length || 0);
        }, 0);
        summary.averageControlCoverage = totalControls / processes.length;

        const totalRisks = processes.reduce((sum, p) => {
          return sum + this.calculateRiskCount(p);
        }, 0);
        summary.averageRiskCount = totalRisks / processes.length;

        // Count processes needing attention (High risk + Low control coverage)
        summary.processesNeedingAttention = processes.filter(p => {
          const controlCount = p.governedByControls?.length || 0;
          return this.calculateRiskCount(p) > 5 || controlCount < 3;
        }).length;
      }

      return summary;
    } catch (error) {
      this.handleError(error, 'fetching process summary');
    }
  }

  /**
   * Map systems to business process
   * @param {string} id - Business process ID
   * @param {string} orgId - Organization ID
   * @param {Array<string>} systemIds - System IDs to map
   * @returns {Promise<Object>} Updated business process
   */
  async mapSystems(id, orgId, systemIds) {
    this.logInfo('Mapping systems to business process', { id, systemCount: systemIds.length });

    try {
      // Verify access
      const existing = await this.businessProcessModel.findById(id);
      this.verifyOrgAccess(existing, orgId, 'Business process');

      // Update with system IDs
      const updated = await this.businessProcessModel.update(id, {
        supportedBySystems: systemIds
      });

      this.logInfo('Systems mapped successfully', { id });

      // Enrich with operational metrics
      const enriched = this.enrichProcesses([updated]);
      return enriched[0];
    } catch (error) {
      this.handleError(error, 'mapping systems');
    }
  }

  /**
   * Map data objects to business process
   * @param {string} id - Business process ID
   * @param {string} orgId - Organization ID
   * @param {Array<string>} dataObjectIds - Data object IDs to map
   * @returns {Promise<Object>} Updated business process
   */
  async mapDataObjects(id, orgId, dataObjectIds) {
    this.logInfo('Mapping data objects to business process', { id, objectCount: dataObjectIds.length });

    try {
      // Verify access
      const existing = await this.businessProcessModel.findById(id);
      this.verifyOrgAccess(existing, orgId, 'Business process');

      // Update with data object IDs
      const updated = await this.businessProcessModel.update(id, {
        createsDataObjects: dataObjectIds
      });

      this.logInfo('Data objects mapped successfully', { id });

      // Enrich with operational metrics
      const enriched = this.enrichProcesses([updated]);
      return enriched[0];
    } catch (error) {
      this.handleError(error, 'mapping data objects');
    }
  }

  /**
   * Map controls to business process
   * @param {string} id - Business process ID
   * @param {string} orgId - Organization ID
   * @param {Array<string>} controlIds - Control IDs to map
   * @returns {Promise<Object>} Updated business process
   */
  async mapControls(id, orgId, controlIds) {
    this.logInfo('Mapping controls to business process', { id, controlCount: controlIds.length });

    try {
      // Verify access
      const existing = await this.businessProcessModel.findById(id);
      this.verifyOrgAccess(existing, orgId, 'Business process');

      // Update with control IDs
      const updated = await this.businessProcessModel.update(id, {
        governedByControls: controlIds
      });

      this.logInfo('Controls mapped successfully', { id });

      // Enrich with operational metrics
      const enriched = this.enrichProcesses([updated]);
      return enriched[0];
    } catch (error) {
      this.handleError(error, 'mapping controls');
    }
  }

  /**
   * Enrich processes with operational metrics
   * @private
   * @param {Array} processes - Business processes
   * @returns {Array} Enriched processes
   */
  enrichProcesses(processes) {
    return processes.map(process => ({
      ...process,
      riskCount: this.calculateRiskCount(process),
      assetCount: this.calculateAssetCount(process),
      controlGap: this.calculateControlGap(process),
      controlCoverage: this.calculateControlCoverage(process),
      healthScore: this.calculateHealthScore(process),
      dataClassification: this.getDataClassification(process)
    }));
  }

  /**
   * Calculate risk count for process
   * @private
   * @param {Object} process - Business process
   * @returns {number} Risk count
   */
  calculateRiskCount(process) {
    // Business logic - would integrate with risk model
    // For now, return 0 as placeholder
    // TODO: Integrate with actual risk model to count risks by process
    return 0;
  }

  /**
   * Calculate asset count for process
   * @private
   * @param {Object} process - Business process
   * @returns {number} Asset count
   */
  calculateAssetCount(process) {
    return (process.supportedBySystems || []).length;
  }

  /**
   * Calculate control gap for process
   * @private
   * @param {Object} process - Business process
   * @returns {number} Control gap
   */
  calculateControlGap(process) {
    // Business logic for control gap analysis
    // Required controls based on criticality
    const requiredControls = {
      'Critical': 10,
      'High': 8,
      'Medium': 5,
      'Low': 3
    };

    const required = requiredControls[process.criticality] || 5;
    const implemented = (process.governedByControls || []).length;
    return Math.max(0, required - implemented);
  }

  /**
   * Calculate control coverage percentage
   * @private
   * @param {Object} process - Business process
   * @returns {number} Coverage percentage (0-100)
   */
  calculateControlCoverage(process) {
    const gap = this.calculateControlGap(process);
    const requiredControls = {
      'Critical': 10,
      'High': 8,
      'Medium': 5,
      'Low': 3
    };
    const required = requiredControls[process.criticality] || 5;

    if (required === 0) return 100;
    const implemented = required - gap;
    return Math.round((implemented / required) * 100);
  }

  /**
   * Calculate overall health score for process
   * @private
   * @param {Object} process - Business process
   * @returns {number} Health score (0-100)
   */
  calculateHealthScore(process) {
    const controlCoverage = this.calculateControlCoverage(process);
    const riskCount = this.calculateRiskCount(process);

    // Health score formula: control coverage - risk impact
    let score = controlCoverage;

    // Reduce score based on risk count
    if (riskCount > 10) score -= 30;
    else if (riskCount > 5) score -= 15;
    else if (riskCount > 0) score -= 5;

    // Criticality modifier
    if (process.criticality === 'Critical' && score < 80) {
      score = Math.max(score, 60); // Critical processes need at least 60
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get data classification summary for process
   * @private
   * @param {Object} process - Business process
   * @returns {Object} Data classification summary
   */
  getDataClassification(process) {
    // TODO: Integrate with DataObject model to get actual classifications
    // For now, return placeholder
    return {
      PHI: 0,
      PII: 0,
      PCI: 0,
      Financial: 0,
      Confidential: 0
    };
  }

  /**
   * Generate business process ID
   * @private
   * @returns {string} Process ID
   */
  generateProcessId() {
    return `bp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = BusinessProcessService;
