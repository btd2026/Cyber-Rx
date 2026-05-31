const CorrelationEngine = require('../../src/services/CorrelationEngine');

// Mock all models
jest.mock('../../src/models', () => ({
  BusinessProcess: {
    findById: jest.fn()
  },
  Asset: {
    findById: jest.fn()
  },
  DataObject: {
    findById: jest.fn(),
    findByAssetId: jest.fn()
  },
  ThreatScenario: {
    findById: jest.fn()
  },
  LegalObligation: {
    findById: jest.fn(),
    getHIPAAObligations: jest.fn()
  },
  ExecutiveOwner: {
    findByUserId: jest.fn(),
    findByRole: jest.fn()
  },
  Risk: {
    findById: jest.fn(),
    findByOrganization: jest.fn()
  },
  Finding: {
    findById: jest.fn(),
    findRepeats: jest.fn()
  },
  FinancialImpact: {
    findByRiskId: jest.fn(),
    getTotalExposure: jest.fn()
  }
}));

const {
  BusinessProcess,
  Asset,
  DataObject,
  ThreatScenario,
  LegalObligation,
  ExecutiveOwner,
  Risk,
  Finding,
  FinancialImpact
} = require('../../src/models');

describe('CorrelationEngine', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('generateExecutiveNarrative', () => {
    const mockFinding = {
      id: 'find-1',
      title: 'Critical CVE in Claims System',
      severity: 'Critical',
      status: 'open',
      discoveredDate: new Date('2024-01-15'),
      organizationId: 'org-123',
      tool: 'RecordedFuture',
      riskId: 'risk-1',
      assetId: 'asset-1',
      businessProcessId: 'bp-1'
    };

    const mockRisk = {
      id: 'risk-1',
      name: 'Claims System Compromise',
      organizationId: 'org-123',
      businessProcessIds: ['bp-1'],
      dataObjectIds: ['data-1', 'data-2'],
      threatScenarioId: 'threat-1',
      executiveOwner: 'exec-1',
      remedationOwner: 'ciso-1',
      evidenceOwner: 'clo-1',
      financialExposure: 250000,
      frameworkMappings: ['HIPAA-164.312(a)(1)', 'NIST-800-53-AC-1'],
      legalObligationIds: ['legal-1'],
      auditEvidenceRequired: 'Evidence required for HIPAA audit',
      auditTestIds: ['test-1']
    };

    const mockBusinessProcess = {
      id: 'bp-1',
      name: 'Claims Processing',
      tier: 'Tier 1',
      criticality: 'high',
      owner: 'cio-1',
      createsDataObjects: ['data-1', 'data-2']
    };

    const mockDataObjects = [
      {
        id: 'data-1',
        type: 'PHI',
        sensitivity: 'high',
        classification: 'Protected Health Information'
      },
      {
        id: 'data-2',
        type: 'PII',
        sensitivity: 'medium',
        classification: 'Personally Identifiable Information'
      }
    ];

    const mockThreatScenario = {
      id: 'threat-1',
      name: 'Ransomware Attack',
      type: 'ransomware',
      probability: 75,
      impactLevel: 'high',
      mitreTechnique: ['T1486']
    };

    const mockLegalObligation = {
      id: 'legal-1',
      name: 'HIPAA Breach Notification',
      source: 'HIPAA',
      notificationTimeline: '60 days',
      citation: '164.312(a)(1)',
      maxPenaltyAmount: 50000
    };

    const mockExecutiveOwner = {
      roleId: 'exec-1',
      name: 'Jane Executive',
      email: 'exec@test.com'
    };

    it('should generate complete executive narrative', async () => {
      // Setup mocks
      Finding.findById.mockResolvedValue(mockFinding);
      Risk.findById.mockResolvedValue(mockRisk);
      BusinessProcess.findById.mockResolvedValue(mockBusinessProcess);
      DataObject.findById
        .mockResolvedValueOnce(mockDataObjects[0])
        .mockResolvedValueOnce(mockDataObjects[1]);
      ThreatScenario.findById.mockResolvedValue(mockThreatScenario);
      LegalObligation.findById.mockResolvedValue(mockLegalObligation);
      ExecutiveOwner.findByUserId.mockResolvedValue(mockExecutiveOwner);
      FinancialImpact.findByRiskId.mockResolvedValue(null);

      const result = await CorrelationEngine.generateExecutiveNarrative('find-1', 'org-123');

      // Verify structure
      expect(result).toHaveProperty('finding');
      expect(result).toHaveProperty('executiveNarrative');
      expect(result).toHaveProperty('correlation');

      // Verify finding data
      expect(result.finding.id).toBe('find-1');
      expect(result.finding.title).toBe('Critical CVE in Claims System');

      // Verify executive narrative
      expect(result.executiveNarrative.summary).toBeDefined();
      expect(result.executiveNarrative.businessProcess).toBeDefined();
      expect(result.executiveNarrative.dataInvolvement).toHaveLength(2);
      expect(result.executiveNarrative.threat).toBeDefined();
      expect(result.executiveNarrative.financialExposure).toBeDefined();
      expect(result.executiveNarrative.regulatory).toBeDefined();
      expect(result.executiveNarrative.ownership).toBeDefined();
      expect(result.executiveNarrative.auditEvidence).toBeDefined();

      // Verify correlation mapping
      expect(result.correlation.riskId).toBe('risk-1');
      expect(result.correlation.assetId).toBe('asset-1');
      expect(result.correlation.businessProcessId).toBe('bp-1');
    });

    it('should throw 404 if finding not found', async () => {
      Finding.findById.mockResolvedValue(null);

      try {
        await CorrelationEngine.generateExecutiveNarrative('find-1', 'org-123');
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toBe('Finding not found');
      }
    });

    it('should throw 403 if access denied', async () => {
      const unauthorizedFinding = {
        ...mockFinding,
        organizationId: 'org-456'
      };

      Finding.findById.mockResolvedValue(unauthorizedFinding);

      try {
        await CorrelationEngine.generateExecutiveNarrative('find-1', 'org-123');
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toBe('Access denied');
      }
    });

    it('should handle finding without risk', async () => {
      Finding.findById.mockResolvedValue({
        ...mockFinding,
        riskId: null
      });
      Risk.findById.mockResolvedValue(null);
      BusinessProcess.findById.mockResolvedValue(mockBusinessProcess);

      const result = await CorrelationEngine.generateExecutiveNarrative('find-1', 'org-123');

      expect(result.finding).toBeDefined();
      expect(result.correlation.riskId).toBeNull();
    });

    it('should handle missing business process', async () => {
      Finding.findById.mockResolvedValue({
        ...mockFinding,
        businessProcessId: null
      });
      Risk.findById.mockResolvedValue({
        ...mockRisk,
        businessProcessIds: []
      });
      Asset.findById.mockResolvedValue({
        businessProcessIds: []
      });
      BusinessProcess.findById.mockResolvedValue(null);

      const result = await CorrelationEngine.generateExecutiveNarrative('find-1', 'org-123');

      expect(result.executiveNarrative.businessProcess).toBeNull();
    });

    it('should calculate financial impact correctly for ransomware', async () => {
      Finding.findById.mockResolvedValue(mockFinding);
      Risk.findById.mockResolvedValue(mockRisk);
      BusinessProcess.findById.mockResolvedValue(mockBusinessProcess);
      ThreatScenario.findById.mockResolvedValue(mockThreatScenario);
      FinancialImpact.findByRiskId.mockResolvedValue(null);

      const result = await CorrelationEngine.generateExecutiveNarrative('find-1', 'org-123');

      const financial = result.executiveNarrative.financialExposure;
      expect(financial.totalGrossExposure).toBe(250000);
      expect(financial.breakdown).toBeDefined();
    });
  });

  describe('batchCorrelate', () => {
    it('should correlate multiple findings', async () => {
      const findingIds = ['find-1', 'find-2', 'find-3'];

      // Mock successful correlation for each finding
      Finding.findById.mockImplementation((id) => {
        return Promise.resolve({
          id,
          title: `Finding ${id}`,
          organizationId: 'org-123',
          riskId: 'risk-1'
        });
      });

      Risk.findById.mockResolvedValue({
        id: 'risk-1',
        organizationId: 'org-123'
      });

      BusinessProcess.findById.mockResolvedValue({
        id: 'bp-1',
        name: 'Test Process'
      });

      DataObject.findById.mockResolvedValue({
        id: 'data-1',
        type: 'PHI'
      });

      ThreatScenario.findById.mockResolvedValue(null);
      LegalObligation.findById.mockResolvedValue(null);
      FinancialImpact.findByRiskId.mockResolvedValue(null);

      const results = await CorrelationEngine.batchCorrelate(findingIds, 'org-123');

      expect(results).toHaveLength(3);
      expect(results[0].finding).toBeDefined();
      expect(results[1].finding).toBeDefined();
      expect(results[2].finding).toBeDefined();
    });

    it('should handle individual correlation failures', async () => {
      const findingIds = ['find-1', 'find-2', 'find-3'];

      Finding.findById.mockImplementation((id) => {
        if (id === 'find-2') {
          return Promise.resolve(null); // Simulate not found
        }
        return Promise.resolve({
          id,
          title: `Finding ${id}`,
          organizationId: 'org-123'
        });
      });

      const results = await CorrelationEngine.batchCorrelate(findingIds, 'org-123');

      expect(results).toHaveLength(3);
      expect(results[0].finding).toBeDefined();
      expect(results[1].error).toBeDefined();
      expect(results[2].finding).toBeDefined();
    });
  });

  describe('getOrganizationRiskSummary', () => {
    it('should generate comprehensive risk summary', async () => {
      const mockRisks = [
        { id: 'risk-1', name: 'Risk 1', status: 'open', severity: 'Critical' },
        { id: 'risk-2', name: 'Risk 2', status: 'mitigated', severity: 'High' }
      ];

      const mockFinancialTotals = {
        totalGrossExposure: 500000,
        netExposure: 450000
      };

      const mockRepeatFindings = [
        { id: 'find-1', title: 'Repeat Finding', repeatCount: 3 }
      ];

      const mockHighValueData = [
        { id: 'data-1', type: 'PHI', sensitivity: 'high' }
      ];

      const mockHighProbThreats = [
        { id: 'threat-1', name: 'Ransomware', probability: 85 }
      ];

      const mockExecutiveRoster = [
        { roleId: 'cio', name: 'Jane CIO', email: 'cio@test.com' }
      ];

      Risk.findByOrganization.mockResolvedValue(mockRisks);
      FinancialImpact.getTotalExposure.mockResolvedValue(mockFinancialTotals);
      Finding.findRepeats.mockResolvedValue(mockRepeatFindings);
      DataObject.getHighValueDataObjects.mockResolvedValue(mockHighValueData);
      ThreatScenario.getHighProbabilityThreats.mockResolvedValue(mockHighProbThreats);
      ExecutiveOwner.getExecutiveRoster.mockResolvedValue(mockExecutiveRoster);

      const result = await CorrelationEngine.getOrganizationRiskSummary('org-123');

      expect(result.organizationId).toBe('org-123');
      expect(result.summary.totalRisks).toBe(2);
      expect(result.summary.openRisks).toBe(1);
      expect(result.summary.criticalRisks).toBe(1);
      expect(result.summary.repeatFindings).toBe(1);
      expect(result.financialExposure).toEqual(mockFinancialTotals);
      expect(result.topRisks).toEqual(mockRisks);
      expect(result.repeatFindings).toEqual(mockRepeatFindings);
      expect(result.highValueData).toEqual(mockHighValueData);
      expect(result.highProbabilityThreats).toEqual(mockHighProbThreats);
      expect(result.executiveRoster).toEqual(mockExecutiveRoster);
    });
  });

  describe('_buildSummary', () => {
    it('should build narrative summary with all components', () => {
      const finding = {
        title: 'Phishing Attack',
        tool: 'GuidePoint'
      };

      const businessProcess = {
        name: 'Claims Processing',
        tier: 'Tier 1'
      };

      const dataObjects = [
        { type: 'PHI' },
        { type: 'PII' }
      ];

      const threatScenario = {
        type: 'phishing'
      };

      const summary = CorrelationEngine._buildSummary({
        finding,
        businessProcess,
        dataObjects,
        threatScenario
      });

      expect(summary).toContain('Phishing Attack');
      expect(summary).toContain('Claims Processing');
      expect(summary).toContain('Tier 1');
      expect(summary).toContain('PHI');
      expect(summary).toContain('phishing');
    });

    it('should build summary with missing optional components', () => {
      const finding = {
        title: 'System Misconfiguration',
        tool: 'Audit'
      };

      const summary = CorrelationEngine._buildSummary({
        finding,
        businessProcess: null,
        dataObjects: [],
        threatScenario: null
      });

      expect(summary).toContain('System Misconfiguration');
    });
  });

  describe('_buildFinancialSummary', () => {
    it('should build financial summary with impact', () => {
      const financialImpact = {
        totalGross: 500000,
        netExposure: 450000,
        insuranceCoverage: 50000,
        breachResponseCost: 150000,
        regulatoryFine: 100000,
        businessInterruption: 125000,
        fraudLoss: 0,
        reputationalLoss: 75000,
        legalCost: 50000,
        recoveryCost: 0
      };

      const risk = {
        financialExposure: 500000
      };

      const summary = CorrelationEngine._buildFinancialSummary(financialImpact, risk);

      expect(summary.totalGrossExposure).toBe(500000);
      expect(summary.netExposure).toBe(450000);
      expect(summary.insuranceCoverage).toBe(50000);
      expect(summary.breakdown.breachResponseCost).toBe(150000);
      expect(summary.breakdown.regulatoryFines).toBe(100000);
    });

    it('should build summary without financial impact', () => {
      const summary = CorrelationEngine._buildFinancialSummary(null, {
        financialExposure: 100000
      });

      expect(summary.totalExposure).toBe(100000);
      expect(summary.breakdown).toBeNull();
    });

    it('should return null if no impact data', () => {
      const summary = CorrelationEngine._buildFinancialSummary(null, null);
      expect(summary).toBeNull();
    });
  });

  describe('_buildRegulatorySummary', () => {
    it('should build regulatory summary', () => {
      const legalObligations = [
        {
          name: 'HIPAA Breach Notification',
          source: 'HIPAA',
          notificationTimeline: '60 days',
          citation: '164.312(a)(1)',
          maxPenaltyAmount: 50000
        },
        {
          name: 'State Notification',
          source: 'State Law',
          notificationTimeline: '24 hours',
          citation: 'STAT-123',
          maxPenaltyAmount: 25000
        }
      ];

      const frameworkMappings = ['HIPAA-164.312(a)(1)', 'NIST-800-53-AC-1'];

      const summary = CorrelationEngine._buildRegulatorySummary(
        legalObligations,
        frameworkMappings
      );

      expect(summary.frameworks).toEqual(frameworkMappings);
      expect(summary.obligations).toHaveLength(2);
      expect(summary.obligations[0].name).toBe('HIPAA Breach Notification');
      expect(summary.urgentNotifications).toHaveLength(1);
      expect(summary.urgentNotifications[0].timeline).toBe('24 hours');
    });
  });

  describe('_getBusinessProcess', () => {
    it('should get process from finding', async () => {
      const finding = {
        businessProcessId: 'bp-1'
      };

      BusinessProcess.findById.mockResolvedValue({
        id: 'bp-1',
        name: 'Test Process'
      });

      const result = await CorrelationEngine._getBusinessProcess(finding, null);

      expect(result.id).toBe('bp-1');
    });

    it('should get process from risk if not on finding', async () => {
      const finding = {
        businessProcessId: null,
        assetId: null
      };

      const risk = {
        businessProcessIds: ['bp-2']
      };

      BusinessProcess.findById.mockResolvedValue({
        id: 'bp-2',
        name: 'Risk Process'
      });

      const result = await CorrelationEngine._getBusinessProcess(finding, risk);

      expect(result.id).toBe('bp-2');
    });

    it('should get process from asset if not on finding or risk', async () => {
      const finding = {
        businessProcessId: null,
        assetId: 'asset-1'
      };

      Asset.findById.mockResolvedValue({
        businessProcessIds: ['bp-3']
      });

      BusinessProcess.findById.mockResolvedValue({
        id: 'bp-3',
        name: 'Asset Process'
      });

      const result = await CorrelationEngine._getBusinessProcess(finding, null);

      expect(result.id).toBe('bp-3');
    });

    it('should return null if no process found', async () => {
      const finding = {
        businessProcessId: null,
        assetId: null
      };

      const result = await CorrelationEngine._getBusinessProcess(finding, null);

      expect(result).toBeNull();
    });
  });
});
