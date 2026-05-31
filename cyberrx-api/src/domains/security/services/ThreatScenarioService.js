'use strict';

const BaseService = require('../../BaseService');
const MitreAttckService = require('../../services/MitreAttckService');

/**
 * Threat Scenario Service
 *
 * Handles threat modeling and risk analysis:
 * - Ransomware, phishing, insider, supply chain, DDoS threats
 * - MITRE ATT&CK integration (tactics, techniques, procedures)
 * - Risk scoring: probability × impact × data sensitivity
 * - Control validation and effectiveness tracking
 */
class ThreatScenarioService extends BaseService {
  constructor(models, logger) {
    super(models, logger);
    this.threatScenarioModel = models.ThreatScenario;
    this.dataObjectModel = models.DataObject;
    this.riskModel = models.Risk;
    this.controlModel = models.Control;
    this.mitreService = new MitreAttckService(logger);
  }

  /**
   * Get threat scenarios with filters
   * @param {string} orgId - Organization ID
   * @param {Object} filters - Query filters
   * @param {string} [filters.type] - Filter by threat type
   * @param {string} [filters.businessProcessId] - Filter by business process
   * @param {number} [filters.minProbability] - Minimum probability
   * @returns {Promise<Array>} Array of threat scenarios
   */
  async getThreatScenarios(orgId, filters = {}) {
    this.logInfo('Fetching threat scenarios', { orgId, filters });

    try {
      const threatScenarios = await this.threatScenarioModel.findByOrganization(orgId, filters);
      return this.enrichThreatScenarios(threatScenarios);
    } catch (error) {
      this.handleError(error, 'fetching threat scenarios');
    }
  }

  /**
   * Get single threat scenario by ID
   * @param {string} id - Threat scenario ID
   * @param {string} orgId - Organization ID
   * @returns {Promise<Object>} Threat scenario with relationships
   */
  async getThreatScenarioById(id, orgId) {
    this.logInfo('Fetching threat scenario', { id });

    try {
      const threatScenario = await this.threatScenarioModel.findById(id);
      this.verifyOrgAccess(threatScenario, orgId, 'Threat scenario');

      return this.enrichThreatScenario(threatScenario);
    } catch (error) {
      this.handleError(error, 'fetching threat scenario');
    }
  }

  /**
   * Create threat scenario
   * @param {string} orgId - Organization ID
   * @param {Object} data - Threat scenario data
   * @returns {Promise<Object>} Created threat scenario
   */
  async createThreatScenario(orgId, data) {
    this.logInfo('Creating threat scenario', { orgId, name: data.name });

    try {
      // Validate required fields
      const name = this.validateRequiredString(data.name, 'Threat scenario name');
      const type = this.validateEnum(
        data.type,
        ['ransomware', 'phishing', 'insider', 'supply_chain', 'misconfig', 'ddos', 'api_abuse', 'zero_day'],
        'Threat type'
      );

      // Validate probability and impact
      if (data.probability !== undefined) {
        if (data.probability < 0 || data.probability > 100) {
          throw new Error('Probability must be between 0 and 100');
        }
      }

      if (data.impactLevel) {
        this.validateEnum(
          data.impactLevel,
          ['Critical', 'High', 'Medium', 'Low'],
          'Impact level'
        );
      }

      // Validate MITRE technique IDs if provided
      if (data.mitreTechnique && data.mitreTechnique.length > 0) {
        await this.validateMitreTechniques(data.mitreTechnique);
      }

      // Generate ID
      const id = this.generateThreatScenarioId();

      // Create threat scenario
      const threatScenario = await this.threatScenarioModel.create({
        id,
        name: this.sanitize(name),
        type,
        organizationId: orgId,
        probability: data.probability,
        impactLevel: data.impactLevel,
        description: data.description,
        mitreTechnique: data.mitreTechnique || [],
        exploitedRisks: data.exploitedRisks || [],
        mitreTactic: data.mitreTactic,
        mitigationStrategy: data.mitigationStrategy,
        controlEffectiveness: data.controlEffectiveness
      });

      this.logInfo('Threat scenario created successfully', { id });
      return this.enrichThreatScenario(threatScenario);
    } catch (error) {
      this.handleError(error, 'creating threat scenario');
    }
  }

  /**
   * Update threat scenario
   * @param {string} id - Threat scenario ID
   * @param {string} orgId - Organization ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated threat scenario
   */
  async updateThreatScenario(id, orgId, data) {
    this.logInfo('Updating threat scenario', { id });

    try {
      // Verify access
      const existing = await this.threatScenarioModel.findById(id);
      this.verifyOrgAccess(existing, orgId, 'Threat scenario');

      // Validate probability and impact if provided
      if (data.probability !== undefined) {
        if (data.probability < 0 || data.probability > 100) {
          throw new Error('Probability must be between 0 and 100');
        }
      }

      if (data.impactLevel) {
        this.validateEnum(
          data.impactLevel,
          ['Critical', 'High', 'Medium', 'Low'],
          'Impact level'
        );
      }

      // Validate MITRE technique IDs if provided
      if (data.mitreTechnique && data.mitreTechnique.length > 0) {
        await this.validateMitreTechniques(data.mitreTechnique);
      }

      // Update threat scenario
      const updated = await this.threatScenarioModel.update(id, data);
      this.logInfo('Threat scenario updated successfully', { id });
      return this.enrichThreatScenario(updated);
    } catch (error) {
      this.handleError(error, 'updating threat scenario');
    }
  }

  /**
   * Delete threat scenario
   * @param {string} id - Threat scenario ID
   * @param {string} orgId - Organization ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteThreatScenario(id, orgId) {
    this.logInfo('Deleting threat scenario', { id });

    try {
      // Verify access
      const existing = await this.threatScenarioModel.findById(id);
      this.verifyOrgAccess(existing, orgId, 'Threat scenario');

      // Delete
      await this.threatScenarioModel.delete(id);
      this.logInfo('Threat scenario deleted successfully', { id });
      return { message: 'Threat scenario deleted successfully', id };
    } catch (error) {
      this.handleError(error, 'deleting threat scenario');
    }
  }

  /**
   * Get threat scenarios with risk analysis
   * @param {string} orgId - Organization ID
   * @returns {Promise<Array>} Array of threat scenarios with calculated risk scores
   */
  async getThreatScenariosWithRiskAnalysis(orgId) {
    this.logInfo('Fetching threat scenarios with risk analysis', { orgId });

    try {
      const threatScenarios = await this.threatScenarioModel.getWithRiskAnalysis(orgId);
      return this.enrichThreatScenarios(threatScenarios);
    } catch (error) {
      this.handleError(error, 'fetching threat scenarios with risk analysis');
    }
  }

  /**
   * Get high-probability threat scenarios
   * @param {string} orgId - Organization ID
   * @param {number} [minProbability] - Minimum probability (default 70)
   * @returns {Promise<Array>} Array of high-probability threat scenarios
   */
  async getHighProbabilityThreats(orgId, minProbability = 70) {
    this.logInfo('Fetching high-probability threats', { orgId, minProbability });

    try {
      const threatScenarios = await this.threatScenarioModel.getHighProbabilityThreats(orgId, minProbability);
      return this.enrichThreatScenarios(threatScenarios);
    } catch (error) {
      this.handleError(error, 'fetching high-probability threats');
    }
  }

  /**
   * Get threat scenarios by MITRE technique
   * @param {string} techniqueId - MITRE technique ID (e.g., 'T1486')
   * @param {string} orgId - Organization ID
   * @returns {Promise<Array>} Array of threat scenarios
   */
  async getThreatScenariosByMitreTechnique(techniqueId, orgId) {
    this.logInfo('Fetching threat scenarios by MITRE technique', { techniqueId });

    try {
      const threatScenarios = await this.threatScenarioModel.findByMitreTechnique(techniqueId, orgId);
      return this.enrichThreatScenarios(threatScenarios);
    } catch (error) {
      this.handleError(error, 'fetching threat scenarios by MITRE technique');
    }
  }

  /**
   * Get threat dashboard summary
   * @param {string} orgId - Organization ID
   * @returns {Promise<Object>} Threat dashboard summary
   */
  async getThreatDashboard(orgId) {
    this.logInfo('Generating threat dashboard', { orgId });

    try {
      const threatScenarios = await this.threatScenarioModel.findByOrganization(orgId);

      // Calculate dashboard metrics
      const dashboard = {
        total: threatScenarios.length,
        byType: {},
        byImpactLevel: {},
        highProbabilityCount: 0,
        criticalImpactCount: 0,
        averageProbability: 0,
        controlEffectiveness: 0,
        riskDistribution: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        }
      };

      let totalProbability = 0;
      let totalControlEffectiveness = 0;

      threatScenarios.forEach(threat => {
        // Count by type
        dashboard.byType[threat.type] = (dashboard.byType[threat.type] || 0) + 1;

        // Count by impact level
        if (threat.impactLevel) {
          dashboard.byImpactLevel[threat.impactLevel] = (dashboard.byImpactLevel[threat.impactLevel] || 0) + 1;

          if (threat.impactLevel === 'Critical') {
            dashboard.criticalImpactCount++;
          }
        }

        // High probability count
        if (threat.probability >= 70) {
          dashboard.highProbabilityCount++;
        }

        // Accumulate for averages
        totalProbability += threat.probability || 0;
        totalControlEffectiveness += threat.controlEffectiveness || 0;

        // Risk distribution
        const riskScore = this.calculateRiskScore(threat);
        if (riskScore >= 80) {
          dashboard.riskDistribution.critical++;
        } else if (riskScore >= 60) {
          dashboard.riskDistribution.high++;
        } else if (riskScore >= 40) {
          dashboard.riskDistribution.medium++;
        } else {
          dashboard.riskDistribution.low++;
        }
      });

      // Calculate averages
      dashboard.averageProbability = threatScenarios.length > 0
        ? Math.round(totalProbability / threatScenarios.length)
        : 0;

      dashboard.controlEffectiveness = threatScenarios.length > 0
        ? Math.round(totalControlEffectiveness / threatScenarios.length)
        : 0;

      // Get top threats
      dashboard.topThreats = await this.getTopThreats(orgId, 5);

      return dashboard;
    } catch (error) {
      this.handleError(error, 'generating threat dashboard');
    }
  }

  /**
   * Get top threats by risk score
   * @param {string} orgId - Organization ID
   * @param {number} limit - Number of threats to return
   * @returns {Promise<Array>} Top threat scenarios
   */
  async getTopThreats(orgId, limit = 10) {
    this.logInfo('Fetching top threats', { orgId, limit });

    try {
      const threatScenarios = await this.threatScenarioModel.getWithRiskAnalysis(orgId);

      // Sort by risk score and limit
      return threatScenarios
        .sort((a, b) => (b.calculatedRiskScore || 0) - (a.calculatedRiskScore || 0))
        .slice(0, limit);
    } catch (error) {
      this.handleError(error, 'fetching top threats');
    }
  }

  /**
   * Search MITRE ATT&CK techniques
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of matching techniques
   */
  async searchMitreTechniques(query) {
    this.logInfo('Searching MITRE techniques', { query });

    try {
      return await this.mitreService.searchTechniques(query);
    } catch (error) {
      this.handleError(error, 'searching MITRE techniques');
    }
  }

  /**
   * Get MITRE ATT&CK tactic details
   * @param {string} tactic - Tactic name
   * @returns {Promise<Object>} Tactic details with techniques
   */
  async getMitreTacticDetails(tactic) {
    this.logInfo('Fetching MITRE tactic details', { tactic });

    try {
      return await this.mitreService.getTacticDetails(tactic);
    } catch (error) {
      this.handleError(error, 'fetching MITRE tactic details');
    }
  }

  /**
   * Get MITRE ATT&CK technique details
   * @param {string} techniqueId - Technique ID (e.g., 'T1486')
   * @returns {Promise<Object>} Technique details
   */
  async getMitreTechniqueDetails(techniqueId) {
    this.logInfo('Fetching MITRE technique details', { techniqueId });

    try {
      return await this.mitreService.getTechniqueDetails(techniqueId);
    } catch (error) {
      this.handleError(error, 'fetching MITRE technique details');
    }
  }

  /**
   * Get all MITRE ATT&CK tactics
   * @returns {Promise<Array>} Array of tactics
   */
  async getMitreTactics() {
    this.logInfo('Fetching MITRE tactics');

    try {
      return await this.mitreService.getAllTactics();
    } catch (error) {
      this.handleError(error, 'fetching MITRE tactics');
    }
  }

  /**
   * Validate MITRE technique IDs exist
   * @private
   */
  async validateMitreTechniques(techniqueIds) {
    for (const techniqueId of techniqueIds) {
      const technique = await this.mitreService.getTechniqueDetails(techniqueId);
      if (!technique) {
        throw new Error(`MITRE technique ${techniqueId} not found`);
      }
    }
  }

  /**
   * Enrich threat scenario with related data
   * @private
   */
  async enrichThreatScenario(threatScenario) {
    if (!threatScenario) return null;

    const enriched = { ...threatScenario };

    // Add MITRE technique details
    if (threatScenario.mitreTechnique && threatScenario.mitreTechnique.length > 0) {
      enriched.mitreTechniques = [];
      for (const techniqueId of threatScenario.mitreTechnique) {
        const technique = await this.mitreService.getTechniqueDetails(techniqueId);
        if (technique) {
          enriched.mitreTechniques.push(technique);
        }
      }
    }

    // Add risk data for affected data objects
    if (threatScenario.exploitedRisks && threatScenario.exploitedRisks.length > 0) {
      enriched.affectedDataObjects = [];
      for (const riskId of threatScenario.exploitedRisks) {
        // Get data objects impacted by this risk
        // This would integrate with risk model when available
        const dataObjects = await this.dataObjectModel.findByOrganization(threatScenario.organizationId);
        enriched.affectedDataObjects = dataObjects.filter(obj =>
          obj.sensitivity === 'Critical' || obj.sensitivity === 'High'
        );
      }
    }

    // Add calculated risk score
    enriched.calculatedRiskScore = this.calculateRiskScore(threatScenario);

    // Add residual risk after controls
    enriched.residualRisk = this.calculateResidualRisk(threatScenario);

    return enriched;
  }

  /**
   * Enrich multiple threat scenarios
   * @private
   */
  async enrichThreatScenarios(threatScenarios) {
    return Promise.all(
      threatScenarios.map(threat => this.enrichThreatScenario(threat))
    );
  }

  /**
   * Calculate risk score: probability × impact × data sensitivity
   * @private
   */
  calculateRiskScore(threatScenario) {
    if (!threatScenario.probability || !threatScenario.impactLevel) {
      return null;
    }

    let score = threatScenario.probability;

    // Impact multiplier
    const impactMultiplier = {
      'Critical': 1.5,
      'High': 1.2,
      'Medium': 1.0,
      'Low': 0.7
    };
    score *= (impactMultiplier[threatScenario.impactLevel] || 1.0);

    return Math.min(100, Math.round(score));
  }

  /**
   * Calculate residual risk after controls
   * @private
   */
  calculateResidualRisk(threatScenario) {
    const riskScore = this.calculateRiskScore(threatScenario);
    if (!riskScore) return null;

    const controlEffectiveness = threatScenario.controlEffectiveness || 0;
    const residualRisk = riskScore * (1 - (controlEffectiveness / 100));

    return Math.round(residualRisk);
  }

  /**
   * Generate threat scenario ID
   * @private
   */
  generateThreatScenarioId() {
    return `ts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = ThreatScenarioService;
