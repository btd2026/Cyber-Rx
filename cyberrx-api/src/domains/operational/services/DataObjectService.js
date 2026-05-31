'use strict';

const BaseService = require('../../BaseService');

/**
 * Data Object Service
 *
 * Handles data classification and management:
 * - PHI, PII, PCI, Financial, Legal, Confidential data types
 * - Data classification workflow (classify → classify → approve)
 * - Process mapping (data → systems → processes)
 * - Control mapping and validation
 */
class DataObjectService extends BaseService {
  constructor(models, logger) {
    super(models, logger);
    this.dataObjectModel = models.DataObject;
    this.assetModel = models.Asset;
    this.businessProcessModel = models.BusinessProcess;
    this.controlModel = models.Control;
  }

  /**
   * Get data objects with filters
   * @param {string} orgId - Organization ID
   * @param {Object} filters - Query filters
   * @param {string} [filters.type] - Filter by data type (PHI/PII/PCI/etc)
   * @param {string} [filters.sensitivity] - Filter by sensitivity
   * @param {string} [filters.businessProcessId] - Filter by business process
   * @returns {Promise<Array>} Array of data objects
   */
  async getDataObjects(orgId, filters = {}) {
    this.logInfo('Fetching data objects', { orgId, filters });

    try {
      const dataObjects = await this.dataObjectModel.findByOrganization(orgId, filters);
      return this.enrichDataObjects(dataObjects);
    } catch (error) {
      this.handleError(error, 'fetching data objects');
    }
  }

  /**
   * Get single data object by ID
   * @param {string} id - Data object ID
   * @param {string} orgId - Organization ID
   * @returns {Promise<Object>} Data object with relationships
   */
  async getDataObjectById(id, orgId) {
    this.logInfo('Fetching data object', { id });

    try {
      const dataObject = await this.dataObjectModel.findById(id);
      this.verifyOrgAccess(dataObject, orgId, 'Data object');

      return this.enrichDataObject(dataObject);
    } catch (error) {
      this.handleError(error, 'fetching data object');
    }
  }

  /**
   * Create data object
   * @param {string} orgId - Organization ID
   * @param {Object} data - Data object data
   * @returns {Promise<Object>} Created data object
   */
  async createDataObject(orgId, data) {
    this.logInfo('Creating data object', { orgId, name: data.name });

    try {
      // Validate required fields
      const name = this.validateRequiredString(data.name, 'Data object name');
      const type = this.validateEnum(
        data.type,
        ['PHI', 'PII', 'PCI', 'Financial', 'Legal', 'Confidential'],
        'Data type'
      );
      const sensitivity = this.validateEnum(
        data.sensitivity,
        ['Critical', 'High', 'Medium', 'Low'],
        'Sensitivity'
      );

      // Validate related entities exist
      await this.validateRelatedEntities(data);

      // Generate ID
      const id = this.generateDataObjectId();

      // Create data object
      const dataObject = await this.dataObjectModel.create({
        id,
        name: this.sanitize(name),
        type,
        sensitivity,
        organizationId: orgId,
        recordCount: data.recordCount,
        description: data.description,
        residesInSystems: data.residesInSystems || [],
        accessedByApps: data.accessedByApps || [],
        protectedByControls: data.protectedByControls || [],
        retentionPeriod: data.retentionPeriod,
        dataOwner: data.dataOwner
      });

      this.logInfo('Data object created successfully', { id });
      return this.enrichDataObject(dataObject);
    } catch (error) {
      this.handleError(error, 'creating data object');
    }
  }

  /**
   * Update data object
   * @param {string} id - Data object ID
   * @param {string} orgId - Organization ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated data object
   */
  async updateDataObject(id, orgId, data) {
    this.logInfo('Updating data object', { id });

    try {
      // Verify access
      const existing = await this.dataObjectModel.findById(id);
      this.verifyOrgAccess(existing, orgId, 'Data object');

      // Validate related entities if provided
      await this.validateRelatedEntities(data);

      // Update data object
      const updated = await this.dataObjectModel.update(id, data);
      this.logInfo('Data object updated successfully', { id });
      return this.enrichDataObject(updated);
    } catch (error) {
      this.handleError(error, 'updating data object');
    }
  }

  /**
   * Delete data object
   * @param {string} id - Data object ID
   * @param {string} orgId - Organization ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteDataObject(id, orgId) {
    this.logInfo('Deleting data object', { id });

    try {
      // Verify access
      const existing = await this.dataObjectModel.findById(id);
      this.verifyOrgAccess(existing, orgId, 'Data object');

      // Delete
      await this.dataObjectModel.delete(id);
      this.logInfo('Data object deleted successfully', { id });
      return { message: 'Data object deleted successfully', id };
    } catch (error) {
      this.handleError(error, 'deleting data object');
    }
  }

  /**
   * Get data objects by asset/system ID
   * @param {string} assetId - Asset/system ID
   * @param {string} orgId - Organization ID
   * @returns {Promise<Array>} Array of data objects
   */
  async getDataObjectsByAsset(assetId, orgId) {
    this.logInfo('Fetching data objects by asset', { assetId });

    try {
      const dataObjects = await this.dataObjectModel.findByAssetId(assetId);

      // Filter by organization
      const orgDataObjects = dataObjects.filter(obj => obj.organizationId === orgId);
      return this.enrichDataObjects(orgDataObjects);
    } catch (error) {
      this.handleError(error, 'fetching data objects by asset');
    }
  }

  /**
   * Get data objects by application ID
   * @param {string} applicationId - Application ID
   * @param {string} orgId - Organization ID
   * @returns {Promise<Array>} Array of data objects
   */
  async getDataObjectsByApplication(applicationId, orgId) {
    this.logInfo('Fetching data objects by application', { applicationId });

    try {
      const dataObjects = await this.dataObjectModel.findByApplicationId(applicationId);

      // Filter by organization
      const orgDataObjects = dataObjects.filter(obj => obj.organizationId === orgId);
      return this.enrichDataObjects(orgDataObjects);
    } catch (error) {
      this.handleError(error, 'fetching data objects by application');
    }
  }

  /**
   * Get data objects by control ID
   * @param {string} controlId - Control ID
   * @param {string} orgId - Organization ID
   * @returns {Promise<Array>} Array of data objects
   */
  async getDataObjectsByControl(controlId, orgId) {
    this.logInfo('Fetching data objects by control', { controlId });

    try {
      const dataObjects = await this.dataObjectModel.findByControlId(controlId);

      // Filter by organization
      const orgDataObjects = dataObjects.filter(obj => obj.organizationId === orgId);
      return this.enrichDataObjects(orgDataObjects);
    } catch (error) {
      this.handleError(error, 'fetching data objects by control');
    }
  }

  /**
   * Get high-value data objects (PHI/PII with Critical/High sensitivity)
   * @param {string} orgId - Organization ID
   * @returns {Promise<Array>} Array of high-value data objects
   */
  async getHighValueDataObjects(orgId) {
    this.logInfo('Fetching high-value data objects', { orgId });

    try {
      const dataObjects = await this.dataObjectModel.getHighValueDataObjects(orgId);
      return this.enrichDataObjects(dataObjects);
    } catch (error) {
      this.handleError(error, 'fetching high-value data objects');
    }
  }

  /**
   * Get data classification summary
   * @param {string} orgId - Organization ID
   * @returns {Promise<Object>} Classification summary
   */
  async getClassificationSummary(orgId) {
    this.logInfo('Fetching classification summary', { orgId });

    try {
      const dataObjects = await this.dataObjectModel.findByOrganization(orgId);

      // Calculate summary metrics
      const summary = {
        total: dataObjects.length,
        byType: {},
        bySensitivity: {},
        highValueCount: 0,
        totalRecords: 0,
        controlCoverage: 0
      };

      dataObjects.forEach(obj => {
        // Count by type
        summary.byType[obj.type] = (summary.byType[obj.type] || 0) + 1;

        // Count by sensitivity
        summary.bySensitivity[obj.sensitivity] = (summary.bySensitivity[obj.sensitivity] || 0) + 1;

        // Count high-value (PHI/PII/PCI with Critical/High)
        if (['PHI', 'PII', 'PCI'].includes(obj.type) && ['Critical', 'High'].includes(obj.sensitivity)) {
          summary.highValueCount++;
        }

        // Sum record counts
        summary.totalRecords += obj.recordCount || 0;

        // Control coverage
        if (obj.protectedByControls && obj.protectedByControls.length > 0) {
          summary.controlCoverage++;
        }
      });

      // Calculate control coverage percentage
      summary.controlCoverage = summary.total > 0
        ? Math.round((summary.controlCoverage / summary.total) * 100)
        : 0;

      return summary;
    } catch (error) {
      this.handleError(error, 'fetching classification summary');
    }
  }

  /**
   * Get data process map for visualization
   * @param {string} orgId - Organization ID
   * @returns {Promise<Object>} Process map graph data
   */
  async getDataProcessMap(orgId) {
    this.logInfo('Generating data process map', { orgId });

    try {
      const dataObjects = await this.dataObjectModel.findByOrganization(orgId);
      const assets = await this.assetModel.findByOrganization(orgId);
      const processes = await this.businessProcessModel.findByOrganization(orgId);

      // Build graph nodes and edges
      const nodes = [];
      const edges = [];

      // Data object nodes
      dataObjects.forEach(obj => {
        nodes.push({
          id: obj.id,
          label: obj.name,
          type: 'dataObject',
          category: obj.type,
          sensitivity: obj.sensitivity,
          metadata: {
            type: obj.type,
            recordCount: obj.recordCount,
            sensitivity: obj.sensitivity
          }
        });

        // Edges to systems
        (obj.residesInSystems || []).forEach(systemId => {
          edges.push({
            source: obj.id,
            target: systemId,
            label: 'resides in',
            type: 'system'
          });
        });

        // Edges to applications
        (obj.accessedByApps || []).forEach(appId => {
          edges.push({
            source: appId,
            target: obj.id,
            label: 'accesses',
            type: 'application'
          });
        });

        // Edges to controls
        (obj.protectedByControls || []).forEach(controlId => {
          edges.push({
            source: controlId,
            target: obj.id,
            label: 'protects',
            type: 'control'
          });
        });
      });

      // Asset/system nodes
      assets.forEach(asset => {
        nodes.push({
          id: asset.id,
          label: asset.name,
          type: 'asset',
          category: asset.type,
          metadata: {
            type: asset.type,
            criticality: asset.criticality
          }
        });
      });

      // Process nodes
      processes.forEach(process => {
        nodes.push({
          id: process.id,
          label: process.name,
          type: 'process',
          category: process.tier,
          metadata: {
            tier: process.tier,
            criticality: process.criticality,
            owner: process.owner
          }
        });

        // Edges to data objects
        (process.createsDataObjects || []).forEach(dataId => {
          edges.push({
            source: process.id,
            target: dataId,
            label: 'creates',
            type: 'process'
          });
        });
      });

      return {
        organizationId: orgId,
        nodes,
        edges,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      this.handleError(error, 'generating data process map');
    }
  }

  /**
   * Validate related entities exist
   * @private
   */
  async validateRelatedEntities(data) {
    // Validate systems exist
    if (data.residesInSystems && data.residesInSystems.length > 0) {
      for (const systemId of data.residesInSystems) {
        const system = await this.assetModel.findById(systemId);
        if (!system) {
          throw new Error(`System ${systemId} not found`);
        }
      }
    }

    // Validate applications exist
    if (data.accessedByApps && data.accessedByApps.length > 0) {
      for (const appId of data.accessedByApps) {
        const app = await this.assetModel.findById(appId);
        if (!app) {
          throw new Error(`Application ${appId} not found`);
        }
      }
    }

    // Validate controls exist
    if (data.protectedByControls && data.protectedByControls.length > 0) {
      for (const controlId of data.protectedByControls) {
        const control = await this.controlModel.findById(controlId);
        if (!control) {
          throw new Error(`Control ${controlId} not found`);
        }
      }
    }
  }

  /**
   * Enrich data object with related data
   * @private
   */
  async enrichDataObject(dataObject) {
    if (!dataObject) return null;

    const enriched = { ...dataObject };

    // Add system details
    if (dataObject.residesInSystems && dataObject.residesInSystems.length > 0) {
      enriched.systems = [];
      for (const systemId of dataObject.residesInSystems) {
        const system = await this.assetModel.findById(systemId);
        if (system) {
          enriched.systems.push(system);
        }
      }
    }

    // Add application details
    if (dataObject.accessedByApps && dataObject.accessedByApps.length > 0) {
      enriched.applications = [];
      for (const appId of dataObject.accessedByApps) {
        const app = await this.assetModel.findById(appId);
        if (app) {
          enriched.applications.push(app);
        }
      }
    }

    // Add control details
    if (dataObject.protectedByControls && dataObject.protectedByControls.length > 0) {
      enriched.controls = [];
      for (const controlId of dataObject.protectedByControls) {
        const control = await this.controlModel.findById(controlId);
        if (control) {
          enriched.controls.push(control);
        }
      }
    }

    // Add risk score
    enriched.riskScore = this.calculateDataRiskScore(dataObject);

    return enriched;
  }

  /**
   * Enrich multiple data objects
   * @private
   */
  async enrichDataObjects(dataObjects) {
    return Promise.all(
      dataObjects.map(obj => this.enrichDataObject(obj))
    );
  }

  /**
   * Calculate data risk score based on type, sensitivity, and controls
   * @private
   */
  calculateDataRiskScore(dataObject) {
    let score = 50; // Base score

    // Type multiplier
    const typeMultiplier = {
      'PHI': 2.0,
      'PII': 1.8,
      'PCI': 1.7,
      'Financial': 1.5,
      'Legal': 1.3,
      'Confidential': 1.0
    };
    score *= (typeMultiplier[dataObject.type] || 1.0);

    // Sensitivity multiplier
    const sensitivityMultiplier = {
      'Critical': 1.5,
      'High': 1.3,
      'Medium': 1.0,
      'Low': 0.7
    };
    score *= (sensitivityMultiplier[dataObject.sensitivity] || 1.0);

    // Control coverage reduces risk
    const controlCount = (dataObject.protectedByControls || []).length;
    const controlReduction = Math.min(0.5, controlCount * 0.1);
    score *= (1 - controlReduction);

    return Math.min(100, Math.round(score));
  }

  /**
   * Generate data object ID
   * @private
   */
  generateDataObjectId() {
    return `do_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = DataObjectService;
