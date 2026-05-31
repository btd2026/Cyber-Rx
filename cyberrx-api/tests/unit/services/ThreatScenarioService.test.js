'use strict';

const ThreatScenarioService = require('../../../src/domains/security/services/ThreatScenarioService');
const ThreatScenario = require('../../../src/models/ThreatScenario');
const MitreAttckService = require('../../../src/services/MitreAttckService');

// Mock dependencies
jest.mock('../../../src/models/ThreatScenario');
jest.mock('../../../src/models/DataObject');
jest.mock('../../../src/models/Risk');
jest.mock('../../../src/models/Control');
jest.mock('../../../src/services/MitreAttckService');

describe('ThreatScenarioService', () => {
  let threatScenarioService;
  let mockLogger;
  let mockModels;
  let mockMitreService;

  beforeEach(() => {
    mockLogger = {
      logInfo: jest.fn(),
      logError: jest.fn(),
      logWarn: jest.fn()
    };

    mockMitreService = {
      searchTechniques: jest.fn(),
      getTacticDetails: jest.fn(),
      getTechniqueDetails: jest.fn(),
      getAllTactics: jest.fn()
    };

    mockModels = {
      ThreatScenario,
      DataObject: {
        findByOrganization: jest.fn()
      },
      Risk: {
        findById: jest.fn()
      },
      Control: {
        findById: jest.fn()
      }
    };

    // MitreAttckService mocked constructor
    MitreAttckService.mockImplementation(() => mockMitreService);

    threatScenarioService = new ThreatScenarioService(mockModels, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getThreatScenarios', () => {
    it('should fetch threat scenarios with filters', async () => {
      const mockThreatScenarios = [
        { id: '1', name: 'Ransomware', type: 'ransomware', probability: 70 },
        { id: '2', name: 'Phishing', type: 'phishing', probability: 80 }
      ];

      ThreatScenario.findByOrganization = jest.fn().mockResolvedValue(mockThreatScenarios);

      const result = await threatScenarioService.getThreatScenarios('org-123', { type: 'ransomware' });

      expect(ThreatScenario.findByOrganization).toHaveBeenCalledWith('org-123', { type: 'ransomware' });
      expect(result).toHaveLength(2);
    });

    it('should handle errors gracefully', async () => {
      ThreatScenario.findByOrganization = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(threatScenarioService.getThreatScenarios('org-123'))
        .rejects.toThrow('Database error');

      expect(mockLogger.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('fetching threat scenarios')
        })
      );
    });
  });

  describe('createThreatScenario', () => {
    it('should create threat scenario with valid data', async () => {
      const data = {
        name: 'Ransomware on Claims System',
        type: 'ransomware',
        probability: 70,
        impactLevel: 'Critical',
        mitreTechnique: ['T1486']
      };

      const mockCreated = { id: 'ts-123', ...data };
      ThreatScenario.create = jest.fn().mockResolvedValue(mockCreated);
      mockMitreService.getTechniqueDetails = jest.fn().mockResolvedValue({ id: 'T1486' });

      const result = await threatScenarioService.createThreatScenario('org-123', data);

      expect(ThreatScenario.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Ransomware on Claims System',
          type: 'ransomware',
          probability: 70,
          impactLevel: 'Critical',
          organizationId: 'org-123'
        })
      );
      expect(result.name).toBe('Ransomware on Claims System');
    });

    it('should validate probability range', async () => {
      const data = {
        name: 'Ransomware',
        type: 'ransomware',
        probability: 150, // Invalid
        impactLevel: 'Critical'
      };

      await expect(threatScenarioService.createThreatScenario('org-123', data))
        .rejects.toThrow('Probability must be between 0 and 100');

      expect(ThreatScenario.create).not.toHaveBeenCalled();
    });

    it('should validate MITRE techniques', async () => {
      const data = {
        name: 'Ransomware',
        type: 'ransomware',
        probability: 70,
        mitreTechnique: ['INVALID']
      };

      mockMitreService.getTechniqueDetails = jest.fn().mockResolvedValue(null);

      await expect(threatScenarioService.createThreatScenario('org-123', data))
        .rejects.toThrow('MITRE technique INVALID not found');

      expect(ThreatScenario.create).not.toHaveBeenCalled();
    });
  });

  describe('updateThreatScenario', () => {
    it('should update threat scenario', async () => {
      const existing = { id: '1', name: 'Ransomware', organizationId: 'org-123' };
      const updated = { id: '1', name: 'Ransomware - Updated', probability: 80 };

      ThreatScenario.findById = jest.fn().mockResolvedValue(existing);
      ThreatScenario.update = jest.fn().mockResolvedValue(updated);

      const result = await threatScenarioService.updateThreatScenario('1', 'org-123', {
        name: 'Ransomware - Updated',
        probability: 80
      });

      expect(ThreatScenario.update).toHaveBeenCalledWith('1', {
        name: 'Ransomware - Updated',
        probability: 80
      });
      expect(result.name).toBe('Ransomware - Updated');
    });

    it('should verify organization access', async () => {
      const existing = { id: '1', name: 'Ransomware', organizationId: 'other-org' };
      ThreatScenario.findById = jest.fn().mockResolvedValue(existing);

      await expect(threatScenarioService.updateThreatScenario('1', 'org-123', { name: 'Updated' }))
        .rejects.toThrow();

      expect(ThreatScenario.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteThreatScenario', () => {
    it('should delete threat scenario', async () => {
      const existing = { id: '1', name: 'Ransomware', organizationId: 'org-123' };
      ThreatScenario.findById = jest.fn().mockResolvedValue(existing);
      ThreatScenario.delete = jest.fn().mockResolvedValue(true);

      const result = await threatScenarioService.deleteThreatScenario('1', 'org-123');

      expect(ThreatScenario.delete).toHaveBeenCalledWith('1');
      expect(result.message).toBe('Threat scenario deleted successfully');
    });

    it('should verify organization access before deletion', async () => {
      const existing = { id: '1', name: 'Ransomware', organizationId: 'other-org' };
      ThreatScenario.findById = jest.fn().mockResolvedValue(existing);

      await expect(threatScenarioService.deleteThreatScenario('1', 'org-123'))
        .rejects.toThrow();

      expect(ThreatScenario.delete).not.toHaveBeenCalled();
    });
  });

  describe('getThreatDashboard', () => {
    it('should generate threat dashboard summary', async () => {
      const mockThreatScenarios = [
        { type: 'ransomware', probability: 70, impactLevel: 'Critical', controlEffectiveness: 65 },
        { type: 'phishing', probability: 80, impactLevel: 'High', controlEffectiveness: 70 },
        { type: 'insider', probability: 40, impactLevel: 'Medium', controlEffectiveness: 75 }
      ];

      ThreatScenario.findByOrganization = jest.fn().mockResolvedValue(mockThreatScenarios);
      ThreatScenario.getWithRiskAnalysis = jest.fn().mockResolvedValue(mockThreatScenarios);

      const dashboard = await threatScenarioService.getThreatDashboard('org-123');

      expect(dashboard.total).toBe(3);
      expect(dashboard.byType.ransomware).toBe(1);
      expect(dashboard.byImpactLevel.Critical).toBe(1);
      expect(dashboard.highProbabilityCount).toBe(2);
      expect(dashboard.averageProbability).toBe(63);
      expect(dashboard.controlEffectiveness).toBe(70);
    });

    it('should calculate risk distribution', async () => {
      const mockThreatScenarios = [
        { probability: 80, impactLevel: 'Critical', controlEffectiveness: 50 },
        { probability: 60, impactLevel: 'High', controlEffectiveness: 70 },
        { probability: 40, impactLevel: 'Medium', controlEffectiveness: 80 }
      ];

      ThreatScenario.findByOrganization = jest.fn().mockResolvedValue(mockThreatScenarios);
      ThreatScenario.getWithRiskAnalysis = jest.fn().mockResolvedValue(mockThreatScenarios);

      const dashboard = await threatScenarioService.getThreatDashboard('org-123');

      expect(dashboard.riskDistribution.critical).toBeDefined();
      expect(dashboard.riskDistribution.high).toBeDefined();
      expect(dashboard.riskDistribution.medium).toBeDefined();
      expect(dashboard.riskDistribution.low).toBeDefined();
    });
  });

  describe('getTopThreats', () => {
    it('should return top threats by risk score', async () => {
      const mockThreatScenarios = [
        { id: '1', name: 'Ransomware', probability: 70, impactLevel: 'Critical', calculatedRiskScore: 105 },
        { id: '2', name: 'Phishing', probability: 80, impactLevel: 'High', calculatedRiskScore: 96 },
        { id: '3', name: 'Insider', probability: 40, impactLevel: 'Medium', calculatedRiskScore: 40 }
      ];

      ThreatScenario.getWithRiskAnalysis = jest.fn().mockResolvedValue(mockThreatScenarios);

      const topThreats = await threatScenarioService.getTopThreats('org-123', 2);

      expect(topThreats).toHaveLength(2);
      expect(topThreats[0].name).toBe('Ransomware');
      expect(topThreats[1].name).toBe('Phishing');
    });
  });

  describe('searchMitreTechniques', () => {
    it('should search MITRE techniques', async () => {
      const mockTechniques = [
        { id: 'T1486', name: 'Data Encrypted for Impact' },
        { id: 'T1566', name: 'Phishing' }
      ];

      mockMitreService.searchTechniques = jest.fn().mockResolvedValue(mockTechniques);

      const result = await threatScenarioService.searchMitreTechniques('ransomware');

      expect(mockMitreService.searchTechniques).toHaveBeenCalledWith('ransomware');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('T1486');
    });
  });

  describe('getMitreTacticDetails', () => {
    it('should get MITRE tactic details with techniques', async () => {
      const mockTactic = {
        id: 'TA0001',
        name: 'Initial Access',
        techniques: [
          { id: 'T1566', name: 'Phishing' },
          { id: 'T1190', name: 'Exploit Public-Facing Application' }
        ]
      };

      mockMitreService.getTacticDetails = jest.fn().mockResolvedValue(mockTactic);

      const result = await threatScenarioService.getMitreTacticDetails('Initial Access');

      expect(mockMitreService.getTacticDetails).toHaveBeenCalledWith('Initial Access');
      expect(result.name).toBe('Initial Access');
      expect(result.techniques).toHaveLength(2);
    });
  });

  describe('getMitreTechniqueDetails', () => {
    it('should get MITRE technique details', async () => {
      const mockTechnique = {
        id: 'T1486',
        name: 'Data Encrypted for Impact',
        url: 'https://attack.mitre.org/techniques/T1486',
        tactics: ['Impact']
      };

      mockMitreService.getTechniqueDetails = jest.fn().mockResolvedValue(mockTechnique);

      const result = await threatScenarioService.getMitreTechniqueDetails('T1486');

      expect(mockMitreService.getTechniqueDetails).toHaveBeenCalledWith('T1486');
      expect(result.name).toBe('Data Encrypted for Impact');
    });
  });

  describe('getMitreTactics', () => {
    it('should get all MITRE tactics', async () => {
      const mockTactics = [
        { id: 'TA0001', name: 'Initial Access' },
        { id: 'TA0040', name: 'Impact' }
      ];

      mockMitreService.getAllTactics = jest.fn().mockResolvedValue(mockTactics);

      const result = await threatScenarioService.getMitreTactics();

      expect(mockMitreService.getAllTactics).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });

  describe('calculateRiskScore', () => {
    it('should calculate risk score with Critical impact', () => {
      const threat = {
        probability: 70,
        impactLevel: 'Critical'
      };

      const score = threatScenarioService.calculateRiskScore(threat);

      expect(score).toBe(105); // 70 * 1.5
    });

    it('should calculate risk score with High impact', () => {
      const threat = {
        probability: 70,
        impactLevel: 'High'
      };

      const score = threatScenarioService.calculateRiskScore(threat);

      expect(score).toBe(84); // 70 * 1.2
    });

    it('should return null for missing probability or impact', () => {
      const threat = {
        probability: 70
      };

      const score = threatScenarioService.calculateRiskScore(threat);

      expect(score).toBeNull();
    });
  });

  describe('calculateResidualRisk', () => {
    it('should calculate residual risk after controls', () => {
      const threat = {
        probability: 70,
        impactLevel: 'Critical',
        controlEffectiveness: 50
      };

      const riskScore = threatScenarioService.calculateRiskScore(threat);
      const residualRisk = threatScenarioService.calculateResidualRisk(threat);

      expect(residualRisk).toBe(52); // 105 * (1 - 0.5)
      expect(residualRisk).toBeLessThan(riskScore);
    });

    it('should return null for threats without risk score', () => {
      const threat = {
        probability: null,
        impactLevel: null,
        controlEffectiveness: 50
      };

      const residualRisk = threatScenarioService.calculateResidualRisk(threat);

      expect(residualRisk).toBeNull();
    });
  });
});
