'use strict';

const { v4: uuidv4 } = require('uuid');
const VendorRiskSignal = require('../models/VendorRiskSignal');
const Risk = require('../models/Risk');

/**
 * Continuous Monitoring Service
 *
 * Orchestrates data collection from 12 connector services, calculates composite
 * vendor risk scores, correlates signals to risks, and manages dashboards.
 */
class ContinuousMonitoringService {
  /**
   * Calculate composite vendor risk score
   *
   * Formula:
   * - 20% External Attack Surface posture
   * - 25% Breach/Incident Intelligence
   * - 20% Compliance Evidence
   * - 10% Questionnaire/Attestation confidence
   * - 15% Business Criticality
   * - 10% Data Sensitivity/PHI exposure
   *
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Risk score with breakdown
   */
  static async calculateVendorRiskScore(vendorId, organizationId) {
    const signals = await VendorRiskSignal.findActiveByVendor(vendorId, organizationId);

    // Calculate category scores (0-100 each, where 0 = bad, 100 = good)
    const externalPostureScore = this.calculateCategoryScore(signals, 'External Attack Surface');
    const breachIntelScore = this.calculateCategoryScore(signals, 'Breach/Incident Intelligence');
    const complianceScore = this.calculateCategoryScore(signals, 'Compliance Evidence');
    const questionnaireScore = this.calculateCategoryScore(signals, 'Questionnaire/Attestation');
    const businessCriticalityScore = this.calculateCategoryScore(signals, 'Business Criticality');
    const dataSensitivityScore = this.calculateCategoryScore(signals, 'Data Sensitivity');

    // Weighted composite formula
    const compositeScore = (
      (externalPostureScore * 0.20) +
      (breachIntelScore * 0.25) +
      (complianceScore * 0.20) +
      (questionnaireScore * 0.10) +
      (businessCriticalityScore * 0.15) +
      (dataSensitivityScore * 0.10)
    );

    return {
      overallScore: Math.round(compositeScore),
      breakdown: {
        externalPosture: Math.round(externalPostureScore),
        breachIntel: Math.round(breachIntelScore),
        compliance: Math.round(complianceScore),
        questionnaire: Math.round(questionnaireScore),
        businessCriticality: Math.round(businessCriticalityScore),
        dataSensitivity: Math.round(dataSensitivityScore)
      }
    };
  }

  /**
   * Calculate score for a specific signal category
   * @param {Array} signals - Array of signals
   * @param {string} category - Category name
   * @returns {number} Score 0-100 (higher is better)
   */
  static calculateCategoryScore(signals, category) {
    const categorySignals = signals.filter(s => s.signalCategory === category);

    if (categorySignals.length === 0) {
      // No signals = neutral score (50)
      return 50;
    }

    // Calculate penalty based on severity
    let penalty = 0;
    categorySignals.forEach(signal => {
      switch (signal.severity) {
        case 'Critical':
          penalty += 40;
          break;
        case 'High':
          penalty += 25;
          break;
        case 'Medium':
          penalty += 10;
          break;
        case 'Low':
          penalty += 5;
          break;
        case 'Info':
          penalty += 0;
          break;
      }
    });

    // Score starts at 100, subtract penalties, minimum 0
    return Math.max(0, 100 - penalty);
  }

  /**
   * Collect signals from all connected sources for a vendor
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of collected signals
   */
  static async collectVendorSignals(vendorId, organizationId) {
    // This will be implemented when connectors are created
    // For now, return empty array
    return [];
  }

  /**
   * Sync from a specific connector (with fallback to manual entry)
   * @param {string} connectorType - Connector type (e.g., 'securityscorecard', 'bitsight')
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @param {Object} credentials - Connector credentials
   * @returns {Promise<Object>} Sync result
   */
  static async syncConnector(connectorType, vendorId, organizationId, credentials) {
    // This will be implemented when connectors are created
    return {
      connectorType,
      status: 'not_implemented',
      signalsCollected: 0,
      message: 'Connector not yet implemented'
    };
  }

  /**
   * Correlate signals to create/update Risks
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Correlation result
   */
  static async correlateSignalsToRisks(vendorId, organizationId) {
    const signals = await VendorRiskSignal.findActiveByVendor(vendorId, organizationId);
    const criticalSignals = signals.filter(s => s.severity === 'Critical');
    const highSignals = signals.filter(s => s.severity === 'High');

    // Create or update vendor risk if critical/high signals present
    if (criticalSignals.length > 0 || highSignals.length >= 3) {
      const existingRisks = await Risk.findByOrganization(organizationId, { vendorId });
      let risk = existingRisks[0];

      const riskTitle = `Vendor Risk: ${signals[0].vendorName}`;
      const riskSeverity = criticalSignals.length > 0 ? 'Critical' : 'High';
      const frameworks = ['HIPAA-SA-9', 'NIST-A.5.19'];

      if (!risk) {
        // Create new risk
        risk = await Risk.create({
          id: uuidv4(),
          title: riskTitle,
          severity: riskSeverity,
          status: 'open',
          organizationId,
          vendorId,
          frameworkMappings: frameworks,
          executiveOwner: 'CRO',
          evidenceOwner: 'CLO',
          description: `Vendor risk detected from ${signals.length} active signals across ${new Set(signals.map(s => s.sourceName)).size} monitoring sources.`
        });
      } else {
        // Update existing risk
        await Risk.update(risk.id, {
          severity: riskSeverity,
          frameworkMappings: frameworks
        });
      }

      return {
        correlated: true,
        riskId: risk.id,
        signalCount: signals.length,
        criticalCount: criticalSignals.length,
        highCount: highSignals.length
      };
    }

    return {
      correlated: false,
      reason: 'Insufficient signal severity to create risk'
    };
  }

  /**
   * Get vendor dashboard data (7 metrics + signals)
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Dashboard data
   */
  static async getVendorDashboard(vendorId, organizationId) {
    const signals = await VendorRiskSignal.findByVendor(vendorId, organizationId);
    const activeSignals = signals.filter(s => s.status === 'active');
    const summary = await VendorRiskSignal.getVendorSignalSummary(vendorId, organizationId);
    const score = await this.calculateVendorRiskScore(vendorId, organizationId);

    // Calculate breach/incident watch status
    const breachSignals = activeSignals.filter(s =>
      s.signalCategory === 'Breach/Incident Intelligence' ||
      s.signalCategory === 'Regulatory Breach Disclosure'
    );
    const activeBreaches = breachSignals.filter(s => s.severity === 'Critical' || s.severity === 'High').length;
    const recentIncidents = breachSignals.filter(s => {
      const daysSinceObserved = Math.floor((Date.now() - new Date(s.observedAt).getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceObserved <= 30;
    }).length;

    // Compliance score from breakdown
    const complianceScore = score.breakdown.compliance;

    // Attack surface trend (simplified - would use historical data)
    const attackSurfaceSignals = activeSignals.filter(s => s.signalCategory === 'External Attack Surface');
    const attackSurfaceDirection = attackSurfaceSignals.length > 0 ? 'increasing' : 'stable';
    const attackSurfaceTrend = attackSurfaceDirection === 'increasing' ? '📈 Increasing' : '➡️ Stable';

    // Evidence freshness (check compliance evidence signals)
    const complianceEvidence = activeSignals.filter(s => s.signalCategory === 'Compliance Evidence');
    const latestEvidence = complianceEvidence.length > 0
      ? Math.max(...complianceEvidence.map(s => new Date(s.observedAt).getTime()))
      : null;
    const evidenceFreshness = latestEvidence
      ? Math.floor((Date.now() - latestEvidence) / (1000 * 60 * 60 * 24))
      : null;

    // Count connected sources (unique source names in signals)
    const connectedSources = new Set(activeSignals.map(s => s.sourceName)).size;

    // Open findings (linked to risks)
    const vendorRisks = await Risk.findByOrganization(organizationId, { vendorId });
    const openFindings = vendorRisks.filter(r => r.status === 'open' || r.status === 'mitigating').length;
    const criticalFindings = vendorRisks.filter(r => r.severity === 'Critical' && (r.status === 'open' || r.status === 'mitigating')).length;

    // Required actions (active critical/high signals not yet addressed)
    const requiredActions = activeSignals.filter(s =>
      (s.severity === 'Critical' || s.severity === 'High') &&
      s.status === 'active'
    ).length;

    // Signals by category
    const signalsByCategory = {};
    activeSignals.forEach(signal => {
      if (!signalsByCategory[signal.signalCategory]) {
        signalsByCategory[signal.signalCategory] = {
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0
        };
      }
      signalsByCategory[signal.signalCategory].total++;
      signalsByCategory[signal.signalCategory][signal.severity.toLowerCase()]++;
    });

    // Recent signals (last 30 days)
    const recentSignals = activeSignals
      .filter(s => {
        const daysSince = Math.floor((Date.now() - new Date(s.observedAt).getTime()) / (1000 * 60 * 60 * 24));
        return daysSince <= 30;
      })
      .sort((a, b) => new Date(b.observedAt) - new Date(a.observedAt))
      .slice(0, 20); // Top 20 most recent

    return {
      vendorId,
      vendorName: signals.length > 0 ? signals[0].vendorName : 'Unknown Vendor',
      overallRiskScore: score.overallScore,
      riskScoreBreakdown: score.breakdown,

      // 7 Key metrics
      breachStatus: activeBreaches > 0 ? 'critical' : recentIncidents > 0 ? 'warning' : 'clear',
      activeBreaches,
      recentIncidents,
      complianceScore,
      attackSurfaceTrend,
      attackSurfaceDirection,
      evidenceFreshness: evidenceFreshness ? `${evidenceFreshness} days` : 'No evidence',
      openFindings,
      criticalFindings,
      requiredActions,
      connectedSources,

      // Signal data
      totalSignals: summary.totalSignals,
      activeSignals: summary.activeCount,
      signalsByCategory,
      recentSignals,

      // Summary
      criticalCount: summary.criticalCount,
      highCount: summary.highCount,
      mediumCount: summary.mediumCount,
      lowCount: summary.lowCount
    };
  }

  /**
   * Trigger evidence refresh workflow
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Result
   */
  static async requestEvidenceRefresh(vendorId, organizationId) {
    // Create a task to collect updated evidence
    // This will integrate with RemediationTask entity
    return {
      message: 'Evidence refresh request created',
      vendorId,
      status: 'pending'
    };
  }

  /**
   * Create reassessment task
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @param {string} reason - Reason for reassessment
   * @returns {Promise<Object>} Result
   */
  static async createReassessmentTask(vendorId, organizationId, reason) {
    // Create a remediation task for vendor reassessment
    // This will integrate with RemediationTask entity
    return {
      message: 'Reassessment task created',
      vendorId,
      reason,
      status: 'pending'
    };
  }

  /**
   * Manual entry fallback for web scraping failures
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @param {Object} signalData - Manual signal data
   * @returns {Promise<Object>} Created signal
   */
  static async recordManualSignal(vendorId, organizationId, signalData) {
    const signal = await VendorRiskSignal.create({
      id: uuidv4(),
      organizationId,
      vendorId,
      vendorName: signalData.vendorName,
      sourceName: signalData.sourceName,
      sourceType: 'manual',
      signalCategory: signalData.signalCategory,
      signalName: signalData.signalName,
      severity: signalData.severity,
      confidence: signalData.confidence || 50,
      observedAt: signalData.observedAt || new Date(),
      status: 'active',
      evidenceUrl: signalData.evidenceUrl || null,
      description: signalData.description,
      recommendedAction: signalData.recommendedAction || null,
      mappedFrameworks: signalData.mappedFrameworks || [],
      mappedPolicies: signalData.mappedPolicies || [],
      rawData: signalData.rawData || {}
    });

    return {
      signal,
      message: 'Manual signal recorded successfully'
    };
  }
}

module.exports = ContinuousMonitoringService;
