'use strict';

/**
 * Base Service Class
 *
 * Provides common functionality for all domain services:
 * - Logging
 * - Error handling
 * - Validation helpers
 * - Organization access control
 */
class BaseService {
  constructor(models, logger) {
    this.models = models;
    this.logger = logger || console;
  }

  /**
   * Log service operation
   */
  logInfo(operation, metadata = {}) {
    this.logger.info(`[${this.constructor.name}] ${operation}`, metadata);
  }

  /**
   * Log service error
   */
  logError(operation, error, metadata = {}) {
    this.logger.error(`[${this.constructor.name}] ${operation}`, {
      error: error.message,
      stack: error.stack,
      ...metadata
    });
  }

  /**
   * Verify organization access to resource
   * @throws {Error} If access is denied
   */
  verifyOrgAccess(resource, orgId, resourceType = 'Resource') {
    if (!resource) {
      const error = new Error(`${resourceType} not found`);
      error.statusCode = 404;
      throw error;
    }

    if (resource.organizationId !== orgId) {
      const error = new Error('Access denied');
      error.statusCode = 403;
      error.message = `You do not have access to this ${resourceType.toLowerCase()}`;
      throw error;
    }

    return resource;
  }

  /**
   * Sanitize string input to prevent XSS
   */
  sanitize(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[<>]/g, '');
  }

  /**
   * Trim and validate non-empty string
   */
  validateRequiredString(value, fieldName) {
    if (!value || !value.trim()) {
      const error = new Error(`${fieldName} is required`);
      error.statusCode = 400;
      throw error;
    }
    return value.trim();
  }

  /**
   * Validate enum value
   */
  validateEnum(value, validValues, fieldName) {
    if (!value || !validValues.includes(value)) {
      const error = new Error(`${fieldName} must be one of: ${validValues.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }
    return value;
  }

  /**
   * Validate numeric range
   */
  validateRange(value, min, max, fieldName) {
    if (value !== undefined && (value < min || value > max)) {
      const error = new Error(`${fieldName} must be between ${min} and ${max}`);
      error.statusCode = 400;
      throw error;
    }
    return value;
  }

  /**
   * Handle service errors consistently
   */
  handleError(error, operation) {
    this.logError(operation, error);

    // If error already has statusCode, re-throw it
    if (error.statusCode) {
      throw error;
    }

    // Wrap unknown errors
    const wrappedError = new Error(`An error occurred during ${operation}`);
    wrappedError.statusCode = 500;
    wrappedError.originalError = error.message;
    throw wrappedError;
  }
}

module.exports = BaseService;
