/**
 * First Briefing Generation Service
 *
 * Service for generating the first live briefing for pilot customer.
 * Prepares briefing materials, delivers briefing to executives,
 * facilitates Q&A, and captures action items.
 *
 * Task: T-PILOT-004
 * Phase: Phase 2 - Pilot Deployment & Customer Onboarding
 */

const { Pool } = require('pg');
const axios = require('axios');

class FirstBriefingGenerationService {
  constructor(databaseUrl = null) {
    this.pool = new Pool(databaseUrl || {
      connectionString: process.env.DATABASE_URL
    });

    this.agentRuntimeUrl = process.env.AGENT_RUNTIME_URL || 'http://localhost:8000';
  }

  /**
   * Generate first live briefing
   * @param {string} organizationId - Organization ID
   * @param {object} config - Briefing configuration
   * @returns {object} Briefing result
   */
  async generateFirstBriefing(organizationId, config = {}) {
    const {
      agentIds = ['cfo', 'ciso', 'board'],
      timeRange = '30d',
      includeTrends = true,
      audience = 'executives'
    } = config;

    const result = {
      organizationId,
      generatedAt: new Date().toISOString(),
      briefings: {},
      summary: {},
      actionItems: [],
      feedback: []
    };

    try {
      // Generate briefing for each agent
      for (const agentId of agentIds) {
        const query = this.getDefaultQuery(agentId);

        const briefingResult = await this.generateAgentBriefing(
          agentId,
          organizationId,
          query,
          timeRange,
          includeTrends
        );

        result.briefings[agentId] = briefingResult;

        if (briefingResult.success) {
          result.actionItems.push(...(briefingResult.actionItems || []));
        }
      }

      // Generate board synthesis briefing
      const synthesisResult = await this.generateBoardSynthesis(
        organizationId,
        result.briefings
      );

      result.briefings.synthesis = synthesisResult;

      // Prepare briefing materials
      result.materials = await this.prepareBriefingMaterials(
        organizationId,
        result.briefings,
        audience
      );

      result.status = 'generated';

    } catch (error) {
      result.status = 'error';
      result.error = error.message;
    }

    // Store briefing record
    await this.storeBriefingRecord(organizationId, result);

    return result;
  }

  /**
   * Generate agent briefing
   * @param {string} agentId - Agent ID
   * @param {string} organizationId - Organization ID
   * @param {string} query - Query
   * @param {string} timeRange - Time range
   * @param {boolean} includeTrends - Include trends
   * @returns {object} Briefing result
   */
  async generateAgentBriefing(agentId, organizationId, query, timeRange, includeTrends) {
    try {
      const response = await axios.post(
        `${this.agentRuntimeUrl}/agents/${agentId}/query`,
        {
          organization_id: organizationId,
          query: query,
          time_range: timeRange,
          include_trends: includeTrends,
          store_briefing: true
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.AGENT_RUNTIME_AUTH_TOKEN || 'dev-token'}`
          },
          timeout: 35000
        }
      );

      const briefing = response.data.briefing;

      // Extract action items from briefing
      const actionItems = this.extractActionItems(briefing, agentId);

      return {
        success: true,
        briefing: briefing,
        briefingId: response.data.briefing_id,
        tokenCost: response.data.token_cost,
        actionItems: actionItems,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Generate board synthesis briefing
   * @param {string} organizationId - Organization ID
   * @param {object} agentBriefings - Agent briefings
   * @returns {object} Synthesis result
   */
  async generateBoardSynthesis(organizationId, agentBriefings) {
    try {
      const cfoBriefing = agentBriefings.cfo?.briefing;
      const cisoBriefing = agentBriefings.ciso?.briefing;

      if (!cfoBriefing || !cisoBriefing) {
        return {
          success: false,
          error: 'Missing CFO or CISO briefing for synthesis'
        };
      }

      // Generate synthesis query
      const synthesisQuery = this.buildSynthesisQuery(cfoBriefing, cisoBriefing);

      const response = await axios.post(
        `${this.agentRuntimeUrl}/agents/board/query`,
        {
          organization_id: organizationId,
          query: synthesisQuery,
          time_range: '30d',
          include_trends: true,
          store_briefing: true
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.AGENT_RUNTIME_AUTH_TOKEN || 'dev-token'}`
          },
          timeout: 35000
        }
      );

      return {
        success: true,
        briefing: response.data.briefing,
        briefingId: response.data.briefing_id,
        tokenCost: response.data.token_cost
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Prepare briefing materials
   * @param {string} organizationId - Organization ID
   * @param {object} briefings - Briefings
   * @param {string} audience - Audience type
   * @returns {object} Briefing materials
   */
  async prepareBriefingMaterials(organizationId, briefings, audience) {
    const materials = {
      audience,
      preparedAt: new Date().toISOString(),
      documents: []
    };

    // CFO briefing materials
    if (briefings.cfo?.success) {
      materials.documents.push({
        type: 'financial_briefing',
        format: 'markdown',
        title: 'CFO Cyber Risk Financial Briefing',
        content: this.formatBriefingAsMarkdown(briefings.cfo.briefing, 'CFO')
      });
    }

    // CISO briefing materials
    if (briefings.ciso?.success) {
      materials.documents.push({
        type: 'security_briefing',
        format: 'markdown',
        title: 'CISO Security Posture Briefing',
        content: this.formatBriefingAsMarkdown(briefings.ciso.briefing, 'CISO')
      });
    }

    // Board synthesis materials
    if (briefings.synthesis?.success) {
      materials.documents.push({
        type: 'board_briefing',
        format: 'markdown',
        title: 'Board Cyber Risk Governance Briefing',
        content: this.formatBriefingAsMarkdown(briefings.synthesis.briefing, 'Board')
      });
    }

    return materials;
  }

  /**
   * Get default query for agent
   * @param {string} agentId - Agent ID
   * @returns {string} Default query
   */
  getDefaultQuery(agentId) {
    const queries = {
      cfo: 'Provide a comprehensive overview of our current cyber risk financial exposure, including MLR impact, stop-loss position, and reserve adequacy.',
      ciso: 'Provide a comprehensive overview of our current security posture, including top risks, emerging threats, and control effectiveness.',
      board: 'Provide a board-level synthesis of cyber risk governance, including financial and security perspectives.'
    };

    return queries[agentId] || 'Provide an overview of current cyber risk posture.';
  }

  /**
   * Build synthesis query
   * @param {object} cfoBriefing - CFO briefing
   * @param {object} cisoBriefing - CISO briefing
   * @returns {string} Synthesis query
   */
  buildSynthesisQuery(cfoBriefing, cisoBriefing) {
    return `Synthesize the following CFO and CISO briefings into a board-level governance summary:

CFO Total Exposure: $${(cfoBriefing.totalExposure || 0).toLocaleString()}
CFO Top Risk: ${cfoBriefing.topRisks?.[0]?.title || 'None identified'}
CISO Critical Vulnerabilities: ${cfoBriefing.criticalVulnerabilities?.length || 0}
CISO Compliance Status: ${cfoBriefing.complianceStatus || 'Unknown'}

Provide board-level recommendations for cyber risk governance.`;
  }

  /**
   * Extract action items from briefing
   * @param {object} briefing - Briefing object
   * @param {string} agentId - Agent ID
   * @returns {Array<object>} Action items
   */
  extractActionItems(briefing, agentId) {
    const actionItems = [];

    if (briefing.recommendations && Array.isArray(briefing.recommendations)) {
      for (const recommendation of briefing.recommendations) {
        actionItems.push({
          agentId: agentId,
          title: recommendation.title || recommendation,
          priority: recommendation.priority || 'medium',
          category: recommendation.category || 'general',
          createdAt: new Date().toISOString()
        });
      }
    }

    return actionItems;
  }

  /**
   * Format briefing as markdown
   * @param {object} briefing - Briefing object
   * @param {string} role - Role
   * @returns {string} Markdown formatted briefing
   */
  formatBriefingAsMarkdown(briefing, role) {
    let markdown = `# ${role} Cyber Risk Briefing\n\n`;
    markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;

    if (briefing.executiveSummary) {
      markdown += `## Executive Summary\n\n${briefing.executiveSummary}\n\n`;
    }

    if (briefing.totalExposure) {
      markdown += `## Total Financial Exposure\n\n`;
      markdown += `**Amount:** $${briefing.totalExposure.toLocaleString()}\n\n`;
    }

    if (briefing.topRisks && Array.isArray(briefing.topRisks)) {
      markdown += `## Top Risks\n\n`;
      for (const risk of briefing.topRisks) {
        markdown += `- **${risk.title}**: $${(risk.exposure || 0).toLocaleString()} (Likelihood: ${risk.likelihood}%)\n`;
      }
      markdown += `\n`;
    }

    if (briefing.recommendations && Array.isArray(briefing.recommendations)) {
      markdown += `## Recommendations\n\n`;
      for (const rec of briefing.recommendations) {
        markdown += `- ${rec.title || rec}\n`;
      }
      markdown += `\n`;
    }

    return markdown;
  }

  /**
   * Store briefing record
   * @param {string} organizationId - Organization ID
   * @param {object} result - Briefing result
   * @returns {object} Storage result
   */
  async storeBriefingRecord(organizationId, result) {
    try {
      await this.pool.query(
        `INSERT INTO first_briefings (organization_id, briefing_data, created_at)
         VALUES ($1, $2, $3)`,
        [organizationId, JSON.stringify(result), new Date()]
      );

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Capture executive feedback
   * @param {string} organizationId - Organization ID
   * @param {object} feedback - Feedback data
   * @returns {object} Feedback result
   */
  async captureFeedback(organizationId, feedback) {
    const {
      executiveId,
      rating,
      comments,
      suggestions,
      actionItems = []
    } = feedback;

    try {
      await this.pool.query(
        `INSERT INTO briefing_feedback (organization_id, executive_id, rating, comments, suggestions, action_items, captured_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [organizationId, executiveId, rating, comments, JSON.stringify(suggestions), JSON.stringify(actionItems), new Date()]
      );

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = FirstBriefingGenerationService;
