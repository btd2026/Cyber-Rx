'use strict';

const BaseService = require('../../BaseService');
const { v4: uuidv4 } = require('uuid');

/**
 * Asset Service
 *
 * Handles asset inventory management and discovery integration:
 * - Asset CRUD operations
 * - Process mapping and data classification
 * - Asset discovery integration (CrowdStrike, Okta, AWS)
 * - Organization-level access control
 */
class AssetService extends BaseService {
  constructor(models, logger) {
    super(models, logger);
    this.assetModel = models.Asset;
  }

  /**
   * Get assets with filters
   * @param {string} organizationId - Organization ID
   * @param {Object} filters - Query filters
   * @param {string} [filters.type] - Filter by asset type
   * @param {string} [filters.businessProcessId] - Filter by business process
   * @param {string} [filters.dataClassification] - Filter by data classification
   * @returns {Promise<Array>} Array of assets
   */
  async getAssets(organizationId, filters = {}) {
    this.logInfo('Fetching assets', { organizationId, filters });

    try {
      let assets;

      // Apply filters
      if (filters.type) {
        assets = await this.assetModel.findByOrganization(organizationId, { type: filters.type });
      } else if (filters.dataClassification) {
        assets = await this.assetModel.findByDataClassification(filters.dataClassification, organizationId);
      } else if (filters.businessProcessId) {
        assets = await this.assetModel.findByBusinessProcessId(filters.businessProcessId);
        // Filter by organization
        assets = assets.filter(asset => asset.organizationId === organizationId);
      } else {
        assets = await this.assetModel.findByOrganization(organizationId);
      }

      return this.enrichAssets(assets);
    } catch (error) {
      this.handleError(error, 'fetching assets');
    }
  }

  /**
   * Get asset by ID
   * @param {string} assetId - Asset ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Asset
   */
  async getAssetById(assetId, organizationId) {
    this.logInfo('Fetching asset by ID', { assetId, organizationId });

    try {
      const asset = await this.assetModel.findById(assetId);
      this.verifyOrgAccess(asset, organizationId, 'Asset');
      return this.enrichAsset(asset);
    } catch (error) {
      this.handleError(error, 'fetching asset');
    }
  }

  /**
   * Create new asset
   * @param {string} organizationId - Organization ID
   * @param {Object} data - Asset data
   * @returns {Promise<Object>} Created asset
   */
  async createAsset(organizationId, data) {
    this.logInfo('Creating asset', { organizationId, name: data.name });

    try {
      // Validate required fields
      const name = this.validateRequiredString(data.name, 'Asset name');
      const type = this.validateEnum(
        data.type,
        ['server', 'endpoint', 'database', 'cloud', 'API', 'app'],
        'Asset type'
      );

      // Validate data classification if provided
      if (data.dataClassification && Array.isArray(data.dataClassification)) {
        const validClassifications = ['PHI', 'PII', 'PCI', 'Financial', 'Legal', 'Confidential'];
        for (const classification of data.dataClassification) {
          if (!validClassifications.includes(classification)) {
            throw new Error(`Invalid data classification: ${classification}. Must be one of: ${validClassifications.join(', ')}`);
          }
        }
      }

      // Generate ID
      const id = `asset-${uuidv4()}`;

      // Create asset
      const asset = await this.assetModel.create({
        id,
        name: this.sanitize(name),
        type,
        organizationId,
        hostname: data.hostname,
        ipAddress: data.ipAddress,
        owner: data.owner,
        description: data.description,
        businessProcessIds: data.businessProcessIds || [],
        applicationIds: data.applicationIds || [],
        dataClassification: data.dataClassification || [],
        cloudProvider: data.cloudProvider,
        location: data.location
      });

      this.logInfo('Asset created successfully', { id });
      return this.enrichAsset(asset);
    } catch (error) {
      this.handleError(error, 'creating asset');
    }
  }

  /**
   * Update asset
   * @param {string} assetId - Asset ID
   * @param {string} organizationId - Organization ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated asset
   */
  async updateAsset(assetId, organizationId, data) {
    this.logInfo('Updating asset', { assetId });

    try {
      // Verify access
      const existing = await this.assetModel.findById(assetId);
      this.verifyOrgAccess(existing, organizationId, 'Asset');

      // Validate type if provided
      if (data.type) {
        this.validateEnum(
          data.type,
          ['server', 'endpoint', 'database', 'cloud', 'API', 'app'],
          'Asset type'
        );
      }

      // Validate data classification if provided
      if (data.dataClassification && Array.isArray(data.dataClassification)) {
        const validClassifications = ['PHI', 'PII', 'PCI', 'Financial', 'Legal', 'Confidential'];
        for (const classification of data.dataClassification) {
          if (!validClassifications.includes(classification)) {
            throw new Error(`Invalid data classification: ${classification}`);
          }
        }
      }

      // Update asset
      const updated = await this.assetModel.update(assetId, data);
      this.logInfo('Asset updated successfully', { assetId });
      return this.enrichAsset(updated);
    } catch (error) {
      this.handleError(error, 'updating asset');
    }
  }

  /**
   * Delete asset
   * @param {string} assetId - Asset ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteAsset(assetId, organizationId) {
    this.logInfo('Deleting asset', { assetId });

    try {
      // Verify access
      const existing = await this.assetModel.findById(assetId);
      this.verifyOrgAccess(existing, organizationId, 'Asset');

      // Delete
      await this.assetModel.delete(assetId);
      this.logInfo('Asset deleted successfully', { assetId });
      return { message: 'Asset deleted successfully', id: assetId };
    } catch (error) {
      this.handleError(error, 'deleting asset');
    }
  }

  /**
   * Discover assets from external sources
   * @param {string} organizationId - Organization ID
   * @param {Object} criteria - Discovery criteria
   * @param {string} criteria.source - Discovery source (crowdstrike, okta, aws)
   * @returns {Promise<Object>} Discovery result
   */
  async discoverAssets(organizationId, criteria) {
    this.logInfo('Discovering assets', { organizationId, criteria });

    try {
      const { source } = criteria;

      // Route to appropriate discovery connector
      let discoveredAssets = [];

      switch (source) {
        case 'crowdstrike':
          discoveredAssets = await this.discoverFromCrowdStrike(organizationId, criteria);
          break;
        case 'okta':
          discoveredAssets = await this.discoverFromOkta(organizationId, criteria);
          break;
        case 'aws':
          discoveredAssets = await this.discoverFromAWS(organizationId, criteria);
          break;
        default:
          throw new Error(`Unsupported discovery source: ${source}`);
      }

      // Optionally auto-import discovered assets
      let importedAssets = [];
      if (criteria.autoImport) {
        importedAssets = await this.batchImportAssets(organizationId, discoveredAssets);
      }

      return {
        organizationId,
        source,
        discoveredCount: discoveredAssets.length,
        importedCount: importedAssets.length,
        discoveredAssets,
        importedAssets,
        discoveredAt: new Date().toISOString()
      };
    } catch (error) {
      this.handleError(error, 'discovering assets');
    }
  }

  /**
   * Get asset summary by type
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Asset summary
   */
  async getAssetSummary(organizationId) {
    this.logInfo('Getting asset summary', { organizationId });

    try {
      const assets = await this.assetModel.findByOrganization(organizationId);

      const summary = {
        total: assets.length,
        byType: {},
        byDataClassification: {},
        byRiskLevel: { critical: 0, high: 0, medium: 0, low: 0 }
      };

      // Group by type
      assets.forEach(asset => {
        // Count by type
        const type = asset.type || 'unknown';
        summary.byType[type] = (summary.byType[type] || 0) + 1;

        // Count by data classification
        if (asset.dataClassification && Array.isArray(asset.dataClassification)) {
          asset.dataClassification.forEach(classification => {
            summary.byDataClassification[classification] = (summary.byDataClassification[classification] || 0) + 1;
          });
        }

        // Count by risk level (if risk score exists)
        if (asset.riskScore) {
          if (asset.riskScore >= 80) summary.byRiskLevel.critical++;
          else if (asset.riskScore >= 60) summary.byRiskLevel.high++;
          else if (asset.riskScore >= 40) summary.byRiskLevel.medium++;
          else summary.byRiskLevel.low++;
        }
      });

      return summary;
    } catch (error) {
      this.handleError(error, 'getting asset summary');
    }
  }

  /**
   * Discover assets from CrowdStrike
   * @private
   */
  async discoverFromCrowdStrike(organizationId, criteria) {
    // Integrate with CrowdStrike API
    // For now, return mock data
    return [
      {
        name: 'Endpoint-WS-001',
        type: 'endpoint',
        hostname: 'ws-001.corp.internal',
        ipAddress: '10.0.1.100',
        owner: 'CIO-EndpointManagement',
        description: 'Corporate workstation - CrowdStrike agent active',
        source: 'crowdstrike',
        discoveredAt: new Date().toISOString()
      }
    ];
  }

  /**
   * Discover assets from Okta
   * @private
   */
  async discoverFromOkta(organizationId, criteria) {
    // Integrate with Okta API
    return [
      {
        name: 'Okta SSO Dashboard',
        type: 'app',
        hostname: 'bcbs.okta.com',
        owner: 'CIO-Identity',
        description: 'SSO dashboard and identity provider',
        source: 'okta',
        discoveredAt: new Date().toISOString()
      }
    ];
  }

  /**
   * Discover assets from AWS
   * @private
   */
  async discoverFromAWS(organizationId, criteria) {
    // Integrate with AWS API
    return [
      {
        name: 'Claims-DB-Primary',
        type: 'database',
        hostname: 'claims-db.prod.aws.internal',
        cloudProvider: 'AWS',
        location: 'us-east-1',
        owner: 'CIO-Database',
        description: 'Primary claims processing database',
        source: 'aws',
        discoveredAt: new Date().toISOString()
      }
    ];
  }

  /**
   * Batch import discovered assets
   * @private
   */
  async batchImportAssets(organizationId, discoveredAssets) {
    const imported = [];

    for (const assetData of discoveredAssets) {
      try {
        const asset = await this.assetModel.create({
          id: `asset-${uuidv4()}`,
          name: assetData.name,
          type: assetData.type,
          organizationId,
          hostname: assetData.hostname,
          ipAddress: assetData.ipAddress,
          owner: assetData.owner,
          description: assetData.description,
          cloudProvider: assetData.cloudProvider,
          location: assetData.location,
          businessProcessIds: [],
          dataClassification: []
        });
        imported.push(asset);
      } catch (error) {
        this.logError('batchImportAssets', error, { assetName: assetData.name });
      }
    }

    return imported;
  }

  /**
   * Enrich single asset with computed properties
   * @private
   */
  enrichAsset(asset) {
    if (!asset) return null;

    return {
      ...asset,
      processCount: (asset.businessProcessIds || []).length,
      classificationCount: (asset.dataClassification || []).length,
      riskLevel: this.calculateAssetRiskLevel(asset)
    };
  }

  /**
   * Enrich array of assets
   * @private
   */
  enrichAssets(assets) {
    return assets.map(asset => this.enrichAsset(asset));
  }

  /**
   * Calculate asset risk level
   * @private
   */
  calculateAssetRiskLevel(asset) {
    if (!asset.riskScore) return 'Unknown';

    if (asset.riskScore >= 80) return 'Critical';
    if (asset.riskScore >= 60) return 'High';
    if (asset.riskScore >= 40) return 'Medium';
    return 'Low';
  }
}

module.exports = AssetService;
