/**
 * Threshold Calibration Service
 *
 * Service for calibrating agent alert thresholds with customer stakeholders.
 * Runs agents on historical data, identifies false positives/negatives,
 * adjusts sensitivity thresholds, tunes prompt templates, and iterates
 * until acceptable baseline is achieved.
 *
 * Targets:
 * - False Positive Rate (FPR): <10%
 * - False Negative Rate (FNR): <5%
 * - Alert Noise: <20 alerts/week
 * - Executive Confidence: 80%+ approval
 *
 * Task: T-PILOT-004
 * Phase: Phase 2 - Pilot Deployment & Customer Onboarding
 */

const { Pool } = require('pg');
const axios = require('axios');

class ThresholdCalibrationService {
  constructor(databaseUrl = null) {
    this.pool = new Pool(databaseUrl || {
      connectionString: process.env.DATABASE_URL
    });

    this.agentRuntimeUrl = process.env.AGENT_RUNTIME_URL || 'http://localhost:8000';

    // Calibration targets
    this.targets = {
      maxFPR: 0.10, // 10%
      maxFNR: 0.05, // 5%
      maxAlertsPerWeek: 20,
      minConfidence: 0.80 // 80%
    };

    // Calibration metrics
    this.metrics = {
      truePositives: 0,
      trueNegatives: 0,
      falsePositives: 0,
      falseNegatives: 0,
      totalAlerts: 0,
      confidenceScores: []
    };
  }

  /**
   * Run calibration cycle for organization
   * @param {string} organizationId - Organization ID
   * @param {object} config - Calibration configuration
   * @returns {object} Calibration results
   */
  async runCalibration(organizationId, config = {}) {
    const {
      agentIds = ['cfo', 'ciso', 'board'],
      historicalDays = 30,
      maxIterations = 4,
      autoTune = false,
      customerReview = true
    } = config;

    const results = {
      organizationId,
      startTime: new Date().toISOString(),
      iterations: [],
      finalStatus: 'pending',
      thresholds: {},
      metrics: {},
      customerFeedback: [],
      recommendations: []
    };

    try {
      // Load current thresholds
      const currentThresholds = await this.loadCurrentThresholds(organizationId);
      results.thresholds.initial = currentThresholds;

      // Run calibration iterations
      for (let i = 0; i < maxIterations; i++) {
        const iterationNum = i + 1;
        const iteration = await this.runCalibrationIteration(
          organizationId,
          agentIds,
          historicalDays,
          iterationNum,
          currentThresholds
        );

        results.iterations.push(iteration);

        // Calculate metrics
        const metrics = this.calculateCalibrationMetrics(iteration);
        results.metrics[`iteration_${iterationNum}`] = metrics;

        // Check if targets met
        const targetsMet = this.checkCalibrationTargets(metrics);

        iteration.targetsMet = targetsMet;
        iteration.metrics = metrics;

        if (targetsMet.all) {
          results.finalStatus = 'success';
          results.thresholds.final = iteration.thresholds;
          results.recommendations.push('Calibration targets met. Proceed to customer validation.');
          break;
        }

        // Auto-tune thresholds if enabled
        if (autoTune) {
          const tunedThresholds = this.autoTuneThresholds(
            currentThresholds,
            metrics,
            this.targets
          );

          Object.assign(currentThresholds, tunedThresholds);
          iteration.thresholdsUpdated = true;
          iteration.tunedThresholds = tunedThresholds;
        }

        // If last iteration, mark as needs review
        if (i === maxIterations - 1 && !targetsMet.all) {
          results.finalStatus = 'needs_review';
          results.recommendations.push('Maximum iterations reached. Manual threshold adjustment required.');
          results.thresholds.final = iteration.thresholds;
        }
      }

      // Customer review phase
      if (customerReview) {
        const customerReviewResults = await this.requestCustomerReview(
          organizationId,
          results
        );
        results.customerReview = customerReviewResults;
      }

      results.endTime = new Date().toISOString();
      results.duration = this.calculateDuration(results.startTime, results.endTime);

    } catch (error) {
      results.finalStatus = 'error';
      results.error = error.message;
    }

    // Store calibration results
    await this.storeCalibrationResults(organizationId, results);

    return results;
  }

  /**
   * Run single calibration iteration
   * @param {string} organizationId - Organization ID
   * @param {Array<string>} agentIds - Agent IDs
   * @param {number} historicalDays - Days of historical data
   * @param {number} iterationNum - Iteration number
   * @param {object} currentThresholds - Current thresholds
   * @returns {object} Iteration results
   */
  async runCalibrationIteration(organizationId, agentIds, historicalDays, iterationNum, currentThresholds) {
    const iteration = {
      iteration: iterationNum,
      timestamp: new Date().toISOString(),
      agents: {},
      thresholds: { ...currentThresholds },
      sampleQueries: [],
      classifications: []
    };

    // Get sample queries from historical data
    const sampleQueries = await this.getHistoricalSampleQueries(
      organizationId,
      historicalDays
    );

    iteration.sampleQueries = sampleQueries;

    // Run each agent with sample queries
    for (const agentId of agentIds) {
      const agentResults = {
        agentId,
        queries: [],
        alertClassifications: []
      };

      for (const query of sampleQueries.slice(0, 10)) { // Limit to 10 queries per agent
        try {
          const result = await this.queryAgent(agentId, organizationId, query.text, false);

          const classification = await this.classifyAlert(
            result,
            query,
            currentThresholds
          );

          agentResults.queries.push({
            query: query.text,
            classification: classification.label,
            confidence: classification.confidence,
            expected: query.severity,
            actual: classification.severity,
            match: classification.label === query.expectedLabel
          });

          agentResults.alertClassifications.push(classification);
          iteration.classifications.push(classification);

        } catch (error) {
          agentResults.queries.push({
            query: query.text,
            error: error.message
          });
        }
      }

      iteration.agents[agentId] = agentResults;
    }

    return iteration;
  }

  /**
   * Get historical sample queries for calibration
   * @param {string} organizationId - Organization ID
   * @param {number} days - Number of days
   * @returns {Array<object>} Sample queries
   */
  async getHistoricalSampleQueries(organizationId, days) {
    const queries = [];

    // Get historical risk events from database
    const result = await this.pool.query(
      `SELECT
        id,
        title,
        description,
        likelihood,
        business_process,
        severity
       FROM risks
       WHERE organization_id = $1
         AND created_at >= NOW() - INTERVAL '${days} days'
       ORDER BY likelihood DESC, created_at DESC
       LIMIT 50`,
      [organizationId]
    );

    for (const row of result.rows) {
      const severity = this.classifySeverity(row.likelihood, row.severity);

      queries.push({
        text: `What is the risk exposure for ${row.title}?`,
        expectedLabel: this.getExpectedLabel(severity),
        severity: severity,
        likelihood: row.likelihood,
        riskId: row.id
      });
    }

    return queries;
  }

  /**
   * Classify alert severity
   * @param {number} likelihood - Likelihood score (0-100)
   * @param {string} severity - Severity level
   * @returns {string} Classification
   */
  classifySeverity(likelihood, severity) {
    if (likelihood >= 80 || severity === 'critical') {
      return 'critical';
    } else if (likelihood >= 60 || severity === 'high') {
      return 'high';
    } else if (likelihood >= 40 || severity === 'medium') {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Get expected classification label
   * @param {string} severity - Severity
   * @returns {string} Expected label
   */
  getExpectedLabel(severity) {
    if (severity === 'critical' || severity === 'high') {
      return 'alert';
    } else {
      return 'no_alert';
    }
  }

  /**
   * Classify alert result
   * @param {object} result - Agent query result
   * @param {object} query - Query object
   * @param {object} thresholds - Current thresholds
   * @returns {object} Classification
   */
  async classifyAlert(result, query, thresholds) {
    const classification = {
      label: 'unknown',
      severity: 'unknown',
      confidence: 0,
      expected: query.expectedLabel,
      actual: 'unknown',
      match: false,
      timestamp: new Date().toISOString()
    };

    if (!result.success) {
      classification.label = 'error';
      classification.actual = 'no_alert';
      classification.match = classification.expected === classification.actual;
      return classification;
    }

    // Extract severity from briefing
    const briefing = result.briefing;

    if (!briefing) {
      classification.label = 'no_alert';
      classification.actual = 'no_alert';
      classification.match = classification.expected === classification.actual;
      classification.confidence = 0.5;
      return classification;
    }

    // Check if briefing indicates alert-worthy situation
    const hasHighExposure = this.hasHighExposure(briefing, thresholds);
    const hasHighLikelihood = this.hasHighLikelihood(briefing, thresholds);
    const hasCriticalTimeHorizon = this.hasCriticalTimeHorizon(briefing, thresholds);

    // Determine if alert should be generated
    if (hasHighExposure || hasHighLikelihood || hasCriticalTimeHorizon) {
      classification.label = 'alert';

      // Determine severity
      if (hasHighExposure && hasCriticalTimeHorizon) {
        classification.severity = 'critical';
      } else if (hasHighExposure || hasCriticalTimeHorizon) {
        classification.severity = 'high';
      } else if (hasHighLikelihood) {
        classification.severity = 'medium';
      } else {
        classification.severity = 'low';
      }

      classification.confidence = this.calculateConfidence(
        briefing,
        thresholds
      );
    } else {
      classification.label = 'no_alert';
      classification.severity = 'low';
      classification.confidence = 0.7;
    }

    classification.actual = classification.label;
    classification.match = classification.expected === classification.actual;

    return classification;
  }

  /**
   * Check if briefing has high exposure
   * @param {object} briefing - Briefing object
   * @param {object} thresholds - Thresholds
   * @returns {boolean} Has high exposure
   */
  hasHighExposure(briefing, thresholds) {
    const exposureThreshold = thresholds.dollarExposure || 1000000;

    if (briefing.totalExposure && briefing.totalExposure > exposureThreshold) {
      return true;
    }

    if (briefing.topRisks && briefing.topRisks.length > 0) {
      return briefing.topRisks.some(risk =>
        risk.exposure && risk.exposure > exposureThreshold
      );
    }

    return false;
  }

  /**
   * Check if briefing has high likelihood
   * @param {object} briefing - Briefing object
   * @param {object} thresholds - Thresholds
   * @returns {boolean} Has high likelihood
   */
  hasHighLikelihood(briefing, thresholds) {
    const likelihoodThreshold = thresholds.likelihood || 60;

    if (briefing.emergingRisks && briefing.emergingRisks.length > 0) {
      return briefing.emergingRisks.some(risk =>
        risk.likelihood && risk.likelihood >= likelihoodThreshold
      );
    }

    return false;
  }

  /**
   * Check if briefing has critical time horizon
   * @param {object} briefing - Briefing object
   * @param {object} thresholds - Thresholds
   * @returns {boolean} Has critical time horizon
   */
  hasCriticalTimeHorizon(briefing, thresholds) {
    const timeHorizonThreshold = thresholds.timeHorizon || 30; // days

    if (briefing.urgentRisks && briefing.urgentRisks.length > 0) {
      return briefing.urgentRisks.some(risk =>
        risk.timeHorizon && risk.timeHorizon <= timeHorizonThreshold
      );
    }

    return false;
  }

  /**
   * Calculate confidence score for classification
   * @param {object} briefing - Briefing object
   * @param {object} thresholds - Thresholds
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(briefing, thresholds) {
    let confidence = 0.5; // Base confidence

    // Increase confidence if briefing has clear metrics
    if (briefing.totalExposure && typeof briefing.totalExposure === 'number') {
      confidence += 0.1;
    }

    if (briefing.topRisks && Array.isArray(briefing.topRisks) && briefing.topRisks.length > 0) {
      confidence += 0.1;
    }

    if (briefing.methodologyTrail && typeof briefing.methodologyTrail === 'object') {
      confidence += 0.1;
    }

    if (briefing.recommendations && Array.isArray(briefing.recommendations)) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate calibration metrics
   * @param {object} iteration - Iteration results
   * @returns {object} Metrics
   */
  calculateCalibrationMetrics(iteration) {
    const metrics = {
      truePositives: 0,
      trueNegatives: 0,
      falsePositives: 0,
      falseNegatives: 0,
      total: 0,
      falsePositiveRate: 0,
      falseNegativeRate: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      accuracy: 0,
      weeklyAlertEstimate: 0,
      averageConfidence: 0
    };

    for (const classification of iteration.classifications) {
      if (!classification.expected || classification.label === 'error') {
        continue;
      }

      metrics.total++;

      if (classification.expected === 'alert' && classification.label === 'alert') {
        metrics.truePositives++;
      } else if (classification.expected === 'no_alert' && classification.label === 'no_alert') {
        metrics.trueNegatives++;
      } else if (classification.expected === 'no_alert' && classification.label === 'alert') {
        metrics.falsePositives++;
      } else if (classification.expected === 'alert' && classification.label === 'no_alert') {
        metrics.falseNegatives++;
      }
    }

    if (metrics.total > 0) {
      metrics.falsePositiveRate = metrics.falsePositives / (metrics.falsePositives + metrics.trueNegatives) || 0;
      metrics.falseNegativeRate = metrics.falseNegatives / (metrics.falseNegatives + metrics.truePositives) || 0;
      metrics.precision = metrics.truePositives / (metrics.truePositives + metrics.falsePositives) || 0;
      metrics.recall = metrics.truePositives / (metrics.truePositives + metrics.falseNegatives) || 0;
      metrics.accuracy = (metrics.truePositives + metrics.trueNegatives) / metrics.total;
      metrics.f1Score = 2 * ((metrics.precision * metrics.recall) / (metrics.precision + metrics.recall)) || 0;

      // Estimate weekly alerts based on sample
      const alertRate = (metrics.truePositives + metrics.falsePositives) / metrics.total;
      metrics.weeklyAlertEstimate = Math.round(alertRate * 20); // Assume 20 queries/week
    }

    // Calculate average confidence
    const confidenceScores = iteration.classifications
      .filter(c => c.confidence > 0)
      .map(c => c.confidence);

    if (confidenceScores.length > 0) {
      metrics.averageConfidence = confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;
    }

    return metrics;
  }

  /**
   * Check if calibration targets are met
   * @param {object} metrics - Metrics object
   * @returns {object} Targets check
   */
  checkCalibrationTargets(metrics) {
    const checks = {
      fprMet: metrics.falsePositiveRate <= this.targets.maxFPR,
      fnrMet: metrics.falseNegativeRate <= this.targets.maxFNR,
      alertVolumeMet: metrics.weeklyAlertEstimate <= this.targets.maxAlertsPerWeek,
      confidenceMet: metrics.averageConfidence >= this.targets.minConfidence,
      all: false
    };

    checks.all = checks.fprMet && checks.fnrMet && checks.alertVolumeMet && checks.confidenceMet;

    return checks;
  }

  /**
   * Auto-tune thresholds based on metrics
   * @param {object} currentThresholds - Current thresholds
   * @param {object} metrics - Metrics
   * @param {object} targets - Target metrics
   * @returns {object} Tuned thresholds
   */
  autoTuneThresholds(currentThresholds, metrics, targets) {
    const tuned = { ...currentThresholds };

    // Adjust dollar exposure threshold if FPR too high
    if (metrics.falsePositiveRate > targets.maxFPR) {
      tuned.dollarExposure = (tuned.dollarExposure || 1000000) * 1.5; // Increase by 50%
    } else if (metrics.falseNegativeRate > targets.maxFNR) {
      tuned.dollarExposure = (tuned.dollarExposure || 1000000) * 0.8; // Decrease by 20%
    }

    // Adjust likelihood threshold
    if (metrics.falsePositiveRate > targets.maxFPR) {
      tuned.likelihood = (tuned.likelihood || 60) + 10; // Increase by 10
    } else if (metrics.falseNegativeRate > targets.maxFNR) {
      tuned.likelihood = (tuned.likelihood || 60) - 5; // Decrease by 5
    }

    // Adjust time horizon threshold
    if (metrics.falsePositiveRate > targets.maxFPR) {
      tuned.timeHorizon = (tuned.timeHorizon || 30) - 5; // Decrease by 5 days
    } else if (metrics.falseNegativeRate > targets.maxFNR) {
      tuned.timeHorizon = (tuned.timeHorizon || 30) + 5; // Increase by 5 days
    }

    // Clamp values to reasonable ranges
    tuned.dollarExposure = Math.max(100000, Math.min(10000000, tuned.dollarExposure));
    tuned.likelihood = Math.max(10, Math.min(100, tuned.likelihood));
    tuned.timeHorizon = Math.max(1, Math.min(90, tuned.timeHorizon));

    return tuned;
  }

  /**
   * Request customer review of calibration results
   * @param {string} organizationId - Organization ID
   * @param {object} calibrationResults - Calibration results
   * @returns {object} Customer review results
   */
  async requestCustomerReview(organizationId, calibrationResults) {
    const review = {
      organizationId,
      requestedAt: new Date().toISOString(),
      status: 'pending',
      feedback: [],
      falsePositives: [],
      falseNegatives: [],
      thresholdAdjustments: [],
      approved: false
    };

    // Create review request in database
    await this.pool.query(
      `INSERT INTO calibration_reviews (organization_id, review_data, requested_at, status)
       VALUES ($1, $2, $3, $4)`,
      [organizationId, JSON.stringify(calibrationResults), new Date(), 'pending']
    );

    return review;
  }

  /**
   * Submit customer feedback
   * @param {string} organizationId - Organization ID
   * @param {object} feedback - Customer feedback
   * @returns {object} Submission result
   */
  async submitCustomerFeedback(organizationId, feedback) {
    const {
      falsePositives = [],
      falseNegatives = [],
      thresholdAdjustments = {},
      approved = false,
      reviewerId = null
    } = feedback;

    const result = {
      organizationId,
      submittedAt: new Date().toISOString(),
      success: false
    };

    try {
      // Update review record
      await this.pool.query(
        `UPDATE calibration_reviews
         SET feedback_data = $1,
             approved = $2,
             reviewed_at = $3,
             reviewer_id = $4,
             status = 'completed'
         WHERE organization_id = $5 AND status = 'pending'
         ORDER BY requested_at DESC
         LIMIT 1`,
        [JSON.stringify(feedback), approved, new Date(), reviewerId, organizationId]
      );

      // If approved, update active thresholds
      if (approved && Object.keys(thresholdAdjustments).length > 0) {
        await this.updateActiveThresholds(organizationId, thresholdAdjustments);
      }

      result.success = true;
      result.approved = approved;

    } catch (error) {
      result.error = error.message;
    }

    return result;
  }

  /**
   * Update active thresholds
   * @param {string} organizationId - Organization ID
   * @param {object} thresholds - New thresholds
   * @returns {object} Update result
   */
  async updateActiveThresholds(organizationId, thresholds) {
    try {
      await this.pool.query(
        `INSERT INTO alert_thresholds (organization_id, thresholds, updated_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (organization_id)
         DO UPDATE SET thresholds = $2, updated_at = $3`,
        [organizationId, JSON.stringify(thresholds), new Date()]
      );

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Load current thresholds
   * @param {string} organizationId - Organization ID
   * @returns {object} Current thresholds
   */
  async loadCurrentThresholds(organizationId) {
    try {
      const result = await this.pool.query(
        'SELECT thresholds FROM alert_thresholds WHERE organization_id = $1',
        [organizationId]
      );

      if (result.rows.length > 0) {
        return result.rows[0].thresholds;
      }

      // Return default thresholds
      return {
        dollarExposure: 1000000,
        likelihood: 60,
        timeHorizon: 30,
        mlrImpact: 1.5,
        stopLossUtilization: 80,
        reserveAdequacy: 95
      };
    } catch (error) {
      // Return defaults on error
      return {
        dollarExposure: 1000000,
        likelihood: 60,
        timeHorizon: 30,
        mlrImpact: 1.5,
        stopLossUtilization: 80,
        reserveAdequacy: 95
      };
    }
  }

  /**
   * Store calibration results
   * @param {string} organizationId - Organization ID
   * @param {object} results - Calibration results
   * @returns {object} Storage result
   */
  async storeCalibrationResults(organizationId, results) {
    try {
      await this.pool.query(
        `INSERT INTO calibration_history (organization_id, calibration_results, created_at)
         VALUES ($1, $2, $3)`,
        [organizationId, JSON.stringify(results), new Date()]
      );

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
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
            'Authorization': `Bearer ${process.env.AGENT_RUNTIME_AUTH_TOKEN || 'dev-token'}`
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
   * Calculate duration
   * @param {string} startTime - Start time
   * @param {string} endTime - End time
   * @returns {string} Duration
   */
  calculateDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;

    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);

    return `${minutes}m ${seconds}s`;
  }

  /**
   * Get calibration history
   * @param {string} organizationId - Organization ID
   * @param {number} limit - Limit results
   * @returns {Array<object>} Calibration history
   */
  async getCalibrationHistory(organizationId, limit = 10) {
    try {
      const result = await this.pool.query(
        `SELECT id, calibration_results, created_at
         FROM calibration_history
         WHERE organization_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [organizationId, limit]
      );

      return result.rows.map(row => ({
        id: row.id,
        ...row.calibration_results,
        createdAt: row.created_at
      }));
    } catch (error) {
      return [];
    }
  }
}

module.exports = ThresholdCalibrationService;
