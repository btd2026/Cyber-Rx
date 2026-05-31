'use strict';

const SignalAggregator = require('../../src/utils/signalAggregator');

describe('SignalAggregator (Pure Functions - No DB Required)', () => {
  const sampleSignals = [
    {
      id: 'sig-1',
      signalName: 'SSL Vulnerability',
      signalCategory: 'External Attack Surface',
      sourceName: 'SecurityScorecard',
      severity: 'High',
      confidence: 80,
      observedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'sig-2',
      signalName: 'SSL Vulnerability',
      signalCategory: 'External Attack Surface',
      sourceName: 'BitSight',
      severity: 'Medium',
      confidence: 70,
      observedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'sig-3',
      signalName: 'Email Security Issue',
      signalCategory: 'External Attack Surface',
      sourceName: 'RiskRecon',
      severity: 'Low',
      confidence: 60,
      observedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'sig-4',
      signalName: 'Database Exposure',
      signalCategory: 'External Attack Surface',
      sourceName: 'RiskRecon',
      severity: 'Critical',
      confidence: 95,
      observedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    }
  ];

  describe('groupBySignalName', () => {
    it('should group signals by normalized name', () => {
      const grouped = SignalAggregator.groupBySignalName(sampleSignals);

      expect(Object.keys(grouped).length).toBe(3);
      expect(grouped['ssl_vulnerability']).toBeDefined();
      expect(grouped['email_security_issue']).toBeDefined();
      expect(grouped['database_exposure']).toBeDefined();
      expect(grouped['ssl_vulnerability'].length).toBe(2);
    });

    it('should handle empty array', () => {
      const grouped = SignalAggregator.groupBySignalName([]);
      expect(Object.keys(grouped).length).toBe(0);
    });

    it('should handle signals with no duplicates', () => {
      const noDupes = [sampleSignals[0], sampleSignals[2], sampleSignals[3]];
      const grouped = SignalAggregator.groupBySignalName(noDupes);

      Object.values(grouped).forEach(group => {
        expect(group.length).toBe(1);
      });
    });
  });

  describe('groupByCategory', () => {
    it('should group signals by category', () => {
      const grouped = SignalAggregator.groupByCategory(sampleSignals);

      expect(Object.keys(grouped).length).toBe(1);
      expect(grouped['External Attack Surface']).toBeDefined();
      expect(grouped['External Attack Surface'].length).toBe(4);
    });

    it('should handle multiple categories', () => {
      const multiCatSignals = [
        ...sampleSignals,
        {
          ...sampleSignals[0],
          signalCategory: 'Breach/Incident Intelligence'
        }
      ];

      const grouped = SignalAggregator.groupByCategory(multiCatSignals);

      expect(Object.keys(grouped).length).toBe(2);
      expect(grouped['External Attack Surface'].length).toBe(4);
      expect(grouped['Breach/Incident Intelligence'].length).toBe(1);
    });
  });

  describe('groupBySource', () => {
    it('should group signals by provider', () => {
      const grouped = SignalAggregator.groupBySource(sampleSignals);

      expect(Object.keys(grouped).length).toBe(3);
      expect(grouped['SecurityScorecard']).toBeDefined();
      expect(grouped['BitSight']).toBeDefined();
      expect(grouped['RiskRecon']).toBeDefined();
      expect(grouped['RiskRecon'].length).toBe(2);
    });
  });

  describe('normalizeSignalName', () => {
    it('should normalize names consistently', () => {
      const name1 = SignalAggregator.normalizeSignalName('SSL Vulnerability Detected');
      const name2 = SignalAggregator.normalizeSignalName('ssl vulnerability detected');
      const name3 = SignalAggregator.normalizeSignalName('  SSL   VULNERABILITY  DETECTED  ');

      expect(name1).toBe(name2);
      expect(name2).toBe(name3);
    });

    it('should remove special characters', () => {
      const normalized = SignalAggregator.normalizeSignalName('SSL-Vulnerability! Detected?');

      expect(normalized).not.toContain('-');
      expect(normalized).not.toContain('!');
      expect(normalized).not.toContain('?');
    });

    it('should replace spaces with underscores', () => {
      const normalized = SignalAggregator.normalizeSignalName('SSL Vulnerability Detected');
      expect(normalized).toContain('_');
      expect(normalized).not.toContain(' ');
    });

    it('should convert to lowercase', () => {
      const normalized = SignalAggregator.normalizeSignalName('SSL VULNERABILITY');
      expect(normalized).toBe(normalized.toLowerCase());
    });

    it('should remove common suffixes', () => {
      const withSuffix = SignalAggregator.normalizeSignalName('SSL Vulnerability Detected');
      const withoutSuffix = SignalAggregator.normalizeSignalName('SSL Vulnerability');

      expect(withSuffix).toBe(withoutSuffix);
    });
  });

  describe('getSignalAge', () => {
    it('should calculate correct age in days', () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const age = SignalAggregator.getSignalAge(tenDaysAgo);

      expect(age).toBe(10);
    });

    it('should handle recent signals', () => {
      const today = new Date();
      const age = SignalAggregator.getSignalAge(today);

      expect(age).toBe(0);
    });

    it('should handle very old signals', () => {
      const hundredDaysAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      const age = SignalAggregator.getSignalAge(hundredDaysAgo);

      expect(age).toBe(100);
    });
  });

  describe('isSignalStale', () => {
    it('should identify signals older than 30 days as stale', () => {
      const staleDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
      const isStale = SignalAggregator.isSignalStale(staleDate);

      expect(isStale).toBe(true);
    });

    it('should not flag recent signals as stale', () => {
      const freshDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      const isStale = SignalAggregator.isSignalStale(freshDate);

      expect(isStale).toBe(false);
    });

    it('should use custom stale threshold', () => {
      const signalDate = new Date(Date.now() - 25 * 24 * 60 * 60 * 1000);

      const defaultStale = SignalAggregator.isSignalStale(signalDate, 30);
      const customStale = SignalAggregator.isSignalStale(signalDate, 20);

      expect(defaultStale).toBe(false);
      expect(customStale).toBe(true);
    });

    it('should flag exactly 30 days as stale', () => {
      const exactly30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const isStale = SignalAggregator.isSignalStale(exactly30Days);

      expect(isStale).toBe(true);
    });
  });

  describe('getUniqueProviders', () => {
    it('should return set of unique providers', () => {
      const providers = SignalAggregator.getUniqueProviders(sampleSignals);

      expect(providers.size).toBe(3);
      expect(providers.has('SecurityScorecard')).toBe(true);
      expect(providers.has('BitSight')).toBe(true);
      expect(providers.has('RiskRecon')).toBe(true);
    });

    it('should handle empty array', () => {
      const providers = SignalAggregator.getUniqueProviders([]);
      expect(providers.size).toBe(0);
    });

    it('should handle single provider', () => {
      const singleProvider = [sampleSignals[0]];
      const providers = SignalAggregator.getUniqueProviders(singleProvider);

      expect(providers.size).toBe(1);
    });
  });

  describe('countBySeverity', () => {
    it('should count signals by severity', () => {
      const counts = SignalAggregator.countBySeverity(sampleSignals);

      expect(counts.Critical).toBe(1);
      expect(counts.High).toBe(1);
      expect(counts.Medium).toBe(1);
      expect(counts.Low).toBe(1);
      expect(counts.Info).toBe(0);
    });

    it('should handle empty array', () => {
      const counts = SignalAggregator.countBySeverity([]);
      expect(counts.Critical).toBe(0);
      expect(counts.High).toBe(0);
    });

    it('should handle all same severity', () => {
      const allHigh = sampleSignals.map(s => ({ ...s, severity: 'High' }));
      const counts = SignalAggregator.countBySeverity(allHigh);

      expect(counts.High).toBe(4);
      expect(counts.Critical).toBe(0);
    });
  });

  describe('averageConfidence', () => {
    it('should calculate average confidence', () => {
      const avg = SignalAggregator.averageConfidence(sampleSignals);

      expect(avg).toBe(76); // (80 + 70 + 60 + 95) / 4 = 76.25 rounded to 76
    });

    it('should return 0 for empty array', () => {
      const avg = SignalAggregator.averageConfidence([]);
      expect(avg).toBe(0);
    });

    it('should handle single value', () => {
      const single = [sampleSignals[0]];
      const avg = SignalAggregator.averageConfidence(single);

      expect(avg).toBe(80);
    });

    it('should handle missing confidence values', () => {
      const withMissing = [
        { ...sampleSignals[0], confidence: null },
        sampleSignals[1]
      ];
      const avg = SignalAggregator.averageConfidence(withMissing);

      expect(avg).toBe(35); // (0 + 70) / 2
    });
  });

  describe('getHighestSeverity', () => {
    it('should return highest severity signal', () => {
      const highest = SignalAggregator.getHighestSeverity(sampleSignals);

      expect(highest.severity).toBe('Critical');
      expect(highest.id).toBe('sig-4');
    });

    it('should return null for empty array', () => {
      const highest = SignalAggregator.getHighestSeverity([]);
      expect(highest).toBeNull();
    });

    it('should respect severity ranking', () => {
      const testSignals = [
        { severity: 'Low', id: '1' },
        { severity: 'Medium', id: '2' },
        { severity: 'High', id: '3' },
        { severity: 'Critical', id: '4' },
        { severity: 'Info', id: '5' }
      ];

      const highest = SignalAggregator.getHighestSeverity(testSignals);
      expect(highest.severity).toBe('Critical');
    });
  });

  describe('getMostRecent', () => {
    it('should return most recent signal', () => {
      const recent = SignalAggregator.getMostRecent(sampleSignals);

      expect(recent.id).toBe('sig-4'); // 1 day ago
    });

    it('should return null for empty array', () => {
      const recent = SignalAggregator.getMostRecent([]);
      expect(recent).toBeNull();
    });

    it('should handle signals at same time', () => {
      const sameTime = new Date();
      const sameTimeSignals = [
        { ...sampleSignals[0], observedAt: sameTime },
        { ...sampleSignals[1], observedAt: sameTime }
      ];

      const recent = SignalAggregator.getMostRecent(sameTimeSignals);
      expect(recent).toBeDefined();
    });
  });

  describe('hasMultiProviderConfirmation', () => {
    it('should detect when 2+ providers report same finding', () => {
      const hasConfirmation = SignalAggregator.hasMultiProviderConfirmation(sampleSignals);

      expect(hasConfirmation).toBe(true); // RiskRecon appears twice
    });

    it('should return false for single provider', () => {
      const singleProvider = [sampleSignals[0]];
      const hasConfirmation = SignalAggregator.hasMultiProviderConfirmation(singleProvider);

      expect(hasConfirmation).toBe(false);
    });

    it('should handle exactly 2 providers', () => {
      const twoProviders = [sampleSignals[0], sampleSignals[1]];
      const hasConfirmation = SignalAggregator.hasMultiProviderConfirmation(twoProviders);

      expect(hasConfirmation).toBe(true);
    });
  });

  describe('calculateSignalSimilarity', () => {
    it('should calculate similarity between signal names', () => {
      const similarity = SignalAggregator.calculateSignalSimilarity(
        'SSL Vulnerability',
        'SSL Configuration Issue'
      );

      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('should return 1 for identical names', () => {
      const similarity = SignalAggregator.calculateSignalSimilarity(
        'SSL Vulnerability',
        'SSL Vulnerability'
      );

      expect(similarity).toBe(1);
    });

    it('should return 0 for completely different names', () => {
      const similarity = SignalAggregator.calculateSignalSimilarity(
        'SSL Vulnerability',
        'Email Security'
      );

      expect(similarity).toBe(0);
    });

    it('should be case-insensitive', () => {
      const similarity = SignalAggregator.calculateSignalSimilarity(
        'SSL Vulnerability',
        'ssl vulnerability'
      );

      expect(similarity).toBe(1);
    });

    it('should handle partial word overlap', () => {
      const similarity = SignalAggregator.calculateSignalSimilarity(
        'SSL Certificate',
        'SSL Configuration'
      );

      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });
  });

  describe('findSimilarSignals', () => {
    it('should find signals similar to target', () => {
      const target = sampleSignals[0];
      const similar = SignalAggregator.findSimilarSignals(target, sampleSignals, 0.3);

      expect(similar.length).toBeGreaterThan(0);
      expect(similar.find(s => s.id === target.id)).toBeUndefined(); // Should not include self
    });

    it('should respect similarity threshold', () => {
      const target = sampleSignals[0];
      const withLowThreshold = SignalAggregator.findSimilarSignals(target, sampleSignals, 0.1);
      const withHighThreshold = SignalAggregator.findSimilarSignals(target, sampleSignals, 0.9);

      expect(withLowThreshold.length).toBeGreaterThanOrEqual(withHighThreshold.length);
    });

    it('should return empty array when no similar signals', () => {
      const target = { signalName: 'Completely Different Finding' };
      const similar = SignalAggregator.findSimilarSignals(target, sampleSignals, 0.8);

      expect(similar).toEqual([]);
    });
  });

  describe('aggregateDuplicateFindings', () => {
    it('should aggregate duplicate findings', () => {
      const aggregated = SignalAggregator.aggregateDuplicateFindings(sampleSignals);

      expect(aggregated.length).toBe(3); // 3 unique signal names

      const sslGroup = aggregated.find(a => a.signal.signalName === 'SSL Vulnerability');
      expect(sslGroup.duplicateCount).toBe(1); // 2 total - 1 original
      expect(sslGroup.providers.length).toBe(2);
    });

    it('should handle no duplicates', () => {
      const noDupes = [sampleSignals[0], sampleSignals[2], sampleSignals[3]];
      const aggregated = SignalAggregator.aggregateDuplicateFindings(noDupes);

      expect(aggregated.length).toBe(3);
      aggregated.forEach(a => {
        expect(a.duplicateCount).toBe(0);
      });
    });

    it('should preserve all signals in allSignals', () => {
      const aggregated = SignalAggregator.aggregateDuplicateFindings(sampleSignals);

      const sslGroup = aggregated.find(a => a.signal.signalName === 'SSL Vulnerability');
      expect(sslGroup.allSignals).toBeDefined();
      expect(sslGroup.allSignals.length).toBe(2);
    });
  });

  describe('getFreshnessScore', () => {
    it('should return 1.0 for fresh signals (0-7 days)', () => {
      const freshDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const score = SignalAggregator.getFreshnessScore(freshDate);

      expect(score).toBe(1.0);
    });

    it('should return 0.8 for recent signals (8-14 days)', () => {
      const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const score = SignalAggregator.getFreshnessScore(recentDate);

      expect(score).toBe(0.8);
    });

    it('should return 0.6 for acceptable signals (15-30 days)', () => {
      const acceptableDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
      const score = SignalAggregator.getFreshnessScore(acceptableDate);

      expect(score).toBe(0.6);
    });

    it('should return 0.4 for stale signals (31-60 days)', () => {
      const staleDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
      const score = SignalAggregator.getFreshnessScore(staleDate);

      expect(score).toBe(0.4);
    });

    it('should return 0.2 for very stale signals (>60 days)', () => {
      const veryStaleDate = new Date(Date.now() - 70 * 24 * 60 * 60 * 1000);
      const score = SignalAggregator.getFreshnessScore(veryStaleDate);

      expect(score).toBe(0.2);
    });

    it('should handle boundary at exactly 7 days', () => {
      const boundaryDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const score = SignalAggregator.getFreshnessScore(boundaryDate);

      expect(score).toBe(1.0);
    });

    it('should handle boundary at exactly 30 days', () => {
      const boundaryDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const score = SignalAggregator.getFreshnessScore(boundaryDate);

      expect(score).toBe(0.6);
    });
  });

  describe('getFreshnessMultiplier', () => {
    it('should return 1.0 for fresh signals', () => {
      const freshDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const multiplier = SignalAggregator.getFreshnessMultiplier(freshDate);

      expect(multiplier).toBe(1.0);
    });

    it('should return 0.7 for stale signals', () => {
      const staleDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
      const multiplier = SignalAggregator.getFreshnessMultiplier(staleDate);

      expect(multiplier).toBe(0.7);
    });
  });

  describe('getProviderCoverage', () => {
    it('should calculate full provider coverage', () => {
      const expectedProviders = ['SecurityScorecard', 'BitSight', 'RiskRecon'];
      const coverage = SignalAggregator.getProviderCoverage(sampleSignals, expectedProviders);

      expect(coverage.total).toBe(3);
      expect(coverage.covered).toBe(3);
      expect(coverage.full).toBe(true);
      expect(coverage.partial).toBe(false);
      expect(coverage.missing).toEqual([]);
    });

    it('should identify missing providers', () => {
      const expectedProviders = ['SecurityScorecard', 'BitSight', 'RiskRecon', 'FourthParty'];
      const coverage = SignalAggregator.getProviderCoverage(sampleSignals, expectedProviders);

      expect(coverage.total).toBe(4);
      expect(coverage.covered).toBe(3);
      expect(coverage.full).toBe(false);
      expect(coverage.partial).toBe(true);
      expect(coverage.missing).toContain('FourthParty');
    });

    it('should handle empty expected providers', () => {
      const coverage = SignalAggregator.getProviderCoverage(sampleSignals, []);

      expect(coverage.total).toBe(0);
      expect(coverage.covered).toBe(0);
      expect(coverage.full).toBe(true);
    });

    it('should handle empty signals', () => {
      const expectedProviders = ['SecurityScorecard', 'BitSight'];
      const coverage = SignalAggregator.getProviderCoverage([], expectedProviders);

      expect(coverage.total).toBe(2);
      expect(coverage.covered).toBe(0);
      expect(coverage.full).toBe(false);
      expect(coverage.missing).toEqual(expectedProviders);
    });
  });
});
