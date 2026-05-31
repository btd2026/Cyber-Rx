'use strict';

const SignalCorrelationService = require('../../src/services/SignalCorrelationService');
const ConflictResolver = require('../../src/utils/conflictResolver');
const SignalAggregator = require('../../src/utils/signalAggregator');
const VendorRiskSignal = require('../../src/models/VendorRiskSignal');

// Mock the VendorRiskSignal model
jest.mock('../../src/models/VendorRiskSignal');

describe('SignalCorrelationService', () => {
  const mockVendorId = 'vendor-123';
  const mockOrganizationId = 'org-456';
  const mockVendorName = 'Test Vendor Inc';

  // Sample signals from multiple providers
  const sampleSignals = [
    // SecurityScorecard signals
    {
      id: 'sig-1',
      organizationId: mockOrganizationId,
      vendorId: mockVendorId,
      vendorName: mockVendorName,
      sourceName: 'SecurityScorecard',
      sourceType: 'api',
      signalCategory: 'External Attack Surface',
      signalName: 'Vulnerability Severity Score',
      severity: 'High',
      confidence: 85,
      observedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      status: 'active',
      evidenceUrl: 'https://example.com/evidence1',
      description: 'Critical vulnerabilities detected',
      mappedFrameworks: ['NIST-A.5.19'],
      mappedPolicies: ['Vulnerability Management'],
      rawData: { score: 68 }
    },
    {
      id: 'sig-2',
      organizationId: mockOrganizationId,
      vendorId: mockVendorId,
      vendorName: mockVendorName,
      sourceName: 'SecurityScorecard',
      sourceType: 'api',
      signalCategory: 'External Attack Surface',
      signalName: 'SSL Certificate Expiry',
      severity: 'Low',
      confidence: 90,
      observedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      status: 'active',
      rawData: {}
    },
    // BitSight signals
    {
      id: 'sig-3',
      organizationId: mockOrganizationId,
      vendorId: mockVendorId,
      vendorName: mockVendorName,
      sourceName: 'BitSight',
      sourceType: 'api',
      signalCategory: 'External Attack Surface',
      signalName: 'BitSight Security Rating',
      severity: 'Medium',
      confidence: 80,
      observedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      status: 'active',
      rawData: { rating: 680 }
    },
    {
      id: 'sig-4',
      organizationId: mockOrganizationId,
      vendorId: mockVendorId,
      vendorName: mockVendorName,
      sourceName: 'BitSight',
      sourceType: 'api',
      signalCategory: 'Breach/Incident Intelligence',
      signalName: 'Observed Security Event',
      severity: 'High',
      confidence: 70,
      observedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      status: 'active',
      rawData: {}
    },
    // RiskRecon signals
    {
      id: 'sig-5',
      organizationId: mockOrganizationId,
      vendorId: mockVendorId,
      vendorName: mockVendorName,
      sourceName: 'RiskRecon',
      sourceType: 'api',
      signalCategory: 'External Attack Surface',
      signalName: 'Exposed Database Port',
      severity: 'Critical',
      confidence: 95,
      observedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      status: 'active',
      rawData: { port: 5432 }
    },
    {
      id: 'sig-6',
      organizationId: mockOrganizationId,
      vendorId: mockVendorId,
      vendorName: mockVendorName,
      sourceName: 'RiskRecon',
      sourceType: 'api',
      signalCategory: 'External Attack Surface',
      signalName: 'Email Security Misconfiguration',
      severity: 'Medium',
      confidence: 72,
      observedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      status: 'active',
      rawData: {}
    },
    // Mitigated signal (should be excluded)
    {
      id: 'sig-7',
      organizationId: mockOrganizationId,
      vendorId: mockVendorId,
      vendorName: mockVendorName,
      sourceName: 'SecurityScorecard',
      sourceType: 'api',
      signalCategory: 'External Attack Surface',
      signalName: 'Old Vulnerability',
      severity: 'High',
      confidence: 80,
      observedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      status: 'mitigated',
      rawData: {}
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('correlateSignals', () => {
    it('should correlate signals from multiple providers', async () => {
      VendorRiskSignal.findByVendor.mockResolvedValue(sampleSignals);

      const result = await SignalCorrelationService.correlateSignals(
        mockVendorId,
        mockOrganizationId
      );

      expect(result).toBeDefined();
      expect(result.vendorId).toBe(mockVendorId);
      expect(result.organizationId).toBe(mockOrganizationId);
      expect(result.vendorName).toBe(mockVendorName);
      expect(result.signals).toBeDefined();
      expect(result.compositeScore).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should exclude mitigated signals from correlation', async () => {
      VendorRiskSignal.findByVendor.mockResolvedValue(sampleSignals);

      const result = await SignalCorrelationService.correlateSignals(
        mockVendorId,
        mockOrganizationId
      );

      // Should only process active signals (6 out of 7)
      expect(result.summary.activeSignals).toBe(6);
      expect(result.summary.totalSignals).toBe(6);
    });

    it('should return empty result when no signals found', async () => {
      VendorRiskSignal.findByVendor.mockResolvedValue([]);

      const result = await SignalCorrelationService.correlateSignals(
        mockVendorId,
        mockOrganizationId
      );

      expect(result.signals).toEqual([]);
      expect(result.compositeScore).toBeNull();
      expect(result.message).toContain('No signals found');
    });

    it('should apply highest severity resolution strategy by default', async () => {
      VendorRiskSignal.findByVendor.mockResolvedValue(sampleSignals);

      const result = await SignalCorrelationService.correlateSignals(
        mockVendorId,
        mockOrganizationId,
        { resolutionStrategy: 'highest' }
      );

      expect(result.correlationMetadata.resolutionStrategy).toBe('highest');
    });

    it('should apply consensus-based resolution strategy', async () => {
      VendorRiskSignal.findByVendor.mockResolvedValue(sampleSignals);

      const result = await SignalCorrelationService.correlateSignals(
        mockVendorId,
        mockOrganizationId,
        { resolutionStrategy: 'consensus' }
      );

      expect(result.correlationMetadata.resolutionStrategy).toBe('consensus');
    });

    it('should include raw signals when requested', async () => {
      VendorRiskSignal.findByVendor.mockResolvedValue(sampleSignals);

      const result = await SignalCorrelationService.correlateSignals(
        mockVendorId,
        mockOrganizationId,
        { includeRawSignals: true }
      );

      // Should have rawSignals in response
      const signalWithRaw = result.signals.find(s => s.rawSignals);
      expect(signalWithRaw).toBeDefined();
      expect(signalWithRaw.rawSignals).toBeInstanceOf(Array);
    });

    it('should exclude raw signals by default', async () => {
      VendorRiskSignal.findByVendor.mockResolvedValue(sampleSignals);

      const result = await SignalCorrelationService.correlateSignals(
        mockVendorId,
        mockOrganizationId
      );

      // Should not have rawSignals in response
      result.signals.forEach(signal => {
        expect(signal.rawSignals).toBeUndefined();
      });
    });
  });

  describe('calculateCompositeScore', () => {
    it('should calculate composite score with provider weights', () => {
      const activeSignals = sampleSignals.filter(s => s.status === 'active');

      const score = SignalCorrelationService.calculateCompositeScore(activeSignals);

      expect(score).toBeDefined();
      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeLessThanOrEqual(100);
      expect(score.riskRating).toBeDefined();
      expect(score.breakdown).toBeDefined();
      expect(score.multiplier).toBeDefined();
    });

    it('should apply multiplier for multi-provider confirmation', () => {
      const activeSignals = sampleSignals.filter(s => s.status === 'active');

      const score = SignalCorrelationService.calculateCompositeScore(activeSignals);

      expect(score.multiplier.value).toBeGreaterThan(0);
      expect(score.multiplier.reason).toBeDefined();
    });

    it('should apply custom provider weights', () => {
      const activeSignals = sampleSignals.filter(s => s.status === 'active');
      const customWeights = {
        'SecurityScorecard': 0.50,
        'BitSight': 0.30,
        'RiskRecon': 0.20
      };

      const score = SignalCorrelationService.calculateCompositeScore(
        activeSignals,
        customWeights
      );

      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeLessThanOrEqual(100);
    });

    it('should return neutral score for no signals', () => {
      const score = SignalCorrelationService.calculateCompositeScore([]);

      expect(score.overallScore).toBe(50);
      expect(score.riskRating).toBe('Medium');
    });
  });

  describe('correlateByCategory', () => {
    it('should correlate signals within a specific category', async () => {
      VendorRiskSignal.findByOrganization.mockResolvedValue(
        sampleSignals.filter(s => s.signalCategory === 'External Attack Surface')
      );

      const result = await SignalCorrelationService.correlateByCategory(
        mockVendorId,
        mockOrganizationId,
        'External Attack Surface'
      );

      expect(result.signalCategory).toBe('External Attack Surface');
      expect(result.signals).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should return empty result for category with no signals', async () => {
      VendorRiskSignal.findByOrganization.mockResolvedValue([]);

      const result = await SignalCorrelationService.correlateByCategory(
        mockVendorId,
        mockOrganizationId,
        'Non-existent Category'
      );

      expect(result.signals).toEqual([]);
      expect(result.message).toContain('No signals found');
    });
  });

  describe('getOrganizationStats', () => {
    it('should return organization-wide correlation statistics', async () => {
      VendorRiskSignal.findByOrganization.mockResolvedValue(sampleSignals);

      const result = await SignalCorrelationService.getOrganizationStats(mockOrganizationId);

      expect(result.organizationId).toBe(mockOrganizationId);
      expect(result.totalSignals).toBeDefined();
      expect(result.activeSignals).toBeDefined();
      expect(result.vendors).toBeDefined();
      expect(result.providers).toBeDefined();
      expect(result.vendorStats).toBeDefined();
      expect(result.providerStats).toBeDefined();
      expect(result.categoryStats).toBeDefined();
    });

    it('should group signals by vendor', async () => {
      VendorRiskSignal.findByOrganization.mockResolvedValue(sampleSignals);

      const result = await SignalCorrelationService.getOrganizationStats(mockOrganizationId);

      expect(result.vendorStats).toBeInstanceOf(Array);
      if (result.vendorStats.length > 0) {
        expect(result.vendorStats[0]).toHaveProperty('vendorName');
        expect(result.vendorStats[0]).toHaveProperty('totalSignals');
        expect(result.vendorStats[0]).toHaveProperty('activeSignals');
      }
    });

    it('should group signals by provider', async () => {
      VendorRiskSignal.findByOrganization.mockResolvedValue(sampleSignals);

      const result = await SignalCorrelationService.getOrganizationStats(mockOrganizationId);

      expect(result.providerStats).toBeInstanceOf(Object);
      expect(Object.keys(result.providerStats).length).toBeGreaterThan(0);
    });
  });

  describe('detectOrganizationDuplicates', () => {
    it('should detect duplicate findings across vendors', async () => {
      VendorRiskSignal.findByOrganization.mockResolvedValue(sampleSignals);

      const result = await SignalCorrelationService.detectOrganizationDuplicates(
        mockOrganizationId
      );

      expect(result.organizationId).toBe(mockOrganizationId);
      expect(result.totalSignalGroups).toBeDefined();
      expect(result.crossVendorPatterns).toBeDefined();
      expect(result.patterns).toBeInstanceOf(Array);
    });

    it('should return empty patterns for single vendor', async () => {
      const singleVendorSignals = sampleSignals.filter(s => s.vendorId === mockVendorId);
      VendorRiskSignal.findByOrganization.mockResolvedValue(singleVendorSignals);

      const result = await SignalCorrelationService.detectOrganizationDuplicates(
        mockOrganizationId
      );

      expect(result.crossVendorPatterns).toBe(0);
    });
  });

  describe('exportForFrontend', () => {
    it('should export correlation data in frontend-friendly format', async () => {
      VendorRiskSignal.findByVendor.mockResolvedValue(sampleSignals);

      const result = await SignalCorrelationService.exportForFrontend(
        mockVendorId,
        mockOrganizationId
      );

      expect(result.vendor).toBeDefined();
      expect(result.vendor.id).toBe(mockVendorId);
      expect(result.vendor.name).toBe(mockVendorName);
      expect(result.riskScore).toBeDefined();
      expect(result.riskScore.overall).toBeDefined();
      expect(result.riskScore.rating).toBeDefined();
      expect(result.signals).toBeInstanceOf(Array);
      expect(result.generatedAt).toBeDefined();
    });

    it('should format signals for frontend consumption', async () => {
      VendorRiskSignal.findByVendor.mockResolvedValue(sampleSignals);

      const result = await SignalCorrelationService.exportForFrontend(
        mockVendorId,
        mockOrganizationId
      );

      if (result.signals.length > 0) {
        const signal = result.signals[0];
        expect(signal).toHaveProperty('id');
        expect(signal).toHaveProperty('category');
        expect(signal).toHaveProperty('name');
        expect(signal).toHaveProperty('severity');
        expect(signal).toHaveProperty('confidence');
        expect(signal).toHaveProperty('sources');
        expect(signal).toHaveProperty('ageDays');
        expect(signal).toHaveProperty('freshness');
      }
    });
  });
});

describe('ConflictResolver', () => {
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

  describe('resolveByHighestSeverity', () => {
    it('should select highest severity signal', () => {
      const result = ConflictResolver.resolveByHighestSeverity(conflictingSignals);

      expect(result.resolvedSignal.severity).toBe('High');
      expect(result.resolutionStrategy).toBe('highest_severity');
      expect(result.metadata.conflictDetected).toBe(true);
    });

    it('should document severity range', () => {
      const result = ConflictResolver.resolveByHighestSeverity(conflictingSignals);

      expect(result.metadata.severityRange).toBeDefined();
      expect(result.metadata.severityRange.min).toBe('Low');
      expect(result.metadata.severityRange.max).toBe('High');
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
      const result = ConflictResolver.resolveByConfidenceWeighting(conflictingSignals);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('resolveByConsensus', () => {
    it('should detect consensus when 2+ providers agree', () => {
      const consensusSignals = [
        { ...conflictingSignals[0], severity: 'High' },
        { ...conflictingSignals[1], severity: 'High' },
        { ...conflictingSignals[2], severity: 'Low' }
      ];

      const result = ConflictResolver.resolveByConsensus(consensusSignals);

      expect(result.resolvedSignal.severity).toBe('High');
      expect(result.metadata.consensusAchieved).toBe(true);
      expect(result.metadata.consensusSeverity).toBe('High');
    });

    it('should fall back to highest severity when no consensus', () => {
      const result = ConflictResolver.resolveByConsensus(conflictingSignals);

      expect(result.metadata.consensusAchieved).toBe(false);
      expect(result.resolvedSignal.severity).toBe('High');
    });
  });

  describe('resolveByLatestTimestamp', () => {
    it('should select most recent signal', () => {
      const result = ConflictResolver.resolveByLatestTimestamp(conflictingSignals);

      expect(result.resolvedSignal.id).toBe('sig-3'); // Most recent (3 days ago)
      expect(result.resolutionStrategy).toBe('latest_timestamp');
      expect(result.metadata.ageDays).toBeDefined();
    });
  });

  describe('hasSignificantDisagreement', () => {
    it('should detect significant disagreement (>2 levels)', () => {
      const disagreeingSignals = [
        { ...conflictingSignals[0], severity: 'Critical' },
        { ...conflictingSignals[1], severity: 'Low' }
      ];

      const hasDisagreement = ConflictResolver.hasSignificantDisagreement(disagreeingSignals);

      expect(hasDisagreement).toBe(true);
    });

    it('should not flag minor disagreements as significant', () => {
      const agreeingSignals = [
        { ...conflictingSignals[0], severity: 'High' },
        { ...conflictingSignals[1], severity: 'Medium' }
      ];

      const hasDisagreement = ConflictResolver.hasSignificantDisagreement(agreeingSignals);

      expect(hasDisagreement).toBe(false);
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

    it('should cap at Critical severity', () => {
      const boosted = ConflictResolver.boostSeverityForConfirmation('Critical', 3);

      expect(boosted).toBe('Critical');
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

      expect(adjusted).toBe(80);
    });
  });
});

describe('SignalAggregator', () => {
  const sampleSignals = [
    {
      signalName: 'SSL Vulnerability',
      signalCategory: 'External Attack Surface',
      sourceName: 'SecurityScorecard',
      severity: 'High',
      confidence: 80,
      observedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    },
    {
      signalName: 'SSL Vulnerability',
      signalCategory: 'External Attack Surface',
      sourceName: 'BitSight',
      severity: 'Medium',
      confidence: 70,
      observedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    },
    {
      signalName: 'Email Security Issue',
      signalCategory: 'External Attack Surface',
      sourceName: 'RiskRecon',
      severity: 'Low',
      confidence: 60,
      observedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    }
  ];

  describe('groupBySignalName', () => {
    it('should group signals by normalized name', () => {
      const grouped = SignalAggregator.groupBySignalName(sampleSignals);

      expect(Object.keys(grouped).length).toBe(2);
      expect(grouped['ssl_vulnerability']).toBeDefined();
      expect(grouped['email_security_issue']).toBeDefined();
      expect(grouped['ssl_vulnerability'].length).toBe(2);
    });
  });

  describe('groupByCategory', () => {
    it('should group signals by category', () => {
      const grouped = SignalAggregator.groupByCategory(sampleSignals);

      expect(Object.keys(grouped).length).toBe(1);
      expect(grouped['External Attack Surface']).toBeDefined();
      expect(grouped['External Attack Surface'].length).toBe(3);
    });
  });

  describe('normalizeSignalName', () => {
    it('should normalize signal names consistently', () => {
      const name1 = SignalAggregator.normalizeSignalName('SSL Vulnerability Detected');
      const name2 = SignalAggregator.normalizeSignalName('ssl vulnerability detected');

      expect(name1).toBe(name2);
    });

    it('should remove special characters', () => {
      const normalized = SignalAggregator.normalizeSignalName('SSL-Vulnerability! Detected');

      expect(normalized).not.toContain('-');
      expect(normalized).not.toContain('!');
    });
  });

  describe('getSignalAge', () => {
    it('should calculate correct age in days', () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const age = SignalAggregator.getSignalAge(tenDaysAgo);

      expect(age).toBe(10);
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
  });

  describe('countBySeverity', () => {
    it('should count signals by severity', () => {
      const counts = SignalAggregator.countBySeverity(sampleSignals);

      expect(counts.High).toBe(1);
      expect(counts.Medium).toBe(1);
      expect(counts.Low).toBe(1);
      expect(counts.Critical).toBe(0);
    });
  });

  describe('averageConfidence', () => {
    it('should calculate average confidence', () => {
      const avg = SignalAggregator.averageConfidence(sampleSignals);

      expect(avg).toBe(70); // (80 + 70 + 60) / 3
    });

    it('should return 0 for empty array', () => {
      const avg = SignalAggregator.averageConfidence([]);

      expect(avg).toBe(0);
    });
  });

  describe('getHighestSeverity', () => {
    it('should return highest severity signal', () => {
      const highest = SignalAggregator.getHighestSeverity(sampleSignals);

      expect(highest.severity).toBe('High');
    });

    it('should return null for empty array', () => {
      const highest = SignalAggregator.getHighestSeverity([]);

      expect(highest).toBeNull();
    });
  });

  describe('getMostRecent', () => {
    it('should return most recent signal', () => {
      const recent = SignalAggregator.getMostRecent(sampleSignals);

      expect(recent.signalName).toBe('Email Security Issue'); // 2 days ago
    });

    it('should return null for empty array', () => {
      const recent = SignalAggregator.getMostRecent([]);

      expect(recent).toBeNull();
    });
  });

  describe('hasMultiProviderConfirmation', () => {
    it('should detect when 2+ providers report same finding', () => {
      const hasConfirmation = SignalAggregator.hasMultiProviderConfirmation(sampleSignals);

      expect(hasConfirmation).toBe(true);
    });

    it('should return false for single provider', () => {
      const singleProvider = [sampleSignals[0]];
      const hasConfirmation = SignalAggregator.hasMultiProviderConfirmation(singleProvider);

      expect(hasConfirmation).toBe(false);
    });
  });

  describe('getFreshnessScore', () => {
    it('should return high score for fresh signals', () => {
      const freshDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const score = SignalAggregator.getFreshnessScore(freshDate);

      expect(score).toBe(1.0);
    });

    it('should return low score for very stale signals', () => {
      const staleDate = new Date(Date.now() - 70 * 24 * 60 * 60 * 1000);
      const score = SignalAggregator.getFreshnessScore(staleDate);

      expect(score).toBe(0.2);
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
  });

  describe('getProviderCoverage', () => {
    it('should calculate provider coverage', () => {
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
  });
});
