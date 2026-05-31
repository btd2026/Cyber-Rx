'use strict';

const BaseConnector = require('./BaseConnector');
const vault = require('../utils/vault');

/**
 * RiskRecon Connector
 *
 * Source Type: API
 * Category: External Attack Surface
 * Purpose: Attack surface discovery and monitoring
 *
 * RiskRecon API Documentation:
 * - Base URL: https://api.riskrecon.com/api/v1
 * - Authentication: Bearer token (API key)
 * - Grade Scale: A+, A, B+, B, C+, C, D, F (A+ = best, F = worst)
 */
class RiskReconConnector extends BaseConnector {
  constructor(config) {
    super({
      connectorType: 'riskrecon',
      sourceType: 'api',
      ...config
    });
  }

  /**
   * Collect signals from RiskRecon API
   * @param {string} vendorDomain - Vendor domain to query (e.g., 'example.com')
   * @param {string} vendorId - Internal vendor ID
   * @param {string} organizationId - Organization ID for credential lookup
   * @returns {Promise<Array>} Array of normalized signals
   */
  async collectSignals(vendorDomain, vendorId, organizationId) {
    // Get credentials from vault
    const creds = await vault.get(organizationId, 'riskrecon');

    if (!creds || !creds.apiKey) {
      console.warn(`[RiskRecon] Credentials not configured for org ${organizationId}`);
      return this.getFallbackSignals(vendorDomain, vendorId);
    }

    try {
      // RiskRecon API endpoint
      // GET https://api.riskrecon.com/api/v1/companies/{domain}
      const response = await fetch(
        `https://api.riskrecon.com/api/v1/companies/${vendorDomain}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `token=${creds.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        }
      );

      if (!response.ok) {
        const error = await this.handleErrorResponse(response);
        throw new Error(`RiskRecon API error: ${error.message}`);
      }

      const data = await response.json();

      // Validate response structure
      if (!data || typeof data.grade === 'undefined') {
        throw new Error('Invalid response from RiskRecon API - missing grade field');
      }

      // Map RiskRecon data to our signal format
      const signals = this.mapRiskReconToSignals(data, vendorDomain, vendorId);

      console.log(`[RiskRecon] Successfully collected ${signals.length} signals for ${vendorDomain}`);
      return signals;

    } catch (error) {
      // Handle fetch errors (network, timeout, etc.)
      if (error.name === 'AbortError') {
        console.error(`[RiskRecon] Request timeout for ${vendorDomain}:`, error.message);
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.error(`[RiskRecon] Network error for ${vendorDomain}:`, error.message);
      } else {
        console.error(`[RiskRecon] API error for ${vendorDomain}:`, error.message);
      }

      // Return fallback signals instead of failing completely
      return this.getFallbackSignals(vendorDomain, vendorId);
    }
  }

  /**
   * Map RiskRecon API response to normalized signal format
   * @param {Object} data - RiskRecon API response
   * @param {string} vendorDomain - Vendor domain
   * @param {string} vendorId - Internal vendor ID
   * @returns {Array} Array of normalized signals
   */
  mapRiskReconToSignals(data, vendorDomain, vendorId) {
    const signals = [];
    const detectedDate = new Date().toISOString();

    // Signal 1: Overall Security Grade
    signals.push(this.normalizeSignal({
      name: 'RiskRecon Security Grade',
      severity: this.calculateSeverity(data.grade),
      confidence: 100,
      observedAt: detectedDate,
      evidenceUrl: `https://app.riskrecon.com/company/${vendorDomain}`,
      description: `Overall security posture grade for ${vendorDomain}`,
      recommendedAction: this.getGradeRecommendation(data.grade),
      rawData: {
        grade: data.grade,
        last_observed: data.last_observed || null,
        vendor_domain: vendorDomain,
        vendor_id: vendorId
      }
    }));

    // Signal 2: Attack Surface Findings (if present)
    if (data.findings && Array.isArray(data.findings) && data.findings.length > 0) {
      const criticalCount = data.findings.filter(f => f.severity === 'critical').length;
      const highCount = data.findings.filter(f => f.severity === 'high').length;
      const mediumCount = data.findings.filter(f => f.severity === 'medium').length;

      if (criticalCount > 0 || highCount > 0) {
        signals.push(this.normalizeSignal({
          name: 'Critical Attack Surface Findings',
          severity: criticalCount > 0 ? 'Critical' : 'High',
          confidence: 100,
          observedAt: detectedDate,
          description: `Discovered ${criticalCount} critical and ${highCount} high-severity attack surface exposures`,
          recommendedAction: 'Review and remediate critical and high-severity attack surface findings immediately',
          rawData: {
            critical_findings: criticalCount,
            high_findings: highCount,
            medium_findings: mediumCount,
            sample_findings: data.findings.slice(0, 5) // First 5 findings for reference
          }
        }));
      }
    }

    // Signal 3: Exposure Severity Score (if present)
    if (data.exposure_score !== undefined) {
      signals.push(this.normalizeSignal({
        name: 'Exposure Severity Score',
        severity: this.calculateSeverityFromExposure(data.exposure_score),
        confidence: 100,
        observedAt: detectedDate,
        description: `Current exposure score: ${data.exposure_score}`,
        recommendedAction: 'Monitor exposure trends and implement security improvements',
        rawData: {
          exposure_score: data.exposure_score,
          score_type: 'continuous',
          vendor_domain: vendorDomain
        }
      }));
    }

    // Signal 4: Insecurity Rating (if present)
    if (data.insecurity_rating !== undefined) {
      signals.push(this.normalizeSignal({
        name: 'Insecurity Rating',
        severity: this.calculateSeverityFromInsecurity(data.insecurity_rating),
        confidence: 100,
        observedAt: detectedDate,
        description: `Insecurity rating: ${data.insecurity_rating}`,
        recommendedAction: 'Address security misconfigurations and vulnerabilities',
        rawData: {
          insecurity_rating: data.insecurity_rating,
          vendor_domain: vendorDomain
        }
      }));
    }

    // Signal 5: Issue Velocity (if present)
    if (data.issue_velocity !== undefined) {
      signals.push(this.normalizeSignal({
        name: 'Issue Velocity',
        severity: this.calculateSeverityFromVelocity(data.issue_velocity),
        confidence: 100,
        observedAt: detectedDate,
        description: `Rate of new security issues: ${data.issue_velocity}`,
        recommendedAction: 'Investigate root cause of accelerating security issues',
        rawData: {
          issue_velocity: data.issue_velocity,
          vendor_domain: vendorDomain
        }
      }));
    }

    return signals;
  }

  /**
   * Calculate severity from RiskRecon grade
   * Grades: A+, A, B+, B, C+, C, D, F
   * @param {string} grade - RiskRecon letter grade
   * @returns {string} Normalized severity level
   */
  calculateSeverity(grade) {
    if (!grade) return 'Medium';

    const g = grade.toUpperCase();

    if (g === 'A+' || g === 'A') return 'Info';      // Low risk - excellent security
    if (g === 'B+' || g === 'B') return 'Low';       // Medium-low risk - good security
    if (g === 'C+' || g === 'C') return 'Medium';    // Medium risk - fair security
    if (g === 'D') return 'High';                     // High risk - poor security
    if (g === 'F') return 'Critical';                // Critical risk - failing security

    return 'Medium'; // Default for unrecognized grades
  }

  /**
   * Calculate severity from exposure score
   * Exposure score: 0-100 (higher = more exposed)
   * @param {number} score - Exposure score
   * @returns {string} Normalized severity level
   */
  calculateSeverityFromExposure(score) {
    if (typeof score !== 'number') return 'Medium';

    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    if (score >= 20) return 'Low';
    return 'Info';
  }

  /**
   * Calculate severity from insecurity rating
   * Insecurity rating: 0-100 (higher = more insecure)
   * @param {number} rating - Insecurity rating
   * @returns {string} Normalized severity level
   */
  calculateSeverityFromInsecurity(rating) {
    if (typeof rating !== 'number') return 'Medium';

    if (rating >= 75) return 'Critical';
    if (rating >= 50) return 'High';
    if (rating >= 25) return 'Medium';
    if (rating >= 10) return 'Low';
    return 'Info';
  }

  /**
   * Calculate severity from issue velocity
   * Velocity: new issues per time period
   * @param {number} velocity - Issue velocity
   * @returns {string} Normalized severity level
   */
  calculateSeverityFromVelocity(velocity) {
    if (typeof velocity !== 'number') return 'Medium';

    if (velocity >= 10) return 'Critical';
    if (velocity >= 5) return 'High';
    if (velocity >= 2) return 'Medium';
    if (velocity >= 1) return 'Low';
    return 'Info';
  }

  /**
   * Get remediation recommendation based on grade
   * @param {string} grade - RiskRecon letter grade
   * @returns {string} Recommendation text
   */
  getGradeRecommendation(grade) {
    if (!grade) return 'Review security posture and address identified issues';

    const g = grade.toUpperCase();

    if (g === 'A+' || g === 'A') {
      return 'Maintain current security practices and monitor for regressions';
    }
    if (g === 'B+' || g === 'B') {
      return 'Continue improving security posture and address remaining issues';
    }
    if (g === 'C+' || g === 'C') {
      return 'Implement comprehensive security improvements and address critical findings';
    }
    if (g === 'D') {
      return 'Immediately address high-severity security issues and implement remediation plan';
    }
    if (g === 'F') {
      return 'CRITICAL: Implement emergency security remediation and engage security leadership';
    }

    return 'Review security posture and address identified issues';
  }

  /**
   * Handle RiskRecon API error responses
   * @param {Response} response - Fetch response object
   * @returns {Promise<Object>} Error object with message
   */
  async handleErrorResponse(response) {
    const status = response.status;
    const statusText = response.statusText;

    try {
      // Try to parse error body
      const errorBody = await response.json();
      return {
        message: errorBody.message || errorBody.error || statusText,
        status,
        details: errorBody
      };
    } catch {
      // No JSON body available
      return { message: `HTTP ${status}: ${statusText}`, status };
    }
  }

  /**
   * Fallback signals when API is unavailable
   * @param {string} vendorDomain - Vendor domain
   * @param {string} vendorId - Internal vendor ID
   * @returns {Array} Fallback signal array
   */
  getFallbackSignals(vendorDomain, vendorId) {
    // Return raw signal object without normalization to preserve confidence: 0
    return [{
      signalName: 'RiskRecon Data Unavailable',
      severity: 'Info',
      confidence: 0,
      observedAt: new Date(),
      description: `Unable to retrieve RiskRecon data for ${vendorDomain}. Please verify credentials and API access.`,
      recommendedAction: 'Verify RiskRecon API credentials and connectivity',
      rawData: {
        vendor_domain: vendorDomain,
        vendor_id: vendorId,
        fallback: true,
        reason: 'API unavailable or credentials invalid'
      }
    }];
  }

  /**
   * Test RiskRecon API connection
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection() {
    try {
      // Get credentials from vault
      const creds = await vault.get(this.organizationId, 'riskrecon');

      if (!creds || !creds.apiKey) {
        return {
          status: 'error',
          message: 'RiskRecon credentials not configured',
          connectorType: this.connectorType,
          configured: false
        };
      }

      // Test API call - fetch a known domain or test endpoint
      const response = await fetch(
        'https://api.riskrecon.com/api/v1/companies/example.com',
        {
          method: 'GET',
          headers: {
            'Authorization': `token=${creds.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        }
      );

      // We expect either 200 (success), 404 (domain not found - API works), or 401 (auth failed)
      if (response.status === 401 || response.status === 403) {
        return {
          status: 'error',
          message: 'Invalid RiskRecon API credentials',
          connectorType: this.connectorType,
          configured: true,
          authenticated: false
        };
      }

      if (response.status >= 500) {
        return {
          status: 'error',
          message: 'RiskRecon service error',
          connectorType: this.connectorType,
          configured: true,
          authenticated: true
        };
      }

      // 200, 404, or other 4xx (except 401/403) means API is accessible
      return {
        status: 'success',
        message: 'RiskRecon API connection successful',
        connectorType: this.connectorType,
        configured: true,
        authenticated: true
      };

    } catch (error) {
      let errorMessage = 'Connection failed';

      if (error.name === 'AbortError') {
        errorMessage = 'Connection timeout';
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Network error - check connectivity';
      }

      return {
        status: 'error',
        message: errorMessage,
        connectorType: this.connectorType,
        error: error.message
      };
    }
  }
}

module.exports = RiskReconConnector;
