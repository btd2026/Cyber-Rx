'use strict';

const {
  BusinessProcessGraph,
  ProcessDependency,
  ProcessFinancialValue,
  SystemProcessMapping,
  ProcessValidationWorkflow,
  ProcessImpactAnalysis,
  ProcessCatalog
} = require('../models');

/**
 * Business Process Graph Service
 *
 * Orchestrates business process graph construction, validation, and maintenance
 * Integrates with CMDB, Financial Modeling Engine, and Blast Radius Analyzer
 */
class BusinessProcessGraphService {
  /**
   * Create a new business process graph
   * @param {Object} data - Graph data
   * @returns {Promise<Object>} Created graph
   */
  static async createGraph(data) {
    return await BusinessProcessGraph.create(data);
  }

  /**
   * Get graph by ID
   * @param {string} graphId - Graph ID
   * @returns {Promise<Object>} Graph
   */
  static async getGraph(graphId) {
    return await BusinessProcessGraph.findById(graphId);
  }

  /**
   * Get latest validated graph for organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Graph
   */
  static async getLatestGraph(organizationId) {
    return await BusinessProcessGraph.findLatestValidated(organizationId);
  }

  /**
   * Add node to graph
   * @param {string} graphId - Graph ID
   * @param {Object} node - Node data
   * @returns {Promise<Object>} Updated graph
   */
  static async addNode(graphId, node) {
    const graph = await BusinessProcessGraph.findById(graphId);
    if (!graph) {
      throw new Error('Graph not found');
    }

    const nodes = [...graph.nodes, node];
    return await BusinessProcessGraph.update(graphId, { nodes });
  }

  /**
   * Add edge to graph
   * @param {string} graphId - Graph ID
   * @param {Object} edge - Edge data
   * @returns {Promise<Object>} Updated graph
   */
  static async addEdge(graphId, edge) {
    const graph = await BusinessProcessGraph.findById(graphId);
    if (!graph) {
      throw new Error('Graph not found');
    }

    const edges = [...graph.edges, edge];
    return await BusinessProcessGraph.update(graphId, { edges });
  }

  /**
   * Map system to process
   * @param {Object} data - Mapping data
   * @returns {Promise<Object>} Created mapping
   */
  static async mapSystemToProcess(data) {
    return await SystemProcessMapping.create(data);
  }

  /**
   * Get system mappings for process
   * @param {string} organizationId - Organization ID
   * @param {string} processId - Process ID
   * @returns {Promise<Array>} Array of mappings
   */
  static async getSystemMappings(organizationId, processId) {
    return await SystemProcessMapping.findByProcess(organizationId, processId);
  }

  /**
   * Get process mappings for system
   * @param {string} organizationId - Organization ID
   * @param {string} systemId - System ID
   * @returns {Promise<Array>} Array of mappings
   */
  static async getProcessMappings(organizationId, systemId) {
    return await SystemProcessMapping.findBySystem(organizationId, systemId);
  }

  /**
   * Get coverage analysis
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Coverage analysis
   */
  static async getCoverageAnalysis(organizationId) {
    return await SystemProcessMapping.getCoverageAnalysis(organizationId);
  }

  /**
   * Add dependency between processes
   * @param {Object} data - Dependency data
   * @returns {Promise<Object>} Created dependency
   */
  static async addDependency(data) {
    return await ProcessDependency.create(data);
  }

  /**
   * Get downstream dependencies
   * @param {string} organizationId - Organization ID
   * @param {string} processId - Process ID
   * @param {number} [maxDepth=10] - Maximum traversal depth
   * @returns {Promise<Array>} Array of downstream process IDs
   */
  static async getDownstreamDependencies(organizationId, processId, maxDepth = 10) {
    return await ProcessDependency.findDownstream(organizationId, processId, maxDepth);
  }

  /**
   * Get upstream dependencies
   * @param {string} organizationId - Organization ID
   * @param {string} processId - Process ID
   * @param {number} [maxDepth=10] - Maximum traversal depth
   * @returns {Promise<Array>} Array of upstream process IDs
   */
  static async getUpstreamDependencies(organizationId, processId, maxDepth = 10) {
    return await ProcessDependency.findUpstream(organizationId, processId, maxDepth);
  }

  /**
   * Find single points of failure
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of single points of failure
   */
  static async findSinglePointsOfFailure(organizationId) {
    return await ProcessDependency.findSinglePointsOfFailure(organizationId);
  }

  /**
   * Set financial values for process
   * @param {Object} data - Financial value data
   * @returns {Promise<Object>} Created financial values
   */
  static async setFinancialValues(data) {
    return await ProcessFinancialValue.create(data);
  }

  /**
   * Get financial values for process
   * @param {string} organizationId - Organization ID
   * @param {string} processId - Process ID
   * @returns {Promise<Object>} Financial values
   */
  static async getFinancialValues(organizationId, processId) {
    return await ProcessFinancialValue.findByProcess(organizationId, processId);
  }

  /**
   * Calculate total financial exposure
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Total financial exposure
   */
  static async calculateTotalExposure(organizationId) {
    return await ProcessFinancialValue.calculateTotalExposure(organizationId);
  }

  /**
   * Validate financial values
   * @param {string} id - Financial value ID
   * @param {string} validatedBy - User who validated
   * @returns {Promise<Object>} Updated financial values
   */
  static async validateFinancialValues(id, validatedBy) {
    return await ProcessFinancialValue.validate(id, validatedBy);
  }

  /**
   * Create validation workflow
   * @param {Object} data - Workflow data
   * @returns {Promise<Object>} Created workflow
   */
  static async createValidationWorkflow(data) {
    return await ProcessValidationWorkflow.create(data);
  }

  /**
   * Approve validation workflow
   * @param {string} workflowId - Workflow ID
   * @param {string} [comments] - Approval comments
   * @returns {Promise<Object>} Updated workflow
   */
  static async approveWorkflow(workflowId, comments = null) {
    return await ProcessValidationWorkflow.approve(workflowId, comments);
  }

  /**
   * Reject validation workflow
   * @param {string} workflowId - Workflow ID
   * @param {string} [comments] - Rejection reason
   * @param {Array} [changeRequests] - Change requests
   * @returns {Promise<Object>} Updated workflow
   */
  static async rejectWorkflow(workflowId, comments = null, changeRequests = null) {
    return await ProcessValidationWorkflow.reject(workflowId, comments, changeRequests);
  }

  /**
   * Check graph validation status
   * @param {string} graphId - Graph ID
   * @returns {Promise<Object>} Validation status
   */
  static async checkValidationStatus(graphId) {
    return await ProcessValidationWorkflow.checkGraphValidationStatus(graphId);
  }

  /**
   * Create process impact analysis
   * @param {Object} data - Analysis data
   * @returns {Promise<Object>} Created analysis
   */
  static async createImpactAnalysis(data) {
    return await ProcessImpactAnalysis.create(data);
  }

  /**
   * Calculate blast radius for process
   * @param {string} organizationId - Organization ID
   * @param {string} processId - Process ID
   * @param {string} scenario - Impact scenario
   * @returns {Promise<Object>} Impact analysis
   */
  static async calculateBlastRadius(organizationId, processId, scenario) {
    // Get downstream dependencies
    const downstreamProcesses = await ProcessDependency.findDownstream(organizationId, processId, 10);

    // Get system mappings for all affected processes
    const blastRadiusSystems = [];
    for (const procId of downstreamProcesses) {
      const mappings = await SystemProcessMapping.findByProcess(organizationId, procId);
      mappings.forEach(mapping => {
        if (!blastRadiusSystems.includes(mapping.systemId)) {
          blastRadiusSystems.push(mapping.systemId);
        }
      });
    }

    // Get financial values for all affected processes
    let totalFinancialImpact = 0;
    for (const procId of downstreamProcesses) {
      const financialValues = await ProcessFinancialValue.findByProcess(organizationId, procId);
      if (financialValues) {
        totalFinancialImpact += financialValues.downtimeCostPerDay || 0;
      }
    }

    // Create impact analysis
    const analysis = await ProcessImpactAnalysis.create({
      id: require('uuid').v4(),
      organizationId,
      processId,
      scenario,
      blastRadiusProcesses: downstreamProcesses,
      blastRadiusSystems,
      financialImpact: totalFinancialImpact,
      operationalImpactScore: downstreamProcesses.length / 100, // Simplified calculation
      analysisMetadata: {
        calculatedAt: new Date().toISOString(),
        methodology: 'BFS traversal with financial aggregation'
      }
    });

    return analysis;
  }

  /**
   * Get aggregate impact
   * @param {string} organizationId - Organization ID
   * @param {string} [scenario] - Optional scenario filter
   * @returns {Promise<Object>} Aggregate impact
   */
  static async getAggregateImpact(organizationId, scenario = null) {
    return await ProcessImpactAnalysis.getAggregateImpact(organizationId, scenario);
  }

  /**
   * Add process to catalog
   * @param {Object} data - Process data
   * @returns {Promise<Object>} Created catalog entry
   */
  static async addProcessToCatalog(data) {
    return await ProcessCatalog.create(data);
  }

  /**
   * Get process catalog
   * @param {string} organizationId - Organization ID
   * @param {Object} [options] - Query options
   * @returns {Promise<Array>} Array of catalog entries
   */
  static async getProcessCatalog(organizationId, options = {}) {
    return await ProcessCatalog.findByOrganization(organizationId, options);
  }

  /**
   * Get crown jewel processes
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of crown jewel processes
   */
  static async getCrownJewels(organizationId) {
    return await ProcessCatalog.findCrownJewels(organizationId);
  }

  /**
   * Search processes
   * @param {string} organizationId - Organization ID
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Array of catalog entries
   */
  static async searchProcesses(organizationId, searchTerm) {
    return await ProcessCatalog.searchByName(organizationId, searchTerm);
  }

  /**
   * Validate graph
   * @param {string} graphId - Graph ID
   * @param {string} validatedBy - User who validated
   * @returns {Promise<Object>} Updated graph
   */
  static async validateGraph(graphId, validatedBy) {
    return await BusinessProcessGraph.validate(graphId, validatedBy);
  }

  /**
   * Lock graph for pilot
   * @param {string} graphId - Graph ID
   * @returns {Promise<Object>} Updated graph
   */
  static async lockGraph(graphId) {
    return await BusinessProcessGraph.lock(graphId);
  }

  /**
   * Get graph statistics
   * @param {string} graphId - Graph ID
   * @returns {Promise<Object>} Graph statistics
   */
  static async getGraphStatistics(graphId) {
    return await BusinessProcessGraph.getStatistics(graphId);
  }

  /**
   * Build complete business process graph for pilot customer
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Complete graph data
   */
  static async buildCompleteGraph(organizationId) {
    // Get all processes from catalog
    const catalog = await ProcessCatalog.findByOrganization(organizationId);

    // Get all dependencies
    const dependencies = await ProcessDependency.findByOrganization(organizationId);

    // Get all system mappings
    const mappings = await SystemProcessMapping.findByOrganization(organizationId);

    // Get all financial values
    const financialValues = await ProcessFinancialValue.findByOrganization(organizationId);

    // Build nodes
    const nodes = catalog.map(process => ({
      id: process.processId,
      name: process.name,
      type: 'process',
      tier: process.tier,
      category: process.category,
      criticalityScore: process.businessCriticalityScore,
      owner: process.owner,
      metadata: {
        processType: process.processType,
        description: process.description,
        criticalSystems: process.criticalSystems,
        dataObjects: process.dataObjects
      }
    }));

    // Build edges
    const edges = dependencies.map(dep => ({
      id: require('uuid').v4(),
      source: dep.sourceProcessId,
      target: dep.targetProcessId,
      type: dep.dependencyType,
      criticality: dep.criticality,
      metadata: dep.metadata
    }));

    // Create graph
    const graph = await BusinessProcessGraph.create({
      id: require('uuid').v4(),
      organizationId,
      version: '1.0',
      name: 'Business Process Graph',
      description: 'Complete business process graph for pilot customer',
      status: 'draft',
      nodes,
      edges,
      metadata: {
        totalProcesses: catalog.length,
        totalDependencies: dependencies.length,
        totalMappings: mappings.length,
        totalFinancialValue: financialValues.reduce((sum, fv) => sum + fv.annualPremiumRevenue, 0),
        buildDate: new Date().toISOString()
      }
    });

    return {
      graph,
      catalog,
      dependencies,
      mappings,
      financialValues
    };
  }

  /**
   * Export graph visualization
   * @param {string} graphId - Graph ID
   * @param {string} exportType - Export type
   * @param {string} organizationId - Organization ID
   * @param {string} exportedBy - User who exported
   * @returns {Promise<Object>} Export data
   */
  static async exportVisualization(graphId, exportType, organizationId, exportedBy) {
    const graph = await BusinessProcessGraph.findById(graphId);
    if (!graph) {
      throw new Error('Graph not found');
    }

    // This is a placeholder for visualization generation
    // In production, this would integrate with a visualization library
    // to generate PDF, PNG, or SVG exports

    const exportData = {
      id: require('uuid').v4(),
      organizationId,
      graphId,
      exportType,
      exportFormat: exportType === 'json' ? 'application/json' : `application/${exportType}`,
      visualizationConfig: {
        layout: 'hierarchical',
        nodeSize: 'medium',
        edgeType: 'curved',
        labels: true,
        legend: true
      },
      exportedBy,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };

    return exportData;
  }
}

module.exports = BusinessProcessGraphService;
