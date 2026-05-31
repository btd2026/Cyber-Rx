'use strict';

const DataObjectService = require('../../../src/domains/operational/services/DataObjectService');
const DataObject = require('../../../src/models/DataObject');

// Mock dependencies
jest.mock('../../../src/models/DataObject');
jest.mock('../../../src/models/Asset');
jest.mock('../../../src/models/BusinessProcess');
jest.mock('../../../src/models/Control');

describe('DataObjectService', () => {
  let dataObjectService;
  let mockLogger;
  let mockModels;

  beforeEach(() => {
    mockLogger = {
      logInfo: jest.fn(),
      logError: jest.fn(),
      logWarn: jest.fn()
    };

    mockModels = {
      DataObject,
      Asset: {
        findById: jest.fn(),
        findByOrganization: jest.fn()
      },
      BusinessProcess: {
        findById: jest.fn(),
        findByOrganization: jest.fn()
      },
      Control: {
        findById: jest.fn()
      }
    };

    dataObjectService = new DataObjectService(mockModels, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDataObjects', () => {
    it('should fetch data objects with filters', async () => {
      const mockDataObjects = [
        { id: '1', name: 'Member PHI', type: 'PHI', sensitivity: 'Critical' },
        { id: '2', name: 'Claims Data', type: 'PHI', sensitivity: 'High' }
      ];

      DataObject.findByOrganization = jest.fn().mockResolvedValue(mockDataObjects);

      const result = await dataObjectService.getDataObjects('org-123', { type: 'PHI' });

      expect(DataObject.findByOrganization).toHaveBeenCalledWith('org-123', { type: 'PHI' });
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Member PHI');
    });

    it('should handle errors gracefully', async () => {
      DataObject.findByOrganization = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(dataObjectService.getDataObjects('org-123'))
        .rejects.toThrow('Database error');

      expect(mockLogger.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('fetching data objects')
        })
      );
    });
  });

  describe('createDataObject', () => {
    it('should create data object with valid data', async () => {
      const data = {
        name: 'Member PHI',
        type: 'PHI',
        sensitivity: 'Critical',
        recordCount: 3000000,
        description: 'Member protected health information'
      };

      const mockCreated = { id: 'do-123', ...data };
      DataObject.create = jest.fn().mockResolvedValue(mockCreated);

      const result = await dataObjectService.createDataObject('org-123', data);

      expect(DataObject.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Member PHI',
          type: 'PHI',
          sensitivity: 'Critical',
          organizationId: 'org-123'
        })
      );
      expect(result.name).toBe('Member PHI');
    });

    it('should validate required fields', async () => {
      const data = {
        name: '',
        type: 'INVALID',
        sensitivity: 'INVALID'
      };

      await expect(dataObjectService.createDataObject('org-123', data))
        .rejects.toThrow();

      expect(DataObject.create).not.toHaveBeenCalled();
    });

    it('should validate related entities', async () => {
      const data = {
        name: 'Member PHI',
        type: 'PHI',
        sensitivity: 'Critical',
        residesInSystems: ['system-123'],
        protectedByControls: ['control-123']
      };

      mockModels.Asset.findById = jest.fn().mockResolvedValue(null);

      await expect(dataObjectService.createDataObject('org-123', data))
        .rejects.toThrow('System system-123 not found');

      expect(DataObject.create).not.toHaveBeenCalled();
    });
  });

  describe('updateDataObject', () => {
    it('should update data object', async () => {
      const existing = { id: '1', name: 'Member PHI', organizationId: 'org-123' };
      const updated = { id: '1', name: 'Member PHI - Updated' };

      DataObject.findById = jest.fn().mockResolvedValue(existing);
      DataObject.update = jest.fn().mockResolvedValue(updated);

      const result = await dataObjectService.updateDataObject('1', 'org-123', {
        name: 'Member PHI - Updated'
      });

      expect(DataObject.update).toHaveBeenCalledWith('1', { name: 'Member PHI - Updated' });
      expect(result.name).toBe('Member PHI - Updated');
    });

    it('should verify organization access', async () => {
      const existing = { id: '1', name: 'Member PHI', organizationId: 'other-org' };
      DataObject.findById = jest.fn().mockResolvedValue(existing);

      await expect(dataObjectService.updateDataObject('1', 'org-123', { name: 'Updated' }))
        .rejects.toThrow();

      expect(DataObject.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteDataObject', () => {
    it('should delete data object', async () => {
      const existing = { id: '1', name: 'Member PHI', organizationId: 'org-123' };
      DataObject.findById = jest.fn().mockResolvedValue(existing);
      DataObject.delete = jest.fn().mockResolvedValue(true);

      const result = await dataObjectService.deleteDataObject('1', 'org-123');

      expect(DataObject.delete).toHaveBeenCalledWith('1');
      expect(result.message).toBe('Data object deleted successfully');
    });

    it('should verify organization access before deletion', async () => {
      const existing = { id: '1', name: 'Member PHI', organizationId: 'other-org' };
      DataObject.findById = jest.fn().mockResolvedValue(existing);

      await expect(dataObjectService.deleteDataObject('1', 'org-123'))
        .rejects.toThrow();

      expect(DataObject.delete).not.toHaveBeenCalled();
    });
  });

  describe('getClassificationSummary', () => {
    it('should calculate classification summary', async () => {
      const mockDataObjects = [
        { type: 'PHI', sensitivity: 'Critical', recordCount: 3000000, protectedByControls: ['c1'] },
        { type: 'PII', sensitivity: 'High', recordCount: 1000000, protectedByControls: ['c2'] },
        { type: 'PCI', sensitivity: 'Medium', recordCount: 500000, protectedByControls: [] }
      ];

      DataObject.findByOrganization = jest.fn().mockResolvedValue(mockDataObjects);

      const summary = await dataObjectService.getClassificationSummary('org-123');

      expect(summary.total).toBe(3);
      expect(summary.byType.PHI).toBe(1);
      expect(summary.bySensitivity.Critical).toBe(1);
      expect(summary.highValueCount).toBe(2);
      expect(summary.totalRecords).toBe(4500000);
      expect(summary.controlCoverage).toBe(67); // 2 out of 3
    });

    it('should handle empty data objects', async () => {
      DataObject.findByOrganization = jest.fn().mockResolvedValue([]);

      const summary = await dataObjectService.getClassificationSummary('org-123');

      expect(summary.total).toBe(0);
      expect(summary.highValueCount).toBe(0);
      expect(summary.controlCoverage).toBe(0);
    });
  });

  describe('getDataProcessMap', () => {
    it('should generate process map graph data', async () => {
      const mockDataObjects = [
        {
          id: 'do-1',
          name: 'Member PHI',
          type: 'PHI',
          sensitivity: 'Critical',
          residesInSystems: ['asset-1'],
          accessedByApps: ['app-1'],
          protectedByControls: ['control-1']
        }
      ];

      const mockAssets = [
        { id: 'asset-1', name: 'Claims System', type: 'system' }
      ];

      const mockProcesses = [
        {
          id: 'bp-1',
          name: 'Claims Processing',
          tier: 'Primary',
          criticality: 'Critical',
          createsDataObjects: ['do-1']
        }
      ];

      DataObject.findByOrganization = jest.fn().mockResolvedValue(mockDataObjects);
      mockModels.Asset.findByOrganization = jest.fn().mockResolvedValue(mockAssets);
      mockModels.BusinessProcess.findByOrganization = jest.fn().mockResolvedValue(mockProcesses);

      const processMap = await dataObjectService.getDataProcessMap('org-123');

      expect(processMap.nodes).toHaveLength(3);
      expect(processMap.edges).toHaveLength(3);
      expect(processMap.nodeCount).toBe(3);
      expect(processMap.edgeCount).toBe(3);

      // Check nodes structure
      const dataObjectNode = processMap.nodes.find(n => n.id === 'do-1');
      expect(dataObjectNode.type).toBe('dataObject');
      expect(dataObjectNode.category).toBe('PHI');

      const assetNode = processMap.nodes.find(n => n.id === 'asset-1');
      expect(assetNode.type).toBe('asset');

      const processNode = processMap.nodes.find(n => n.id === 'bp-1');
      expect(processNode.type).toBe('process');
    });
  });

  describe('calculateDataRiskScore', () => {
    it('should calculate high risk score for PHI Critical', () => {
      const dataObject = {
        type: 'PHI',
        sensitivity: 'Critical',
        protectedByControls: []
      };

      const score = dataObjectService.calculateDataRiskScore(dataObject);

      expect(score).toBeGreaterThan(70);
    });

    it('should reduce risk score with controls', () => {
      const dataObject = {
        type: 'PHI',
        sensitivity: 'Critical',
        protectedByControls: ['c1', 'c2', 'c3']
      };

      const scoreWithoutControls = dataObjectService.calculateDataRiskScore({
        type: 'PHI',
        sensitivity: 'Critical',
        protectedByControls: []
      });

      const scoreWithControls = dataObjectService.calculateDataRiskScore(dataObject);

      expect(scoreWithControls).toBeLessThan(scoreWithoutControls);
    });

    it('should calculate low risk score for Confidential Low', () => {
      const dataObject = {
        type: 'Confidential',
        sensitivity: 'Low',
        protectedByControls: []
      };

      const score = dataObjectService.calculateDataRiskScore(dataObject);

      expect(score).toBeLessThan(50);
    });
  });
});
