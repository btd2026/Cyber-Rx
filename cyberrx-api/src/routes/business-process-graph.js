'use strict';

const express = require('express');
const router = express.Router();
const BusinessProcessGraphService = require('../services/BusinessProcessGraphService');
const { authenticate } = require('../middleware/auth');

/**
 * Business Process Graph Routes
 *
 * API endpoints for business process graph management
 * Integrates with T-PILOT-002 implementation
 */

// Middleware
router.use(authenticate);

/**
 * GET /api/business-process-graph
 * Get latest validated graph for organization
 */
router.get('/', async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const graph = await BusinessProcessGraphService.getLatestGraph(organizationId);

    if (!graph) {
      return res.status(404).json({
        error: 'Graph not found',
        message: 'No validated graph found for this organization'
      });
    }

    res.json(graph);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business-process-graph/:graphId
 * Get graph by ID
 */
router.get('/:graphId', async (req, res, next) => {
  try {
    const { graphId } = req.params;
    const graph = await BusinessProcessGraphService.getGraph(graphId);

    if (!graph) {
      return res.status(404).json({
        error: 'Graph not found',
        message: `Graph with ID ${graphId} not found`
      });
    }

    res.json(graph);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/business-process-graph
 * Create new business process graph
 */
router.post('/', async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const graphData = {
      ...req.body,
      organizationId,
      id: req.body.id || require('uuid').v4()
    };

    const graph = await BusinessProcessGraphService.createGraph(graphData);

    res.status(201).json(graph);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/business-process-graph/:graphId
 * Update graph
 */
router.put('/:graphId', async (req, res, next) => {
  try {
    const { graphId } = req.params;
    const graph = await BusinessProcessGraphService.getGraph(graphId);

    if (!graph) {
      return res.status(404).json({
        error: 'Graph not found',
        message: `Graph with ID ${graphId} not found`
      });
    }

    const updatedGraph = await BusinessProcessGraphService.addNode(graphId, req.body);

    res.json(updatedGraph);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/business-process-graph/:graphId/nodes
 * Add node to graph
 */
router.post('/:graphId/nodes', async (req, res, next) => {
  try {
    const { graphId } = req.params;
    const graph = await BusinessProcessGraphService.addNode(graphId, req.body);

    res.json(graph);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/business-process-graph/:graphId/edges
 * Add edge to graph
 */
router.post('/:graphId/edges', async (req, res, next) => {
  try {
    const { graphId } = req.params;
    const graph = await BusinessProcessGraphService.addEdge(graphId, req.body);

    res.json(graph);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business-process-graph/:graphId/statistics
 * Get graph statistics
 */
router.get('/:graphId/statistics', async (req, res, next) => {
  try {
    const { graphId } = req.params;
    const statistics = await BusinessProcessGraphService.getGraphStatistics(graphId);

    res.json(statistics);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/business-process-graph/:graphId/validate
 * Validate graph
 */
router.post('/:graphId/validate', async (req, res, next) => {
  try {
    const { graphId } = req.params;
    const { userId } = req.user;
    const graph = await BusinessProcessGraphService.validateGraph(graphId, userId);

    res.json(graph);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/business-process-graph/:graphId/lock
 * Lock graph for pilot
 */
router.post('/:graphId/lock', async (req, res, next) => {
  try {
    const { graphId } = req.params;
    const graph = await BusinessProcessGraphService.lockGraph(graphId);

    if (!graph) {
      return res.status(400).json({
        error: 'Cannot lock graph',
        message: 'Graph must be validated before locking'
      });
    }

    res.json(graph);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business-process-graph/:graphId/export/:exportType
 * Export graph visualization
 */
router.get('/:graphId/export/:exportType', async (req, res, next) => {
  try {
    const { graphId, exportType } = req.params;
    const { organizationId, userId } = req.user;

    if (!['pdf', 'png', 'svg', 'json'].includes(exportType)) {
      return res.status(400).json({
        error: 'Invalid export type',
        message: 'Export type must be one of: pdf, png, svg, json'
      });
    }

    const exportData = await BusinessProcessGraphService.exportVisualization(
      graphId,
      exportType,
      organizationId,
      userId
    );

    res.json(exportData);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/business-process-graph/system-mappings
 * Map system to process
 */
router.post('/system-mappings', async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const mappingData = {
      ...req.body,
      organizationId,
      id: req.body.id || require('uuid').v4()
    };

    const mapping = await BusinessProcessGraphService.mapSystemToProcess(mappingData);

    res.status(201).json(mapping);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business-process-graph/system-mappings/:processId
 * Get system mappings for process
 */
router.get('/system-mappings/process/:processId', async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const { processId } = req.params;
    const mappings = await BusinessProcessGraphService.getSystemMappings(organizationId, processId);

    res.json(mappings);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business-process-graph/system-mappings/system/:systemId
 * Get process mappings for system
 */
router.get('/system-mappings/system/:systemId', async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const { systemId } = req.params;
    const mappings = await BusinessProcessGraphService.getProcessMappings(organizationId, systemId);

    res.json(mappings);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business-process-graph/coverage-analysis
 * Get coverage analysis
 */
router.get('/coverage-analysis', async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const coverage = await BusinessProcessGraphService.getCoverageAnalysis(organizationId);

    res.json(coverage);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/business-process-graph/dependencies
 * Add dependency between processes
 */
router.post('/dependencies', async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const dependencyData = {
      ...req.body,
      organizationId,
      id: req.body.id || require('uuid').v4()
    };

    const dependency = await BusinessProcessGraphService.addDependency(dependencyData);

    res.status(201).json(dependency);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business-process-graph/dependencies/:processId/downstream
 * Get downstream dependencies
 */
router.get('/dependencies/:processId/downstream', async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const { processId } = req.params;
    const { maxDepth = 10 } = req.query;

    const dependencies = await BusinessProcessGraphService.getDownstreamDependencies(
      organizationId,
      processId,
      parseInt(maxDepth)
    );

    res.json(dependencies);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business-process-graph/dependencies/:processId/upstream
 * Get upstream dependencies
 */
router.get('/dependencies/:processId/upstream', async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const { processId } = req.params;
    const { maxDepth = 10 } = req.query;

    const dependencies = await BusinessProcessGraphService.getUpstreamDependencies(
      organizationId,
      processId,
      parseInt(maxDepth)
    );

    res.json(dependencies);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business-process-graph/single-points-of-failure
 * Find single points of failure
 */
router.get('/single-points-of-failure', async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const spofs = await BusinessProcessGraphService.findSinglePointsOfFailure(organizationId);

    res.json(spofs);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/business-process-graph/financial-values
 * Set financial values for process
 */
router.post('/financial-values', async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const financialData = {
      ...req.body,
      organizationId,
      id: req.body.id || require('uuid').v4()
    };

    const financialValues = await BusinessProcessGraphService.setFinancialValues(financialData);

    res.status(201).json(financialValues);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business-process-graph/financial-values/:processId
 * Get financial values for process
 */
router.get('/financial-values/:processId', async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const { processId } = req.params;
    const financialValues = await BusinessProcessGraphService.getFinancialValues(organizationId, processId);

    if (!financialValues) {
      return res.status(404).json({
        error: 'Financial values not found',
        message: `No financial values found for process ${processId}`
      });
    }

    res.json(financialValues);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business-process-graph/financial-exposure
 * Get total financial exposure
 */
router.get('/financial-exposure', async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const exposure = await BusinessProcessGraphService.calculateTotalExposure(organizationId);

    res.json(exposure);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/business-process-graph/financial-values/:id/validate
 * Validate financial values
 */
router.post('/financial-values/:id/validate', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const financialValues = await BusinessProcessGraphService.validateFinancialValues(id, userId);

    res.json(financialValues);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/business-process-graph/impact-analysis
 * Create process impact analysis
 */
router.post('/impact-analysis', async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const analysisData = {
      ...req.body,
      organizationId,
      id: req.body.id || require('uuid').v4()
    };

    const analysis = await BusinessProcessGraphService.createImpactAnalysis(analysisData);

    res.status(201).json(analysis);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business-process-graph/impact-analysis/:processId
 * Calculate blast radius for process
 */
router.get('/impact-analysis/:processId/:scenario', async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const { processId, scenario } = req.params;

    const analysis = await BusinessProcessGraphService.calculateBlastRadius(
      organizationId,
      processId,
      scenario
    );

    res.json(analysis);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business-process-graph/aggregate-impact
 * Get aggregate impact
 */
router.get('/aggregate-impact', async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const { scenario } = req.query;
    const impact = await BusinessProcessGraphService.getAggregateImpact(organizationId, scenario);

    res.json(impact);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/business-process-graph/catalog
 * Add process to catalog
 */
router.post('/catalog', async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const processData = {
      ...req.body,
      organizationId,
      id: req.body.id || require('uuid').v4()
    };

    const process = await BusinessProcessGraphService.addProcessToCatalog(processData);

    res.status(201).json(process);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business-process-graph/catalog
 * Get process catalog
 */
router.get('/catalog', async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const options = req.query;
    const catalog = await BusinessProcessGraphService.getProcessCatalog(organizationId, options);

    res.json(catalog);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business-process-graph/catalog/crown-jewels
 * Get crown jewel processes
 */
router.get('/catalog/crown-jewels', async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const crownJewels = await BusinessProcessGraphService.getCrownJewels(organizationId);

    res.json(crownJewels);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business-process-graph/catalog/search
 * Search processes
 */
router.get('/catalog/search', async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        error: 'Missing search term',
        message: 'Search term "q" is required'
      });
    }

    const results = await BusinessProcessGraphService.searchProcesses(organizationId, q);

    res.json(results);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/business-process-graph/build-complete
 * Build complete business process graph
 */
router.post('/build-complete', async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const completeGraph = await BusinessProcessGraphService.buildCompleteGraph(organizationId);

    res.json(completeGraph);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
