'use strict';

/**
 * BitSight Connector Unit Tests (Standalone)
 *
 * These tests don't require database setup and can run independently
 * to verify the BitSight connector implementation logic.
 */

// Mock dependencies before importing
jest.mock('../../../src/utils/vault', () => ({
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn()
}));

const BitSightConnector = require('../../../src/connectors/BitSightConnector');
const vault = require('../../../src/utils/vault');

// Mock global fetch
global.fetch = jest.fn();

describe('BitSightConnector (Standalone Tests)', () => {
  let connector;
  let mockConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    mockConfig = {
      organizationId: 'org-123',
      vendorId: 'vendor-456',
      timeout: 10000,
      rateLimitDelay: 1000
    };

    connector = new BitSightConnector(mockConfig);

    // Default vault mock - return valid credentials
    vault.get.mockResolvedValue({
      apiKey: 'test-api-key-12345'
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with correct configuration', () => {
      expect(connector.connectorType).toBe('bitsight');
      expect(connector.sourceType).toBe('api');
      expect(connector.baseUrl).toBe('https://api.bitsighttech.com/ratings/v1');
      expect(connector.timeout).toBe(10000);
      expect(connector.rateLimitDelay).toBe(1000);
      expect(connector.organizationId).toBe('org-123');
      expect(connector.vendorId).toBe('vendor-456');
    });

    test('should accept custom timeout and rate limit delay', () => {
      const customConnector = new BitSightConnector({
        organizationId: 'org-123',
        timeout: 20000,
        rateLimitDelay: 2000
      });

      expect(customConnector.timeout).toBe(20000);
      expect(customConnector.rateLimitDelay).toBe(2000);
    });
  });

  describe('collectSignals', () => {
    test('should collect signals from BitSight API successfully', async () => {
      const mockBitSightResponse = {
        company_name: 'Test Company',
        grade: 'B',
        score: 720,
        vector_score: 715,
        rating_date: '2026-05-31',
        industry: 'Healthcare',
        industry_average: 680,
        compromises: [],
        vulnerabilities: {
          count: 15,
          critical: 0,
          high: 5,
          severity_breakdown: {
            critical: 0,
            high: 5,
            medium: 7,
            low: 3
          }
        },
        patching_speed: 25,
        patching_percentile: 65
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockBitSightResponse
      });

      const signals = await connector.collectSignals('testcompany.com', 'vendor-456', 'org-123');

      expect(signals).toHaveLength(3); // Grade, vulnerabilities, patching
      expect(signals[0].signalName).toBe('BitSight Security Grade');
      expect(signals[0].severity).toBe('Low');
      expect(signals[0].vendorName).toBe('Test Company');
      expect(signals[0].confidence).toBe(100);
      expect(signals[0].signalCategory).toBe('External Attack Surface');
      expect(signals[0].mappedFrameworks).toEqual(['NIST-A.5.19', 'HIPAA-SA-9']);
      expect(signals[0].mappedPolicies).toEqual(['Third-Party Risk Policy']);

      expect(vault.get).toHaveBeenCalledWith('org-123', 'bitsight');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.bitsighttech.com/ratings/v1/companies/testcompany.com',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key-12345',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          })
        })
      );
    });

    test('should handle A+ grade as Info severity', async () => {
      const mockBitSightResponse = {
        company_name: 'Excellent Security Corp',
        grade: 'A+',
        score: 850,
        compromises: [],
        vulnerabilities: { count: 0 }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockBitSightResponse
      });

      const signals = await connector.collectSignals('excellent.com', 'vendor-456', 'org-123');

      expect(signals[0].severity).toBe('Info');
      expect(signals[0].recommendedAction).toContain('acceptable security posture');
    });

    test('should handle F grade as Critical severity', async () => {
      const mockBitSightResponse = {
        company_name: 'Poor Security Corp',
        grade: 'F',
        score: 350,
        compromises: [],
        vulnerabilities: { count: 0 }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockBitSightResponse
      });

      const signals = await connector.collectSignals('poor.com', 'vendor-456', 'org-123');

      expect(signals[0].severity).toBe('Critical');
      expect(signals[0].recommendedAction).toContain('URGENT');
    });

    test('should handle compromise history signals', async () => {
      const mockBitSightResponse = {
        company_name: 'Compromised Vendor',
        grade: 'C',
        score: 620,
        compromises: [
          { date: '2026-04-15', type: 'Botnet' },
          { date: '2026-02-20', type: 'Malware' },
          { date: '2025-11-10', type: 'Phishing' }
        ],
        vulnerabilities: { count: 0 }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockBitSightResponse
      });

      const signals = await connector.collectSignals('compromised.com', 'vendor-456', 'org-123');

      const compromiseSignal = signals.find(s => s.signalName === 'Compromise History');
      expect(compromiseSignal).toBeDefined();
      expect(compromiseSignal.signalCategory).toBe('Breach/Incident Intelligence');
      expect(compromiseSignal.severity).toBe('Critical'); // Recent compromise
      expect(compromiseSignal.rawData.compromises).toHaveLength(3);
      expect(compromiseSignal.rawData.total_compromises).toBe(3);
    });

    test('should handle missing credentials gracefully', async () => {
      vault.get.mockResolvedValue(null);

      const signals = await connector.collectSignals('test.com', 'vendor-456', 'org-123');

      expect(signals).toHaveLength(1);
      expect(signals[0].signalName).toBe('BitSight Security Rating');
      expect(signals[0].severity).toBe('Medium');
      expect(signals[0].confidence).toBe(50);
      expect(signals[0].rawData.fallback).toBe(true);
      expect(signals[0].rawData.reason).toContain('API unavailable');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('should handle API error responses', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Company not found' })
      });

      const signals = await connector.collectSignals('notfound.com', 'vendor-456', 'org-123');

      expect(signals).toHaveLength(1);
      expect(signals[0].rawData.fallback).toBe(true);
    });

    test('should handle 401 unauthorized error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'Invalid API key' })
      });

      const signals = await connector.collectSignals('test.com', 'vendor-456', 'org-123');

      expect(signals[0].rawData.fallback).toBe(true);
    });

    test('should handle network timeout', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'AbortError';
      global.fetch.mockRejectedValueOnce(timeoutError);

      const signals = await connector.collectSignals('test.com', 'vendor-456', 'org-123');

      expect(signals).toHaveLength(1);
      expect(signals[0].rawData.fallback).toBe(true);
    });

    test('should validate response and reject invalid data', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ irrelevant: 'data' }) // Missing grade and score
      });

      const signals = await connector.collectSignals('test.com', 'vendor-456', 'org-123');

      expect(signals).toHaveLength(1);
      expect(signals[0].rawData.fallback).toBe(true);
    });
  });

  describe('calculateSeverity', () => {
    test('should map grades to correct severities', () => {
      expect(connector.calculateSeverity({ grade: 'A+', score: 850 })).toBe('Info');
      expect(connector.calculateSeverity({ grade: 'A', score: 820 })).toBe('Info');
      expect(connector.calculateSeverity({ grade: 'B+', score: 750 })).toBe('Low');
      expect(connector.calculateSeverity({ grade: 'B', score: 720 })).toBe('Low');
      expect(connector.calculateSeverity({ grade: 'C+', score: 650 })).toBe('Medium');
      expect(connector.calculateSeverity({ grade: 'C', score: 620 })).toBe('Medium');
      expect(connector.calculateSeverity({ grade: 'D', score: 550 })).toBe('High');
      expect(connector.calculateSeverity({ grade: 'F', score: 350 })).toBe('Critical');
    });

    test('should map scores to correct severities when grade not available', () => {
      expect(connector.calculateSeverity({ score: 850 })).toBe('Info');
      expect(connector.calculateSeverity({ score: 720 })).toBe('Low');
      expect(connector.calculateSeverity({ score: 650 })).toBe('Medium');
      expect(connector.calculateSeverity({ score: 550 })).toBe('High');
      expect(connector.calculateSeverity({ score: 350 })).toBe('Critical');
    });

    test('should return Medium as default severity', () => {
      expect(connector.calculateSeverity({})).toBe('Medium');
    });
  });

  describe('calculateSeverityFromVulns', () => {
    test('should calculate severity from vulnerability counts', () => {
      expect(
        connector.calculateSeverityFromVulns({ count: 200, critical: 15, high: 60 })
      ).toBe('Critical');

      expect(
        connector.calculateSeverityFromVulns({ count: 50, critical: 2, high: 25 })
      ).toBe('High');

      expect(
        connector.calculateSeverityFromVulns({ count: 120, critical: 0, high: 10 })
      ).toBe('Medium');

      expect(
        connector.calculateSeverityFromVulns({ count: 5, critical: 0, high: 0 })
      ).toBe('Low');

      expect(
        connector.calculateSeverityFromVulns({ count: 0 })
      ).toBe('Info');
    });

    test('should handle missing vulnerability data', () => {
      expect(connector.calculateSeverityFromVulns({})).toBe('Info');
      expect(connector.calculateSeverityFromVulns(null)).toBe('Info');
    });
  });

  describe('calculateSeverityFromPatching', () => {
    test('should calculate severity from patching speed', () => {
      expect(connector.calculateSeverityFromPatching(120)).toBe('Critical');
      expect(connector.calculateSeverityFromPatching(75)).toBe('High');
      expect(connector.calculateSeverityFromPatching(45)).toBe('Medium');
      expect(connector.calculateSeverityFromPatching(20)).toBe('Low');
      expect(connector.calculateSeverityFromPatching(7)).toBe('Info');
      expect(connector.calculateSeverityFromPatching(null)).toBe('Critical');
      expect(connector.calculateSeverityFromPatching(undefined)).toBe('Critical');
    });
  });

  describe('calculateSeverityFromScore', () => {
    test('should map scores to severities', () => {
      expect(connector.calculateSeverityFromScore(850)).toBe('Info');
      expect(connector.calculateSeverityFromScore(720)).toBe('Low');
      expect(connector.calculateSeverityFromScore(650)).toBe('Medium');
      expect(connector.calculateSeverityFromScore(550)).toBe('High');
      expect(connector.calculateSeverityFromScore(350)).toBe('Critical');
      expect(connector.calculateSeverityFromScore(null)).toBe('Medium');
      expect(connector.calculateSeverityFromScore(undefined)).toBe('Medium');
    });
  });

  describe('getCompromiseSeverity', () => {
    test('should calculate severity from compromise history', () => {
      const now = Date.now();

      // Recent compromise (< 90 days)
      const recentCompromises = [
        { date: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString() }
      ];
      expect(connector.getCompromiseSeverity(recentCompromises)).toBe('Critical');

      // Many historical compromises
      const manyCompromises = Array(10).fill().map((_, i) => ({
        date: new Date(now - (200 + i * 30) * 24 * 60 * 60 * 1000).toISOString()
      }));
      expect(connector.getCompromiseSeverity(manyCompromises)).toBe('High');

      // Few historical compromises
      const fewCompromises = [
        { date: new Date(now - 180 * 24 * 60 * 60 * 1000).toISOString() },
        { date: new Date(now - 210 * 24 * 60 * 60 * 1000).toISOString() }
      ];
      expect(connector.getCompromiseSeverity(fewCompromises)).toBe('Medium');

      // Single historical compromise
      const singleCompromise = [
        { date: new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString() }
      ];
      expect(connector.getCompromiseSeverity(singleCompromise)).toBe('Low');

      // No compromises
      expect(connector.getCompromiseSeverity([])).toBe('Info');
    });

    test('should handle missing dates in compromise array', () => {
      const compromsWithMissingDates = [
        { type: 'Botnet' },
        { date: '2020-01-01' }
      ];
      // Should not crash, default to treating as old
      expect(connector.getCompromiseSeverity(compromsWithMissingDates)).toBe('Low');
    });
  });

  describe('getRecommendedAction', () => {
    test('should provide appropriate actions for each grade', () => {
      const urgentAction = connector.getRecommendedAction({ grade: 'F' });
      expect(urgentAction).toContain('URGENT');
      expect(urgentAction).toContain('Immediate');

      const reviewAction = connector.getRecommendedAction({ grade: 'C' });
      expect(reviewAction).toContain('Review');
      expect(reviewAction).toContain('remediation plan');

      const monitorAction = connector.getRecommendedAction({ grade: 'B' });
      expect(monitorAction).toContain('Monitor');

      const continueAction = connector.getRecommendedAction({ grade: 'A' });
      expect(continueAction).toContain('Continue monitoring');
      expect(continueAction).toContain('acceptable');
    });

    test('should provide appropriate actions for scores', () => {
      expect(connector.getRecommendedAction({ score: 350 })).toContain('URGENT');
      expect(connector.getRecommendedAction({ score: 550 })).toContain('Review');
      expect(connector.getRecommendedAction({ score: 650 })).toContain('Monitor');
      expect(connector.getRecommendedAction({ score: 800 })).toContain('Continue');
    });

    test('should handle missing data', () => {
      const defaultAction = connector.getRecommendedAction({});
      expect(defaultAction).toContain('Review');
    });
  });

  describe('handleErrorResponse', () => {
    test('should map HTTP error codes to messages', async () => {
      const badRequest = await connector.handleErrorResponse({ status: 400, statusText: 'Bad Request' });
      expect(badRequest.message).toContain('Bad request');

      const unauthorized = await connector.handleErrorResponse({ status: 401, statusText: 'Unauthorized' });
      expect(unauthorized.message).toContain('Invalid BitSight API key');

      const forbidden = await connector.handleErrorResponse({ status: 403, statusText: 'Forbidden' });
      expect(forbidden.message).toContain('insufficient permissions');

      const notFound = await connector.handleErrorResponse({ status: 404, statusText: 'Not Found' });
      expect(notFound.message).toContain('not found');

      const rateLimit = await connector.handleErrorResponse({ status: 429, statusText: 'Too Many Requests' });
      expect(rateLimit.message).toContain('Rate limit');

      const serverError = await connector.handleErrorResponse({ status: 500, statusText: 'Internal Server Error' });
      expect(serverError.message).toContain('server error');
    });

    test('should parse error response body when available', async () => {
      const mockResponse = {
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Custom error from API' })
      };

      const error = await connector.handleErrorResponse(mockResponse);
      expect(error.message).toBe('Custom error from API');
    });

    test('should handle JSON parsing errors in response', async () => {
      const mockResponse = {
        status: 400,
        statusText: 'Bad Request',
        json: async () => { throw new Error('Invalid JSON'); }
      };

      const error = await connector.handleErrorResponse(mockResponse);
      expect(error.message).toContain('HTTP 400');
    });
  });

  describe('testConnection', () => {
    test('should return success for valid credentials', async () => {
      global.fetch.mockResolvedValueOnce({
        status: 404, // 404 is expected for example.com
        statusText: 'Not Found'
      });

      const result = await connector.testConnection();

      expect(result.status).toBe('success');
      expect(result.message).toContain('successful');
      expect(result.connectorType).toBe('bitsight');
    });

    test('should return error for invalid API key', async () => {
      global.fetch.mockResolvedValueOnce({
        status: 401,
        statusText: 'Unauthorized'
      });

      const result = await connector.testConnection();

      expect(result.status).toBe('error');
      expect(result.message).toContain('Invalid BitSight API key');
    });

    test('should return error for forbidden access', async () => {
      global.fetch.mockResolvedValueOnce({
        status: 403,
        statusText: 'Forbidden'
      });

      const result = await connector.testConnection();

      expect(result.status).toBe('error');
      expect(result.message).toContain('insufficient permissions');
    });

    test('should return error when credentials not configured', async () => {
      vault.get.mockResolvedValue(null);

      const result = await connector.testConnection();

      expect(result.status).toBe('error');
      expect(result.message).toContain('not configured');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('should handle network errors during connection test', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await connector.testConnection();

      expect(result.status).toBe('error');
      expect(result.message).toContain('Connection test failed');
    });
  });

  describe('mapBitSightToSignals', () => {
    test('should map complete BitSight response to multiple signals', () => {
      const mockBitSightData = {
        company_name: 'Complete Data Corp',
        grade: 'B',
        score: 720,
        vector_score: 715,
        rating_date: '2026-05-31',
        industry: 'Healthcare',
        industry_average: 680,
        compromises: [
          { date: '2025-01-15', type: 'Botnet' }
        ],
        vulnerabilities: {
          count: 25,
          critical: 1,
          high: 10,
          severity_breakdown: { critical: 1, high: 10, medium: 10, low: 4 }
        },
        patching_speed: 35,
        patching_percentile: 70,
        network_security: {
          score: 750,
          grade: 'B+'
        }
      };

      const signals = connector.mapBitSightToSignals(mockBitSightData, 'completedata.com', 'vendor-456');

      expect(signals).toHaveLength(5); // All signals present

      const gradeSignal = signals.find(s => s.signalName === 'BitSight Security Grade');
      expect(gradeSignal).toBeDefined();
      expect(gradeSignal.severity).toBe('Low');
      expect(gradeSignal.rawData.industry).toBe('Healthcare');
      expect(gradeSignal.rawData.industry_average).toBe(680);

      const compromiseSignal = signals.find(s => s.signalName === 'Compromise History');
      expect(compromiseSignal).toBeDefined();
      expect(compromiseSignal.signalCategory).toBe('Breach/Incident Intelligence');
      expect(compromiseSignal.mappedFrameworks).toContain('NIST-A.10.1');

      const vulnSignal = signals.find(s => s.signalName === 'Vulnerability Findings');
      expect(vulnSignal).toBeDefined();
      expect(vulnSignal.signalCategory).toBe('Vulnerability Management');
      expect(vulnSignal.rawData.count).toBe(25);

      const patchingSignal = signals.find(s => s.signalName === 'Patching Cadence');
      expect(patchingSignal).toBeDefined();
      expect(patchingSignal.rawData.patching_speed).toBe(35);

      const networkSignal = signals.find(s => s.signalName === 'Network Security Posture');
      expect(networkSignal).toBeDefined();
      expect(networkSignal.rawData.score).toBe(750);
    });

    test('should handle minimal BitSight response', () => {
      const minimalData = {
        company_name: 'Minimal Corp',
        grade: 'A',
        score: 830
      };

      const signals = connector.mapBitSightToSignals(minimalData, 'minimal.com', 'vendor-456');

      expect(signals).toHaveLength(1); // Only grade signal
      expect(signals[0].signalName).toBe('BitSight Security Grade');
      expect(signals[0].severity).toBe('Info');
    });

    test('should handle response with only vulnerabilities', () => {
      const vulnOnlyData = {
        company_name: 'Vuln Corp',
        grade: 'C',
        score: 620,
        vulnerabilities: {
          count: 100,
          critical: 5,
          high: 20,
          severity_breakdown: { critical: 5, high: 20, medium: 50, low: 25 }
        }
      };

      const signals = connector.mapBitSightToSignals(vulnOnlyData, 'vulncorp.com', 'vendor-456');

      expect(signals).toHaveLength(2); // Grade + vulnerabilities
      const vulnSignal = signals.find(s => s.signalName === 'Vulnerability Findings');
      expect(vulnSignal).toBeDefined();
      expect(vulnSignal.severity).toBe('Critical'); // 5 critical vulns
    });
  });

  describe('getFallbackSignals', () => {
    test('should return fallback signals with correct structure', () => {
      const fallbackSignals = connector.getFallbackSignals('test.com', 'vendor-456');

      expect(fallbackSignals).toHaveLength(1);
      expect(fallbackSignals[0].signalName).toBe('BitSight Security Rating');
      expect(fallbackSignals[0].severity).toBe('Medium');
      expect(fallbackSignals[0].confidence).toBe(50);
      expect(fallbackSignals[0].rawData.fallback).toBe(true);
      expect(fallbackSignals[0].rawData.reason).toContain('API unavailable');
      expect(fallbackSignals[0].recommendedAction).toContain('Manually verify');
      expect(fallbackSignals[0].mappedFrameworks).toEqual(['NIST-A.5.19', 'HIPAA-SA-9']);
    });
  });

  describe('sleep utility', () => {
    test('should resolve after specified milliseconds', async () => {
      const start = Date.now();
      await connector.sleep(100);
      const end = Date.now();
      // Allow a small scheduling tolerance: setTimeout may fire a fraction of a
      // millisecond early (e.g. 99.x ms) due to timer rounding, but the call
      // must still introduce a real, substantial delay.
      expect(end - start).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    test('should handle null vendor domain', async () => {
      const signals = await connector.collectSignals(null, 'vendor-456', 'org-123');
      expect(signals).toBeDefined();
    });

    test('should handle empty vendor domain', async () => {
      const signals = await connector.collectSignals('', 'vendor-456', 'org-123');
      expect(signals).toBeDefined();
    });

    test('should handle special characters in vendor domain', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ grade: 'B', score: 720, compromises: [], vulnerabilities: { count: 0 } })
      });

      const signals = await connector.collectSignals('test-company.com', 'vendor-456', 'org-123');
      expect(signals).toBeDefined();
    });

    test('should handle very large compromise array', () => {
      const manyCompromises = Array(100).fill().map((_, i) => ({
        date: `202${i % 10}-01-01`,
        type: 'Botnet'
      }));

      const severity = connector.getCompromiseSeverity(manyCompromises);
      expect(severity).toBe('High');
    });

    test('should handle zero score', () => {
      const severity = connector.calculateSeverity({ score: 0 });
      expect(severity).toBe('Critical');
    });

    test('should handle extremely high score', () => {
      const severity = connector.calculateSeverity({ score: 1000 });
      expect(severity).toBe('Info');
    });
  });

  describe('Integration with BaseConnector', () => {
    test('should extend BaseConnector properly', () => {
      expect(connector.constructor.name).toBe('BitSightConnector');
      expect(connector.connectorType).toBeDefined();
      expect(connector.sourceType).toBeDefined();
    });

    test('should have all required methods', () => {
      expect(typeof connector.collectSignals).toBe('function');
      expect(typeof connector.testConnection).toBe('function');
      expect(typeof connector.mapBitSightToSignals).toBe('function');
      expect(typeof connector.calculateSeverity).toBe('function');
    });
  });
});
