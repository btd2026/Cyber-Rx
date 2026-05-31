'use strict';

/**
 * Signal Aggregation Utilities
 *
 * Provides helper functions for grouping, aggregating, and analyzing
 * vendor risk signals from multiple providers.
 */

class SignalAggregator {
  /**
   * Group signals by signal name (normalized)
   * @param {Array} signals - Array of signals
   * @returns {Object} Grouped signals { signalName: [signals] }
   */
  static groupBySignalName(signals) {
    const groups = {};

    signals.forEach(signal => {
      const normalizedName = this.normalizeSignalName(signal.signalName);

      if (!groups[normalizedName]) {
        groups[normalizedName] = [];
      }

      groups[normalizedName].push(signal);
    });

    return groups;
  }

  /**
   * Group signals by category
   * @param {Array} signals - Array of signals
   * @returns {Object} Grouped signals { category: [signals] }
   */
  static groupByCategory(signals) {
    const groups = {};

    signals.forEach(signal => {
      const category = signal.signalCategory;

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push(signal);
    });

    return groups;
  }

  /**
   * Group signals by source provider
   * @param {Array} signals - Array of signals
   * @returns {Object} Grouped signals { sourceName: [signals] }
   */
  static groupBySource(signals) {
    const groups = {};

    signals.forEach(signal => {
      const source = signal.sourceName;

      if (!groups[source]) {
        groups[source] = [];
      }

      groups[source].push(signal);
    });

    return groups;
  }

  /**
   * Normalize signal name for deduplication
   * Removes variations in capitalization, spacing, and common suffixes
   * @param {string} signalName - Raw signal name
   * @returns {string} Normalized name
   */
  static normalizeSignalName(signalName) {
    return signalName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\w_]/g, '')
      .replace(/_(vulnerability|issue|finding|detected|observed)$/g, '');
  }

  /**
   * Calculate signal age in days
   * @param {Date|string} observedAt - Observation timestamp
   * @returns {number} Age in days
   */
  static getSignalAge(observedAt) {
    const observed = new Date(observedAt);
    const now = new Date();
    const diffMs = now - observed;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if signal is stale (>30 days old)
   * @param {Date|string} observedAt - Observation timestamp
   * @param {number} staleDays - Days before considering stale (default: 30)
   * @returns {boolean} True if stale
   */
  static isSignalStale(observedAt, staleDays = 30) {
    const age = this.getSignalAge(observedAt);
    return age > staleDays;
  }

  /**
   * Get unique providers from signals
   * @param {Array} signals - Array of signals
   * @returns {Set} Set of provider names
   */
  static getUniqueProviders(signals) {
    return new Set(signals.map(s => s.sourceName));
  }

  /**
   * Count signals by severity
   * @param {Array} signals - Array of signals
   * @returns {Object} Count by severity { Critical: 0, High: 0, ... }
   */
  static countBySeverity(signals) {
    const counts = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
      Info: 0
    };

    signals.forEach(signal => {
      if (counts.hasOwnProperty(signal.severity)) {
        counts[signal.severity]++;
      }
    });

    return counts;
  }

  /**
   * Calculate average confidence score
   * @param {Array} signals - Array of signals
   * @returns {number} Average confidence (0-100)
   */
  static averageConfidence(signals) {
    if (signals.length === 0) return 0;

    const total = signals.reduce((sum, signal) => {
      return sum + (signal.confidence || 0);
    }, 0);

    return Math.round(total / signals.length);
  }

  /**
   * Find highest severity signal in group
   * @param {Array} signals - Array of signals
   * @returns {Object|null} Highest severity signal
   */
  static getHighestSeverity(signals) {
    if (signals.length === 0) return null;

    const severityRank = {
      Critical: 5,
      High: 4,
      Medium: 3,
      Low: 2,
      Info: 1
    };

    return signals.reduce((highest, signal) => {
      if (!highest || severityRank[signal.severity] > severityRank[highest.severity]) {
        return signal;
      }
      return highest;
    }, null);
  }

  /**
   * Find most recent signal in group
   * @param {Array} signals - Array of signals
   * @returns {Object|null} Most recent signal
   */
  static getMostRecent(signals) {
    if (signals.length === 0) return null;

    return signals.reduce((recent, signal) => {
      if (!recent || new Date(signal.observedAt) > new Date(recent.observedAt)) {
        return signal;
      }
      return recent;
    }, null);
  }

  /**
   * Check if multiple providers report similar findings
   * @param {Array} signals - Array of signals
   * @returns {boolean} True if 2+ providers report similar findings
   */
  static hasMultiProviderConfirmation(signals) {
    const providers = this.getUniqueProviders(signals);
    return providers.size >= 2;
  }

  /**
   * Calculate similarity between two signal names
   * Uses simple Jaccard similarity on word sets
   * @param {string} name1 - First signal name
   * @param {string} name2 - Second signal name
   * @returns {number} Similarity score (0-1)
   */
  static calculateSignalSimilarity(name1, name2) {
    const words1 = new Set(name1.toLowerCase().split(/\s+/));
    const words2 = new Set(name2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) return 0;

    return intersection.size / union.size;
  }

  /**
   * Find signals similar to a given signal
   * @param {Object} targetSignal - Target signal
   * @param {Array} signals - Array of signals to search
   * @param {number} threshold - Minimum similarity threshold (default: 0.5)
   * @returns {Array} Similar signals
   */
  static findSimilarSignals(targetSignal, signals, threshold = 0.5) {
    return signals.filter(signal => {
      if (signal.id === targetSignal.id) return false;

      const similarity = this.calculateSignalSimilarity(
        targetSignal.signalName,
        signal.signalName
      );

      return similarity >= threshold;
    });
  }

  /**
   * Aggregate duplicate findings across providers
   * @param {Array} signals - Array of signals
   * @returns {Array} Aggregated signal groups
   */
  static aggregateDuplicateFindings(signals) {
    const grouped = this.groupBySignalName(signals);
    const aggregated = [];

    Object.values(grouped).forEach(group => {
      if (group.length === 1) {
        // No duplicates
        aggregated.push({
          signal: group[0],
          duplicateCount: 0,
          providers: [group[0].sourceName]
        });
      } else {
        // Has duplicates from multiple providers
        aggregated.push({
          signal: this.getHighestSeverity(group),
          duplicateCount: group.length - 1,
          providers: group.map(s => s.sourceName),
          allSignals: group
        });
      }
    });

    return aggregated;
  }

  /**
   * Get signal freshness score
   * @param {Date|string} observedAt - Observation timestamp
   * @returns {number} Freshness score (0-1, where 1 is fresh)
   */
  static getFreshnessScore(observedAt) {
    const age = this.getSignalAge(observedAt);

    if (age <= 7) return 1.0;      // Fresh (within 7 days)
    if (age <= 14) return 0.8;     // Recent (8-14 days)
    if (age <= 30) return 0.6;     // Acceptable (15-30 days)
    if (age <= 60) return 0.4;     // Stale (31-60 days)
    return 0.2;                     // Very stale (>60 days)
  }

  /**
   * Calculate data freshness factor for confidence
   * @param {Date|string} observedAt - Observation timestamp
   * @returns {number} Freshness multiplier (0.7 for stale, 1.0 for fresh)
   */
  static getFreshnessMultiplier(observedAt) {
    return this.isSignalStale(observedAt) ? 0.7 : 1.0;
  }

  /**
   * Get provider coverage for a vendor
   * @param {Array} signals - Array of signals
   * @param {Array} expectedProviders - Expected provider names
   * @returns {Object} Coverage stats
   */
  static getProviderCoverage(signals, expectedProviders) {
    const actualProviders = this.getUniqueProviders(signals);
    const coverage = {
      total: expectedProviders.length,
      covered: actualProviders.size,
      missing: [],
      partial: actualProviders.size < expectedProviders.length,
      full: actualProviders.size === expectedProviders.length
    };

    expectedProviders.forEach(provider => {
      if (!actualProviders.has(provider)) {
        coverage.missing.push(provider);
      }
    });

    return coverage;
  }
}

module.exports = SignalAggregator;
