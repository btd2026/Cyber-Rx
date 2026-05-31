'use strict';

const SignalAggregator = require('./signalAggregator');

/**
 * Conflict Resolution Strategies
 *
 * Implements multiple strategies for resolving conflicts when
 * multiple providers report different severities for the same finding.
 */

class ConflictResolver {
  /**
   * Strategy 1: Highest Severity Wins
   * When providers disagree, use the highest severity reported
   * @param {Array} signals - Array of conflicting signals
   * @returns {Object} Resolved signal with metadata
   */
  static resolveByHighestSeverity(signals) {
    const highest = SignalAggregator.getHighestSeverity(signals);
    const providers = SignalAggregator.getUniqueProviders(signals);

    return {
      resolvedSignal: { ...highest },
      resolutionStrategy: 'highest_severity',
      confidence: highest.confidence || SignalAggregator.averageConfidence(signals),
      metadata: {
        originalProviders: Array.from(providers),
        severityRange: this.getSeverityRange(signals),
        conflictDetected: this.hasSeverityConflict(signals),
        resolutionReason: `Selected highest severity (${highest.severity}) from ${highest.sourceName}`
      }
    };
  }

  /**
   * Strategy 2: Confidence Weighted
   * Weight severity by provider's confidence score
   * @param {Array} signals - Array of conflicting signals
   * @returns {Object} Resolved signal with metadata
   */
  static resolveByConfidenceWeighting(signals) {
    const severityScore = {
      Critical: 100,
      High: 75,
      Medium: 50,
      Low: 25,
      Info: 0
    };

    // Calculate weighted severity score
    let totalWeight = 0;
    let weightedScore = 0;

    signals.forEach(signal => {
      const confidence = signal.confidence || 50;
      const severityValue = severityScore[signal.severity] || 0;
      const weight = confidence / 100;

      weightedScore += severityValue * weight;
      totalWeight += weight;
    });

    // Normalize by total weight
    const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

    // Convert back to severity
    const resolvedSeverity = this.scoreToSeverity(finalScore);

    // Select signal closest to weighted average
    const resolvedSignal = signals.reduce((closest, signal) => {
      const signalScore = severityScore[signal.severity] || 0;
      const closestScore = severityScore[closest.severity] || 0;

      if (Math.abs(signalScore - finalScore) < Math.abs(closestScore - finalScore)) {
        return signal;
      }
      return closest;
    }, signals[0]);

    const providers = SignalAggregator.getUniqueProviders(signals);

    return {
      resolvedSignal: { ...resolvedSignal, severity: resolvedSeverity },
      resolutionStrategy: 'confidence_weighted',
      confidence: Math.round(finalScore),
      metadata: {
        originalProviders: Array.from(providers),
        weightedScore: Math.round(finalScore),
        severityRange: this.getSeverityRange(signals),
        conflictDetected: this.hasSeverityConflict(signals),
        resolutionReason: `Calculated weighted severity (${resolvedSeverity}) based on provider confidence scores`
      }
    };
  }

  /**
   * Strategy 3: Consensus Based
   * If 2+ providers agree on severity, use that. Otherwise highest wins.
   * @param {Array} signals - Array of conflicting signals
   * @returns {Object} Resolved signal with metadata
   */
  static resolveByConsensus(signals) {
    // Count occurrences of each severity
    const severityCounts = {};
    signals.forEach(signal => {
      const severity = signal.severity;
      if (!severityCounts[severity]) {
        severityCounts[severity] = 0;
      }
      severityCounts[severity]++;
    });

    // Find if any severity has consensus (2+ providers)
    let consensusSeverity = null;
    let maxCount = 0;

    Object.entries(severityCounts).forEach(([severity, count]) => {
      if (count >= 2 && count > maxCount) {
        consensusSeverity = severity;
        maxCount = count;
      }
    });

    let resolvedSignal;
    let resolutionReason;

    if (consensusSeverity) {
      // Use consensus severity
      resolvedSignal = signals.find(s => s.severity === consensusSeverity);
      resolutionReason = `Consensus among ${maxCount} providers for ${consensusSeverity} severity`;
    } else {
      // No consensus, fall back to highest severity
      resolvedSignal = SignalAggregator.getHighestSeverity(signals);
      resolutionReason = `No consensus found, using highest severity (${resolvedSignal.severity})`;
    }

    const providers = SignalAggregator.getUniqueProviders(signals);

    return {
      resolvedSignal: { ...resolvedSignal },
      resolutionStrategy: 'consensus_based',
      confidence: resolvedSignal.confidence || SignalAggregator.averageConfidence(signals),
      metadata: {
        originalProviders: Array.from(providers),
        severityCounts,
        consensusAchieved: consensusSeverity !== null,
        consensusSeverity,
        severityRange: this.getSeverityRange(signals),
        conflictDetected: this.hasSeverityConflict(signals),
        resolutionReason
      }
    };
  }

  /**
   * Strategy 4: Latest Timestamp
   * Prefer the most recently observed signal
   * @param {Array} signals - Array of conflicting signals
   * @returns {Object} Resolved signal with metadata
   */
  static resolveByLatestTimestamp(signals) {
    const latest = SignalAggregator.getMostRecent(signals);
    const providers = SignalAggregator.getUniqueProviders(signals);

    return {
      resolvedSignal: { ...latest },
      resolutionStrategy: 'latest_timestamp',
      confidence: latest.confidence || SignalAggregator.averageConfidence(signals),
      metadata: {
        originalProviders: Array.from(providers),
        observedAt: latest.observedAt,
        ageDays: SignalAggregator.getSignalAge(latest.observedAt),
        severityRange: this.getSeverityRange(signals),
        conflictDetected: this.hasSeverityConflict(signals),
        resolutionReason: `Selected most recent signal from ${latest.sourceName} (${SignalAggregator.getSignalAge(latest.observedAt)} days ago)`
      }
    };
  }

  /**
   * Resolve conflicts using specified strategy
   * @param {Array} signals - Array of conflicting signals
   * @param {string} strategy - Strategy name (highest, weighted, consensus, latest)
   * @returns {Object} Resolved signal with metadata
   */
  static resolveConflict(signals, strategy = 'highest') {
    if (signals.length === 0) {
      throw new Error('Cannot resolve conflict: no signals provided');
    }

    if (signals.length === 1) {
      // No conflict to resolve
      return {
        resolvedSignal: signals[0],
        resolutionStrategy: 'none',
        confidence: signals[0].confidence || 50,
        metadata: {
          originalProviders: [signals[0].sourceName],
          conflictDetected: false,
          resolutionReason: 'Single signal, no conflict'
        }
      };
    }

    switch (strategy) {
      case 'highest':
        return this.resolveByHighestSeverity(signals);
      case 'weighted':
        return this.resolveByConfidenceWeighting(signals);
      case 'consensus':
        return this.resolveByConsensus(signals);
      case 'latest':
        return this.resolveByLatestTimestamp(signals);
      default:
        throw new Error(`Unknown resolution strategy: ${strategy}`);
    }
  }

  /**
   * Get severity range for a group of signals
   * @param {Array} signals - Array of signals
   * @returns {Object} Severity range { min, max, range }
   */
  static getSeverityRange(signals) {
    const severityOrder = ['Info', 'Low', 'Medium', 'High', 'Critical'];
    const severities = signals.map(s => s.severity);

    const minIndex = Math.min(...severities.map(s => severityOrder.indexOf(s)));
    const maxIndex = Math.max(...severities.map(s => severityOrder.indexOf(s)));

    return {
      min: severityOrder[minIndex],
      max: severityOrder[maxIndex],
      range: maxIndex - minIndex,
      count: severities.length,
      unique: new Set(severities).size
    };
  }

  /**
   * Check if signals have conflicting severities
   * @param {Array} signals - Array of signals
   * @returns {boolean} True if conflict detected
   */
  static hasSeverityConflict(signals) {
    const severities = new Set(signals.map(s => s.severity));
    return severities.size > 1;
  }

  /**
   * Check if conflict is significant (>2 severity levels difference)
   * @param {Array} signals - Array of signals
   * @returns {boolean} True if significant disagreement
   */
  static hasSignificantDisagreement(signals) {
    const range = this.getSeverityRange(signals);
    return range.range > 2;
  }

  /**
   * Convert numeric score to severity
   * @param {number} score - Score (0-100)
   * @returns {string} Severity
   */
  static scoreToSeverity(score) {
    if (score >= 90) return 'Critical';
    if (score >= 70) return 'High';
    if (score >= 45) return 'Medium';
    if (score >= 20) return 'Low';
    return 'Info';
  }

  /**
   * Apply freshness factor to confidence
   * Reduces confidence for stale data (>30 days)
   * @param {number} confidence - Original confidence (0-100)
   * @param {Date|string} observedAt - Observation timestamp
   * @returns {number} Adjusted confidence (0-100)
   */
  static applyFreshnessFactor(confidence, observedAt) {
    const multiplier = SignalAggregator.getFreshnessMultiplier(observedAt);
    return Math.round(confidence * multiplier);
  }

  /**
   * Create conflict metadata for documentation
   * @param {Array} signals - Array of conflicting signals
   * @param {Object} resolution - Resolution result
   * @returns {Object} Conflict metadata
   */
  static createConflictMetadata(signals, resolution) {
    const conflictingData = {};
    signals.forEach(signal => {
      conflictingData[signal.sourceName] = {
        severity: signal.severity,
        confidence: signal.confidence,
        observedAt: signal.observedAt
      };
    });

    return {
      conflictDetected: true,
      providerCount: signals.length,
      conflictingData,
      resolutionStrategy: resolution.resolutionStrategy,
      resolvedSeverity: resolution.resolvedSignal.severity,
      resolvedConfidence: resolution.confidence,
      resolutionReason: resolution.metadata.resolutionReason,
      significantDisagreement: this.hasSignificantDisagreement(signals)
    };
  }

  /**
   * Boost severity if multiple providers confirm same finding
   * @param {string} severity - Original severity
   * @param {number} providerCount - Number of providers
   * @returns {string} Boosted severity
   */
  static boostSeverityForConfirmation(severity, providerCount) {
    if (providerCount < 2) return severity;

    const severityOrder = ['Info', 'Low', 'Medium', 'High', 'Critical'];
    const currentIndex = severityOrder.indexOf(severity);

    if (currentIndex === -1) return severity;

    // Boost by one level for 2+ providers
    const newIndex = Math.min(currentIndex + 1, severityOrder.length - 1);

    return severityOrder[newIndex];
  }

  /**
   * Resolve all signal groups using specified strategy
   * @param {Object} signalGroups - Grouped signals { groupName: [signals] }
   * @param {string} strategy - Resolution strategy
   * @returns {Array} Array of resolved signals
   */
  static resolveAllGroups(signalGroups, strategy = 'highest') {
    const resolved = [];

    Object.entries(signalGroups).forEach(([groupName, signals]) => {
      const resolution = this.resolveConflict(signals, strategy);

      // Apply multi-provider confirmation boost
      const providers = SignalAggregator.getUniqueProviders(signals);
      if (providers.size >= 2) {
        resolution.resolvedSignal.severity = this.boostSeverityForConfirmation(
          resolution.resolvedSignal.severity,
          providers.size
        );
        resolution.metadata.multiProviderConfirmation = true;
        resolution.metadata.providerCount = providers.size;
      }

      resolved.push({
        groupName,
        ...resolution,
        sources: Array.from(providers),
        rawSignals: signals
      });
    });

    return resolved;
  }
}

module.exports = ConflictResolver;
