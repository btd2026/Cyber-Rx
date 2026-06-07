/**
 * Agent Context Configuration Service
 *
 * Service for configuring agent contexts with customer-specific data.
 * Loads business process graph (T-PILOT-002) and financial parameters
 * (T-PILOT-003) into agent context managers.
 *
 * Task: T-PILOT-004
 * Phase: Phase 2 - Pilot Deployment & Customer Onboarding
 */

const { Pool } = require('pg');

class AgentContextConfigurationService {
  constructor(databaseUrl = null) {
    this.pool = new Pool(databaseUrl || {
      connectionString: process.env.DATABASE_URL
    });
  }

  /**
   * Configure agent contexts for organization
   * @param {string} organizationId - Organization ID
   * @param {object} config - Configuration options
   * @returns {object} Configuration results
   */
  async configureAgentContexts(organizationId, config = {}) {
    const {
      agentIds = ['cfo', 'ciso', 'board'],
      validateContext = true,
      loadFinancialData = true,
      loadBusinessProcessData = true
    } = config;

    const results = {
      organizationId,
      timestamp: new Date().toISOString(),
      agents: {},
      summary: {
        total: 0,
        configured: 0,
        failed: 0
      },
      dataLoaded: {}
    };

    try {
      // Load financial parameters (from T-PILOT-003)
      let financialContext = null;
      if (loadFinancialData) {
        financialContext = await this.loadFinancialContext(organizationId);
        results.dataLoaded.financial = financialContext.summary;
      }

      // Load business process graph (from T-PILOT-002)
      let businessProcessContext = null;
      if (loadBusinessProcessData) {
        businessProcessContext = await this.loadBusinessProcessContext(organizationId);
        results.dataLoaded.businessProcess = businessProcessContext.summary;
      }

      // Configure each agent
      for (const agentId of agentIds) {
        try {
          const agentConfig = await this.configureAgentContext(
            agentId,
            organizationId,
            financialContext,
            businessProcessContext,
            config
          );

          results.agents[agentId] = agentConfig;
          results.summary.total++;

          if (agentConfig.status === 'configured') {
            results.summary.configured++;
          } else {
            results.summary.failed++;
          }

        } catch (error) {
          results.agents[agentId] = {
            status: 'failed',
            error: error.message
          };
          results.summary.total++;
          results.summary.failed++;
        }
      }

      // Validate contexts if requested
      if (validateContext && results.summary.configured > 0) {
        const validation = await this.validateContexts(organizationId, agentIds);
        results.validation = validation;
      }

    } catch (error) {
      results.error = error.message;
    }

    // Store configuration
    await this.storeConfiguration(organizationId, results);

    return results;
  }

  /**
   * Load financial context
   * @param {string} organizationId - Organization ID
   * @returns {object} Financial context
   */
  async loadFinancialContext(organizationId) {
    const context = {
      organizationId,
      loadedAt: new Date().toISOString(),
      summary: {},
      data: {}
    };

    try {
      // Load MLR targets (from T-PILOT-003)
      const mlrResult = await this.pool.query(
        `SELECT id, config, market_segment, tax_year, status
         FROM mlr_target_configurations
         WHERE organization_id = $1 AND status = 'active'
         ORDER BY created_at DESC`,
        [organizationId]
      );

      context.data.mlrTargets = mlrResult.rows.map(row => ({
        id: row.id,
        marketSegment: row.market_segment,
        taxYear: row.tax_year,
        targetPercentage: parseFloat(row.config?.target_percentage || 0),
        premiumRevenue: parseFloat(row.config?.annual_premium_revenue || 0),
        claimsCost: parseFloat(row.config?.annual_claims_cost || 0)
      }));

      context.summary.mlrTargetsLoaded = context.data.mlrTargets.length;

      // Load stop-loss parameters (from T-PILOT-003)
      const stopLossResult = await this.pool.query(
        `SELECT id, config, line_of_business, status
         FROM stop_loss_parameters
         WHERE organization_id = $1 AND status = 'active'
         ORDER BY created_at DESC`,
        [organizationId]
      );

      context.data.stopLossParameters = stopLossResult.rows.map(row => ({
        id: row.id,
        lineOfBusiness: row.line_of_business,
        specificAttachment: parseFloat(row.config?.specific_attachment || 0),
        aggregateLimit: parseFloat(row.config?.aggregate_limit || 0),
        currentAggregatePosition: parseFloat(row.config?.current_aggregate_position || 0)
      }));

      context.summary.stopLossParametersLoaded = context.data.stopLossParameters.length;

      // Load reserve positions (from T-PILOT-003)
      const reservesResult = await this.pool.query(
        `SELECT id, config, line_of_business, reserve_type, status
         FROM reserve_positions
         WHERE organization_id = $1 AND status = 'active'
         ORDER BY created_at DESC`,
        [organizationId]
      );

      context.data.reservePositions = reservesResult.rows.map(row => ({
        id: row.id,
        lineOfBusiness: row.line_of_business,
        reserveType: row.reserve_type,
        reserveBalance: parseFloat(row.config?.reserve_balance || 0),
        adequacyPercentage: parseFloat(row.config?.adequacy_percentage || 0)
      }));

      context.summary.reservePositionsLoaded = context.data.reservePositions.length;

      // Load premium revenue mappings (from T-PILOT-003)
      const revenueResult = await this.pool.query(
        `SELECT id, config, business_process_id, status
         FROM premium_revenue_mappings
         WHERE organization_id = $1 AND status = 'active'
         ORDER BY created_at DESC`,
        [organizationId]
      );

      context.data.premiumRevenueMappings = revenueResult.rows.map(row => ({
        id: row.id,
        businessProcessId: row.business_process_id,
        annualPremiumRevenue: parseFloat(row.config?.annual_premium_revenue || 0),
        memberCount: parseInt(row.config?.member_count || 0),
        pmpm: parseFloat(row.config?.pmpm || 0)
      }));

      context.summary.premiumRevenueMappingsLoaded = context.data.premiumRevenueMappings.length;

      // Calculate totals
      context.summary.totalPremiumRevenue = context.data.premiumRevenueMappings.reduce(
        (sum, m) => sum + m.annualPremiumRevenue, 0
      );

      context.summary.totalMembers = context.data.premiumRevenueMappings.reduce(
        (sum, m) => sum + m.memberCount, 0
      );

      // Load risk appetite thresholds (from T-PILOT-003)
      const appetiteResult = await this.pool.query(
        `SELECT id, config, threshold_level, status
         FROM risk_appetite_thresholds
         WHERE organization_id = $1 AND status = 'active'
         ORDER BY created_at DESC`,
        [organizationId]
      );

      context.data.riskAppetiteThresholds = appetiteResult.rows.map(row => ({
        id: row.id,
        thresholdLevel: row.threshold_level,
        maxSingleEventExposure: parseFloat(row.config?.max_single_event_exposure || 0),
        maxAnnualAggregateExposure: parseFloat(row.config?.max_annual_aggregate_exposure || 0),
        maxMLRImpact: parseFloat(row.config?.max_mlr_impact || 0)
      }));

      context.summary.riskAppetiteThresholdsLoaded = context.data.riskAppetiteThresholds.length;

    } catch (error) {
      context.error = error.message;
    }

    return context;
  }

  /**
   * Load business process context
   * @param {string} organizationId - Organization ID
   * @returns {object} Business process context
   */
  async loadBusinessProcessContext(organizationId) {
    const context = {
      organizationId,
      loadedAt: new Date().toISOString(),
      summary: {},
      data: {}
    };

    try {
      // Load business process graph (from T-PILOT-002)
      const graphResult = await this.pool.query(
        `SELECT id, name, nodes, edges, status
         FROM business_process_graph
         WHERE organization_id = $1 AND status = 'active'
         ORDER BY created_at DESC
         LIMIT 1`,
        [organizationId]
      );

      if (graphResult.rows.length > 0) {
        const graph = graphResult.rows[0];

        context.data.graph = {
          id: graph.id,
          name: graph.name,
          nodeCount: graph.nodes ? graph.nodes.length : 0,
          edgeCount: graph.edges ? graph.edges.length : 0,
          nodes: graph.nodes,
          edges: graph.edges
        };

        context.summary.graphLoaded = true;
      } else {
        context.summary.graphLoaded = false;
        context.summary.graphWarning = 'No active business process graph found';
      }

      // Load process catalog (from T-PILOT-002)
      const catalogResult = await this.pool.query(
        `SELECT id, process_name, process_category, criticality, status
         FROM process_catalog
         WHERE organization_id = $1 AND status = 'active'
         ORDER BY criticality DESC`,
        [organizationId]
      );

      context.data.processCatalog = catalogResult.rows.map(row => ({
        id: row.id,
        processName: row.process_name,
        processCategory: row.process_category,
        criticality: row.criticality
      }));

      context.summary.processCatalogLoaded = context.data.processCatalog.length;

      // Load system mappings (from T-PILOT-002)
      const mappingsResult = await this.pool.query(
        `SELECT id, business_process_id, system_id, mapping_type, status
         FROM system_process_mappings
         WHERE organization_id = $1 AND status = 'active'
         ORDER BY created_at DESC`,
        [organizationId]
      );

      context.data.systemMappings = mappingsResult.rows.map(row => ({
        id: row.id,
        businessProcessId: row.business_process_id,
        systemId: row.system_id,
        mappingType: row.mapping_type
      }));

      context.summary.systemMappingsLoaded = context.data.systemMappings.length;

      // Load dependencies (from T-PILOT-002)
      const depsResult = await this.pool.query(
        `SELECT id, upstream_process_id, downstream_process_id, dependency_type, status
         FROM process_dependencies
         WHERE organization_id = $1 AND status = 'active'
         ORDER BY created_at DESC`,
        [organizationId]
      );

      context.data.dependencies = depsResult.rows.map(row => ({
        id: row.id,
        upstreamProcessId: row.upstream_process_id,
        downstreamProcessId: row.downstream_process_id,
        dependencyType: row.dependency_type
      }));

      context.summary.dependenciesLoaded = context.data.dependencies.length;

    } catch (error) {
      context.error = error.message;
    }

    return context;
  }

  /**
   * Configure agent context
   * @param {string} agentId - Agent ID
   * @param {string} organizationId - Organization ID
   * @param {object} financialContext - Financial context
   * @param {object} businessProcessContext - Business process context
   * @param {object} config - Configuration options
   * @returns {object} Agent configuration result
   */
  async configureAgentContext(agentId, organizationId, financialContext, businessProcessContext, config) {
    const result = {
      agentId,
      organizationId,
      status: 'pending',
      timestamp: new Date().toISOString(),
      contextConfigured: {}
    };

    try {
      // Configure context based on agent type
      if (agentId === 'cfo') {
        result.contextConfigured = this.configureCFOContext(financialContext, businessProcessContext);
      } else if (agentId === 'ciso') {
        result.contextConfigured = this.configureCISOContext(financialContext, businessProcessContext);
      } else if (agentId === 'board') {
        result.contextConfigured = this.configureBoardContext(financialContext, businessProcessContext);
      } else {
        throw new Error(`Unknown agent ID: ${agentId}`);
      }

      // Validate no PHI in context
      const phiCheck = this.validateNoPHI(result.contextConfigured);
      if (!phiCheck.valid) {
        throw new Error('PHI detected in context configuration');
      }

      // Store context configuration
      await this.storeAgentContext(agentId, organizationId, result.contextConfigured);

      result.status = 'configured';

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
    }

    return result;
  }

  /**
   * Configure CFO agent context
   * @param {object} financialContext - Financial context
   * @param {object} businessProcessContext - Business process context
   * @returns {object} CFO context
   */
  configureCFOContext(financialContext, businessProcessContext) {
    const context = {
      agentType: 'cfo',
      financialMetrics: {},
      businessProcessMetrics: {}
    };

    if (financialContext && financialContext.data) {
      // MLR targets
      context.financialMetrics.mlrTargets = financialContext.data.mlrTargets || [];
      context.financialMetrics.totalPremiumRevenue = financialContext.summary.totalPremiumRevenue || 0;
      context.financialMetrics.totalMembers = financialContext.summary.totalMembers || 0;

      // Stop-loss parameters
      context.financialMetrics.stopLossParameters = financialContext.data.stopLossParameters || [];
      const totalStopLossPosition = financialContext.data.stopLossParameters.reduce(
        (sum, p) => sum + (p.currentAggregatePosition || 0), 0
      );
      context.financialMetrics.totalStopLossPosition = totalStopLossPosition;

      // Reserve positions
      context.financialMetrics.reservePositions = financialContext.data.reservePositions || [];
      const totalReserves = financialContext.data.reservePositions.reduce(
        (sum, r) => sum + (r.reserveBalance || 0), 0
      );
      context.financialMetrics.totalReserves = totalReserves;

      // Risk appetite thresholds
      context.financialMetrics.riskAppetiteThresholds = financialContext.data.riskAppetiteThresholds || [];
    }

    if (businessProcessContext && businessProcessContext.data) {
      // Business process catalog
      context.businessProcessMetrics.processCatalog = businessProcessContext.data.processCatalog || [];
      context.businessProcessMetrics.crownJewels = (businessProcessContext.data.processCatalog || [])
        .filter(p => p.criticality === 'crown_jewel')
        .map(p => p.processName);

      // System mappings
      context.businessProcessMetrics.systemMappings = businessProcessContext.data.systemMappings || [];
    }

    return context;
  }

  /**
   * Configure CISO agent context
   * @param {object} financialContext - Financial context
   * @param {object} businessProcessContext - Business process context
   * @returns {object} CISO context
   */
  configureCISOContext(financialContext, businessProcessContext) {
    const context = {
      agentType: 'ciso',
      securityMetrics: {},
      businessProcessMetrics: {}
    };

    if (businessProcessContext && businessProcessContext.data) {
      // Business process catalog
      context.businessProcessMetrics.processCatalog = businessProcessContext.data.processCatalog || [];
      context.businessProcessMetrics.criticalProcesses = (businessProcessContext.data.processCatalog || [])
        .filter(p => ['crown_jewel', 'critical'].includes(p.criticality))
        .map(p => ({
          name: p.processName,
          category: p.processCategory,
          criticality: p.criticality
        }));

      // System mappings
      context.businessProcessMetrics.systemMappings = businessProcessContext.data.systemMappings || [];
      context.securityMetrics.instrumentedSystems = [...new Set(
        (businessProcessContext.data.systemMappings || []).map(m => m.systemId)
      )];

      // Dependencies
      context.businessProcessMetrics.dependencies = businessProcessContext.data.dependencies || [];
      context.securityMetrics.singlePointsOfFailure = this.identifySinglePointsOfFailure(
        businessProcessContext.data.dependencies || []
      );
    }

    if (financialContext && financialContext.data) {
      // Risk appetite thresholds (for security context)
      context.securityMetrics.riskAppetiteThresholds = (financialContext.data.riskAppetiteThresholds || [])
        .filter(t => t.thresholdLevel === 'ciso');
    }

    return context;
  }

  /**
   * Configure Board agent context
   * @param {object} financialContext - Financial context
   * @param {object} businessProcessContext - Business process context
   * @returns {object} Board context
   */
  configureBoardContext(financialContext, businessProcessContext) {
    const context = {
      agentType: 'board',
      governanceMetrics: {},
      financialSummary: {},
      businessProcessSummary: {}
    };

    if (financialContext && financialContext.data) {
      // High-level financial summary
      context.financialSummary.totalPremiumRevenue = financialContext.summary.totalPremiumRevenue || 0;
      context.financialSummary.totalMembers = financialContext.summary.totalMembers || 0;
      context.financialSummary.totalReserves = (financialContext.data.reservePositions || []).reduce(
        (sum, r) => sum + (r.reserveBalance || 0), 0
      );
      context.financialSummary.totalStopLossPosition = (financialContext.data.stopLossParameters || []).reduce(
        (sum, p) => sum + (p.currentAggregatePosition || 0), 0
      );

      // Board-level risk appetite thresholds
      context.governanceMetrics.riskAppetiteThresholds = (financialContext.data.riskAppetiteThresholds || [])
        .filter(t => t.thresholdLevel === 'board');
    }

    if (businessProcessContext && businessProcessContext.data) {
      // High-level business process summary
      context.businessProcessSummary.totalProcesses = (businessProcessContext.data.processCatalog || []).length;
      context.businessProcessSummary.crownJewelCount = (businessProcessContext.data.processCatalog || [])
        .filter(p => p.criticality === 'crown_jewel').length;
      context.businessProcessSummary.criticalProcessCount = (businessProcessContext.data.processCatalog || [])
        .filter(p => p.criticality === 'critical').length;

      // Crown jewel processes
      context.businessProcessSummary.crownJewels = (businessProcessContext.data.processCatalog || [])
        .filter(p => p.criticality === 'crown_jewel')
        .map(p => p.processName);
    }

    return context;
  }

  /**
   * Identify single points of failure from dependencies
   * @param {Array<object>} dependencies - Dependencies array
   * @returns {Array<string>} Single points of failure
   */
  identifySinglePointsOfFailure(dependencies) {
    // Count downstream dependencies for each process
    const downstreamCounts = {};

    for (const dep of dependencies) {
      downstreamCounts[dep.upstreamProcessId] = (downstreamCounts[dep.upstreamProcessId] || 0) + 1;
    }

    // Processes with many downstream dependencies are potential SPOFs
    return Object.entries(downstreamCounts)
      .filter(([id, count]) => count >= 3)
      .map(([id]) => id);
  }

  /**
   * Validate no PHI in context
   * @param {object} context - Context object
   * @returns {object} Validation result
   */
  validateNoPHI(context) {
    const phiPatterns = [
      /\d{3}-\d{2}-\d{4}/, // SSN
      /\b\d{9}\b/, // 9-digit number (potential SSN)
      /\b[A-Z]\d{3}\b/, // Member ID pattern
      /\b\d{3}-\d{3}-\d{4}\b/ // Phone number
    ];

    const contextString = JSON.stringify(context);

    for (const pattern of phiPatterns) {
      if (pattern.test(contextString)) {
        return {
          valid: false,
          pattern: pattern.toString()
        };
      }
    }

    return { valid: true };
  }

  /**
   * Store agent context
   * @param {string} agentId - Agent ID
   * @param {string} organizationId - Organization ID
   * @param {object} context - Context object
   * @returns {object} Storage result
   */
  async storeAgentContext(agentId, organizationId, context) {
    try {
      await this.pool.query(
        `INSERT INTO agent_contexts (agent_id, organization_id, context_data, updated_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (agent_id, organization_id)
         DO UPDATE SET context_data = $3, updated_at = $4`,
        [agentId, organizationId, JSON.stringify(context), new Date()]
      );

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate contexts
   * @param {string} organizationId - Organization ID
   * @param {Array<string>} agentIds - Agent IDs
   * @returns {object} Validation results
   */
  async validateContexts(organizationId, agentIds) {
    const validation = {
      organizationId,
      timestamp: new Date().toISOString(),
      agents: {}
    };

    for (const agentId of agentIds) {
      try {
        const result = await this.pool.query(
          'SELECT context_data FROM agent_contexts WHERE agent_id = $1 AND organization_id = $2',
          [agentId, organizationId]
        );

        if (result.rows.length > 0) {
          const context = result.rows[0].context_data;

          // Validate structure
          const hasContext = Object.keys(context).length > 0;
          const phiCheck = this.validateNoPHI(context);

          validation.agents[agentId] = {
            valid: hasContext && phiCheck.valid,
            hasContext,
            phiCheck: phiCheck.valid
          };
        } else {
          validation.agents[agentId] = {
            valid: false,
            hasContext: false,
            phiCheck: true
          };
        }
      } catch (error) {
        validation.agents[agentId] = {
          valid: false,
          error: error.message
        };
      }
    }

    return validation;
  }

  /**
   * Store configuration results
   * @param {string} organizationId - Organization ID
   * @param {object} results - Configuration results
   * @returns {object} Storage result
   */
  async storeConfiguration(organizationId, results) {
    try {
      await this.pool.query(
        `INSERT INTO context_configurations (organization_id, configuration_results, created_at)
         VALUES ($1, $2, $3)`,
        [organizationId, JSON.stringify(results), new Date()]
      );

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get agent context
   * @param {string} agentId - Agent ID
   * @param {string} organizationId - Organization ID
   * @returns {object} Agent context
   */
  async getAgentContext(agentId, organizationId) {
    try {
      const result = await this.pool.query(
        'SELECT context_data, updated_at FROM agent_contexts WHERE agent_id = $1 AND organization_id = $2',
        [agentId, organizationId]
      );

      if (result.rows.length > 0) {
        return {
          success: true,
          context: result.rows[0].context_data,
          updatedAt: result.rows[0].updated_at
        };
      }

      return {
        success: false,
        error: 'Context not found'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = AgentContextConfigurationService;
