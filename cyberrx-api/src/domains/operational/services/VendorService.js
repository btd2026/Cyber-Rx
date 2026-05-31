'use strict';

const BaseService = require('../../BaseService');
const { v4: uuidv4 } = require('uuid');

/**
 * Vendor Service
 *
 * Handles vendor risk management and third-party ecosystem tracking:
 * - Vendor CRUD operations
 * - Risk scoring and assessment
 * - Contract tracking and expiry monitoring
 * - Process mapping and data access tracking
 */
class VendorService extends BaseService {
  constructor(models, logger) {
    super(models, logger);
    this.vendorModel = models.Vendor;
  }

  /**
   * Get vendors with filters
   * @param {string} organizationId - Organization ID
   * @param {Object} filters - Query filters
   * @param {string} [filters.tier] - Filter by tier
   * @param {string} [filters.riskRating] - Filter by risk rating
   * @param {string} [filters.category] - Filter by category
   * @returns {Promise<Array>} Array of vendors
   */
  async getVendors(organizationId, filters = {}) {
    this.logInfo('Fetching vendors', { organizationId, filters });

    try {
      const vendors = await this.vendorModel.findByOrganization(organizationId, filters);
      return this.enrichVendors(vendors);
    } catch (error) {
      this.handleError(error, 'fetching vendors');
    }
  }

  /**
   * Get vendor by ID
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Vendor
   */
  async getVendorById(vendorId, organizationId) {
    this.logInfo('Fetching vendor by ID', { vendorId, organizationId });

    try {
      const vendor = await this.vendorModel.findById(vendorId);
      this.verifyOrgAccess(vendor, organizationId, 'Vendor');
      return this.enrichVendor(vendor);
    } catch (error) {
      this.handleError(error, 'fetching vendor');
    }
  }

  /**
   * Create new vendor
   * @param {string} organizationId - Organization ID
   * @param {Object} data - Vendor data
   * @returns {Promise<Object>} Created vendor
   */
  async createVendor(organizationId, data) {
    this.logInfo('Creating vendor', { organizationId, name: data.name });

    try {
      // Validate required fields
      const name = this.validateRequiredString(data.name, 'Vendor name');
      const tier = this.validateEnum(
        data.tier,
        ['Critical', 'High', 'Medium', 'Low'],
        'Vendor tier'
      );

      // Validate risk rating if provided
      if (data.riskRating) {
        this.validateEnum(
          data.riskRating,
          ['Critical', 'High', 'Medium', 'Low', 'Info'],
          'Risk rating'
        );
      }

      // Validate scores if provided
      if (data.securityScore !== undefined) {
        this.validateRange(data.securityScore, 0, 100, 'Security score');
      }
      if (data.complianceScore !== undefined) {
        this.validateRange(data.complianceScore, 0, 100, 'Compliance score');
      }

      // Validate data access if provided
      if (data.dataAccess && Array.isArray(data.dataAccess)) {
        const validAccessTypes = ['PHI', 'PII', 'PCI', 'Financial', 'Legal', 'Confidential'];
        for (const accessType of data.dataAccess) {
          if (!validAccessTypes.includes(accessType)) {
            throw new Error(`Invalid data access type: ${accessType}`);
          }
        }
      }

      // Generate ID
      const id = `vendor-${uuidv4()}`;

      // Create vendor
      const vendor = await this.vendorModel.create({
        id,
        name: this.sanitize(name),
        tier,
        organizationId,
        riskRating: data.riskRating || null,
        category: data.category,
        businessProcessIds: data.businessProcessIds || [],
        contractValue: data.contractValue,
        contractExpiry: data.contractExpiry,
        description: data.description,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        website: data.website,
        dataAccess: data.dataAccess || [],
        securityScore: data.securityScore,
        complianceScore: data.complianceScore
      });

      this.logInfo('Vendor created successfully', { id });
      return this.enrichVendor(vendor);
    } catch (error) {
      this.handleError(error, 'creating vendor');
    }
  }

  /**
   * Update vendor
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated vendor
   */
  async updateVendor(vendorId, organizationId, data) {
    this.logInfo('Updating vendor', { vendorId });

    try {
      // Verify access
      const existing = await this.vendorModel.findById(vendorId);
      this.verifyOrgAccess(existing, organizationId, 'Vendor');

      // Validate tier if provided
      if (data.tier) {
        this.validateEnum(
          data.tier,
          ['Critical', 'High', 'Medium', 'Low'],
          'Vendor tier'
        );
      }

      // Validate risk rating if provided
      if (data.riskRating) {
        this.validateEnum(
          data.riskRating,
          ['Critical', 'High', 'Medium', 'Low', 'Info'],
          'Risk rating'
        );
      }

      // Validate scores if provided
      if (data.securityScore !== undefined) {
        this.validateRange(data.securityScore, 0, 100, 'Security score');
      }
      if (data.complianceScore !== undefined) {
        this.validateRange(data.complianceScore, 0, 100, 'Compliance score');
      }

      // Update vendor
      const updated = await this.vendorModel.update(vendorId, data);
      this.logInfo('Vendor updated successfully', { vendorId });
      return this.enrichVendor(updated);
    } catch (error) {
      this.handleError(error, 'updating vendor');
    }
  }

  /**
   * Delete vendor
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteVendor(vendorId, organizationId) {
    this.logInfo('Deleting vendor', { vendorId });

    try {
      // Verify access
      const existing = await this.vendorModel.findById(vendorId);
      this.verifyOrgAccess(existing, organizationId, 'Vendor');

      // Delete
      await this.vendorModel.delete(vendorId);
      this.logInfo('Vendor deleted successfully', { vendorId });
      return { message: 'Vendor deleted successfully', id: vendorId };
    } catch (error) {
      this.handleError(error, 'deleting vendor');
    }
  }

  /**
   * Assess vendor risk
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Risk assessment result
   */
  async assessVendorRisk(vendorId, organizationId) {
    this.logInfo('Assessing vendor risk', { vendorId });

    try {
      const vendor = await this.vendorModel.findById(vendorId);
      this.verifyOrgAccess(vendor, organizationId, 'Vendor');

      // Calculate risk factors
      const riskFactors = {
        securityScore: vendor.securityScore || 50,
        complianceScore: vendor.complianceScore || 50,
        financialHealth: this.calculateFinancialHealth(vendor),
        geographicRisk: this.calculateGeographicRisk(vendor),
        dataAccessRisk: this.calculateDataAccessRisk(vendor),
        contractExposure: this.calculateContractExposure(vendor)
      };

      // Calculate overall risk score
      const riskScore = this.calculateVendorRiskScore(riskFactors);
      const riskRating = this.getRiskRatingFromScore(riskScore);

      // Update vendor with latest assessment
      await this.vendorModel.update(vendorId, {
        riskRating,
        lastAssessedAt: new Date()
      });

      return {
        vendorId,
        vendorName: vendor.name,
        organizationId,
        riskScore,
        riskRating,
        factors: riskFactors,
        assessedAt: new Date().toISOString()
      };
    } catch (error) {
      this.handleError(error, 'assessing vendor risk');
    }
  }

  /**
   * Get vendors with expiring contracts
   * @param {string} organizationId - Organization ID
   * @param {number} [days=90] - Days until expiry
   * @returns {Promise<Array>} Array of vendors
   */
  async getExpiringContracts(organizationId, days = 90) {
    this.logInfo('Fetching vendors with expiring contracts', { organizationId, days });

    try {
      const vendors = await this.vendorModel.findExpiringContracts(organizationId, days);
      return this.enrichVendors(vendors);
    } catch (error) {
      this.handleError(error, 'fetching expiring contracts');
    }
  }

  /**
   * Get vendor risk summary
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Risk summary
   */
  async getRiskSummary(organizationId) {
    this.logInfo('Getting vendor risk summary', { organizationId });

    try {
      return await this.vendorModel.getRiskSummary(organizationId);
    } catch (error) {
      this.handleError(error, 'getting risk summary');
    }
  }

  /**
   * Map vendor to business processes
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @param {string[]} processIds - Business process IDs
   * @returns {Promise<Object>} Updated vendor
   */
  async mapToProcesses(vendorId, organizationId, processIds) {
    this.logInfo('Mapping vendor to processes', { vendorId, processIds });

    try {
      const vendor = await this.vendorModel.findById(vendorId);
      this.verifyOrgAccess(vendor, organizationId, 'Vendor');

      const updated = await this.vendorModel.update(vendorId, {
        businessProcessIds: processIds
      });

      this.logInfo('Vendor mapped to processes successfully', { vendorId });
      return this.enrichVendor(updated);
    } catch (error) {
      this.handleError(error, 'mapping vendor to processes');
    }
  }

  /**
   * Calculate financial health factor
   * @private
   */
  calculateFinancialHealth(vendor) {
    // Business logic for financial health
    // Could integrate with financial data providers
    // For now, return based on contract value
    if (!vendor.contractValue) return 70; // Default

    // Higher contract value = lower financial risk (vendor is stable)
    if (vendor.contractValue > 10000000) return 90;
    if (vendor.contractValue > 1000000) return 80;
    if (vendor.contractValue > 100000) return 70;
    return 60;
  }

  /**
   * Calculate geographic risk factor
   * @private
   */
  calculateGeographicRisk(vendor) {
    // Business logic for geographic risk
    // Could integrate with geopolitical risk data
    // For now, return low risk
    return 20;
  }

  /**
   * Calculate data access risk factor
   * @private
   */
  calculateDataAccessRisk(vendor) {
    if (!vendor.dataAccess || !Array.isArray(vendor.dataAccess)) {
      return 0;
    }

    // Higher risk for sensitive data types
    const riskWeights = {
      'PHI': 90,
      'PII': 80,
      'PCI': 85,
      'Financial': 70,
      'Legal': 60,
      'Confidential': 50
    };

    let maxRisk = 0;
    vendor.dataAccess.forEach(accessType => {
      const risk = riskWeights[accessType] || 0;
      if (risk > maxRisk) maxRisk = risk;
    });

    return maxRisk;
  }

  /**
   * Calculate contract exposure factor
   * @private
   */
  calculateContractExposure(vendor) {
    // Higher contract value = higher exposure
    if (!vendor.contractValue) return 0;

    // Normalize to 0-100 scale
    const exposure = Math.min(100, (vendor.contractValue / 10000000) * 100);
    return Math.round(exposure);
  }

  /**
   * Calculate overall vendor risk score
   * @private
   */
  calculateVendorRiskScore(factors) {
    // Weighted risk calculation
    let score = 0;
    score += ((100 - factors.securityScore) * 0.25); // 25% weight
    score += ((100 - factors.complianceScore) * 0.20); // 20% weight
    score += ((100 - factors.financialHealth) * 0.15); // 15% weight
    score += (factors.geographicRisk * 0.10); // 10% weight
    score += (factors.dataAccessRisk * 0.20); // 20% weight
    score += (factors.contractExposure * 0.10); // 10% weight

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * Get risk rating from score
   * @private
   */
  getRiskRatingFromScore(score) {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    if (score >= 20) return 'Low';
    return 'Info';
  }

  /**
   * Enrich single vendor with computed properties
   * @private
   */
  enrichVendor(vendor) {
    if (!vendor) return null;

    const daysUntilExpiry = vendor.contractExpiry
      ? Math.ceil((new Date(vendor.contractExpiry) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      ...vendor,
      processCount: (vendor.businessProcessIds || []).length,
      dataAccessCount: (vendor.dataAccess || []).length,
      contractStatus: this.getContractStatus(vendor),
      daysUntilExpiry,
      overallRisk: this.calculateOverallRisk(vendor)
    };
  }

  /**
   * Enrich array of vendors
   * @private
   */
  enrichVendors(vendors) {
    return vendors.map(vendor => this.enrichVendor(vendor));
  }

  /**
   * Get contract status
   * @private
   */
  getContractStatus(vendor) {
    if (!vendor.contractExpiry) return 'No Contract';

    const daysUntilExpiry = Math.ceil((new Date(vendor.contractExpiry) - new Date()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return 'Expired';
    if (daysUntilExpiry <= 30) return 'Critical';
    if (daysUntilExpiry <= 90) return 'Warning';
    return 'Active';
  }

  /**
   * Calculate overall risk score
   * @private
   */
  calculateOverallRisk(vendor) {
    const riskFactors = {
      securityScore: vendor.securityScore || 50,
      complianceScore: vendor.complianceScore || 50,
      financialHealth: this.calculateFinancialHealth(vendor),
      geographicRisk: this.calculateGeographicRisk(vendor),
      dataAccessRisk: this.calculateDataAccessRisk(vendor),
      contractExposure: this.calculateContractExposure(vendor)
    };

    return this.calculateVendorRiskScore(riskFactors);
  }
}

module.exports = VendorService;
