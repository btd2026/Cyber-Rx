'use strict';

const SecurityService = require('./security/services/SecurityService');
const LegalService = require('./legal/services/LegalService');
const FinancialService = require('./financial/services/FinancialService');
const OperationalService = require('./operational/services/OperationalService');
const AuditService = require('./audit/services/AuditService');
const PlatformService = require('./platform/services/PlatformService');

/**
 * Service Factory
 *
 * Centralized service initialization with dependency injection
 */
class ServiceFactory {
  constructor(models, db, logger) {
    this.models = models;
    this.db = db;
    this.logger = logger || console;
    this.services = {};
  }

  /**
   * Get or create SecurityService
   */
  getSecurityService() {
    if (!this.services.security) {
      this.services.security = new SecurityService(this.models, this.logger);
    }
    return this.services.security;
  }

  /**
   * Get or create LegalService
   */
  getLegalService() {
    if (!this.services.legal) {
      this.services.legal = new LegalService(this.models, this.logger);
    }
    return this.services.legal;
  }

  /**
   * Get or create FinancialService
   */
  getFinancialService() {
    if (!this.services.financial) {
      this.services.financial = new FinancialService(this.models, this.logger);
    }
    return this.services.financial;
  }

  /**
   * Get or create OperationalService
   */
  getOperationalService() {
    if (!this.services.operational) {
      this.services.operational = new OperationalService(this.models, this.logger);
    }
    return this.services.operational;
  }

  /**
   * Get or create AuditService
   */
  getAuditService() {
    if (!this.services.audit) {
      this.services.audit = new AuditService(this.models, this.logger);
    }
    return this.services.audit;
  }

  /**
   * Get or create PlatformService
   */
  getPlatformService() {
    if (!this.services.platform) {
      this.services.platform = new PlatformService(this.models, this.logger, this.db);
    }
    return this.services.platform;
  }

  /**
   * Get all services
   */
  getAllServices() {
    return {
      security: this.getSecurityService(),
      legal: this.getLegalService(),
      financial: this.getFinancialService(),
      operational: this.getOperationalService(),
      audit: this.getAuditService(),
      platform: this.getPlatformService()
    };
  }
}

module.exports = ServiceFactory;
