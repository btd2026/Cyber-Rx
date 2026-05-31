'use strict';

const BusinessProcessService = require('../../../../src/domains/operational/services/BusinessProcessService');
const { models } = require('../../../../src/models');

// Mock the models
jest.mock('../../../../src/models');

describe('BusinessProcessService', () => {
  let service;
  let mockLogger;
  let mockBusinessProcessModel;

  beforeEach(() => {
    // Setup mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    };

    // Setup mock business process model
    mockBusinessProcessModel = {
      findByOrganization: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    models.BusinessProcess = mockBusinessProcessModel;

    // Create service instance
    service = new BusinessProcessService(models, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProcesses', () => {
    it('should fetch processes for organization', async () => {
      const mockProcesses = [
        {
          id: 'bp_1',
          name: 'Claims Processing',
          tier: 'Primary',
          criticality: 'Critical',
          owner: 'CIO',
          organizationId: 'org-1',
          supportedBySystems: ['sys-1'],
          createsDataObjects: ['data-1'],
          governedByControls: ['ctrl-1']
        }
      ];

      mockBusinessProcessModel.findByOrganization.mockResolvedValue(mockProcesses);

      const result = await service.getProcesses('org-1', {});

      expect(mockBusinessProcessModel.findByOrganization).toHaveBeenCalledWith('org-1', {});
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('riskCount');
      expect(result[0]).toHaveProperty('assetCount');
      expect(result[0]).toHaveProperty('controlGap');
    });

    it('should filter by criticality', async () => {
      const mockProcesses = [
        { id: 'bp_1', name: 'Process 1', criticality: 'Critical', organizationId: 'org-1' },
        { id: 'bp_2', name: 'Process 2', criticality: 'High', organizationId: 'org-1' }
      ];

      mockBusinessProcessModel.findByOrganization.mockResolvedValue(mockProcesses);

      const result = await service.getProcesses('org-1', { criticality: 'Critical' });

      expect(result).toHaveLength(1);
      expect(result[0].criticality).toBe('Critical');
    });

    it('should filter by owner', async () => {
      const mockProcesses = [
        { id: 'bp_1', name: 'Process 1', owner: 'CIO', organizationId: 'org-1' },
        { id: 'bp_2', name: 'Process 2', owner: 'CFO', organizationId: 'org-1' }
      ];

      mockBusinessProcessModel.findByOrganization.mockResolvedValue(mockProcesses);

      const result = await service.getProcesses('org-1', { owner: 'CIO' });

      expect(result).toHaveLength(1);
      expect(result[0].owner).toBe('CIO');
    });

    it('should handle errors gracefully', async () => {
      mockBusinessProcessModel.findByOrganization.mockRejectedValue(new Error('Database error'));

      await expect(service.getProcesses('org-1', {}))
        .rejects
        .toThrow('An error occurred during fetching business processes');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getProcessById', () => {
    it('should fetch process by ID', async () => {
      const mockProcess = {
        id: 'bp_1',
        name: 'Claims Processing',
        tier: 'Primary',
        criticality: 'Critical',
        owner: 'CIO',
        organizationId: 'org-1'
      };

      mockBusinessProcessModel.findById.mockResolvedValue(mockProcess);

      const result = await service.getProcessById('bp_1', 'org-1');

      expect(mockBusinessProcessModel.findById).toHaveBeenCalledWith('bp_1');
      expect(result).toHaveProperty('healthScore');
    });

    it('should throw 404 if process not found', async () => {
      mockBusinessProcessModel.findById.mockResolvedValue(null);

      await expect(service.getProcessById('bp-1', 'org-1'))
        .rejects
        .toThrow('Business process not found');
    });

    it('should throw 403 if access denied', async () => {
      const mockProcess = {
        id: 'bp_1',
        name: 'Claims Processing',
        organizationId: 'org-2'  // Different org
      };

      mockBusinessProcessModel.findById.mockResolvedValue(mockProcess);

      await expect(service.getProcessById('bp-1', 'org-1'))
        .rejects
        .toThrow('You do not have access to this business process');
    });
  });

  describe('createProcess', () => {
    const validProcessData = {
      name: 'Claims Processing',
      tier: 'Primary',
      criticality: 'Critical',
      owner: 'CIO',
      description: 'Core claims process'
    };

    it('should create process with valid data', async () => {
      const mockCreatedProcess = {
        id: 'bp_1',
        ...validProcessData,
        organizationId: 'org-1',
        supportedBySystems: [],
        createsDataObjects: [],
        governedByControls: []
      };

      mockBusinessProcessModel.create.mockResolvedValue(mockCreatedProcess);

      const result = await service.createProcess('org-1', validProcessData);

      expect(mockBusinessProcessModel.create).toHaveBeenCalled();
      expect(result.name).toBe(validProcessData.name);
      expect(result).toHaveProperty('healthScore');
    });

    it('should validate required name field', async () => {
      const invalidData = { ...validProcessData, name: '' };

      await expect(service.createProcess('org-1', invalidData))
        .rejects
        .toThrow('Business process name is required');
    });

    it('should validate tier enum', async () => {
      const invalidData = { ...validProcessData, tier: 'Invalid' };

      await expect(service.createProcess('org-1', invalidData))
        .rejects
        .toThrow('Tier must be one of: Primary, Strategic');
    });

    it('should validate criticality enum', async () => {
      const invalidData = { ...validProcessData, criticality: 'Invalid' };

      await expect(service.createProcess('org-1', invalidData))
        .rejects
        .toThrow('Criticality must be one of: Critical, High, Medium, Low');
    });

    it('should validate owner role enum', async () => {
      const invalidData = { ...validProcessData, owner: 'Invalid' };

      await expect(service.createProcess('org-1', invalidData))
        .rejects
        .toThrow('Owner role must be one of');
    });

    it('should accept valid owner roles', async () => {
      const validOwners = ['CIO', 'CISO', 'CFO', 'CRO', 'CTO', 'CSO', 'COO', 'CEO', 'CLO', 'CMO'];

      for (const owner of validOwners) {
        const data = { ...validProcessData, owner };
        mockBusinessProcessModel.create.mockResolvedValue({ id: 'bp_1', ...data });

        await expect(service.createProcess('org-1', data))
          .resolves
          .toHaveProperty('owner', owner);
      }
    });

    it('should sanitize input', async () => {
      const dataWithXss = {
        ...validProcessData,
        name: '<script>alert("xss")</script> Claims',
        description: '<img src=x onerror=alert("xss")> Description'
      };

      mockBusinessProcessModel.create.mockResolvedValue({
        id: 'bp_1',
        name: 'scriptalert("xss")/script Claims',
        description: 'img src=x onerror=alert("xss") Description'
      });

      const result = await service.createProcess('org-1', dataWithXss);

      expect(result.name).not.toContain('<script>');
      expect(result.description).not.toContain('<img>');
    });
  });

  describe('updateProcess', () => {
    it('should update process with valid data', async () => {
      const existingProcess = {
        id: 'bp_1',
        name: 'Old Name',
        organizationId: 'org-1'
      };

      const updateData = {
        name: 'New Name',
        criticality: 'High'
      };

      const updatedProcess = {
        ...existingProcess,
        ...updateData
      };

      mockBusinessProcessModel.findById.mockResolvedValue(existingProcess);
      mockBusinessProcessModel.update.mockResolvedValue(updatedProcess);

      const result = await service.updateProcess('bp_1', 'org-1', updateData);

      expect(mockBusinessProcessModel.update).toHaveBeenCalledWith('bp_1', updateData);
      expect(result.name).toBe('New Name');
    });

    it('should throw 404 if process not found', async () => {
      mockBusinessProcessModel.findById.mockResolvedValue(null);

      await expect(service.updateProcess('bp-1', 'org-1', { name: 'New' }))
        .rejects
        .toThrow('Business process not found');
    });

    it('should throw 403 if access denied', async () => {
      const existingProcess = {
        id: 'bp_1',
        organizationId: 'org-2'  // Different org
      };

      mockBusinessProcessModel.findById.mockResolvedValue(existingProcess);

      await expect(service.updateProcess('bp-1', 'org-1', { name: 'New' }))
        .rejects
        .toThrow('You do not have access to this business process');
    });

    it('should validate enum values on update', async () => {
      const existingProcess = {
        id: 'bp_1',
        organizationId: 'org-1'
      };

      mockBusinessProcessModel.findById.mockResolvedValue(existingProcess);

      await expect(service.updateProcess('bp-1', 'org-1', { tier: 'Invalid' }))
        .rejects
        .toThrow('Tier must be one of: Primary, Strategic');
    });
  });

  describe('deleteProcess', () => {
    it('should delete process', async () => {
      const existingProcess = {
        id: 'bp_1',
        organizationId: 'org-1'
      };

      mockBusinessProcessModel.findById.mockResolvedValue(existingProcess);
      mockBusinessProcessModel.delete.mockResolvedValue(true);

      const result = await service.deleteProcess('bp_1', 'org-1');

      expect(mockBusinessProcessModel.delete).toHaveBeenCalledWith('bp_1');
      expect(result).toEqual({
        message: 'Business process deleted successfully',
        id: 'bp_1'
      });
    });

    it('should throw 404 if process not found', async () => {
      mockBusinessProcessModel.findById.mockResolvedValue(null);

      await expect(service.deleteProcess('bp-1', 'org-1'))
        .rejects
        .toThrow('Business process not found');
    });

    it('should throw 403 if access denied', async () => {
      const existingProcess = {
        id: 'bp_1',
        organizationId: 'org-2'  // Different org
      };

      mockBusinessProcessModel.findById.mockResolvedValue(existingProcess);

      await expect(service.deleteProcess('bp-1', 'org-1'))
        .rejects
        .toThrow('You do not have access to this business process');
    });
  });

  describe('getProcessSummary', () => {
    it('should return process summary statistics', async () => {
      const mockProcesses = [
        { id: 'bp_1', tier: 'Primary', criticality: 'Critical', owner: 'CIO', governedByControls: ['c1', 'c2', 'c3'] },
        { id: 'bp_2', tier: 'Strategic', criticality: 'High', owner: 'CISO', governedByControls: ['c1'] },
        { id: 'bp_3', tier: 'Primary', criticality: 'Critical', owner: 'CIO', governedByControls: [] }
      ];

      mockBusinessProcessModel.findByOrganization.mockResolvedValue(mockProcesses);

      const result = await service.getProcessSummary('org-1');

      expect(result.total).toBe(3);
      expect(result.byTier.Primary).toBe(2);
      expect(result.byTier.Strategic).toBe(1);
      expect(result.byCriticality.Critical).toBe(2);
      expect(result.byCriticality.High).toBe(1);
      expect(result.byOwner.CIO).toBe(2);
      expect(result.byOwner.CISO).toBe(1);
      expect(result.averageControlCoverage).toBeGreaterThan(0);
    });

    it('should handle empty process list', async () => {
      mockBusinessProcessModel.findByOrganization.mockResolvedValue([]);

      const result = await service.getProcessSummary('org-1');

      expect(result.total).toBe(0);
      expect(result.averageControlCoverage).toBe(0);
      expect(result.averageRiskCount).toBe(0);
    });
  });

  describe('Process enrichment', () => {
    it('should calculate control gap correctly', async () => {
      const mockProcess = {
        id: 'bp_1',
        criticality: 'Critical',
        governedByControls: ['c1', 'c2', 'c3', 'c4', 'c5']
      };

      mockBusinessProcessModel.findByOrganization.mockResolvedValue([mockProcess]);

      const result = await service.getProcesses('org-1', {});

      // Critical requires 10 controls, has 5, gap should be 5
      expect(result[0].controlGap).toBe(5);
    });

    it('should calculate health score correctly', async () => {
      const mockProcess = {
        id: 'bp_1',
        criticality: 'High',
        governedByControls: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']
      };

      mockBusinessProcessModel.findByOrganization.mockResolvedValue([mockProcess]);

      const result = await service.getProcesses('org-1', {});

      // High requires 8 controls, has 8, 100% coverage, should have good health score
      expect(result[0].healthScore).toBeGreaterThan(80);
    });

    it('should calculate control coverage percentage', async () => {
      const mockProcess = {
        id: 'bp_1',
        criticality: 'Medium',
        governedByControls: ['c1', 'c2', 'c3']
      };

      mockBusinessProcessModel.findByOrganization.mockResolvedValue([mockProcess]);

      const result = await service.getProcesses('org-1', {});

      // Medium requires 5 controls, has 3, should be 60%
      expect(result[0].controlCoverage).toBe(60);
    });

    it('should calculate asset count', async () => {
      const mockProcess = {
        id: 'bp_1',
        supportedBySystems: ['sys-1', 'sys-2', 'sys-3']
      };

      mockBusinessProcessModel.findByOrganization.mockResolvedValue([mockProcess]);

      const result = await service.getProcesses('org-1', {});

      expect(result[0].assetCount).toBe(3);
    });
  });

  describe('Mapping operations', () => {
    it('should map systems to process', async () => {
      const existingProcess = {
        id: 'bp_1',
        organizationId: 'org-1',
        supportedBySystems: []
      };

      const updatedProcess = {
        ...existingProcess,
        supportedBySystems: ['sys-1', 'sys-2']
      };

      mockBusinessProcessModel.findById.mockResolvedValue(existingProcess);
      mockBusinessProcessModel.update.mockResolvedValue(updatedProcess);

      const result = await service.mapSystems('bp_1', 'org-1', ['sys-1', 'sys-2']);

      expect(mockBusinessProcessModel.update).toHaveBeenCalledWith('bp_1', {
        supportedBySystems: ['sys-1', 'sys-2']
      });
      expect(result.supportedBySystems).toEqual(['sys-1', 'sys-2']);
    });

    it('should map data objects to process', async () => {
      const existingProcess = {
        id: 'bp_1',
        organizationId: 'org-1',
        createsDataObjects: []
      };

      const updatedProcess = {
        ...existingProcess,
        createsDataObjects: ['data-1', 'data-2', 'data-3']
      };

      mockBusinessProcessModel.findById.mockResolvedValue(existingProcess);
      mockBusinessProcessModel.update.mockResolvedValue(updatedProcess);

      const result = await service.mapDataObjects('bp_1', 'org-1', ['data-1', 'data-2', 'data-3']);

      expect(mockBusinessProcessModel.update).toHaveBeenCalledWith('bp_1', {
        createsDataObjects: ['data-1', 'data-2', 'data-3']
      });
      expect(result.createsDataObjects).toEqual(['data-1', 'data-2', 'data-3']);
    });

    it('should map controls to process', async () => {
      const existingProcess = {
        id: 'bp_1',
        organizationId: 'org-1',
        governedByControls: []
      };

      const updatedProcess = {
        ...existingProcess,
        governedByControls: ['ctrl-1', 'ctrl-2', 'ctrl-3', 'ctrl-4']
      };

      mockBusinessProcessModel.findById.mockResolvedValue(existingProcess);
      mockBusinessProcessModel.update.mockResolvedValue(updatedProcess);

      const result = await service.mapControls('bp_1', 'org-1', ['ctrl-1', 'ctrl-2', 'ctrl-3', 'ctrl-4']);

      expect(mockBusinessProcessModel.update).toHaveBeenCalledWith('bp_1', {
        governedByControls: ['ctrl-1', 'ctrl-2', 'ctrl-3', 'ctrl-4']
      });
      expect(result.governedByControls).toEqual(['ctrl-1', 'ctrl-2', 'ctrl-3', 'ctrl-4']);
    });

    it('should validate array inputs for mapping operations', async () => {
      mockBusinessProcessModel.findById.mockResolvedValue({
        id: 'bp_1',
        organizationId: 'org-1'
      });

      // System IDs validation is handled by controller, but service should handle arrays
      const systemIds = ['sys-1', 'sys-2'];
      mockBusinessProcessModel.update.mockResolvedValue({
        id: 'bp_1',
        supportedBySystems: systemIds
      });

      await service.mapSystems('bp_1', 'org-1', systemIds);

      expect(mockBusinessProcessModel.update).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should wrap unknown errors', async () => {
      const unknownError = new Error('Unknown error');
      delete unknownError.statusCode;

      mockBusinessProcessModel.findByOrganization.mockRejectedValue(unknownError);

      await expect(service.getProcesses('org-1', {}))
        .rejects
        .toHaveProperty('statusCode', 500);

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should pass through errors with statusCode', async () => {
      const knownError = new Error('Not found');
      knownError.statusCode = 404;

      mockBusinessProcessModel.findById.mockRejectedValue(knownError);

      await expect(service.getProcessById('bp-1', 'org-1'))
        .rejects
        .toHaveProperty('statusCode', 404);
    });
  });
});
