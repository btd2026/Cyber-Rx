'use strict';

/**
 * Threat Scenario Controller
 *
 * Handles HTTP requests for threat modeling
 */

class ThreatScenarioController {
  constructor(threatScenarioService) {
    this.service = threatScenarioService;
  }

  /**
   * GET /api/threat-scenarios
   * Get all threat scenarios with optional filters
   */
  async getThreatScenarios(req, res) {
    try {
      const { type, businessProcessId, minProbability } = req.query;
      const filters = {};

      if (type) filters.type = type;
      if (businessProcessId) filters.businessProcessId = businessProcessId;
      if (minProbability) filters.minProbability = parseInt(minProbability);

      const threatScenarios = await this.service.getThreatScenarios(req.orgId, filters);

      res.json({
        success: true,
        data: threatScenarios,
        count: threatScenarios.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/threat-scenarios/:id
   * Get single threat scenario by ID
   */
  async getThreatScenarioById(req, res) {
    try {
      const { id } = req.params;
      const threatScenario = await this.service.getThreatScenarioById(id, req.orgId);

      if (!threatScenario) {
        return res.status(404).json({
          success: false,
          error: 'Threat scenario not found'
        });
      }

      res.json({
        success: true,
        data: threatScenario
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/threat-scenarios
   * Create new threat scenario
   */
  async createThreatScenario(req, res) {
    try {
      const threatScenario = await this.service.createThreatScenario(req.orgId, req.body);

      res.status(201).json({
        success: true,
        data: threatScenario
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * PUT /api/threat-scenarios/:id
   * Update threat scenario
   */
  async updateThreatScenario(req, res) {
    try {
      const { id } = req.params;
      const threatScenario = await this.service.updateThreatScenario(id, req.orgId, req.body);

      res.json({
        success: true,
        data: threatScenario
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/threat-scenarios/:id
   * Delete threat scenario
   */
  async deleteThreatScenario(req, res) {
    try {
      const { id } = req.params;
      const result = await this.service.deleteThreatScenario(id, req.orgId);

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
   * GET /api/threat-scenarios/risk-analysis
   * Get threat scenarios with risk analysis
   */
  async getThreatScenariosWithRiskAnalysis(req, res) {
    try {
      const threatScenarios = await this.service.getThreatScenariosWithRiskAnalysis(req.orgId);

      res.json({
        success: true,
        data: threatScenarios,
        count: threatScenarios.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/threat-scenarios/high-probability
   * Get high-probability threat scenarios
   */
  async getHighProbabilityThreats(req, res) {
    try {
      const { minProbability } = req.query;
      const minProb = minProbability ? parseInt(minProbability) : 70;

      const threatScenarios = await this.service.getHighProbabilityThreats(req.orgId, minProb);

      res.json({
        success: true,
        data: threatScenarios,
        count: threatScenarios.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/threat-scenarios/mitre/technique/:techniqueId
   * Get threat scenarios by MITRE technique
   */
  async getThreatScenariosByMitreTechnique(req, res) {
    try {
      const { techniqueId } = req.params;
      const threatScenarios = await this.service.getThreatScenariosByMitreTechnique(techniqueId, req.orgId);

      res.json({
        success: true,
        data: threatScenarios,
        count: threatScenarios.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/threat-scenarios/dashboard
   * Get threat dashboard summary
   */
  async getThreatDashboard(req, res) {
    try {
      const dashboard = await this.service.getThreatDashboard(req.orgId);

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/threat-scenarios/top
   * Get top threats by risk score
   */
  async getTopThreats(req, res) {
    try {
      const { limit } = req.query;
      const limitValue = limit ? parseInt(limit) : 10;

      const topThreats = await this.service.getTopThreats(req.orgId, limitValue);

      res.json({
        success: true,
        data: topThreats,
        count: topThreats.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/threat-scenarios/mitre/search
   * Search MITRE ATT&CK techniques
   */
  async searchMitreTechniques(req, res) {
    try {
      const { q } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
      }

      const techniques = await this.service.searchMitreTechniques(q);

      res.json({
        success: true,
        data: techniques,
        count: techniques.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/threat-scenarios/mitre/tactic/:tactic
   * Get MITRE ATT&CK tactic details
   */
  async getMitreTacticDetails(req, res) {
    try {
      const { tactic } = req.params;
      const tacticDetails = await this.service.getMitreTacticDetails(tactic);

      if (!tacticDetails) {
        return res.status(404).json({
          success: false,
          error: 'MITRE tactic not found'
        });
      }

      res.json({
        success: true,
        data: tacticDetails
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/threat-scenarios/mitre/technique-details/:techniqueId
   * Get MITRE ATT&CK technique details
   */
  async getMitreTechniqueDetails(req, res) {
    try {
      const { techniqueId } = req.params;
      const techniqueDetails = await this.service.getMitreTechniqueDetails(techniqueId);

      if (!techniqueDetails) {
        return res.status(404).json({
          success: false,
          error: 'MITRE technique not found'
        });
      }

      res.json({
        success: true,
        data: techniqueDetails
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/threat-scenarios/mitre/tactics
   * Get all MITRE ATT&CK tactics
   */
  async getMitreTactics(req, res) {
    try {
      const tactics = await this.service.getMitreTactics();

      res.json({
        success: true,
        data: tactics,
        count: tactics.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = ThreatScenarioController;
