'use strict';

const BaseService = require('../../BaseService');

/**
 * Financial Service
 *
 * Handles all financial risk and impact-related business logic:
 * - Financial impact calculation
 * - Scenario analysis
 * - Benchmarking and peer comparison
 */
class FinancialService extends BaseService {
  constructor(models, logger) {
    super(models, logger);
    this.financialImpactModel = models.FinancialImpact;
    this.riskModel = models.Risk;
  }

  /**
   * Get financial impacts with filters
   */
  async getImpacts(orgId, filters = {}) {
    this.logInfo('Fetching financial impacts', { orgId, filters });

    try {
      const impacts = await this.financialImpactModel.findByOrganization(orgId, filters);
      return this.enrichImpacts(impacts);
    } catch (error) {
      this.handleError(error, 'fetching financial impacts');
    }
  }

  /**
   * Calculate impact for a specific risk
   */
  async calculateImpact(riskId, threatScenario) {
    this.logInfo('Calculating financial impact', { riskId });

    try {
      // Get risk details
      const risk = await this.riskModel.findById(riskId);
      if (!risk) {
        const error = new Error('Risk not found');
        error.statusCode = 404;
        throw error;
      }

      // Business logic for impact calculation
      const baseImpact = risk.financialExposure || 0;
      const likelihood = risk.likelihood || 0.5;

      // Calculate expected loss
      const expectedLoss = baseImpact * likelihood;

      // Calculate impact with threat scenario
      let scenarioMultiplier = 1.0;
      if (threatScenario) {
        scenarioMultiplier = this.calculateScenarioMultiplier(threatScenario);
      }

      const totalImpact = expectedLoss * scenarioMultiplier;

      return {
        riskId,
        baseImpact,
        likelihood,
        expectedLoss,
        scenarioMultiplier,
        totalImpact,
        currency: 'USD',
        calculatedAt: new Date().toISOString()
      };
    } catch (error) {
      this.handleError(error, 'calculating financial impact');
    }
  }

  /**
   * Get risk scenarios
   */
  async getScenarios(orgId) {
    this.logInfo('Fetching risk scenarios', { orgId });

    try {
      // Would integrate with scenario model
      const scenarios = [
        {
          id: 'scenario_1',
          name: 'Ransomware Attack',
          type: 'ransomware',
          impactMultiplier: 2.5,
          probability: 0.3
        },
        {
          id: 'scenario_2',
          name: 'Data Breach',
          type: 'data_breach',
          impactMultiplier: 1.8,
          probability: 0.5
        }
      ];

      return scenarios;
    } catch (error) {
      this.handleError(error, 'fetching scenarios');
    }
  }

  /**
   * Run scenario analysis
   */
  async runScenario(orgId, scenarioParams) {
    this.logInfo('Running scenario analysis', { orgId, scenario: scenarioParams.scenarioId });

    try {
      // Get scenario
      const scenarios = await this.getScenarios(orgId);
      const scenario = scenarios.find(s => s.id === scenarioParams.scenarioId);

      if (!scenario) {
        const error = new Error('Scenario not found');
        error.statusCode = 404;
        throw error;
      }

      // Get risks for organization
      const risks = await this.riskModel.findByOrganization(orgId);

      // Calculate scenario impact for each risk
      const results = risks.map(risk => ({
        riskId: risk.id,
        riskTitle: risk.title,
        currentExposure: risk.financialExposure || 0,
        scenarioExposure: (risk.financialExposure || 0) * scenario.impactMultiplier,
        increase: ((risk.financialExposure || 0) * (scenario.impactMultiplier - 1))
      }));

      // Calculate aggregate impact
      const totalCurrentExposure = results.reduce((sum, r) => sum + r.currentExposure, 0);
      const totalScenarioExposure = results.reduce((sum, r) => sum + r.scenarioExposure, 0);
      const totalIncrease = totalScenarioExposure - totalCurrentExposure;

      return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        organizationId: orgId,
        results,
        summary: {
          totalCurrentExposure,
          totalScenarioExposure,
          totalIncrease,
          increasePercentage: ((totalIncrease / totalCurrentExposure) * 100).toFixed(2)
        },
        runAt: new Date().toISOString()
      };
    } catch (error) {
      this.handleError(error, 'running scenario analysis');
    }
  }

  /**
   * Get benchmarks for peer comparison
   */
  async getBenchmarks(orgId) {
    this.logInfo('Fetching financial benchmarks', { orgId });

    try {
      // Business logic for benchmark calculation
      const benchmarks = {
        organizationId: orgId,
        averageFinancialExposure: 0,
        medianFinancialExposure: 0,
        percentile25: 0,
        percentile75: 0,
        peerCount: 0,
        lastUpdated: new Date().toISOString()
      };

      // Would integrate with actual peer data
      return benchmarks;
    } catch (error) {
      this.handleError(error, 'fetching benchmarks');
    }
  }

  /**
   * Compare organization with peers
   */
  async comparePeers(orgId, peerId) {
    this.logInfo('Comparing peers', { orgId, peerId });

    try {
      // Get organization financial data
      const orgImpacts = await this.getImpacts(orgId);
      const orgTotalExposure = orgImpacts.reduce((sum, impact) => sum + (impact.amount || 0), 0);

      // Get peer financial data
      const peerImpacts = await this.getImpacts(peerId);
      const peerTotalExposure = peerImpacts.reduce((sum, impact) => sum + (impact.amount || 0), 0);

      // Calculate comparison
      const comparison = {
        organizationId: orgId,
        peerId,
        organizationExposure: orgTotalExposure,
        peerExposure: peerTotalExposure,
        difference: orgTotalExposure - peerTotalExposure,
        percentageDifference: ((orgTotalExposure - peerTotalExposure) / peerTotalExposure * 100).toFixed(2),
        relativePosition: orgTotalExposure > peerTotalExposure ? 'higher' : 'lower',
        comparedAt: new Date().toISOString()
      };

      return comparison;
    } catch (error) {
      this.handleError(error, 'comparing peers');
    }
  }

  /**
   * Get high-exposure risks
   */
  async getHighExposureRisks(orgId, minExposure = 100000) {
    this.logInfo('Fetching high-exposure risks', { orgId, minExposure });

    try {
      return await this.riskModel.getHighFinancialExposure(orgId, minExposure);
    } catch (error) {
      this.handleError(error, 'fetching high-exposure risks');
    }
  }

  /**
   * Enrich financial impacts
   * @private
   */
  enrichImpacts(impacts) {
    return impacts.map(impact => ({
      ...impact,
      riskLevel: this.calculateRiskLevel(impact),
      trend: this.calculateTrend(impact),
      currency: 'USD'
    }));
  }

  /**
   * Calculate scenario multiplier
   * @private
   */
  calculateScenarioMultiplier(scenario) {
    // Business logic for scenario multiplier calculation
    return scenario.impactMultiplier || 1.0;
  }

  /**
   * Calculate risk level from impact
   * @private
   */
  calculateRiskLevel(impact) {
    if (!impact.amount) return 'unknown';

    const amount = impact.amount;
    if (amount > 1000000) return 'critical';
    if (amount > 500000) return 'high';
    if (amount > 100000) return 'medium';
    return 'low';
  }

  /**
   * Calculate trend for impact
   * @private
   */
  calculateTrend(impact) {
    // Business logic for trend calculation
    // Would compare with historical data
    return 'stable';
  }
}

module.exports = FinancialService;
