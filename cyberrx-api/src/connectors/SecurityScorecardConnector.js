'use strict';

const BaseConnector = require('./BaseConnector');
const vault = require('../utils/vault');

/**
 * SecurityScorecard Connector
 *
 * Source Type: API
 * Category: External Attack Surface
 * Purpose: External security posture scoring
 *
 * API Documentation: https://api.securityscorecard.com/docs/
 * Score Range: 0-100 (higher = better)
 * Rate Limit: 1000 requests/day (free tier)
 */
class SecurityScorecardConnector extends BaseConnector {
  constructor(config) {
    super({
      connectorType: 'securityscorecard',
      sourceType: 'api',
      ...config
    });

    // API Configuration
    this.apiBaseUrl = 'https://api.securityscorecard.com';
    this.timeout = 10000; // 10 seconds
    this.maxRetries = 3;
  }

  /**
   * Collect signals from SecurityScorecard API
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @param {Object} vendorData - Vendor data containing domain/name
   * @returns {Promise<Array>} Array of signals
   */
  async collectSignals(vendorId, organizationId, vendorData = {}) {
    const vendorDomain = vendorData.domain || vendorData.website || this.extractDomain(vendorData.name);

    if (!vendorDomain) {
      console.warn('SecurityScorecard: No domain available for vendor');
      return this.getFallbackSignals(vendorData.name || 'Unknown', vendorId, organizationId);
    }

    // Get credentials from vault
    const creds = await vault.get(organizationId, 'securityscorecard');

    if (!creds || !creds.apiKey) {
      console.warn('SecurityScorecard credentials not configured for organization', organizationId);
      return this.getFallbackSignals(vendorData.name || vendorDomain, vendorId, organizationId);
    }

    try {
      // Call SecurityScorecard API with exponential backoff
      const data = await this.fetchWithBackoff(
        `${this.apiBaseUrl}/companies/${vendorDomain}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${creds.apiKey}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(this.timeout)
        }
      );

      // Validate response has expected data
      if (!data || typeof data.score === 'undefined') {
        throw new Error('Invalid response from SecurityScorecard API: missing score');
      }

      // Map SecurityScorecard response to our signal schema
      return this.mapSecurityScorecardToSignals(data, vendorDomain, vendorData.name, vendorId, organizationId);

    } catch (error) {
      console.error('SecurityScorecard API error:', error.message);
      // Return fallback signals if API fails
      return this.getFallbackSignals(vendorData.name || vendorDomain, vendorId, organizationId);
    }
  }

  /**
   * Fetch with exponential backoff for rate limiting
   * @param {string} url - API URL
   * @param {Object} options - Fetch options
   * @param {number} retries - Number of retries remaining
   * @returns {Promise<Object>} Response data
   */
  async fetchWithBackoff(url, options, retries = this.maxRetries) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, i) * 1000;

          console.log(`SecurityScorecard rate limited. Waiting ${waitTime}ms before retry ${i + 1}/${retries}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        // Handle other errors
        if (!response.ok) {
          const error = await this.handleErrorResponse(response);
          throw new Error(`SecurityScorecard API error: ${error.message}`);
        }

        return await response.json();

      } catch (error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout after 10s');
        }

        if (i === retries - 1) throw error;

        const waitTime = Math.pow(2, i) * 1000;
        console.log(`SecurityScorecard fetch error (attempt ${i + 1}/${retries}): ${error.message}. Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Handle error response from API
   * @param {Response} response - Fetch response object
   * @returns {Promise<Object>} Error details
   */
  async handleErrorResponse(response) {
    const status = response.status;
    let message = `HTTP ${status}: ${response.statusText}`;

    try {
      const errorData = await response.json();
      if (errorData.message) {
        message = errorData.message;
      }
    } catch (e) {
      // Ignore JSON parsing errors for error responses
    }

    // Map common error codes
    if (status === 401) return { message: 'Invalid API key' };
    if (status === 404) return { message: 'Company not found in SecurityScorecard' };
    if (status === 429) return { message: 'Rate limit exceeded (1000 requests/day)' };
    if (status === 500) return { message: 'SecurityScorecard server error' };
    if (status === 503) return { message: 'SecurityScorecard service unavailable' };

    return { message };
  }

  /**
   * Map SecurityScorecard API response to signal format
   * @param {Object} data - API response data
   * @param {string} vendorDomain - Vendor domain
   * @param {string} vendorName - Vendor name
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @returns {Array} Array of normalized signals
   */
  mapSecurityScorecardToSignals(data, vendorDomain, vendorName, vendorId, organizationId) {
    const signals = [];
    const observedDate = new Date().toISOString();

    // Overall score signal
    signals.push({
      vendorName: vendorName || vendorDomain,
      signalCategory: 'External Attack Surface',
      signalName: 'Overall Security Score',
      severity: this.calculateSeverity(data.score),
      confidence: 100,
      observedAt: observedDate,
      evidenceUrl: `https://securityscorecard.com/company/${vendorDomain}`,
      description: `SecurityScorecard overall score: ${data.score}/100`,
      recommendedAction: this.getScoreRecommendation(data.score),
      mappedFrameworks: ['NIST-A.5.19', 'CIS v8'],
      mappedPolicies: ['Vendor Risk Management Policy'],
      rawData: {
        vendorDomain,
        vendorId,
        organizationId,
        score: data.score,
        grade: data.grade,
        scoreHistory: data.score_history || null,
        industry: data.industry || null,
        size: data.size || null
      }
    });

    // Network security factor
    if (data.factors?.network_security) {
      const factor = data.factors.network_security;
      signals.push({
        vendorName: vendorName || vendorDomain,
        signalCategory: 'External Attack Surface',
        signalName: 'Network Security',
        severity: this.calculateSeverity(factor.score),
        confidence: 100,
        observedAt: observedDate,
        description: `Network security score: ${factor.score}/100 - ${factor.variability || 'stable'} trend`,
        recommendedAction: this.getFactorRecommendation('network_security', factor.score),
        mappedFrameworks: ['NIST-A.5.19', 'CIS v8'],
        mappedPolicies: ['Vendor Risk Management Policy'],
        rawData: {
          vendorDomain,
          score: factor.score,
          grade: factor.grade,
          variability: factor.variability
        }
      });
    }

    // Patching cadence factor
    if (data.factors?.patching_cadence) {
      const factor = data.factors.patching_cadence;
      signals.push({
        vendorName: vendorName || vendorDomain,
        signalCategory: 'Vulnerability Management',
        signalName: 'Patching Cadence',
        severity: this.calculateSeverity(factor.score),
        confidence: 100,
        observedAt: observedDate,
        description: `Patching cadence score: ${factor.score}/100`,
        recommendedAction: this.getFactorRecommendation('patching_cadence', factor.score),
        mappedFrameworks: ['NIST-A.5.19', 'CIS v8'],
        mappedPolicies: ['Vulnerability Management Policy'],
        rawData: {
          vendorDomain,
          score: factor.score,
          grade: factor.grade,
          variability: factor.variability
        }
      });
    }

    // Endpoint protection factor
    if (data.factors?.endpoint_protection) {
      const factor = data.factors.endpoint_protection;
      signals.push({
        vendorName: vendorName || vendorDomain,
        signalCategory: 'Malware Protection',
        signalName: 'Endpoint Protection',
        severity: this.calculateSeverity(factor.score),
        confidence: 100,
        observedAt: observedDate,
        description: `Endpoint protection score: ${factor.score}/100`,
        recommendedAction: this.getFactorRecommendation('endpoint_protection', factor.score),
        mappedFrameworks: ['NIST-A.5.19', 'CIS v8'],
        mappedPolicies: ['Endpoint Security Policy'],
        rawData: {
          vendorDomain,
          score: factor.score,
          grade: factor.grade,
          variability: factor.variability
        }
      });
    }

    // Hacker chatter factor (breach intelligence)
    if (data.factors?.hacker_chatter) {
      const factor = data.factors.hacker_chatter;
      signals.push({
        vendorName: vendorName || vendorDomain,
        signalCategory: 'Breach/Incident Intelligence',
        signalName: 'Hacker Chatter Detected',
        severity: this.calculateSeverity(factor.score),
        confidence: 100,
        observedAt: observedDate,
        description: `Hacker chatter score: ${factor.score}/100 - indicates discussions about this vendor in hacker communities`,
        recommendedAction: this.getFactorRecommendation('hacker_chatter', factor.score),
        mappedFrameworks: ['NIST-A.5.19'],
        mappedPolicies: ['Threat Intelligence Policy'],
        rawData: {
          vendorDomain,
          score: factor.score,
          grade: factor.grade,
          variability: factor.variability
        }
      });
    }

    // Leaked credentials factor
    if (data.factors?.leaked_credentials) {
      const factor = data.factors.leaked_credentials;
      const count = factor.count || factor.findings_count || 0;

      signals.push({
        vendorName: vendorName || vendorDomain,
        signalCategory: 'Dark Web/Credential Exposure',
        signalName: 'Leaked Credentials Found',
        severity: count > 0 ? 'Critical' : 'Info',
        confidence: 100,
        observedAt: observedDate,
        description: count > 0
          ? `${count} leaked credentials found in dark web breaches`
          : 'No leaked credentials detected',
        recommendedAction: count > 0
          ? 'Immediately rotate all exposed credentials and enforce multi-factor authentication'
          : 'Continue monitoring for credential exposure',
        mappedFrameworks: ['NIST-A.5.19', 'HIPAA-SA-9'],
        mappedPolicies: ['Access Control Policy', 'Credential Management Policy'],
        rawData: {
          vendorDomain,
          score: factor.score,
          count,
          grade: factor.grade,
          variability: factor.variability
        }
      });
    }

    // SSL certificate issues
    if (data.issues?.ssl_certificates) {
      const sslIssues = data.issues.ssl_certificates;
      if (sslIssues.length > 0) {
        signals.push({
          vendorName: vendorName || vendorDomain,
          signalCategory: 'External Attack Surface',
          signalName: 'SSL Certificate Issues',
          severity: sslIssues.some(i => i.severity === 'critical') ? 'High' : 'Low',
          confidence: 100,
          observedAt: observedDate,
          description: `${sslIssues.length} SSL certificate issue(s) detected`,
          recommendedAction: 'Review and remediate SSL certificate issues to prevent service disruption',
          mappedFrameworks: ['NIST-A.5.19'],
          mappedPolicies: ['Encryption Policy'],
          rawData: {
            vendorDomain,
            issues: sslIssues,
            count: sslIssues.length
          }
        });
      }
    }

    return signals;
  }

  /**
   * Calculate severity from SecurityScorecard score (0-100)
   * @param {number} score - SecurityScorecard score (higher = better)
   * @returns {string} Severity level
   */
  calculateSeverity(score) {
    if (score >= 90) return 'Info';      // Low risk
    if (score >= 70) return 'Low';      // Medium-low risk
    if (score >= 50) return 'Medium';   // Medium risk
    if (score >= 30) return 'High';     // High risk
    return 'Critical';                  // Critical risk
  }

  /**
   * Get recommendation based on overall score
   * @param {number} score - SecurityScorecard score
   * @returns {string} Recommendation
   */
  getScoreRecommendation(score) {
    if (score >= 90) return 'Maintain current security practices';
    if (score >= 70) return 'Monitor security posture and address minor issues';
    if (score >= 50) return 'Review security practices and implement remediation plan';
    if (score >= 30) return 'Immediate security assessment and remediation required';
    return 'Critical: Require comprehensive security review before engagement';
  }

  /**
   * Get recommendation based on factor score
   * @param {string} factorName - Name of the factor
   * @param {number} score - Factor score
   * @returns {string} Recommendation
   */
  getFactorRecommendation(factorName, score) {
    const recommendations = {
      network_security: score < 50
        ? 'Review network security controls and firewall configurations'
        : 'Continue monitoring network security posture',
      patching_cadence: score < 50
        ? 'Implement automated patching and reduce deployment cycle time'
        : 'Maintain current patching cadence',
      endpoint_protection: score < 50
        ? 'Deploy comprehensive endpoint protection across all systems'
        : 'Continue monitoring endpoint security',
      hacker_chatter: score < 50
        ? 'Investigate hacker discussions and assess threat exposure'
        : 'Monitor for increased hacker activity',
      leaked_credentials: score < 50
        ? 'Conduct credential audit and force password rotation'
        : 'Continue monitoring for credential leaks'
    };

    return recommendations[factorName] || 'Review factor details and implement appropriate controls';
  }

  /**
   * Extract domain from vendor name or website
   * @param {string} input - Vendor name or website
   * @returns {string|null} Extracted domain
   */
  extractDomain(input) {
    if (!input) return null;

    // If it's already a domain
    if (input.includes('.')) {
      const match = input.match(/^https?:\/\/([^/]+)/);
      if (match) return match[1];

      const domainMatch = input.match(/^([^\/]+)\//);
      if (domainMatch) return domainMatch[1];

      return input.split('/')[0];
    }

    // Try to construct domain from company name (basic heuristic)
    // This is a fallback and may not always work
    return `${input.toLowerCase().replace(/\s+/g, '')}.com`;
  }

  /**
   * Get fallback signals when API is unavailable
   * @param {string} vendorName - Vendor name
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @returns {Array} Fallback signals
   */
  getFallbackSignals(vendorName, vendorId, organizationId) {
    return [
      {
        vendorName,
        signalCategory: 'External Attack Surface',
        signalName: 'SecurityScorecard Unavailable',
        severity: 'Info',
        confidence: 50,
        observedAt: new Date().toISOString(),
        description: 'Unable to fetch SecurityScorecard data - check API credentials',
        recommendedAction: 'Configure SecurityScorecard API credentials in settings',
        mappedFrameworks: [],
        mappedPolicies: [],
        rawData: {
          vendorId,
          organizationId,
          fallback: true,
          reason: 'API unavailable or credentials not configured'
        }
      }
    ];
  }

  /**
   * Test connection to SecurityScorecard API
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Test result
   */
  async testConnection(organizationId) {
    try {
      const creds = await vault.get(organizationId, 'securityscorecard');

      if (!creds || !creds.apiKey) {
        return {
          status: 'error',
          message: 'SecurityScorecard credentials not configured',
          connectorType: this.connectorType,
          details: {
            issue: 'missing_credentials',
            solution: 'Add SECURITYSCORECARD_APIKEY to environment variables'
          }
        };
      }

      // Test with a simple request to a known domain
      const testDomain = 'google.com';
      const response = await this.fetchWithBackoff(
        `${this.apiBaseUrl}/companies/${testDomain}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${creds.apiKey}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000) // 5s timeout for test
        }
      );

      if (response && typeof response.score !== 'undefined') {
        return {
          status: 'success',
          message: 'SecurityScorecard API connection successful',
          connectorType: this.connectorType,
          details: {
            testDomain,
            score: response.score,
            grade: response.grade
          }
        };
      }

      return {
        status: 'error',
        message: 'Invalid response from SecurityScorecard API',
        connectorType: this.connectorType
      };

    } catch (error) {
      return {
        status: 'error',
        message: `Connection test failed: ${error.message}`,
        connectorType: this.connectorType,
        details: {
          error: error.message
        }
      };
    }
  }
}

module.exports = SecurityScorecardConnector;
