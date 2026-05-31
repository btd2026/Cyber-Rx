const SecurityService = require('../../src/domains/security/services/SecurityService');
const BaseService = require('../../src/domains/BaseService');

describe('SecurityService', () => {
  let securityService;
  let mockModels;
  let mockLogger;
  let mockFindingModel;
  let mockThreatModel;
  let mockControlModel;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    };

    mockFindingModel = {
      findByOrganization: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      findSimilar: jest.fn(),
      markAsRepeat: jest.fn(),
      delete: jest.fn(),
      getStatistics: jest.fn(),
      findRepeats: jest.fn()
    };

    mockThreatModel = {
      findByOrganization: jest.fn(),
      create: jest.fn(),
      findById: jest.fn()
    };

    mockControlModel = {
      findByOrganization: jest.fn(),
      findById: jest.fn(),
      recordTest: jest.fn()
    };

    mockModels = {
      Finding: mockFindingModel,
      ThreatScenario: mockThreatModel,
      Control: mockControlModel
    };

    securityService = new SecurityService(mockModels, mockLogger);
  });

  describe('inheritance', () => {
    it('should extend BaseService', () => {
      expect(securityService).toBeInstanceOf(BaseService);
    });

    it('should set model references', () => {
      expect(securityService.findingModel).toBe(mockFindingModel);
      expect(securityService.threatModel).toBe(mockThreatModel);
      expect(securityService.controlModel).toBe(mockControlModel);
    });
  });

  describe('getFindings', () => {
    it('should fetch and enrich findings', async () => {
      const mockFindings = [
        {
          id: 'find-1',
          title: 'Critical CVE',
          severity: 'Critical',
          businessProcessId: 'bp-1',
          organizationId: 'org-123'
        }
      ];

      mockFindingModel.findByOrganization.mockResolvedValue(mockFindings);

      const result = await securityService.getFindings('org-123', { severity: 'Critical' });

      expect(mockFindingModel.findByOrganization).toHaveBeenCalledWith('org-123', { severity: 'Critical' });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'find-1',
        title: 'Critical CVE',
        severity: 'Critical'
      });
      expect(result[0].businessProcess).toBeDefined();
      expect(result[0].financialExposure).toBeDefined();
    });

    it('should handle empty findings list', async () => {
      mockFindingModel.findByOrganization.mockResolvedValue([]);

      const result = await securityService.getFindings('org-123');

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockFindingModel.findByOrganization.mockRejectedValue(error);

      try {
        await securityService.getFindings('org-123');
        fail('Should have thrown error');
      } catch (thrownError) {
        expect(thrownError.statusCode).toBe(500);
        expect(mockLogger.error).toHaveBeenCalled();
      }
    });
  });

  describe('createFinding', () => {
    const validFindingData = {
      title: 'Critical CVE in Claims System',
      severity: 'Critical',
      status: 'open',
      discoveredDate: new Date('2024-01-15'),
      assetId: 'asset-123',
      tool: 'RecordedFuture',
      sourceRef: 'CVE-2024-1234'
    };

    it('should create finding successfully', async () => {
      mockFindingModel.findSimilar.mockResolvedValue([]);
      mockFindingModel.create.mockResolvedValue({
        id: 'find-1',
        ...validFindingData
      });

      const result = await securityService.createFinding('org-123', validFindingData);

      expect(mockFindingModel.findSimilar).toHaveBeenCalled();
      expect(mockFindingModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: validFindingData.title,
          severity: validFindingData.severity,
          status: validFindingData.status,
          organizationId: 'org-123'
        })
      );
      expect(result).toBeDefined();
    });

    it('should auto-detect repeat findings', async () => {
      const similarFinding = {
        id: 'find-2',
        title: 'Critical CVE in Claims System',
        assetId: 'asset-123',
        tool: 'RecordedFuture',
        repeatCount: 0
      };

      mockFindingModel.findSimilar.mockResolvedValue([similarFinding]);
      mockFindingModel.create.mockResolvedValue({
        id: 'find-3',
        isRepeat: true,
        originalFindingId: 'find-2',
        repeatCount: 1
      });
      mockFindingModel.markAsRepeat.mockResolvedValue({});

      const result = await securityService.createFinding('org-123', validFindingData);

      expect(mockFindingModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isRepeat: true,
          originalFindingId: 'find-2',
          repeatCount: 1
        })
      );
    });

    it('should require discoveredDate', async () => {
      const invalidData = { ...validFindingData };
      delete invalidData.discoveredDate;

      try {
        await securityService.createFinding('org-123', invalidData);
        fail('Should have thrown error');
      } catch (error) {
        expect(error.statusCode).toBe(400);
        expect(error.message).toContain('Discovered date');
      }
    });

    it('should validate severity enum', async () => {
      const invalidData = {
        ...validFindingData,
        severity: 'Urgent'
      };

      try {
        await securityService.createFinding('org-123', invalidData);
        fail('Should have thrown error');
      } catch (error) {
        expect(error.statusCode).toBe(400);
        expect(error.message).toContain('Severity');
      }
    });

    it('should validate status enum', async () => {
      const invalidData = {
        ...validFindingData,
        status: 'pending'
      };

      try {
        await securityService.createFinding('org-123', invalidData);
        fail('Should have thrown error');
      } catch (error) {
        expect(error.statusCode).toBe(400);
        expect(error.message).toContain('Status');
      }
    });

    it('should handle database errors', async () => {
      mockFindingModel.findSimilar.mockRejectedValue(new Error('Database error'));

      try {
        await securityService.createFinding('org-123', validFindingData);
        fail('Should have thrown error');
      } catch (error) {
        expect(error.statusCode).toBe(500);
        expect(mockLogger.error).toHaveBeenCalled();
      }
    });
  });

  describe('updateFinding', () => {
    it('should update finding successfully', async () => {
      const existingFinding = {
        id: 'find-1',
        title: 'Old Title',
        organizationId: 'org-123'
      };

      const updateData = { title: 'New Title', status: 'resolved' };

      mockFindingModel.findById.mockResolvedValue(existingFinding);
      mockFindingModel.update.mockResolvedValue({
        ...existingFinding,
        ...updateData
      });

      const result = await securityService.updateFinding('find-1', 'org-123', updateData);

      expect(mockFindingModel.findById).toHaveBeenCalledWith('find-1');
      expect(mockFindingModel.update).toHaveBeenCalledWith('find-1', updateData);
      expect(result.title).toBe('New Title');
    });

    it('should deny access to different organization', async () => {
      const existingFinding = {
        id: 'find-1',
        title: 'Title',
        organizationId: 'org-456'
      };

      mockFindingModel.findById.mockResolvedValue(existingFinding);

      try {
        await securityService.updateFinding('find-1', 'org-123', { title: 'New' });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.statusCode).toBe(403);
      }
    });

    it('should throw 404 if finding not found', async () => {
      mockFindingModel.findById.mockResolvedValue(null);

      try {
        await securityService.updateFinding('find-1', 'org-123', { title: 'New' });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.statusCode).toBe(404);
      }
    });
  });

  describe('deleteFinding', () => {
    it('should delete finding successfully', async () => {
      const existingFinding = {
        id: 'find-1',
        title: 'Title',
        organizationId: 'org-123'
      };

      mockFindingModel.findById.mockResolvedValue(existingFinding);
      mockFindingModel.delete.mockResolvedValue({});

      const result = await securityService.deleteFinding('find-1', 'org-123');

      expect(result).toEqual({
        message: 'Finding deleted successfully',
        id: 'find-1'
      });
    });

    it('should deny access to different organization', async () => {
      const existingFinding = {
        id: 'find-1',
        organizationId: 'org-456'
      };

      mockFindingModel.findById.mockResolvedValue(existingFinding);

      try {
        await securityService.deleteFinding('find-1', 'org-123');
        fail('Should have thrown error');
      } catch (error) {
        expect(error.statusCode).toBe(403);
      }
    });
  });

  describe('getThreats', () => {
    it('should fetch threat scenarios', async () => {
      const mockThreats = [
        {
          id: 'threat-1',
          name: 'Ransomware Attack',
          type: 'ransomware',
          probability: 75
        }
      ];

      mockThreatModel.findByOrganization.mockResolvedValue(mockThreats);

      const result = await securityService.getThreats('org-123');

      expect(mockThreatModel.findByOrganization).toHaveBeenCalledWith('org-123', {});
      expect(result).toEqual(mockThreats);
    });

    it('should pass filters to model', async () => {
      mockThreatModel.findByOrganization.mockResolvedValue([]);

      await securityService.getThreats('org-123', { type: 'ransomware' });

      expect(mockThreatModel.findByOrganization).toHaveBeenCalledWith('org-123', { type: 'ransomware' });
    });
  });

  describe('createThreatScenario', () => {
    const validThreatData = {
      name: 'Spear Phishing Campaign',
      type: 'phishing',
      probability: 60,
      impactLevel: 'high'
    };

    it('should create threat scenario successfully', async () => {
      mockThreatModel.create.mockResolvedValue({
        id: 'threat-1',
        ...validThreatData
      });

      const result = await securityService.createThreatScenario('org-123', validThreatData);

      expect(mockThreatModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: validThreatData.name,
          type: validThreatData.type,
          organizationId: 'org-123'
        })
      );
    });

    it('should validate threat type enum', async () => {
      const invalidData = {
        ...validThreatData,
        type: 'ddos'
      };

      try {
        await securityService.createThreatScenario('org-123', invalidData);
        fail('Should have thrown error');
      } catch (error) {
        expect(error.statusCode).toBe(400);
        expect(error.message).toContain('Type');
      }
    });

    it('should validate probability range', async () => {
      const invalidData = {
        ...validThreatData,
        probability: 150
      };

      try {
        await securityService.createThreatScenario('org-123', invalidData);
        fail('Should have thrown error');
      } catch (error) {
        expect(error.statusCode).toBe(400);
        expect(error.message).toContain('Probability');
      }
    });
  });

  describe('getControls', () => {
    it('should fetch and enrich controls', async () => {
      const mockControls = [
        {
          id: 'ctrl-1',
          name: 'Access Control',
          implementationStatus: 'implemented',
          lastTestDate: new Date('2024-01-01')
        }
      ];

      mockControlModel.findByOrganization.mockResolvedValue(mockControls);

      const result = await securityService.getControls('org-123');

      expect(result).toHaveLength(1);
      expect(result[0].effectivenessScore).toBe(100);
      expect(result[0].lastTested).toBeDefined();
    });

    it('should calculate effectiveness scores correctly', async () => {
      const mockControls = [
        { id: 'ctrl-1', implementationStatus: 'implemented' },
        { id: 'ctrl-2', implementationStatus: 'partially_implemented' },
        { id: 'ctrl-3', implementationStatus: 'not_implemented' }
      ];

      mockControlModel.findByOrganization.mockResolvedValue(mockControls);

      const result = await securityService.getControls('org-123');

      expect(result[0].effectivenessScore).toBe(100);
      expect(result[1].effectivenessScore).toBe(50);
      expect(result[2].effectivenessScore).toBe(0);
    });
  });

  describe('assessControlEffectiveness', () => {
    const assessment = {
      result: 'pass',
      testedBy: 'user-123',
      evidenceIds: ['ev-1', 'ev-2'],
      notes: 'Control tested successfully'
    };

    it('should record control assessment', async () => {
      const control = {
        id: 'ctrl-1',
        name: 'Access Control',
        organizationId: 'org-123'
      };

      mockControlModel.findById.mockResolvedValue(control);
      mockControlModel.recordTest.mockResolvedValue({
        controlId: 'ctrl-1',
        result: 'pass'
      });

      const result = await securityService.assessControlEffectiveness('ctrl-1', 'org-123', assessment);

      expect(mockControlModel.recordTest).toHaveBeenCalledWith('ctrl-1', assessment);
      expect(result).toBeDefined();
    });

    it('should deny access to different organization', async () => {
      const control = {
        id: 'ctrl-1',
        organizationId: 'org-456'
      };

      mockControlModel.findById.mockResolvedValue(control);

      try {
        await securityService.assessControlEffectiveness('ctrl-1', 'org-123', assessment);
        fail('Should have thrown error');
      } catch (error) {
        expect(error.statusCode).toBe(403);
      }
    });
  });

  describe('getFindingStatistics', () => {
    it('should fetch finding statistics', async () => {
      const stats = {
        total: 150,
        bySeverity: { Critical: 5, High: 20, Medium: 50, Low: 75 },
        openFindings: 89,
        mttr: 72
      };

      mockFindingModel.getStatistics.mockResolvedValue(stats);

      const result = await securityService.getFindingStatistics('org-123');

      expect(result).toEqual(stats);
    });
  });

  describe('getRepeatFindings', () => {
    it('should fetch repeat findings', async () => {
      const repeats = [
        { id: 'find-1', title: 'Repeat Finding', repeatCount: 3 }
      ];

      mockFindingModel.findRepeats.mockResolvedValue(repeats);

      const result = await securityService.getRepeatFindings('org-123');

      expect(result).toEqual(repeats);
    });
  });

  describe('enrichFindings', () => {
    it('should enrich findings with business context', () => {
      const findings = [
        {
          id: 'find-1',
          title: 'Critical CVE',
          severity: 'Critical',
          businessProcessId: 'bp-1'
        }
      ];

      const enriched = securityService.enrichFindings(findings);

      expect(enriched[0].businessProcess).toBeDefined();
      expect(enriched[0].financialExposure).toBeDefined();
      expect(enriched[0].financialExposure).toBe(100000); // Critical = 100000
    });
  });

  describe('calculateExposure', () => {
    it('should calculate exposure by severity', () => {
      expect(securityService.calculateExposure({ severity: 'Critical' })).toBe(100000);
      expect(securityService.calculateExposure({ severity: 'High' })).toBe(50000);
      expect(securityService.calculateExposure({ severity: 'Medium' })).toBe(10000);
      expect(securityService.calculateExposure({ severity: 'Low' })).toBe(5000);
      expect(securityService.calculateExposure({ severity: 'Info' })).toBe(0);
      expect(securityService.calculateExposure({ severity: 'Unknown' })).toBe(0);
    });
  });
});
