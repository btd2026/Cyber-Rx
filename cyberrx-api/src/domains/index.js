'use strict';

const BaseService = require('./BaseService');
const ServiceFactory = require('./ServiceFactory');

const SecurityService = require('./security/services/SecurityService');
const LegalService = require('./legal/services/LegalService');
const FinancialService = require('./financial/services/FinancialService');
const OperationalService = require('./operational/services/OperationalService');
const AuditService = require('./audit/services/AuditService');
const PlatformService = require('./platform/services/PlatformService');

module.exports = {
  BaseService,
  ServiceFactory,
  SecurityService,
  LegalService,
  FinancialService,
  OperationalService,
  AuditService,
  PlatformService
};
