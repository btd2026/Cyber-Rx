'use strict';

/**
 * Credential Validation Service
 *
 * Validates vendor connector credentials by making test API calls.
 * Supports multiple security rating vendors with different authentication schemes.
 *
 * Security Features:
 * - Never logs actual API keys (only masked versions)
 * - 10-second timeout for validation requests
 * - Proper error handling and user-friendly messages
 * - Rate limiting integration
 * - Audit logging for compliance
 */

const { createCustomLimiter } = require('../middleware/rateLimit');
const db = require('../utils/db');

// Rate limiter for credential validation (10 attempts per minute per org)
const validationLimiter = createCustomLimiter({
  prefix: 'rl:cred:validate',
  points: 10, // 10 attempts
  duration: 60, // per 60 seconds (1 minute)
  blockDuration: 60, // Block for 1 minute after limit reached
  keyBy: 'user'
});

/**
 * Mask API key for logging (never log actual keys)
 * @param {string} key - API key to mask
 * @returns {string} Masked key (e.g., "sk_••••••••••1234")
 */
function maskApiKey(key) {
  if (!key || typeof key !== 'string') return '••••';
  if (key.length <= 4) return '••••';
  return `${key.substring(0, Math.min(8, key.length - 4))}••••${key.substring(key.length - 4)}`;
}

/**
 * Get client IP from request
 * @param {Object} req - Express request
 * @returns {string} Client IP address
 */
function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.ip || req.connection?.remoteAddress || 'unknown';
}

/**
 * Log validation attempt to audit_logs table
 * @param {Object} params - Logging parameters
 */
async function logValidationAttempt({ userId, orgId, connectorType, result, ipAddress, maskedKey, error = null }) {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, organization_id, action_type, resource_type, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        userId,
        orgId,
        'credential_validation',
        'connector',
        JSON.stringify({
          connectorType,
          result,
          maskedKey,
          error: error ? error.message : null,
          timestamp: new Date().toISOString()
        }),
        ipAddress
      ]
    ).catch(() => {
      // Non-fatal if audit logging fails
      console.warn('Failed to write audit log for credential validation');
    });
  } catch (error) {
    console.warn('Error writing audit log:', error.message);
  }
}

/**
 * SecurityScorecard validator
 * API: https://api.securityscorecard.com/companies/{domain}
 * Auth: Bearer token
 */
async function validateSecurityScorecard(credentials, options = {}) {
  const { apiKey, domain = 'securityscorecard.com' } = credentials;
  const timeout = options.timeout || 10000;

  if (!apiKey) {
    throw new Error('API key is required for SecurityScorecard');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(
      `https://api.securityscorecard.com/companies/${encodeURIComponent(domain)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    const data = await response.json();

    if (response.status === 200) {
      // Success - extract score data
      return {
        valid: true,
        message: 'Connection verified successfully',
        data: {
          testResult: {
            score: data.score || data.overall_score,
            grade: data.grade || data.letter_grade,
            companyName: data.name || data.company_name || domain
          }
        }
      };
    } else if (response.status === 401 || response.status === 403) {
      return {
        valid: false,
        message: 'Invalid API key or unauthorized access',
        errorCode: 'ERR_INVALID_CREDENTIALS',
        details: `${response.status} ${response.statusText} from SecurityScorecard API`
      };
    } else if (response.status === 404) {
      return {
        valid: false,
        message: 'Domain not found in SecurityScorecard database',
        errorCode: 'ERR_DOMAIN_NOT_FOUND',
        details: 'The specified domain does not exist in SecurityScorecard\'s database'
      };
    } else {
      return {
        valid: false,
        message: 'Unexpected response from SecurityScorecard API',
        errorCode: 'ERR_UNEXPECTED_RESPONSE',
        details: `${response.status}: ${JSON.stringify(data)}`
      };
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Request timeout - validation took longer than 10 seconds');
    }
    throw error;
  }
}

/**
 * BitSight validator
 * API: https://api.bitsighttech.com/ratings/v1/companies/{domain}
 * Auth: Bearer token
 */
async function validateBitSight(credentials, options = {}) {
  const { apiKey, domain = 'bitsighttech.com' } = credentials;
  const timeout = options.timeout || 10000;

  if (!apiKey) {
    throw new Error('API key is required for BitSight');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(
      `https://api.bitsighttech.com/ratings/v1/companies/${encodeURIComponent(domain)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    const data = await response.json();

    if (response.status === 200) {
      return {
        valid: true,
        message: 'Connection verified successfully',
        data: {
          testResult: {
            grade: data.grade || data.rating || data.score,
            companyName: data.name || data.company_name || domain
          }
        }
      };
    } else if (response.status === 401 || response.status === 403) {
      return {
        valid: false,
        message: 'Invalid API key or unauthorized access',
        errorCode: 'ERR_INVALID_CREDENTIALS',
        details: `${response.status} ${response.statusText} from BitSight API`
      };
    } else {
      return {
        valid: false,
        message: 'Unexpected response from BitSight API',
        errorCode: 'ERR_UNEXPECTED_RESPONSE',
        details: `${response.status}: ${JSON.stringify(data)}`
      };
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Request timeout - validation took longer than 10 seconds');
    }
    throw error;
  }
}

/**
 * RiskRecon validator
 * API: https://api.riskrecon.com/api/v1/companies/{domain}
 * Auth: token={apiKey}
 */
async function validateRiskRecon(credentials, options = {}) {
  const { apiKey, domain = 'riskrecon.com' } = credentials;
  const timeout = options.timeout || 10000;

  if (!apiKey) {
    throw new Error('API key is required for RiskRecon');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(
      `https://api.riskrecon.com/api/v1/companies/${encodeURIComponent(domain)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `token=${apiKey}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    const data = await response.json();

    if (response.status === 200) {
      return {
        valid: true,
        message: 'Connection verified successfully',
        data: {
          testResult: {
            score: data.score || data.rating,
            companyName: data.name || data.company_name || domain
          }
        }
      };
    } else if (response.status === 401 || response.status === 403) {
      return {
        valid: false,
        message: 'Invalid API key or unauthorized access',
        errorCode: 'ERR_INVALID_CREDENTIALS',
        details: `${response.status} ${response.statusText} from RiskRecon API`
      };
    } else {
      return {
        valid: false,
        message: 'Unexpected response from RiskRecon API',
        errorCode: 'ERR_UNEXPECTED_RESPONSE',
        details: `${response.status}: ${JSON.stringify(data)}`
      };
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Request timeout - validation took longer than 10 seconds');
    }
    throw error;
  }
}

/**
 * Recorded Future validator
 * API: https://api.recordedfuture.com/v2/company/{domain}
 * Auth: X-RFToken header
 */
async function validateRecordedFuture(credentials, options = {}) {
  const { apiKey, domain = 'recordedfuture.com' } = credentials;
  const timeout = options.timeout || 10000;

  if (!apiKey) {
    throw new Error('API key is required for Recorded Future');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(
      `https://api.recordedfuture.com/v2/company/${encodeURIComponent(domain)}`,
      {
        method: 'GET',
        headers: {
          'X-RFToken': apiKey,
          'Accept': 'application/json'
        },
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    const data = await response.json();

    if (response.status === 200) {
      return {
        valid: true,
        message: 'Connection verified successfully',
        data: {
          testResult: {
            riskScore: data.riskScore || data.score,
            companyName: data.name || data.company_name || domain
          }
        }
      };
    } else if (response.status === 401 || response.status === 403) {
      return {
        valid: false,
        message: 'Invalid API key or unauthorized access',
        errorCode: 'ERR_INVALID_CREDENTIALS',
        details: `${response.status} ${response.statusText} from Recorded Future API`
      };
    } else {
      return {
        valid: false,
        message: 'Unexpected response from Recorded Future API',
        errorCode: 'ERR_UNEXPECTED_RESPONSE',
        details: `${response.status}: ${JSON.stringify(data)}`
      };
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Request timeout - validation took longer than 10 seconds');
    }
    throw error;
  }
}

/**
 * BlackKite validator
 * API: https://api.blackkite.com/companies/{domain}
 * Auth: Bearer token
 */
async function validateBlackKite(credentials, options = {}) {
  const { apiKey, domain = 'blackkite.com' } = credentials;
  const timeout = options.timeout || 10000;

  if (!apiKey) {
    throw new Error('API key is required for BlackKite');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(
      `https://api.blackkite.com/companies/${encodeURIComponent(domain)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    const data = await response.json();

    if (response.status === 200) {
      return {
        valid: true,
        message: 'Connection verified successfully',
        data: {
          testResult: {
            score: data.score || data.rating,
            companyName: data.name || data.company_name || domain
          }
        }
      };
    } else if (response.status === 401 || response.status === 403) {
      return {
        valid: false,
        message: 'Invalid API key or unauthorized access',
        errorCode: 'ERR_INVALID_CREDENTIALS',
        details: `${response.status} ${response.statusText} from BlackKite API`
      };
    } else {
      return {
        valid: false,
        message: 'Unexpected response from BlackKite API',
        errorCode: 'ERR_UNEXPECTED_RESPONSE',
        details: `${response.status}: ${JSON.stringify(data)}`
      };
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Request timeout - validation took longer than 10 seconds');
    }
    throw error;
  }
}

/**
 * Validator registry - maps connector types to their validation functions
 */
const validators = {
  securityscorecard: validateSecurityScorecard,
  bitsight: validateBitSight,
  riskrecon: validateRiskRecon,
  recordedfuture: validateRecordedFuture,
  blackkite: validateBlackKite
};

/**
 * Main validation function - validates credentials for a connector
 * @param {string} connectorType - Type of connector
 * @param {Object} credentials - Credentials object
 * @param {Object} options - Validation options (timeout, etc.)
 * @returns {Promise<Object>} Validation result
 */
async function validateCredentials(connectorType, credentials, options = {}) {
  // Normalize connector type
  const normalizedType = connectorType.toLowerCase().replace(/[^a-z0-9]/g, '');

  const validator = validators[normalizedType];

  if (!validator) {
    return {
      valid: false,
      message: `Unsupported connector type: ${connectorType}`,
      errorCode: 'ERR_UNSUPPORTED_CONNECTOR',
      details: `Connector '${connectorType}' is not supported for validation. Supported types: ${Object.keys(validators).join(', ')}`
    };
  }

  // Validate credentials
  try {
    const result = await validator(credentials, options);

    return result;
  } catch (error) {
    return {
      valid: false,
      message: 'Validation failed due to network or server error',
      errorCode: 'ERR_VALIDATION_FAILED',
      details: error.message
    };
  }
}

module.exports = {
  validateCredentials,
  validationLimiter,
  maskApiKey,
  logValidationAttempt,
  getClientIp,
  validators
};
