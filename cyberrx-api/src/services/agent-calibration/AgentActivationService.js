/**
 * Agent Activation Service
 *
 * Service for activating CyberRX agents (CFO, CISO, Board) in pilot environment.
 * Configures agent runtime for customer tenant, loads customer context,
 * validates LLM inference endpoints, and verifies agent coordination.
 *
 * Task: T-PILOT-004
 * Phase: Phase 2 - Pilot Deployment & Customer Onboarding
 */

const { Pool } = require('pg');
const axios = require('axios');

class AgentActivationService {
  constructor(databaseUrl = null) {
    this.pool = new Pool(databaseUrl || {
      connectionString: process.env.DATABASE_URL
    });

    // Agent runtime endpoint (from T-MVP-007)
    this.agentRuntimeUrl = process.env.AGENT_RUNTIME_URL || 'http://localhost:8000';

    // Agents to activate
    this.agents = ['cfo', 'ciso', 'board'];
  }

  /**
   * Activate all agents for pilot customer
   * @param {string} organizationId - Organization ID
   * @param {object} config - Activation configuration
   * @returns {object} Activation results
   */
  async activateAgents(organizationId, config = {}) {
    const {
      tenantId = organizationId,
      validateLLM = true,
      testSampleData = true,
      verifyCoordination = true
    } = config;

    const results = {
      organizationId,
      tenantId,
      timestamp: new Date().toISOString(),
      agents: {},
      summary: {
        total: 0,
        activated: 0,
        failed: 0,
        warnings: 0
      },
      validationResults: {},
      warnings: [],
      errors: []
    };

    try {
      // Validate organization exists
      const orgValid = await this.validateOrganization(organizationId);
      if (!orgValid) {
        throw new Error(`Organization ${organizationId} not found or not active`);
      }

      // Validate LLM inference endpoints if requested
      if (validateLLM) {
        const llmValid = await this.validateLLMEndpoints();
        results.validationResults.llmEndpoints = llmValid;

        if (!llmValid.valid) {
          throw new Error('LLM inference endpoints validation failed');
        }
      }

      // Activate each agent
      for (const agentId of this.agents) {
        try {
          const agentResult = await this.activateAgent(agentId, organizationId, config);
          results.agents[agentId] = agentResult;
          results.summary.total++;

          if (agentResult.status === 'activated') {
            results.summary.activated++;
          } else if (agentResult.status === 'failed') {
            results.summary.failed++;
            results.errors.push(`${agentId}: ${agentResult.error}`);
          }

          if (agentResult.warnings && agentResult.warnings.length > 0) {
            results.summary.warnings += agentResult.warnings.length;
            results.warnings.push(...agentResult.warnings.map(w => `${agentId}: ${w}`));
          }
        } catch (error) {
          results.agents[agentId] = {
            status: 'failed',
            error: error.message,
            timestamp: new Date().toISOString()
          };
          results.summary.total++;
          results.summary.failed++;
          results.errors.push(`${agentId}: ${error.message}`);
        }
      }

      // Verify agent coordination if requested
      if (verifyCoordination && results.summary.activated === this.agents.length) {
        const coordValid = await this.verifyAgentCoordination(organizationId);
        results.validationResults.coordination = coordValid;

        if (!coordValid.valid) {
          results.warnings.push('Agent coordination verification produced warnings');
          results.validationResults.coordination.warnings.forEach(w => {
            results.warnings.push(`Coordination: ${w}`);
          });
        }
      }

      // Test agents on sample data if requested
      if (testSampleData && results.summary.activated === this.agents.length) {
        const sampleTestResults = await this.testWithSampleData(organizationId);
        results.validationResults.sampleData = sampleTestResults;

        if (sampleTestResults.failed > 0) {
          results.warnings.push('Sample data tests produced failures');
        }
      }

      results.status = this.determineActivationStatus(results.summary);

    } catch (error) {
      results.status = 'failed';
      results.errors.push(`Activation failed: ${error.message}`);
    }

    return results;
  }

  /**
   * Activate single agent
   * @param {string} agentId - Agent ID (cfo, ciso, board)
   * @param {string} organizationId - Organization ID
   * @param {object} config - Configuration
   * @returns {object} Agent activation result
   */
  async activateAgent(agentId, organizationId, config = {}) {
    const result = {
      agentId,
      organizationId,
      status: 'pending',
      steps: [],
      warnings: [],
      errors: [],
      timestamp: new Date().toISOString()
    };

    try {
      // Step 1: Configure agent runtime for customer tenant
      const runtimeConfig = await this.configureAgentRuntime(agentId, organizationId);
      result.steps.push({
        step: 'configure_runtime',
        status: 'completed',
        config: runtimeConfig
      });

      // Step 2: Load customer context into agent context manager
      const contextConfig = await this.loadCustomerContext(agentId, organizationId);
      result.steps.push({
        step: 'load_context',
        status: 'completed',
        contextSummary: contextConfig.summary
      });

      // Step 3: Validate agent state persistence
      const persistenceValid = await this.validateStatePersistence(agentId, organizationId);
      result.steps.push({
        step: 'validate_persistence',
        status: persistenceValid.valid ? 'completed' : 'warning',
        result: persistenceValid
      });

      if (!persistenceValid.valid) {
        result.warnings.push('State persistence validation produced warnings');
        result.warnings.push(...persistenceValid.warnings || []);
      }

      // Step 4: Start agent
      const startResult = await this.startAgent(agentId, organizationId);
      result.steps.push({
        step: 'start_agent',
        status: startResult.success ? 'completed' : 'failed',
        result: startResult
      });

      if (!startResult.success) {
        throw new Error(startResult.error || 'Failed to start agent');
      }

      // Step 5: Verify agent is running
      const agentState = await this.getAgentState(agentId, organizationId);
      result.steps.push({
        step: 'verify_running',
        status: agentState.status === 'running' ? 'completed' : 'failed',
        state: agentState
      });

      if (agentState.status !== 'running') {
        throw new Error(`Agent not in running state: ${agentState.status}`);
      }

      result.status = 'activated';
      result.agentState = agentState;

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      result.steps.push({
        step: 'activation',
        status: 'failed',
        error: error.message
      });
    }

    return result;
  }

  /**
   * Configure agent runtime for customer tenant
   * @param {string} agentId - Agent ID
   * @param {string} organizationId - Organization ID
   * @returns {object} Runtime configuration
   */
  async configureAgentRuntime(agentId, organizationId) {
    const config = {
      agentId,
      organizationId,
      tenantId: organizationId,
      model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
      maxTokens: parseInt(process.env.AGENT_MAX_TOKENS || '4000'),
      temperature: parseFloat(process.env.AGENT_TEMPERATURE || '0.7'),
      timeout: parseInt(process.env.AGENT_TIMEOUT || '30000'),
      costTrackingEnabled: process.env.COST_TRACKING_ENABLED === 'true',
      phiValidationEnabled: true,
      promptTemplates: this.getPromptTemplates(agentId),
      createdAt: new Date().toISOString()
    };

    // Store configuration in database
    await this.pool.query(
      `INSERT INTO agent_configurations (agent_id, organization_id, config, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (agent_id, organization_id)
       DO UPDATE SET config = $3, updated_at = $4`,
      [agentId, organizationId, JSON.stringify(config), new Date()]
    );

    return config;
  }

  /**
   * Load customer context into agent context manager
   * @param {string} agentId - Agent ID
   * @param {string} organizationId - Organization ID
   * @returns {object} Context configuration
   */
  async loadCustomerContext(agentId, organizationId) {
    const context = {
      agentId,
      organizationId,
      loadedAt: new Date().toISOString()
    };

    // Load business process graph context (from T-PILOT-002)
    const bpgResult = await this.pool.query(
      `SELECT id, name, nodes, edges
       FROM business_process_graph
       WHERE organization_id = $1 AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
      [organizationId]
    );

    if (bpgResult.rows.length > 0) {
      context.businessProcessGraph = {
        id: bpgResult.rows[0].id,
        name: bpgResult.rows[0].name,
        nodeCount: bpgResult.rows[0].nodes ? bpgResult.rows[0].nodes.length : 0,
        edgeCount: bpgResult.rows[0].edges ? bpgResult.rows[0].edges.length : 0
      };
    }

    // Load financial parameters context (from T-PILOT-003)
    const financeResult = await this.pool.query(
      `SELECT parameter_type, COUNT(*) as count,
              SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count
       FROM financial_parameters
       WHERE organization_id = $1
       GROUP BY parameter_type`,
      [organizationId]
    );

    context.financialParameters = {
      total: financeResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
      active: financeResult.rows.reduce((sum, row) => sum + parseInt(row.active_count), 0),
      byType: financeResult.rows.reduce((acc, row) => {
        acc[row.parameter_type] = {
          total: parseInt(row.count),
          active: parseInt(row.active_count)
        };
        return acc;
      }, {})
    };

    // Load financial summary for context
    const summaryResult = await this.pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN parameter_type = 'premium_revenue_mapping'
          AND status = 'active' THEN (config->>'annual_premium_revenue')::numeric ELSE 0 END), 0) as total_premium_revenue,
        COALESCE(SUM(CASE WHEN parameter_type = 'mlr_target'
          AND status = 'active' THEN (config->>'target_percentage')::numeric ELSE 0 END), 0) as avg_mlr_target
       FROM financial_parameters
       WHERE organization_id = $1`,
      [organizationId]
    );

    if (summaryResult.rows.length > 0) {
      context.financialSummary = {
        totalPremiumRevenue: parseFloat(summaryResult.rows[0].total_premium_revenue || 0),
        averageMLRTarget: parseFloat(summaryResult.rows[0].avg_mlr_target || 0)
      };
    }

    context.summary = {
      businessProcessGraphLoaded: !!context.businessProcessGraph,
      financialParametersLoaded: context.financialParameters.total > 0,
      financialSummaryLoaded: !!context.financialSummary
    };

    return context;
  }

  /**
   * Validate agent state persistence
   * @param {string} agentId - Agent ID
   * @param {string} organizationId - Organization ID
   * @returns {object} Validation result
   */
  async validateStatePersistence(agentId, organizationId) {
    const result = {
      valid: true,
      warnings: [],
      tests: []
    };

    try {
      // Test 1: Check agent_states table exists and is accessible
      const tableExists = await this.pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'agent_states'
        )`
      );

      result.tests.push({
        test: 'table_exists',
        passed: tableExists.rows[0].exists
      });

      if (!tableExists.rows[0].exists) {
        result.valid = false;
        result.warnings.push('agent_states table does not exist');
      }

      // Test 2: Check agent_briefings table exists
      const briefingsTableExists = await this.pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'agent_briefings'
        )`
      );

      result.tests.push({
        test: 'briefings_table_exists',
        passed: briefingsTableExists.rows[0].exists
      });

      // Test 3: Test write operation
      const testStateId = `test_${agentId}_${Date.now()}`;
      try {
        await this.pool.query(
          `INSERT INTO agent_states (agent_id, status, config, created_at, updated_at)
           VALUES ($1, 'stopped', '{}', NOW(), NOW())`,
          [testStateId]
        );

        await this.pool.query(
          `DELETE FROM agent_states WHERE agent_id = $1`,
          [testStateId]
        );

        result.tests.push({
          test: 'write_operation',
          passed: true
        });
      } catch (error) {
        result.tests.push({
          test: 'write_operation',
          passed: false,
          error: error.message
        });
        result.warnings.push('State persistence write test failed');
      }

    } catch (error) {
      result.valid = false;
      result.warnings.push(`State persistence validation failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Start agent via Agent Runtime API
   * @param {string} agentId - Agent ID
   * @param {string} organizationId - Organization ID
   * @returns {object} Start result
   */
  async startAgent(agentId, organizationId) {
    try {
      const response = await axios.post(
        `${this.agentRuntimeUrl}/agents/${agentId}/start`,
        {
          organization_id: organizationId,
          config: {
            tenantId: organizationId,
            phiValidationEnabled: true
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAuthToken()}`
          },
          timeout: 10000
        }
      );

      return {
        success: true,
        agentId: response.data.agent_id,
        status: response.data.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Get agent state
   * @param {string} agentId - Agent ID
   * @param {string} organizationId - Organization ID
   * @returns {object} Agent state
   */
  async getAgentState(agentId, organizationId) {
    try {
      const response = await axios.get(
        `${this.agentRuntimeUrl}/agents/${agentId}/state`,
        {
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`
          },
          timeout: 5000
        }
      );

      return response.data;
    } catch (error) {
      return {
        status: 'error',
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Validate LLM inference endpoints
   * @returns {object} Validation result
   */
  async validateLLMEndpoints() {
    const result = {
      valid: true,
      warnings: [],
      tests: []
    };

    try {
      // Test Claude API connection
      const testPrompt = 'Hello, this is a connection test. Please respond with "Connection successful".';

      const response = await axios.post(
        `${this.agentRuntimeUrl}/test/llm`,
        { prompt: testPrompt },
        {
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`
          },
          timeout: 30000
        }
      );

      result.tests.push({
        test: 'llm_connection',
        passed: response.data.success === true,
        responseTime: response.data.responseTime
      });

      if (response.data.success !== true) {
        result.valid = false;
        result.warnings.push('LLM connection test failed');
      }

      // Test cost tracking
      if (response.data.cost) {
        result.tests.push({
          test: 'cost_tracking',
          passed: true,
          cost: response.data.cost
        });
      }

    } catch (error) {
      result.valid = false;
      result.warnings.push(`LLM endpoint validation failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Verify agent coordination (Board Agent synthesizes CFO and CISO outputs)
   * @param {string} organizationId - Organization ID
   * @returns {object} Coordination verification result
   */
  async verifyAgentCoordination(organizationId) {
    const result = {
      valid: true,
      warnings: [],
      tests: []
    };

    try {
      // Test 1: Verify all agents are running
      for (const agentId of this.agents) {
        const state = await this.getAgentState(agentId, organizationId);
        result.tests.push({
          test: `agent_${agentId}_running`,
          passed: state.status === 'running',
          status: state.status
        });

        if (state.status !== 'running') {
          result.warnings.push(`Agent ${agentId} not running`);
        }
      }

      // Test 2: Verify Board Agent can query CFO and CISO agents
      try {
        const testQuery = 'Provide a brief summary of current risk posture.';

        const cfoResponse = await this.queryAgent('cfo', organizationId, testQuery, false);
        const cisoResponse = await this.queryAgent('ciso', organizationId, testQuery, false);

        result.tests.push({
          test: 'cfo_query',
          passed: cfoResponse.success
        });

        result.tests.push({
          test: 'ciso_query',
          passed: cisoResponse.success
        });

        if (!cfoResponse.success || !cisoResponse.success) {
          result.warnings.push('CFO or CISO agent query failed');
        }

      } catch (error) {
        result.tests.push({
          test: 'agent_query',
          passed: false,
          error: error.message
        });
        result.warnings.push(`Agent query test failed: ${error.message}`);
      }

    } catch (error) {
      result.valid = false;
      result.warnings.push(`Coordination verification failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Test agents with sample customer data
   * @param {string} organizationId - Organization ID
   * @returns {object} Sample data test results
   */
  async testWithSampleData(organizationId) {
    const results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      agents: {}
    };

    const sampleQueries = {
      cfo: 'What is our current total cyber risk exposure?',
      ciso: 'What are the top 3 security risks facing our organization?',
      board: 'Provide a comprehensive overview of our cyber risk posture.'
    };

    for (const [agentId, query] of Object.entries(sampleQueries)) {
      try {
        const result = await this.queryAgent(agentId, organizationId, query, false);

        results.agents[agentId] = {
          success: result.success,
          hasBriefing: !!result.briefing,
          tokenCost: result.tokenCost,
          error: result.error
        };

        if (result.success && result.briefing) {
          results.passed++;
        } else if (!result.success) {
          results.failed++;
        } else {
          results.warnings++;
        }

      } catch (error) {
        results.agents[agentId] = {
          success: false,
          error: error.message
        };
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Query agent
   * @param {string} agentId - Agent ID
   * @param {string} organizationId - Organization ID
   * @param {string} query - Query text
   * @param {boolean} storeBriefing - Whether to store briefing
   * @returns {object} Query result
   */
  async queryAgent(agentId, organizationId, query, storeBriefing = true) {
    try {
      const response = await axios.post(
        `${this.agentRuntimeUrl}/agents/${agentId}/query`,
        {
          organization_id: organizationId,
          query: query,
          time_range: '30d',
          store_briefing: storeBriefing
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAuthToken()}`
          },
          timeout: 35000
        }
      );

      return {
        success: true,
        briefing: response.data.briefing,
        tokenCost: response.data.token_cost,
        briefingId: response.data.briefing_id
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Validate organization exists and is active
   * @param {string} organizationId - Organization ID
   * @returns {boolean} Valid
   */
  async validateOrganization(organizationId) {
    try {
      const result = await this.pool.query(
        'SELECT id, status FROM organizations WHERE id = $1',
        [organizationId]
      );

      return result.rows.length > 0 && result.rows[0].status === 'active';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get prompt templates for agent
   * @param {string} agentId - Agent ID
   * @returns {object} Prompt templates
   */
  getPromptTemplates(agentId) {
    const templates = {
      cfo: ['briefing.txt', 'exposure_analysis.txt', 'trend_analysis.txt'],
      ciso: ['briefing.txt', 'security_posture.txt', 'attack_analysis.txt'],
      board: ['briefing.txt', 'governance_summary.txt', 'coordination.txt']
    };

    return templates[agentId] || ['briefing.txt'];
  }

  /**
   * Get auth token for API calls
   * @returns {string} Auth token
   */
  getAuthToken() {
    // In production, this would validate and return a proper JWT
    // For now, returning a placeholder
    return process.env.AGENT_RUNTIME_AUTH_TOKEN || 'dev-token';
  }

  /**
   * Determine overall activation status
   * @param {object} summary - Summary object
   * @returns {string} Status
   */
  determineActivationStatus(summary) {
    if (summary.failed > 0) {
      return 'partial_failure';
    } else if (summary.activated === this.agents.length) {
      return 'success';
    } else if (summary.activated > 0) {
      return 'partial_success';
    } else {
      return 'failed';
    }
  }

  /**
   * Deactivate agent
   * @param {string} agentId - Agent ID
   * @param {string} organizationId - Organization ID
   * @returns {object} Deactivation result
   */
  async deactivateAgent(agentId, organizationId) {
    try {
      const response = await axios.post(
        `${this.agentRuntimeUrl}/agents/${agentId}/stop`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`
          },
          timeout: 10000
        }
      );

      return {
        success: true,
        agentId: response.data.agent_id,
        status: response.data.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
}

module.exports = AgentActivationService;
