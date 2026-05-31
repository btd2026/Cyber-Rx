'use strict';

const VendorRiskSignal = require('../models/VendorRiskSignal');
const SignalAggregator = require('../utils/signalAggregator');
const ConflictResolver = require('../utils/conflictResolver');

/**
 * Signal Correlation Service
 *
 * Implements intelligent signal correlation across multiple cyber intelligence providers.
 * Combines signals from SecurityScorecard, BitSight, RiskRecon, and other sources,
 * resolves conflicts, calculates composite scores, and deduplicates findings.
 */
class SignalCorrelationService {
  // Provider weights for composite scoring
  static PROVIDER_WEIGHTS = {
    'SecurityScorecard': 0.40,
    'BitSight': 0.35,
    'RiskRecon': 0.25
  };

  // Default provider list for coverage checks
  static DEFAULT_PROVIDERS = ['SecurityScorecard', 'BitSight', 'RiskRecon'];

  /**
   * Correlate signals for a vendor across all providers
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Correlation options
   * @param {string} options.resolutionStrategy - Conflict resolution strategy (highest, weighted, consensus, latest)
   * @param {boolean} options.includeRawSignals - Include raw signals in response
   * @param {Array} options.providerWeights - Custom provider weights
   * @returns {Promise<Object>} Correlation result
   */
  static async correlateSignals(vendorId, organizationId, options = {}) {
    const {
      resolutionStrategy = 'highest',
      includeRawSignals = false,
      providerWeights = this.PROVIDER_WEIGHTS
    } = options;

    // Step 1: Fetch all signals for vendor
    const signals = await VendorRiskSignal.findByVendor(vendorId, organizationId);

    if (signals.length === 0) {
      return {
        vendorId,
        organizationId,
        signals: [],
        compositeScore: null,
        providers: 0,
        summary: {
          totalSignals: 0,
          activeSignals: 0,
          categories: {},
          severityBreakdown: {}
        },
        message: 'No signals found for this vendor'
      };
    }

    // Step 2: Filter active signals
    const activeSignals = signals.filter(s => s.status === 'active');

    // Step 3: Group by signal name for deduplication
    const groupedBySignal = SignalAggregator.groupBySignalName(activeSignals);

    // Step 4: Resolve conflicts for each group
    const correlatedSignals = ConflictResolver.resolveAllGroups(
      groupedBySignal,
      resolutionStrategy
    );

    // Step 5: Apply freshness factors and update metadata
    const enrichedSignals = correlatedSignals.map(correlation => {
      const signal = correlation.resolvedSignal;
      const adjustedConfidence = ConflictResolver.applyFreshnessFactor(
        correlation.confidence,
        signal.observedAt
      );

      return {
        ...correlation,
        resolvedSignal: {
          ...signal,
          adjustedConfidence
        },
        confidence: adjustedConfidence,
        metadata: {
          ...correlation.metadata,
          dataFreshness: SignalAggregator.isSignalStale(signal.observedAt) ? 'stale' : 'fresh',
          ageDays: SignalAggregator.getSignalAge(signal.observedAt),
          freshnessScore: SignalAggregator.getFreshnessScore(signal.observedAt)
        }
      };
    });

    // Step 6: Calculate composite score
    const compositeScore = this.calculateCompositeScore(
      activeSignals,
      providerWeights
    );

    // Step 7: Get provider coverage
    const providerCoverage = SignalAggregator.getProviderCoverage(
      activeSignals,
      this.DEFAULT_PROVIDERS
    );

    // Step 8: Generate summary
    const summary = this.generateSummary(enrichedSignals, activeSignals);

    // Step 9: Build response
    const response = {
      vendorId,
      organizationId,
      vendorName: signals[0].vendorName,
      signals: includeRawSignals
        ? enrichedSignals
        : enrichedSignals.map(s => this.omitRawSignals(s)),
      compositeScore,
      providers: SignalAggregator.getUniqueProviders(activeSignals).size,
      providerCoverage,
      summary,
      correlationMetadata: {
        totalSignalsProcessed: signals.length,
        activeSignalsProcessed: activeSignals.length,
        signalGroups: Object.keys(groupedBySignal).length,
        resolutionStrategy,
        correlatedAt: new Date().toISOString()
      }
    };

    return response;
  }

  /**
   * Calculate composite risk score from multiple providers
   * @param {Array} signals - Array of active signals
   * @param {Object} providerWeights - Provider weight configuration
   * @returns {Object} Composite score with breakdown
   */
  static calculateCompositeScore(signals, providerWeights = this.PROVIDER_WEIGHTS) {
    // Group signals by provider
    const groupedByProvider = SignalAggregator.groupBySource(signals);

    // Calculate provider scores (0-100, where higher is better)
    const providerScores = {};

    Object.entries(groupedByProvider).forEach(([provider, providerSignals]) => {
      providerScores[provider] = this.calculateProviderScore(providerSignals);
    });

    // Calculate weighted average
    let weightedSum = 0;
    let totalWeight = 0;

    Object.entries(providerWeights).forEach(([provider, weight]) => {
      if (providerScores[provider] !== undefined) {
        weightedSum += providerScores[provider] * weight;
        totalWeight += weight;
      }
    });

    // Normalize if some providers are missing
    const baseScore = totalWeight > 0 ? weightedSum / totalWeight : 50;

    // Apply multipliers
    const multiplier = this.calculateMultiplier(signals, groupedByProvider);
    const finalScore = Math.round(baseScore * multiplier);
    const clampedScore = Math.max(0, Math.min(100, finalScore));

    // Determine risk rating from score
    const riskRating = this.scoreToRiskRating(clampedScore);

    return {
      overallScore: clampedScore,
      riskRating,
      breakdown: providerScores,
      multiplier: {
        value: multiplier,
        applied: multiplier !== 1.0,
        reason: this.getMultiplierReason(signals, groupedByProvider)
      },
      calculation: {
        baseScore: Math.round(baseScore),
        weightedSum: Math.round(weightedSum),
        totalWeight,
        formula: 'Weighted Average × Multiplier Bonus'
      }
    };
  }

  /**
   * Calculate score for a single provider
   * @param {Array} signals - Provider's signals
   * @returns {number} Provider score (0-100, higher is better)
   */
  static calculateProviderScore(signals) {
    if (signals.length === 0) return 50; // Neutral score

    // Start with 100, subtract penalties for severity
    const severityPenalties = {
      Critical: 40,
      High: 25,
      Medium: 10,
      Low: 5,
      Info: 0
    };

    let penalty = 0;
    signals.forEach(signal => {
      penalty += severityPenalties[signal.severity] || 0;
    });

    // Apply freshness factor (stale data = less penalty)
    const latestSignal = SignalAggregator.getMostRecent(signals);
    const freshnessMultiplier = SignalAggregator.getFreshnessMultiplier(
      latestSignal?.observedAt || new Date()
    );

    penalty = penalty * freshnessMultiplier;

    const score = Math.max(0, 100 - penalty);
    return Math.round(score);
  }

  /**
   * Calculate multiplier bonus based on provider agreement
   * @param {Array} signals - All signals
   * @param {Object} groupedByProvider - Signals grouped by provider
   * @returns {number} Multiplier (0.9-1.1)
   */
  static calculateMultiplier(signals, groupedByProvider) {
    let multiplier = 1.0;

    // Check for multi-provider confirmation
    const signalGroups = SignalAggregator.groupBySignalName(signals);
    let confirmedFindings = 0;

    Object.values(signalGroups).forEach(group => {
      const providers = SignalAggregator.getUniqueProviders(group);
      if (providers.size >= 2) {
        confirmedFindings++;
      }
    });

    // +10% bonus if 2+ providers confirm same finding
    if (confirmedFindings >= 1) {
      multiplier += 0.10;
    }

    // +5% bonus if all providers agree on most findings
    const totalProviders = Object.keys(groupedByProvider).length;
    if (totalProviders >= 3 && confirmedFindings >= 2) {
      multiplier += 0.05;
    }

    // -10% penalty if significant disagreement
    let significantDisagreements = 0;
    Object.values(signalGroups).forEach(group => {
      if (ConflictResolver.hasSignificantDisagreement(group)) {
        significantDisagreements++;
      }
    });

    if (significantDisagreements >= 2) {
      multiplier -= 0.10;
    }

    return Math.max(0.9, Math.min(1.1, multiplier));
  }

  /**
   * Get reason for multiplier application
   * @param {Array} signals - All signals
   * @param {Object} groupedByProvider - Signals grouped by provider
   * @returns {string} Reason explanation
   */
  static getMultiplierReason(signals, groupedByProvider) {
    const reasons = [];

    const signalGroups = SignalAggregator.groupBySignalName(signals);
    let confirmedFindings = 0;
    let significantDisagreements = 0;

    Object.values(signalGroups).forEach(group => {
      const providers = SignalAggregator.getUniqueProviders(group);
      if (providers.size >= 2) {
        confirmedFindings++;
      }
      if (ConflictResolver.hasSignificantDisagreement(group)) {
        significantDisagreements++;
      }
    });

    if (confirmedFindings >= 1) {
      reasons.push(`+10%: ${confirmedFindings} findings confirmed by 2+ providers`);
    }

    if (Object.keys(groupedByProvider).length >= 3 && confirmedFindings >= 2) {
      reasons.push('+5%: Strong multi-provider agreement');
    }

    if (significantDisagreements >= 2) {
      reasons.push(`-10%: ${significantDisagreements} significant provider disagreements`);
    }

    if (reasons.length === 0) {
      return 'Baseline: No significant agreement or disagreement';
    }

    return reasons.join('; ');
  }

  /**
   * Convert numeric score to risk rating
   * @param {number} score - Score (0-100)
   * @returns {string} Risk rating
   */
  static scoreToRiskRating(score) {
    if (score >= 80) return 'Low';
    if (score >= 60) return 'Medium';
    if (score >= 40) return 'High';
    return 'Critical';
  }

  /**
   * Generate summary statistics
   * @param {Array} correlatedSignals - Correlated signals
   * @param {Array} originalSignals - Original active signals
   * @returns {Object} Summary statistics
   */
  static generateSummary(correlatedSignals, originalSignals) {
    const severityCounts = SignalAggregator.countBySeverity(correlatedSignals.map(s => s.resolvedSignal));
    const categories = SignalAggregator.groupByCategory(originalSignals);

    const categorySummary = {};
    Object.entries(categories).forEach(([category, signals]) => {
      categorySummary[category] = {
        totalSignals: signals.length,
        criticalCount: signals.filter(s => s.severity === 'Critical').length,
        highCount: signals.filter(s => s.severity === 'High').length,
        avgConfidence: SignalAggregator.averageConfidence(signals)
      };
    });

    // Count conflicts resolved
    const conflictsResolved = correlatedSignals.filter(s =>
      s.metadata.conflictDetected || s.metadata.multiProviderConfirmation
    ).length;

    return {
      totalSignals: correlatedSignals.length,
      activeSignals: originalSignals.length,
      severityBreakdown: severityCounts,
      categories: categorySummary,
      conflictsResolved,
      multiProviderConfirmations: correlatedSignals.filter(s =>
        s.metadata.multiProviderConfirmation
      ).length,
      staleSignals: correlatedSignals.filter(s =>
        s.metadata.dataFreshness === 'stale'
      ).length
    };
  }

  /**
   * Remove raw signals from response for cleaner output
   * @param {Object} signal - Correlated signal object
   * @returns {Object} Signal without raw data
   */
  static omitRawSignals(signal) {
    const { rawSignals, ...rest } = signal;
    return rest;
  }

  /**
   * Get correlation for a specific signal type
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @param {string} signalCategory - Signal category
   * @param {Object} options - Correlation options
   * @returns {Promise<Object>} Correlation result for category
   */
  static async correlateByCategory(vendorId, organizationId, signalCategory, options = {}) {
    const signals = await VendorRiskSignal.findByOrganization(organizationId, {
      vendorId,
      signalCategory
    });

    if (signals.length === 0) {
      return {
        vendorId,
        organizationId,
        signalCategory,
        signals: [],
        message: `No signals found for category: ${signalCategory}`
      };
    }

    const activeSignals = signals.filter(s => s.status === 'active');
    const groupedBySignal = SignalAggregator.groupBySignalName(activeSignals);
    const correlatedSignals = ConflictResolver.resolveAllGroups(
      groupedBySignal,
      options.resolutionStrategy || 'highest'
    );

    return {
      vendorId,
      organizationId,
      vendorName: signals[0].vendorName,
      signalCategory,
      signals: correlatedSignals,
      summary: {
        totalSignals: signals.length,
        activeSignals: activeSignals.length,
        signalGroups: Object.keys(groupedBySignal).length
      }
    };
  }

  /**
   * Get correlation statistics across organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Organization-wide correlation stats
   */
  static async getOrganizationStats(organizationId) {
    const signals = await VendorRiskSignal.findByOrganization(organizationId);
    const activeSignals = signals.filter(s => s.status === 'active');

    // Count by vendor
    const vendorCounts = {};
    signals.forEach(signal => {
      if (!vendorCounts[signal.vendorId]) {
        vendorCounts[signal.vendorId] = {
          vendorName: signal.vendorName,
          totalSignals: 0,
          activeSignals: 0,
          criticalCount: 0
        };
      }
      vendorCounts[signal.vendorId].totalSignals++;
      if (signal.status === 'active') {
        vendorCounts[signal.vendorId].activeSignals++;
      }
      if (signal.severity === 'Critical') {
        vendorCounts[signal.vendorId].criticalCount++;
      }
    });

    // Count by provider
    const providerCounts = SignalAggregator.groupBySource(signals);
    const providerStats = {};
    Object.entries(providerCounts).forEach(([provider, providerSignals]) => {
      providerStats[provider] = {
        totalSignals: providerSignals.length,
        activeSignals: providerSignals.filter(s => s.status === 'active').length,
        vendors: new Set(providerSignals.map(s => s.vendorId)).size
      };
    });

    // Count by category
    const categories = SignalAggregator.groupByCategory(activeSignals);
    const categoryStats = {};
    Object.entries(categories).forEach(([category, categorySignals]) => {
      categoryStats[category] = {
        totalSignals: categorySignals.length,
        criticalCount: categorySignals.filter(s => s.severity === 'Critical').length,
        highCount: categorySignals.filter(s => s.severity === 'High').length
      };
    });

    return {
      organizationId,
      totalSignals: signals.length,
      activeSignals: activeSignals.length,
      vendors: Object.keys(vendorCounts).length,
      providers: Object.keys(providerCounts).length,
      vendorStats: Object.values(vendorCounts),
      providerStats,
      categoryStats,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Detect duplicates across all vendors in organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Duplicate detection results
   */
  static async detectOrganizationDuplicates(organizationId) {
    const signals = await VendorRiskSignal.findByOrganization(organizationId);
    const activeSignals = signals.filter(s => s.status === 'active');

    // Group by signal name across all vendors
    const allGroups = SignalAggregator.groupBySignalName(activeSignals);

    // Find groups with multiple vendors (cross-vendor patterns)
    const crossVendorPatterns = [];
    Object.entries(allGroups).forEach(([signalName, signalGroup]) => {
      const vendors = new Set(signalGroup.map(s => s.vendorId));
      if (vendors.size > 1) {
        crossVendorPatterns.push({
          signalName,
          affectedVendors: vendors.size,
          signals: signalGroup.length,
          vendors: Array.from(vendors)
        });
      }
    });

    return {
      organizationId,
      totalSignalGroups: Object.keys(allGroups).length,
      crossVendorPatterns: crossVendorPatterns.length,
      patterns: crossVendorPatterns.sort((a, b) => b.affectedVendors - a.affectedVendors),
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Export correlation data for frontend integration
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Formatted correlation data
   */
  static async exportForFrontend(vendorId, organizationId) {
    const correlation = await this.correlateSignals(vendorId, organizationId, {
      includeRawSignals: false
    });

    // Format for frontend consumption
    return {
      vendor: {
        id: correlation.vendorId,
        name: correlation.vendorName
      },
      riskScore: {
        overall: correlation.compositeScore.overallScore,
        rating: correlation.compositeScore.riskRating,
        breakdown: correlation.compositeScore.breakdown
      },
      signals: correlation.signals.map(s => ({
        id: s.resolvedSignal.id,
        category: s.resolvedSignal.signalCategory,
        name: s.resolvedSignal.signalName,
        severity: s.resolvedSignal.severity,
        confidence: s.confidence,
        sources: s.sources,
        ageDays: s.metadata.ageDays,
        freshness: s.metadata.dataFreshness,
        conflictResolved: s.metadata.conflictDetected,
        multiProviderConfirmed: s.metadata.multiProviderConfirmation
      })),
      summary: correlation.summary,
      providers: correlation.providers,
      generatedAt: correlation.correlationMetadata.correlatedAt
    };
  }
}

module.exports = SignalCorrelationService;
