'use strict';

const BaseConnector = require('./BaseConnector');
const vault = require('../utils/vault');

/**
 * BitSight Connector
 *
 * Source Type: API
 * Category: External Attack Surface, Breach Intelligence
 * Purpose: Security ratings and vulnerability intelligence
 *
 * BitSight API Documentation:
 * - Base URL: https://api.bitsighttech.com/ratings/v1
 * - Authentication: Bearer token (API key)
 * - Rate Limit: Check response headers for limits
 * - Score Range: 250-900 (higher = better)
 * - Grade Range: A+, A, B+, B, C+, C, D, F
 */
class BitSightConnector extends BaseConnector {
  constructor(config) {
    super({
      connectorType: 'bitsight',
      sourceType: 'api',
      ...config
    });

    // BitSight API configuration
    this.baseUrl = 'https://api.bitsighttech.com/ratings/v1';
    this.timeout = config.timeout || 10000; // 10 seconds default
    this.rateLimitDelay = config.rateLimitDelay || 1000; // 1 second between requests
  }

  /**
   * Collect signals from BitSight API
   * @param {string} vendorDomain - Vendor domain (e.g., 'nasco.com')
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of normalized signals
   */
  async collectSignals(vendorDomain, vendorId, organizationId) {
    // Get credentials from vault
    const creds = await vault.get(this.organizationId || organizationId, 'bitsight');

    if (!creds || !creds.apiKey) {
      console.warn('BitSight credentials not configured');
      return this.getFallbackSignals(vendorDomain, vendorId);
    }

    try {
      // Call BitSight API to get company rating
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/companies/${vendorDomain}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${creds.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(this.timeout)
        }
      );

      if (!response.ok) {
        const error = await this.handleErrorResponse(response);
        throw new Error(`BitSight API error: ${error.message}`);
      }

      const data = await response.json();

      // Validate response
      if (!data || (typeof data.grade === 'undefined' && typeof data.score === 'undefined')) {
        throw new Error('Invalid response from BitSight API - missing grade or score');
      }

      // Map BitSight data to signals
      return this.mapBitSightToSignals(data, vendorDomain, vendorId);

    } catch (error) {
      console.error('BitSight API error:', error.message);
      return this.getFallbackSignals(vendorDomain, vendorId);
    }
  }

  /**
   * Fetch with retry logic for rate limiting
   * @param {string} url - API URL
   * @param {Object} options - Fetch options
   * @param {number} retries - Number of retries remaining
   * @returns {Promise<Response>} Fetch response
   */
  async fetchWithRetry(url, options, retries = 3) {
    try {
      const response = await fetch(url, options);

      // Handle rate limiting (429)
      if (response.status === 429 && retries > 0) {
        const retryAfter = parseInt(response.headers.get('Retry-After')) || this.rateLimitDelay;
        console.warn(`BitSight rate limit reached, retrying after ${retryAfter}ms`);
        await this.sleep(retryAfter);
        return this.fetchWithRetry(url, options, retries - 1);
      }

      return response;
    } catch (error) {
      if (retries > 0 && error.name === 'AbortError') {
        console.warn('BitSight request timeout, retrying...');
        return this.fetchWithRetry(url, options, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Handle BitSight API error responses
   * @param {Response} response - Fetch response object
   * @returns {Promise<Object>} Parsed error
   */
  async handleErrorResponse(response) {
    const status = response.status;
    const statusText = response.statusText;

    // Prefer the API's own error message when a parseable body is available.
    // This surfaces vendor-specific detail (e.g. why a request was rejected)
    // instead of masking it with a generic mapped message.
    if (typeof response.json === 'function') {
      try {
        const errorData = await response.json();
        const bodyMessage = errorData && (errorData.message || errorData.error);
        if (bodyMessage) {
          return { message: bodyMessage };
        }
      } catch (e) {
        // Body could not be parsed - fall back to a generic HTTP message
        // rather than a friendly mapped one, so the raw status is preserved.
        return { message: `HTTP ${status}: ${statusText}` };
      }
    }

    // Map common HTTP errors to user-friendly messages
    if (status === 400) return { message: 'Bad request - invalid domain or parameters' };
    if (status === 401) return { message: 'Invalid BitSight API key' };
    if (status === 403) return { message: 'Forbidden - insufficient permissions' };
    if (status === 404) return { message: 'Company not found in BitSight database' };
    if (status === 429) return { message: 'Rate limit exceeded - please retry later' };
    if (status >= 500) return { message: 'BitSight server error - please retry later' };

    return { message: `HTTP ${status}: ${statusText}` };
  }

  /**
   * Map BitSight API response to normalized signals
   * @param {Object} data - BitSight API response
   * @param {string} vendorDomain - Vendor domain
   * @param {string} vendorId - Vendor ID
   * @returns {Array} Array of normalized signals
   */
  mapBitSightToSignals(data, vendorDomain, vendorId) {
    const signals = [];
    const observedDate = new Date().toISOString();

    // Overall security grade/score
    signals.push({
      vendorName: data.company_name || vendorDomain,
      signalCategory: 'External Attack Surface',
      signalName: 'BitSight Security Grade',
      severity: this.calculateSeverity(data),
      confidence: 100,
      observedAt: observedDate,
      evidenceUrl: `https://bitsighttech.com/companies/${vendorDomain}`,
      description: `BitSight security rating: ${data.grade || 'N/A'} (${data.score || 'N/A'})`,
      recommendedAction: this.getRecommendedAction(data),
      mappedFrameworks: ['NIST-A.5.19', 'HIPAA-SA-9'],
      mappedPolicies: ['Third-Party Risk Policy'],
      rawData: {
        vendor_domain: vendorDomain,
        vendor_id: vendorId,
        score: data.score,
        grade: data.grade,
        vector_score: data.vector_score || null,
        rating_date: data.rating_date || null,
        industry: data.industry || null,
        industry_average: data.industry_average || null
      }
    });

    // Compromise history (if available)
    if (data.compromises && data.compromises.length > 0) {
      signals.push({
        vendorName: data.company_name || vendorDomain,
        signalCategory: 'Breach/Incident Intelligence',
        signalName: 'Compromise History',
        severity: this.getCompromiseSeverity(data.compromises),
        confidence: 100,
        observedAt: observedDate,
        evidenceUrl: `https://bitsighttech.com/companies/${vendorDomain}/compromises`,
        description: `BitSight detected ${data.compromises.length} compromise events`,
        recommendedAction: 'Investigate compromise history and containment procedures',
        mappedFrameworks: ['NIST-A.10.1', 'HIPAA-SA-9'],
        mappedPolicies: ['Incident Response Policy'],
        rawData: {
          compromises: data.compromises.slice(0, 10), // Last 10 compromises
          total_compromises: data.compromises.length
        }
      });
    }

    // Vulnerability findings (if available)
    if (data.vulnerabilities && data.vulnerabilities.count > 0) {
      signals.push({
        vendorName: data.company_name || vendorDomain,
        signalCategory: 'Vulnerability Management',
        signalName: 'Vulnerability Findings',
        severity: this.calculateSeverityFromVulns(data.vulnerabilities),
        confidence: 100,
        observedAt: observedDate,
        evidenceUrl: `https://bitsighttech.com/companies/${vendorDomain}/vulnerabilities`,
        description: `${data.vulnerabilities.count} vulnerabilities detected`,
        recommendedAction: 'Review and prioritize vulnerability remediation',
        mappedFrameworks: ['NIST-A.5.19', 'CIS v8'],
        mappedPolicies: ['Vulnerability Management Policy'],
        rawData: {
          count: data.vulnerabilities.count,
          severity_breakdown: data.vulnerabilities.severity_breakdown || {}
        }
      });
    }

    // Patching cadence (if available)
    if (data.patching_speed) {
      signals.push({
        vendorName: data.company_name || vendorDomain,
        signalCategory: 'Vulnerability Management',
        signalName: 'Patching Cadence',
        severity: this.calculateSeverityFromPatching(data.patching_speed),
        confidence: 100,
        observedAt: observedDate,
        evidenceUrl: `https://bitsighttech.com/companies/${vendorDomain}/patching`,
        description: `Average patch deployment time: ${data.patching_speed} days`,
        recommendedAction: 'Accelerate patch deployment cycle to meet 30-day SLA',
        mappedFrameworks: ['NIST-A.5.19', 'CIS v8'],
        mappedPolicies: ['Vulnerability Management Policy'],
        rawData: {
          patching_speed: data.patching_speed,
          industry_percentile: data.patching_percentile || null
        }
      });
    }

    // Network security (if available)
    if (data.network_security) {
      signals.push({
        vendorName: data.company_name || vendorDomain,
        signalCategory: 'External Attack Surface',
        signalName: 'Network Security Posture',
        severity: this.calculateSeverityFromScore(data.network_security.score),
        confidence: 100,
        observedAt: observedDate,
        evidenceUrl: `https://bitsighttech.com/companies/${vendorDomain}/network`,
        description: `Network security score: ${data.network_security.score}`,
        recommendedAction: 'Review network security configurations',
        mappedFrameworks: ['NIST-A.5.19', 'CIS v8'],
        mappedPolicies: ['Network Security Policy'],
        rawData: {
          score: data.network_security.score,
          grade: data.network_security.grade
        }
      });
    }

    return signals;
  }

  /**
   * Calculate severity from BitSight grade/score
   * @param {Object} data - BitSight data
   * @returns {string} Normalized severity
   */
  calculateSeverity(data) {
    // BitSight uses both grades (A+-F) and scores (250-900)
    const grade = data.grade;
    const score = data.score;

    // Normalize grade to severity (primary method)
    if (grade) {
      const g = grade.toUpperCase();
      if (g === 'A+' || g === 'A') return 'Info';      // 800-900
      if (g === 'B+' || g === 'B') return 'Low';        // 700-799
      if (g === 'C+' || g === 'C') return 'Medium';     // 600-699
      if (g === 'D') return 'High';                      // 500-599
      if (g === 'F') return 'Critical';                  // 250-499
    }

    // If only score available (fallback). Use a type check so a score of 0
    // (the worst possible rating) is evaluated rather than treated as missing.
    if (typeof score === 'number' && !isNaN(score)) {
      if (score >= 800) return 'Info';
      if (score >= 700) return 'Low';
      if (score >= 600) return 'Medium';
      if (score >= 500) return 'High';
      return 'Critical'; // 250-499 and anything below (e.g. 0)
    }

    return 'Medium'; // Default
  }

  /**
   * Calculate severity from vulnerability data
   * @param {Object} vulns - Vulnerability data
   * @returns {string} Normalized severity
   */
  calculateSeverityFromVulns(vulns) {
    if (!vulns) return 'Info';

    const count = vulns.count || 0;
    const critical = vulns.critical || 0;
    const high = vulns.high || 0;

    if (critical >= 5 || high > 50) return 'Critical';
    if (critical > 0 || high > 20) return 'High';
    if (count > 100) return 'Medium';
    if (count > 0) return 'Low';

    return 'Info';
  }

  /**
   * Calculate severity from patching speed
   * @param {number} patchingSpeed - Days to patch
   * @returns {string} Normalized severity
   */
  calculateSeverityFromPatching(patchingSpeed) {
    if (!patchingSpeed || patchingSpeed > 90) return 'Critical';
    if (patchingSpeed > 60) return 'High';
    if (patchingSpeed > 30) return 'Medium';
    if (patchingSpeed > 14) return 'Low';

    return 'Info';
  }

  /**
   * Calculate severity from score
   * @param {number} score - BitSight score
   * @returns {string} Normalized severity
   */
  calculateSeverityFromScore(score) {
    if (!score) return 'Medium';
    if (score >= 800) return 'Info';
    if (score >= 700) return 'Low';
    if (score >= 600) return 'Medium';
    if (score >= 500) return 'High';
    return 'Critical';
  }

  /**
   * Calculate severity from compromise data
   * @param {Array} compromises - Array of compromise events
   * @returns {string} Normalized severity
   */
  getCompromiseSeverity(compromises) {
    // Only consider compromises that carry a valid date. Entries with a
    // missing or unparseable date are excluded so they don't inflate the
    // count or accidentally register as "recent".
    const validCompromises = compromises.filter(c => {
      return c && c.date && !isNaN(new Date(c.date).getTime());
    });

    const count = validCompromises.length;
    const recentCount = validCompromises.filter(c => {
      const daysSince = (Date.now() - new Date(c.date)) / (1000 * 60 * 60 * 24);
      // Future-dated entries (negative daysSince) are not treated as recent.
      return daysSince >= 0 && daysSince <= 90;
    }).length;

    if (recentCount > 0) return 'Critical';
    if (count > 5) return 'High';
    if (count > 1) return 'Medium';
    if (count === 1) return 'Low';

    return 'Info';
  }

  /**
   * Get recommended action based on grade/score
   * @param {Object} data - BitSight data
   * @returns {string} Recommended action
   */
  getRecommendedAction(data) {
    const grade = data.grade;
    const score = data.score;

    if (grade) {
      const g = grade.toUpperCase();
      if (g === 'F' || g === 'D') {
        return 'URGENT: Immediate security remediation required - vendor is high risk';
      }
      if (g === 'C') {
        return 'Review security posture and request remediation plan';
      }
      if (g === 'B') {
        return 'Monitor for security improvements and best practices';
      }
      return 'Continue monitoring - acceptable security posture';
    }

    if (score) {
      if (score < 500) {
        return 'URGENT: Immediate security remediation required - vendor is high risk';
      }
      if (score < 600) {
        return 'Review security posture and request remediation plan';
      }
      if (score < 700) {
        return 'Monitor for security improvements and best practices';
      }
      return 'Continue monitoring - acceptable security posture';
    }

    return 'Review security rating and assess risk';
  }

  /**
   * Fallback signals when API is unavailable
   * @param {string} vendorDomain - Vendor domain
   * @param {string} vendorId - Vendor ID
   * @returns {Array} Fallback signals
   */
  getFallbackSignals(vendorDomain, vendorId) {
    return [{
      vendorName: vendorDomain,
      signalCategory: 'External Attack Surface',
      signalName: 'BitSight Security Rating',
      severity: 'Medium',
      confidence: 50,
      observedAt: new Date().toISOString(),
      evidenceUrl: `https://bitsighttech.com/companies/${vendorDomain}`,
      description: 'BitSight data temporarily unavailable - manual review required',
      recommendedAction: 'Manually verify vendor security rating on BitSight platform',
      mappedFrameworks: ['NIST-A.5.19', 'HIPAA-SA-9'],
      mappedPolicies: ['Third-Party Risk Policy'],
      rawData: {
        vendor_domain: vendorDomain,
        vendor_id: vendorId,
        fallback: true,
        reason: 'API unavailable or credentials not configured'
      }
    }];
  }

  /**
   * Test connection to BitSight API
   * @returns {Promise<Object>} Test result
   */
  async testConnection() {
    try {
      const creds = await vault.get(this.organizationId, 'bitsight');

      if (!creds || !creds.apiKey) {
        return {
          status: 'error',
          message: 'BitSight credentials not configured',
          connectorType: this.connectorType
        };
      }

      // Test API with a simple request
      const response = await fetch(
        `${this.baseUrl}/companies/example.com`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${creds.apiKey}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000)
        }
      );

      // 404 is expected for example.com, but 401 means invalid key
      if (response.status === 401) {
        return {
          status: 'error',
          message: 'Invalid BitSight API key',
          connectorType: this.connectorType
        };
      }

      if (response.status === 403) {
        return {
          status: 'error',
          message: 'Forbidden - insufficient permissions',
          connectorType: this.connectorType
        };
      }

      return {
        status: 'success',
        message: 'BitSight API connection successful',
        connectorType: this.connectorType
      };

    } catch (error) {
      return {
        status: 'error',
        message: `Connection test failed: ${error.message}`,
        connectorType: this.connectorType
      };
    }
  }

  /**
   * Sleep utility for rate limiting
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = BitSightConnector;
