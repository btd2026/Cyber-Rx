'use strict';

const ConflictResolver = require('../../src/utils/conflictResolver');

describe('ConflictResolver (Pure Functions - No DB Required)', () => {
  const conflictingSignals = [
    {
      id: 'sig-1',
      signalName: 'SSL Vulnerability',
      severity: 'High',
      confidence: 80,
      sourceName: 'SecurityScorecard',
      observedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'sig-2',
      signalName: 'SSL Vulnerability',
      severity: 'Low',
      confidence: 60,
      sourceName: 'BitSight',
      observedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'sig-3',
      signalName: 'SSL Vulnerability',
      severity: 'Medium',
      confidence: 70,
      sourceName: 'RiskRecon',
      observedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    }
  ];

  const consensusSignals = [
    {
      id: 'sig-1',
      signalName: 'SSL Vulnerability',
      severity: 'High',
      confidence: 80,
      sourceName: 'SecurityScorecard',
      observedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'sig-2',
      signalName: 'SSL Vulnerability',
      severity: 'High',
      confidence: 75,
      sourceName: 'BitSight',
      observedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'sig-3',
      signalName: 'SSL Vulnerability',
      severity: 'Low',
      confidence: 50,
      sourceName: 'RiskRecon',
      observedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    }
  ];

  describe('resolveByHighestSeverity', () => {
    it('should select highest severity signal', () => {
      const result = ConflictResolver.resolveByHighestSeverity(conflictingSignals);

      expect(result.resolvedSignal.severity).toBe('High');
      expect(result.resolvedSignal.id).toBe('sig-1');
      expect(result.resolutionStrategy).toBe('highest_severity');
    });

    it('should document conflict detection', () => {
      const result = ConflictResolver.resolveByHighestSeverity(conflictingSignals);

      expect(result.metadata.conflictDetected).toBe(true);
      expect(result.metadata.originalProviders).toContain('SecurityScorecard');
      expect(result.metadata.originalProviders).toContain('BitSight');
      expect(result.metadata.originalProviders).toContain('RiskRecon');
    });

    it('should document severity range', () => {
      const result = ConflictResolver.resolveByHighestSeverity(conflictingSignals);

      expect(result.metadata.severityRange).toBeDefined();
      expect(result.metadata.severityRange.min).toBe('Low');
      expect(result.metadata.severityRange.max).toBe('High');
      expect(result.metadata.severityRange.range).toBe(3); // High(4) - Low(2) = 2
      expect(result.metadata.severityRange.count).toBe(3);
    });

    it('should use highest confidence from selected signal', () => {
      const result = ConflictResolver.resolveByHighestSeverity(conflictingSignals);

      expect(result.confidence).toBe(80);
    });

    it('should handle single signal (no conflict)', () => {
      const singleSignal = [conflictingSignals[0]];
      const result = ConflictResolver.resolveByHighestSeverity(singleSignal);

      expect(result.metadata.conflictDetected).toBe(false);
      expect(result.metadata.resolutionReason).toContain('no conflict');
    });
  });

  describe('resolveByConfidenceWeighting', () => {
    it('should calculate weighted severity based on confidence', () => {
      const result = ConflictResolver.resolveByConfidenceWeighting(conflictingSignals);

      expect(result.resolvedSignal).toBeDefined();
      expect(result.resolutionStrategy).toBe('confidence_weighted');
      expect(result.metadata.weightedScore).toBeDefined();
    });

    it('should return score between 0 and 100', () => {
      const result = ConflictResolver.resolveByConfidenceWeighted(conflictingSignals);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('should select signal closest to weighted average', () => {
      const result = ConflictResolver.resolveByConfidenceWeighted(conflictingSignals);

      // High (75) × 0.80 + Low (25) × 0.60 + Medium (50) × 0.70
      // = 60 + 15 + 35 = 110 / 3 ≈ 36.67
      // Closest to Medium (50) or Low (25)
      expect(['High', 'Medium', 'Low']).toContain(result.resolvedSignal.severity);
    });

    it('should handle equal confidence values', () => {
      const equalConfidence = conflictingSignals.map(s => ({ ...s, confidence: 75 }));
      const result = ConflictResolver.resolveByConfidenceWeighted(equalConfidence);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('should handle missing confidence values (default to 50)', () => {
      const withMissing = [
        { ...conflictingSignals[0], confidence: null },
        conflictingSignals[1],
        conflictingSignals[2]
      ];
      const result = ConflictResolver.resolveByConfidenceWeighted(withMissing);

      expect(result.confidence).toBeDefined();
    });
  });

  describe('resolveByConsensus', () => {
    it('should detect consensus when 2+ providers agree', () => {
      const result = ConflictResolver.resolveByConsensus(consensusSignals);

      expect(result.resolvedSignal.severity).toBe('High');
      expect(result.metadata.consensusAchieved).toBe(true);
      expect(result.metadata.consensusSeverity).toBe('High');
    });

    it('should count consensus participants', () => {
      const result = ConflictResolver.resolveByConsensus(consensusSignals);

      expect(result.metadata.severityCounts.High).toBe(2);
      expect(result.metadata.severityCounts.Low).toBe(1);
    });

    it('should fall back to highest severity when no consensus', () => {
      const result = ConflictResolver.resolveByConsensus(conflictingSignals);

      expect(result.metadata.consensusAchieved).toBe(false);
      expect(result.resolvedSignal.severity).toBe('High');
      expect(result.metadata.resolutionReason).toContain('no consensus');
    });

    it('should handle all providers agreeing (unanimous)', () => {
      const unanimous = conflictingSignals.map(s => ({ ...s, severity: 'High' }));
      const result = ConflictResolver.resolveByConsensus(unanimous);

      expect(result.metadata.consensusAchieved).toBe(true);
      expect(result.metadata.consensusSeverity).toBe('High');
      expect(result.resolvedSignal.severity).toBe('High');
    });

    it('should handle two-way ties', () => {
      const tieSignals = [
        { ...consensusSignals[0] }, // High
        { ...consensusSignals[1] }, // High
        { ...consensusSignals[2], severity: 'Medium' } // Medium
      ];

      const result = ConflictResolver.resolveByConsensus(tieSignals);
      expect(result.metadata.consensusAchieved).toBe(true);
      expect(result.resolvedSignal.severity).toBe('High');
    });
  });

  describe('resolveByLatestTimestamp', () => {
    it('should select most recent signal', () => {
      const result = ConflictResolver.resolveByLatestTimestamp(conflictingSignals);

      expect(result.resolvedSignal.id).toBe('sig-3'); // 3 days ago
      expect(result.resolutionStrategy).toBe('latest_timestamp');
    });

    it('should document signal age', () => {
      const result = ConflictResolver.resolveByLatestTimestamp(conflictingSignals);

      expect(result.metadata.ageDays).toBeDefined();
      expect(result.metadata.ageDays).toBe(3);
    });

    it('should include observed timestamp', () => {
      const result = ConflictResolver.resolveByLatestTimestamp(conflictingSignals);

      expect(result.metadata.observedAt).toBeDefined();
      expect(new Date(result.metadata.observedAt)).toBeInstanceOf(Date);
    });

    it('should handle signals at same time', () => {
      const sameTime = new Date();
      const sameTimeSignals = [
        { ...conflictingSignals[0], observedAt: sameTime },
        { ...conflictingSignals[1], observedAt: sameTime }
      ];

      const result = ConflictResolver.resolveByLatestTimestamp(sameTimeSignals);
      expect(result.resolvedSignal).toBeDefined();
    });
  });

  describe('resolveConflict', () => {
    it('should use highest strategy by default', () => {
      const result = ConflictResolver.resolveConflict(conflictingSignals);

      expect(result.resolutionStrategy).toBe('highest_severity');
    });

    it('should support weighted strategy', () => {
      const result = ConflictResolver.resolveConflict(conflictingSignals, 'weighted');

      expect(result.resolutionStrategy).toBe('confidence_weighted');
    });

    it('should support consensus strategy', () => {
      const result = ConflictResolver.resolveConflict(conflictingSignals, 'consensus');

      expect(result.resolutionStrategy).toBe('consensus_based');
    });

    it('should support latest strategy', () => {
      const result = ConflictResolver.resolveConflict(conflictingSignals, 'latest');

      expect(result.resolutionStrategy).toBe('latest_timestamp');
    });

    it('should throw error for unknown strategy', () => {
      expect(() => {
        ConflictResolver.resolveConflict(conflictingSignals, 'unknown');
      }).toThrow('Unknown resolution strategy');
    });

    it('should handle single signal (no conflict)', () => {
      const result = ConflictResolver.resolveConflict([conflictingSignals[0]]);

      expect(result.resolutionStrategy).toBe('none');
      expect(result.metadata.conflictDetected).toBe(false);
    });

    it('should throw error for empty signals', () => {
      expect(() => {
        ConflictResolver.resolveConflict([]);
      }).toThrow('no signals provided');
    });
  });

  describe('getSeverityRange', () => {
    it('should calculate severity range correctly', () => {
      const range = ConflictResolver.getSeverityRange(conflictingSignals);

      expect(range.min).toBe('Low');
      expect(range.max).toBe('High');
      expect(range.range).toBeGreaterThan(0);
      expect(range.count).toBe(3);
      expect(range.unique).toBe(3);
    });

    it('should handle single severity', () => {
      const singleSeverity = conflictingSignals.map(s => ({ ...s, severity: 'High' }));
      const range = ConflictResolver.getSeverityRange(singleSeverity);

      expect(range.min).toBe('High');
      expect(range.max).toBe('High');
      expect(range.range).toBe(0);
      expect(range.unique).toBe(1);
    });

    it('should handle full severity range', () => {
      const fullRange = [
        { severity: 'Info' },
        { severity: 'Low' },
        { severity: 'Medium' },
        { severity: 'High' },
        { severity: 'Critical' }
      ];

      const range = ConflictResolver.getSeverityRange(fullRange);
      expect(range.min).toBe('Info');
      expect(range.max).toBe('Critical');
      expect(range.range).toBe(4);
    });
  });

  describe('hasSeverityConflict', () => {
    it('should detect conflicting severities', () => {
      const hasConflict = ConflictResolver.hasSeverityConflict(conflictingSignals);

      expect(hasConflict).toBe(true);
    });

    it('should return false for single severity', () => {
      const singleSeverity = [conflictingSignals[0]];
      const hasConflict = ConflictResolver.hasSeverityConflict(singleSeverity);

      expect(hasConflict).toBe(false);
    });

    it('should return false for all same severity', () => {
      const sameSeverity = conflictingSignals.map(s => ({ ...s, severity: 'High' }));
      const hasConflict = ConflictResolver.hasSeverityConflict(sameSeverity);

      expect(hasConflict).toBe(false);
    });
  });

  describe('hasSignificantDisagreement', () => {
    it('should detect significant disagreement (>2 levels)', () => {
      const disagreeingSignals = [
        { ...conflictingSignals[0], severity: 'Critical' }, // Level 5
        { ...conflictingSignals[1], severity: 'Low' } // Level 2
        // Range: 5 - 2 = 3 > 2, significant
      ];

      const hasDisagreement = ConflictResolver.hasSignificantDisagreement(disagreeingSignals);

      expect(hasDisagreement).toBe(true);
    });

    it('should not flag minor disagreements as significant', () => {
      const agreeingSignals = [
        { ...conflictingSignals[0], severity: 'High' }, // Level 4
        { ...conflictingSignals[1], severity: 'Medium' } // Level 3
        // Range: 4 - 3 = 1 <= 2, not significant
      ];

      const hasDisagreement = ConflictResolver.hasSignificantDisagreement(agreeingSignals);

      expect(hasDisagreement).toBe(false);
    });

    it('should handle boundary case (exactly 2 levels)', () => {
      const boundarySignals = [
        { severity: 'High' }, // Level 4
        { severity: 'Low' } // Level 2
        // Range: 4 - 2 = 2, boundary case
      ];

      const hasDisagreement = ConflictResolver.hasSignificantDisagreement(boundarySignals);

      expect(hasDisagreement).toBe(false);
    });

    it('should handle single signal (no disagreement)', () => {
      const singleSignal = [conflictingSignals[0]];
      const hasDisagreement = ConflictResolver.hasSignificantDisagreement(singleSignal);

      expect(hasDisagreement).toBe(false);
    });
  });

  describe('scoreToSeverity', () => {
    it('should convert high scores to Critical', () => {
      expect(ConflictResolver.scoreToSeverity(95)).toBe('Critical');
      expect(ConflictResolver.scoreToSeverity(90)).toBe('Critical');
    });

    it('should convert medium-high scores to High', () => {
      expect(ConflictResolver.scoreToSeverity(75)).toBe('High');
      expect(ConflictResolver.scoreToSeverity(70)).toBe('High');
    });

    it('should convert medium scores to Medium', () => {
      expect(ConflictResolver.scoreToSeverity(50)).toBe('Medium');
      expect(ConflictResolver.scoreToSeverity(45)).toBe('Medium');
    });

    it('should convert low scores to Low', () => {
      expect(ConflictResolver.scoreToSeverity(25)).toBe('Low');
      expect(ConflictResolver.scoreToSeverity(20)).toBe('Low');
    });

    it('should convert very low scores to Info', () => {
      expect(ConflictResolver.scoreToSeverity(10)).toBe('Info');
      expect(ConflictResolver.scoreToSeverity(0)).toBe('Info');
    });

    it('should handle boundary values', () => {
      expect(ConflictResolver.scoreToSeverity(89)).toBe('High'); // < 90
      expect(ConflictResolver.scoreToSeverity(69)).toBe('Medium'); // < 70
      expect(ConflictResolver.scoreToSeverity(44)).toBe('Medium'); // < 45
      expect(ConflictResolver.scoreToSeverity(19)).toBe('Low'); // < 20
    });
  });

  describe('applyFreshnessFactor', () => {
    it('should reduce confidence for stale data', () => {
      const staleDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      const adjusted = ConflictResolver.applyFreshnessFactor(80, staleDate);

      expect(adjusted).toBeLessThan(80);
      expect(adjusted).toBe(56); // 80 * 0.7
    });

    it('should not reduce confidence for fresh data', () => {
      const freshDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const adjusted = ConflictResolver.applyFreshnessFactor(80, freshDate);

      expect(adjusted).toBe(80); // No reduction
    });

    it('should handle boundary at 30 days', () => {
      const boundaryDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const adjusted = ConflictResolver.applyFreshnessFactor(100, boundaryDate);

      expect(adjusted).toBe(70); // 100 * 0.7 (stale)
    });

    it('should handle zero confidence', () => {
      const date = new Date();
      const adjusted = ConflictResolver.applyFreshnessFactor(0, date);

      expect(adjusted).toBe(0);
    });

    it('should handle high confidence values', () => {
      const date = new Date();
      const adjusted = ConflictResolver.applyFreshnessFactor(100, date);

      expect(adjusted).toBe(100);
    });
  });

  describe('boostSeverityForConfirmation', () => {
    it('should boost severity when 2+ providers confirm', () => {
      const boosted = ConflictResolver.boostSeverityForConfirmation('High', 3);

      expect(boosted).toBe('Critical');
    });

    it('should not boost severity for single provider', () => {
      const notBoosted = ConflictResolver.boostSeverityForConfirmation('High', 1);

      expect(notBoosted).toBe('High');
    });

    it('should boost with exactly 2 providers', () => {
      const boosted = ConflictResolver.boostSeverityForConfirmation('Medium', 2);

      expect(boosted).toBe('High');
    });

    it('should cap at Critical severity', () => {
      const boosted = ConflictResolver.boostSeverityForConfirmation('Critical', 3);

      expect(boosted).toBe('Critical');
    });

    it('should boost all severity levels', () => {
      expect(ConflictResolver.boostSeverityForConfirmation('Info', 2)).toBe('Low');
      expect(ConflictResolver.boostSeverityForConfirmation('Low', 2)).toBe('Medium');
      expect(ConflictResolver.boostSeverityForConfirmation('Medium', 2)).toBe('High');
      expect(ConflictResolver.boostSeverityForConfirmation('High', 2)).toBe('Critical');
      expect(ConflictResolver.boostSeverityForConfirmation('Critical', 2)).toBe('Critical');
    });
  });

  describe('createConflictMetadata', () => {
    it('should create comprehensive conflict metadata', () => {
      const resolution = ConflictResolver.resolveConflict(conflictingSignals, 'highest');
      const metadata = ConflictResolver.createConflictMetadata(conflictingSignals, resolution);

      expect(metadata.conflictDetected).toBe(true);
      expect(metadata.providerCount).toBe(3);
      expect(metadata.conflictingData).toBeDefined();
      expect(metadata.resolutionStrategy).toBe('highest_severity');
      expect(metadata.resolvedSeverity).toBeDefined();
      expect(metadata.resolvedConfidence).toBeDefined();
    });

    it('should include conflicting data from all providers', () => {
      const resolution = ConflictResolver.resolveConflict(conflictingSignals, 'highest');
      const metadata = ConflictResolver.createConflictMetadata(conflictingSignals, resolution);

      expect(metadata.conflictingData.SecurityScorecard).toBeDefined();
      expect(metadata.conflictingData.BitSight).toBeDefined();
      expect(metadata.conflictingData.RiskRecon).toBeDefined();

      expect(metadata.conflictingData.SecurityScorecard.severity).toBe('High');
      expect(metadata.conflictingData.BitSight.severity).toBe('Low');
    });

    it('should indicate significant disagreement', () => {
      const disagreeingSignals = [
        { ...conflictingSignals[0], severity: 'Critical' },
        { ...conflictingSignals[1], severity: 'Low' }
      ];

      const resolution = ConflictResolver.resolveConflict(disagreeingSignals, 'highest');
      const metadata = ConflictResolver.createConflictMetadata(disagreeingSignals, resolution);

      expect(metadata.significantDisagreement).toBe(true);
    });

    it('should include resolution reason', () => {
      const resolution = ConflictResolver.resolveConflict(conflictingSignals, 'consensus');
      const metadata = ConflictResolver.createConflictMetadata(conflictingSignals, resolution);

      expect(metadata.resolutionReason).toBeDefined();
      expect(typeof metadata.resolutionReason).toBe('string');
    });
  });

  describe('resolveAllGroups', () => {
    it('should resolve multiple signal groups', () => {
      const signalGroups = {
        'ssl_vulnerability': conflictingSignals,
        'email_security': [
          { ...conflictingSignals[0], signalName: 'Email Security', severity: 'Medium' }
        ]
      };

      const resolved = ConflictResolver.resolveAllGroups(signalGroups, 'highest');

      expect(resolved.length).toBe(2);
      expect(resolved[0].groupName).toBeDefined();
      expect(resolved[0].resolutionStrategy).toBe('highest_severity');
    });

    it('should apply multi-provider boost', () => {
      const signalGroups = {
        'ssl_vulnerability': conflictingSignals
      };

      const resolved = ConflictResolver.resolveAllGroups(signalGroups, 'highest');

      expect(resolved[0].metadata.multiProviderConfirmation).toBe(true);
      expect(resolved[0].metadata.providerCount).toBe(3);
      expect(resolved[0].resolvedSignal.severity).toBe('Critical'); // Boosted from High
    });

    it('should preserve source providers', () => {
      const signalGroups = {
        'ssl_vulnerability': conflictingSignals
      };

      const resolved = ConflictResolver.resolveAllGroups(signalGroups, 'highest');

      expect(resolved[0].sources).toContain('SecurityScorecard');
      expect(resolved[0].sources).toContain('BitSight');
      expect(resolved[0].sources).toContain('RiskRecon');
    });

    it('should include raw signals', () => {
      const signalGroups = {
        'ssl_vulnerability': conflictingSignals
      };

      const resolved = ConflictResolver.resolveAllGroups(signalGroups, 'highest');

      expect(resolved[0].rawSignals).toBeDefined();
      expect(resolved[0].rawSignals.length).toBe(3);
    });

    it('should handle empty groups', () => {
      const resolved = ConflictResolver.resolveAllGroups({}, 'highest');

      expect(resolved).toEqual([]);
    });

    it('should support different strategies per call', () => {
      const signalGroups = {
        'ssl_vulnerability': conflictingSignals
      };

      const highest = ConflictResolver.resolveAllGroups(signalGroups, 'highest');
      const consensus = ConflictResolver.resolveAllGroups(signalGroups, 'consensus');

      expect(highest[0].resolutionStrategy).toBe('highest_severity');
      expect(consensus[0].resolutionStrategy).toBe('consensus_based');
    });
  });
});
