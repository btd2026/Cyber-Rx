'use strict';

/**
 * Environment Variable Validation
 *
 * Validates that all required environment variables are set and properly formatted.
 * The application will fail to start if critical variables are missing.
 *
 * CRITICAL variables: Application cannot start without these
 * REQUIRED variables: Application starts but logs warnings
 * OPTIONAL variables: Silently ignored if not set
 */

const logger = require('./logger');

// Validation rules for environment variables
const ENV_VARS = {
  // CRITICAL - Application cannot start without these
  DATABASE_URL: {
    required: true,
    critical: true,
    description: 'PostgreSQL database connection string',
    format: 'postgresql://user:password@host:port/database',
    example: 'postgresql://cyberrx_user:password@localhost:5432/cyberrx'
  },
  JWT_SECRET: {
    required: true,
    critical: true,
    minLength: 32,
    description: 'Secret key for JWT token signing',
    format: 'string (min 32 characters)',
    example: 'your-super-secret-jwt-key-min-32-characters-long'
  },
  NODE_ENV: {
    required: true,
    critical: true,
    description: 'Application environment',
    format: 'development|production|test',
    example: 'production',
    validate: (value) => ['development', 'production', 'test'].includes(value)
  },
  PORT: {
    required: true,
    critical: true,
    description: 'API server port',
    format: 'number (1024-65535)',
    example: '3001',
    validate: (value) => {
      const port = parseInt(value);
      return !isNaN(port) && port >= 1024 && port <= 65535;
    }
  },

  // REQUIRED - Application starts but logs warnings
  SESSION_SECRET: {
    required: true,
    critical: false,
    minLength: 32,
    description: 'Secret key for session encryption (SSO flows)',
    format: 'string (min 32 characters)',
    example: 'change-this-in-production-min-32-chars'
  },

  // OPTIONAL - No warnings if missing
  REDIS_URL: {
    required: false,
    critical: false,
    description: 'Redis connection URL for rate limiting, sessions, and job queue',
    format: 'redis://[:password@]host:port/db',
    example: 'redis://localhost:6379'
  },

  // OPTIONAL - Observability
  SENTRY_DSN: {
    required: false,
    critical: false,
    description: 'Sentry error tracking DSN',
    format: 'https://...',
    example: 'https://your-sentry-dsn@sentry.io/project-id'
  },
  DATADOG_API_KEY: {
    required: false,
    critical: false,
    description: 'DataDog API key for monitoring',
    format: 'string',
    example: 'your-datadog-api-key'
  },
  LOG_LEVEL: {
    required: false,
    critical: false,
    description: 'Logging verbosity level',
    format: 'debug|info|warn|error',
    example: 'info',
    validate: (value) => ['debug', 'info', 'warn', 'error'].includes(value)
  },

  // OPTIONAL - CORS Configuration
  CORS_ALLOWLIST: {
    required: false,
    critical: false,
    description: 'Comma-separated list of allowed CORS origins',
    format: 'url1,url2,url3',
    example: 'https://app.cyberrx.com,https://www.anthropic.com'
  },
  FRONTEND_URL: {
    required: false,
    critical: false,
    description: 'Single frontend origin (deprecated, use CORS_ALLOWLIST)',
    format: 'url',
    example: 'https://app.cyberrx.com'
  },

  // OPTIONAL - Vault Mode
  VAULT_MODE: {
    required: false,
    critical: false,
    description: 'Credential vault mode',
    format: 'local|aws',
    example: 'local',
    validate: (value) => ['local', 'aws'].includes(value)
  },

  // OPTIONAL - Security Tool Credentials (vendor integrations)
  OKTA_DOMAIN: {
    required: false,
    critical: false,
    description: 'Okta domain for MFA metrics',
    format: 'your-org.okta.com',
    example: 'your-org.okta.com'
  },
  OKTA_APITOKEN: {
    required: false,
    critical: false,
    description: 'Okta API token',
    format: 'string (starts with 00)',
    example: '00your-api-token-here'
  },
  CROWDSTRIKE_CLIENT_ID: {
    required: false,
    critical: false,
    description: 'CrowdStrike Falcon OAuth client ID',
    format: 'string',
    example: 'your-client-id'
  },
  CROWDSTRIKE_CLIENT_SECRET: {
    required: false,
    critical: false,
    description: 'CrowdStrike Falcon OAuth client secret',
    format: 'string',
    example: 'your-client-secret'
  },
  SPLUNK_HOST: {
    required: false,
    critical: false,
    description: 'Splunk SIEM host for retention metrics',
    format: 'hostname',
    example: 'splunk.yourorg.com'
  },
  SPLUNK_USER: {
    required: false,
    critical: false,
    description: 'Splunk API username',
    format: 'string',
    example: 'admin'
  },
  SPLUNK_PASSWORD: {
    required: false,
    critical: false,
    description: 'Splunk API password',
    format: 'string',
    example: 'your-secure-password'
  },
  SPLUNK_PORT: {
    required: false,
    critical: false,
    description: 'Splunk management port',
    format: 'number',
    example: '8089'
  },
  KNOWBE4_APIKEY: {
    required: false,
    critical: false,
    description: 'KnowBe4 API key for phishing metrics',
    format: 'string',
    example: 'your-api-key'
  },
  TENABLE_ACCESS_KEY: {
    required: false,
    critical: false,
    description: 'Tenable.io access key',
    format: 'string',
    example: 'your-access-key'
  },
  TENABLE_SECRET_KEY: {
    required: false,
    critical: false,
    description: 'Tenable.io secret key',
    format: 'string',
    example: 'your-secret-key'
  },
  SECURITYSCORECARD_APIKEY: {
    required: false,
    critical: false,
    description: 'SecurityScorecard API key',
    format: 'string',
    example: 'your-api-key-here'
  },

  // OPTIONAL - ITSM Systems
  SNOW_INSTANCE: {
    required: false,
    critical: false,
    description: 'ServiceNow instance name',
    format: 'string',
    example: 'dev12345'
  },
  SNOW_USER: {
    required: false,
    critical: false,
    description: 'ServiceNow API username',
    format: 'string',
    example: 'admin'
  },
  SNOW_PASSWORD: {
    required: false,
    critical: false,
    description: 'ServiceNow API password',
    format: 'string',
    example: 'your-password'
  },
  SNOW_ASSIGN_GROUP: {
    required: false,
    critical: false,
    description: 'ServiceNow assignment group for tickets',
    format: 'string',
    example: 'IT Security'
  },
  JIRA_INSTANCE: {
    required: false,
    critical: false,
    description: 'Jira instance name',
    format: 'string',
    example: 'yourorg'
  },
  JIRA_EMAIL: {
    required: false,
    critical: false,
    description: 'Jira API email',
    format: 'email',
    example: 'you@yourorg.com'
  },
  JIRA_TOKEN: {
    required: false,
    critical: false,
    description: 'Jira API token',
    format: 'string',
    example: 'your-api-token'
  },
  JIRA_PROJECT: {
    required: false,
    critical: false,
    description: 'Jira project key',
    format: 'string',
    example: 'SEC'
  },
  FRESHSERVICE_DOMAIN: {
    required: false,
    critical: false,
    description: 'Freshservice domain',
    format: 'string',
    example: 'yourorg'
  },
  FRESHSERVICE_APIKEY: {
    required: false,
    critical: false,
    description: 'Freshservice API key',
    format: 'string',
    example: 'your-api-key'
  },

  // OPTIONAL - SSO Configuration
  SAML_ENTRY_POINT: {
    required: false,
    critical: false,
    description: 'SAML SSO entry point URL',
    format: 'url',
    example: 'https://dev-123456.okta.com/app/dev123456/sso/saml'
  },
  SAML_ISSUER: {
    required: false,
    critical: false,
    description: 'SAML issuer URI',
    format: 'url',
    example: 'https://dev-123456.okta.com'
  },
  SAML_CERT: {
    required: false,
    critical: false,
    description: 'SAML X.509 certificate (PEM format)',
    format: 'PEM certificate',
    example: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----'
  },
  SAML_CALLBACK_URL: {
    required: false,
    critical: false,
    description: 'SAML callback URL',
    format: 'url',
    example: 'https://api.cyberrx.com/sso/saml/callback'
  },
  AZURE_AD_CLIENT_ID: {
    required: false,
    critical: false,
    description: 'Azure AD application client ID',
    format: 'GUID',
    example: 'your-client-id'
  },
  AZURE_AD_CLIENT_SECRET: {
    required: false,
    critical: false,
    description: 'Azure AD application client secret',
    format: 'string',
    example: 'your-client-secret'
  },
  AZURE_AD_TENANT_ID: {
    required: false,
    critical: false,
    description: 'Azure AD tenant ID',
    format: 'domain or GUID',
    example: 'contoso.onmicrosoft.com'
  },
  AZURE_AD_CALLBACK_URL: {
    required: false,
    critical: false,
    description: 'Azure AD callback URL',
    format: 'url',
    example: 'https://api.cyberrx.com/sso/azure/callback'
  },
  DEFAULT_SSO_ORG_ID: {
    required: false,
    critical: false,
    description: 'Default organization ID for SSO auto-provisioned users',
    format: 'string',
    example: 'default-org'
  },

  // OPTIONAL - Rate Limiting
  RATE_LIMIT_ENABLED: {
    required: false,
    critical: false,
    description: 'Enable/disable rate limiting',
    format: 'boolean',
    example: 'true',
    validate: (value) => ['true', 'false', '1', '0'].includes(value)
  },
  RATE_LIMIT_WINDOW: {
    required: false,
    critical: false,
    description: 'Rate limit window in seconds',
    format: 'number',
    example: '60',
    validate: (value) => {
      const num = parseInt(value);
      return !isNaN(num) && num > 0;
    }
  }
};

/**
 * Validate a single environment variable
 */
function validateVar(name, rule) {
  const value = process.env[name];

  // Check if variable is set
  if (!value) {
    if (rule.required && rule.critical) {
      throw new Error(
        `CRITICAL: ${name} is not set\n` +
        `  Description: ${rule.description}\n` +
        `  Format: ${rule.format}\n` +
        `  Example: ${rule.example}\n` +
        `  Fix: Add ${name}= to your .env file or environment`
      );
    } else if (rule.required) {
      logger.warn(
        `Required variable not set: ${name}\n` +
        `  Description: ${rule.description}\n` +
        `  Example: ${rule.example}`
      );
      return { valid: false, missing: true };
    }
    return { valid: true, missing: true }; // Optional, not set is OK
  }

  // Check minimum length
  if (rule.minLength && value.length < rule.minLength) {
    if (rule.critical) {
      throw new Error(
        `CRITICAL: ${name} must be at least ${rule.minLength} characters (got ${value.length})`
      );
    } else {
      logger.warn(`${name} is shorter than recommended ${rule.minLength} characters`);
      return { valid: false };
    }
  }

  // Run custom validation
  if (rule.validate && !rule.validate(value)) {
    if (rule.critical) {
      throw new Error(
        `CRITICAL: ${name} has invalid format: "${value}"\n` +
        `  Expected format: ${rule.format}\n` +
        `  Example: ${rule.example}`
      );
    } else {
      logger.warn(`${name} has unexpected format: "${value}" (expected: ${rule.format})`);
      return { valid: false };
    }
  }

  return { valid: true, value };
}

/**
 * Validate all environment variables
 * Throws error if critical variables are missing or invalid
 */
function validateEnv() {
  logger.info('Validating environment variables...');

  const errors = [];
  const warnings = [];
  const results = {};

  // Validate each variable
  for (const [name, rule] of Object.entries(ENV_VARS)) {
    try {
      const result = validateVar(name, rule);
      results[name] = result;

      if (result.missing && !rule.required) {
        // Optional variable not set - no warning
      } else if (result.missing && rule.required) {
        warnings.push(name);
      } else if (!result.valid) {
        warnings.push(name);
      }
    } catch (error) {
      errors.push({ name, error: error.message });
    }
  }

  // Log critical errors and fail fast
  if (errors.length > 0) {
    logger.error('Environment validation failed with critical errors:');
    errors.forEach(({ name, error }) => {
      logger.error(`  ${name}: ${error}`);
    });
    throw new Error(
      `Application cannot start: ${errors.length} critical environment variable(s) missing or invalid. ` +
      `See logs above for details.`
    );
  }

  // Log warnings but continue
  if (warnings.length > 0) {
    logger.warn(
      `${warnings.length} environment variable(s) have warnings: ${warnings.join(', ')}`
    );
  }

  // Log summary
  const setCount = Object.values(results).filter(r => !r.missing).length;
  const totalCount = Object.keys(ENV_VARS).length;

  logger.info(
    `Environment validation complete: ${setCount}/${totalCount} variables set, ` +
    `${warnings.length} warning(s), ${errors.length} error(s)`
  );

  return { valid: true, results, warnings: warnings.length, errors: errors.length };
}

/**
 * Get a safe summary of environment variables for logging
 * (hides sensitive values)
 */
function getEnvSummary() {
  return Object.entries(ENV_VARS).map(([name, rule]) => {
    const value = process.env[name];
    const isSet = !!value;

    // Hide sensitive values
    let displayValue = 'not set';
    if (isSet) {
      if (name.toLowerCase().includes('secret') ||
          name.toLowerCase().includes('password') ||
          name.toLowerCase().includes('token') ||
          name.toLowerCase().includes('key')) {
        displayValue = '*** (hidden)';
      } else {
        displayValue = value;
      }
    }

    return { name, value: displayValue, required: rule.required, critical: rule.critical };
  });
}

module.exports = {
  validateEnv,
  getEnvSummary,
  ENV_VARS
};
