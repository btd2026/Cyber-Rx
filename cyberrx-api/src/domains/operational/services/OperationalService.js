'use strict';

const BaseService = require('../../BaseService');
const AssetService = require('./AssetService');
const VendorService = require('./VendorService');

/**
 * Operational Service
 *
 * Facade service for all operational-related business logic:
 * - Business process management
 * - Vendor risk assessment
 * - Asset and system discovery
 * 
 * Delegates to specialized services for assets and vendors
 */
class OperationalService extends BaseService {
  constructor(models, logger) {
    super(models, logger);
    this.businessProcessModel = models.BusinessProcess;
    this.vendorModel = models.Vendor;
    this.assetModel = models.Asset;
    
    // Initialize specialized services
    this.assetService = new AssetService(models, logger);
    this.vendorService = new VendorService(models, logger);
  }

  /**
   * Get assets - delegates to AssetService
   */
  async getAssets(orgId, filters = {}) {
    return this.assetService.getAssets(orgId, filters);
  }

  /**
   * Get asset by ID - delegates to AssetService
   */
  async getAssetById(assetId, orgId) {
    return this.assetService.getAssetById(assetId, orgId);
  }

  /**
   * Create asset - delegates to AssetService
   */
  async createAsset(orgId, data) {
    return this.assetService.createAsset(orgId, data);
  }

  /**
   * Update asset - delegates to AssetService
   */
  async updateAsset(assetId, orgId, data) {
    return this.assetService.updateAsset(assetId, orgId, data);
  }

  /**
   * Delete asset - delegates to AssetService
   */
  async deleteAsset(assetId, orgId) {
    return this.assetService.deleteAsset(assetId, orgId);
  }

  /**
   * Discover assets - delegates to AssetService
   */
  async discoverAssets(orgId, criteria) {
    return this.assetService.discoverAssets(orgId, criteria);
  }

  /**
   * Get asset summary - delegates to AssetService
   */
  async getAssetSummary(orgId) {
    return this.assetService.getAssetSummary(orgId);
  }

  /**
   * Get vendors - delegates to VendorService
   */
  async getVendors(orgId, filters = {}) {
    return this.vendorService.getVendors(orgId, filters);
  }

  /**
   * Get vendor by ID - delegates to VendorService
   */
  async getVendorById(vendorId, orgId) {
    return this.vendorService.getVendorById(vendorId, orgId);
  }

  /**
   * Create vendor - delegates to VendorService
   */
  async createVendor(orgId, data) {
    return this.vendorService.createVendor(orgId, data);
  }

  /**
   * Update vendor - delegates to VendorService
   */
  async updateVendor(vendorId, orgId, data) {
    return this.vendorService.updateVendor(vendorId, orgId, data);
  }

  /**
   * Delete vendor - delegates to VendorService
   */
  async deleteVendor(vendorId, orgId) {
    return this.vendorService.deleteVendor(vendorId, orgId);
  }

  /**
   * Assess vendor risk - delegates to VendorService
   */
  async assessVendorRisk(vendorId, orgId) {
    return this.vendorService.assessVendorRisk(vendorId, orgId);
  }

  /**
   * Get expiring contracts - delegates to VendorService
   */
  async getExpiringContracts(orgId, days = 90) {
    return this.vendorService.getExpiringContracts(orgId, days);
  }

  /**
   * Get vendor risk summary - delegates to VendorService
   */
  async getVendorRiskSummary(orgId) {
    return this.vendorService.getRiskSummary(orgId);
  }

  /**
   * Map vendor to processes - delegates to VendorService
   */
  async mapVendorToProcesses(vendorId, orgId, processIds) {
    return this.vendorService.mapToProcesses(vendorId, orgId, processIds);
  }

  /**
   * Get business processes with filters
   */
  async getProcesses(orgId, filters = {}) {
    this.logInfo('Fetching business processes', { orgId, filters });

    try {
      const processes = await this.businessProcessModel.findByOrganization(orgId, filters);
      return this.enrichProcesses(processes);
    } catch (error) {
      this.handleError(error, 'fetching business processes');
    }
  }

  /**
   * Create business process
   */
  async createProcess(orgId, data) {
    this.logInfo('Creating business process', { orgId, name: data.name });

    try {
      // Validate required fields
      const name = this.validateRequiredString(data.name, 'Business process name');
      const tier = this.validateEnum(data.tier, ['Primary', 'Strategic'], 'Tier');
      const criticality = this.validateEnum(
        data.criticality,
        ['Critical', 'High', 'Medium', 'Low'],
        'Criticality'
      );
      const owner = this.validateRequiredString(data.owner, 'Owner');

      // Generate ID
      const id = this.generateProcessId();

      // Create business process
      const process = await this.businessProcessModel.create({
        id,
        name: this.sanitize(name),
        tier,
        criticality,
        owner: this.sanitize(owner),
        organizationId: orgId,
        description: data.description,
        supportedBySystems: data.supportedBySystems || [],
        createsDataObjects: data.createsDataObjects || [],
        governedByControls: data.governedByControls || []
      });

      this.logInfo('Business process created successfully', { id });
      return process;
    } catch (error) {
      this.handleError(error, 'creating business process');
    }
  }

  /**
   * Get vendors with risk assessment
   */
  async getVendors(orgId, filters = {}) {
    this.logInfo('Fetching vendors', { orgId, filters });

    try {
      // Would integrate with vendor model
      const vendors = [];
      return this.assessVendorRisks(vendors);
    } catch (error) {
      this.handleError(error, 'fetching vendors');
    }
  }

  /**
   * Assess vendor risk
   */
  async assessVendorRisk(vendorId, orgId) {
    this.logInfo('Assessing vendor risk', { vendorId });

    try {
      // Business logic for vendor risk assessment
      const riskFactors = {
        securityScore: 0,
        complianceScore: 0,
        financialHealth: 0,
        geographicRisk: 0,
        dataAccess: 0
      };

      // Calculate risk score
      const riskScore = this.calculateVendorRiskScore(riskFactors);

      return {
        vendorId,
        organizationId: orgId,
        riskScore,
        riskLevel: this.getVendorRiskLevel(riskScore),
        factors: riskFactors,
        assessedAt: new Date().toISOString()
      };
    } catch (error) {
      this.handleError(error, 'assessing vendor risk');
    }
  }

  /**
   * Get systems and assets
   */
  async getSystems(orgId, filters = {}) {
    this.logInfo('Fetching systems', { orgId, filters });

    try {
      const assets = await this.assetModel.findByOrganization(orgId, filters);
      return this.groupBySystem(assets);
    } catch (error) {
      this.handleError(error, 'fetching systems');
    }
  }

  /**
   * Discover assets based on criteria
   */
  async discoverAssets(orgId, criteria) {
    this.logInfo('Discovering assets', { orgId, criteria });

    try {
      // Business logic for asset discovery
      const discoveredAssets = [];

      // Would integrate with:
      // - Network scanning tools
      // - Cloud provider APIs
      // - CMDB systems
      // - Asset management tools

      return {
        organizationId: orgId,
        criteria,
        assets: discoveredAssets,
        discoveredAt: new Date().toISOString(),
        count: discoveredAssets.length
      };
    } catch (error) {
      this.handleError(error, 'discovering assets');
    }
  }

  /**
   * Update business process
   */
  async updateProcess(id, orgId, data) {
    this.logInfo('Updating business process', { id });

    try {
      // Verify access
      const existing = await this.businessProcessModel.findById(id);
      this.verifyOrgAccess(existing, orgId, 'Business process');

      // Update process
      const updated = await this.businessProcessModel.update(id, data);
      this.logInfo('Business process updated successfully', { id });
      return updated;
    } catch (error) {
      this.handleError(error, 'updating business process');
    }
  }

  /**
   * Delete business process
   */
  async deleteProcess(id, orgId) {
    this.logInfo('Deleting business process', { id });

    try {
      // Verify access
      const existing = await this.businessProcessModel.findById(id);
      this.verifyOrgAccess(existing, orgId, 'Business process');

      // Delete
      await this.businessProcessModel.delete(id);
      this.logInfo('Business process deleted successfully', { id });
      return { message: 'Business process deleted successfully', id };
    } catch (error) {
      this.handleError(error, 'deleting business process');
    }
  }

  /**
   * Enrich processes with operational metrics
   * @private
   */
  enrichProcesses(processes) {
    return processes.map(process => ({
      ...process,
      riskCount: this.calculateRiskCount(process),
      assetCount: this.calculateAssetCount(process),
      controlGap: this.calculateControlGap(process)
    }));
  }

  /**
   * Assess vendor risks
   * @private
   */
  assessVendorRisks(vendors) {
    return vendors.map(vendor => ({
      ...vendor,
      riskScore: this.calculateVendorRiskScore(vendor),
      riskLevel: this.getVendorRiskLevel(vendor.riskScore || 0)
    }));
  }

  /**
   * Group assets by system
   * @private
   */
  groupBySystem(assets) {
    const systems = {};

    assets.forEach(asset => {
      const systemKey = asset.type || 'unknown';
      if (!systems[systemKey]) {
        systems[systemKey] = {
          systemType: systemKey,
          assets: [],
          count: 0
        };
      }
      systems[systemKey].assets.push(asset);
      systems[systemKey].count++;
    });

    return Object.values(systems);
  }

  /**
   * Calculate risk count for process
   * @private
   */
  calculateRiskCount(process) {
    // Business logic - would integrate with risk model
    return 0;
  }

  /**
   * Calculate asset count for process
   * @private
   */
  calculateAssetCount(process) {
    // Business logic - would integrate with asset model
    return (process.supportedBySystems || []).length;
  }

  /**
   * Calculate control gap for process
   * @private
   */
  calculateControlGap(process) {
    // Business logic for control gap analysis
    const requiredControls = 10; // Would be calculated based on criticality
    const implementedControls = (process.governedByControls || []).length;
    return Math.max(0, requiredControls - implementedControls);
  }

  /**
   * Calculate vendor risk score
   * @private
   */
  calculateVendorRiskScore(factors) {
    // Business logic for vendor risk calculation
    let score = 0;
    score += ((100 - factors.securityScore) * 0.3);
    score += ((100 - factors.complianceScore) * 0.25);
    score += ((100 - factors.financialHealth) * 0.2);
    score += (factors.geographicRisk * 0.15);
    score += (factors.dataAccess * 0.1);
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Get vendor risk level from score
   * @private
   */
  getVendorRiskLevel(score) {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Generate business process ID
   * @private
   */
  generateProcessId() {
    return `bp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = OperationalService;
