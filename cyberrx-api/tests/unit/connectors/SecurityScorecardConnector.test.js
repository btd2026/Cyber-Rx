// Isolated unit tests for SecurityScorecardConnector
// These tests don't require database setup - they test the connector logic only

const SecurityScorecardConnector = require('../../../src/connectors/SecurityScorecardConnector');

describe('SecurityScorecardConnector', () => {
  let connector;
  let mockVault;
  let mockFetch;

  beforeEach(() => {
    // Mock environment
    process.env.NODE_ENV = 'test';

    // Setup connector with test config
    connector = new SecurityScorecardConnector({
      organizationId: 'test-org-123',
      vendorId: 'vendor-123'
    });

    // Mock fetch globally
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Note: vault is mocked per-test by reassigning vault.get on the real
    // module instance (see individual tests). A runtime jest.mock() here would
    // create a separate auto-mocked module that the connector's top-level
    // require() does not share, causing vault.get to never be invoked.
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('collectSignals', () => {
    const mockVendorData = {
      name: 'Test Vendor',
      domain: 'testvendor.com',
      website: 'https://testvendor.com'
    };

    const mockAPIResponse = {
      score: 72,
      grade: 'B',
      industry: 'Technology',
      size: 'Mid-Market',
      score_history: [
        { date: '2024-01-01', score: 70 },
        { date: '2024-02-01', score: 72 }
      ],
      factors: {
        network_security: {
          score: 85,
          grade: 'A',
          variability: 'improving'
        },
        patching_cadence: {
          score: 65,
          grade: 'C',
          variability: 'stable'
        },
        endpoint_protection: {
          score: 78,
          grade: 'B',
          variability: 'stable'
        },
        hacker_chatter: {
          score: 90,
          grade: 'A',
          variability: 'stable'
        },
        leaked_credentials: {
          score: 95,
          grade: 'A',
          count: 0,
          variability: 'stable'
        }
      },
      issues: {
        ssl_certificates: []
      }
    };

    it('should collect signals successfully from API', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAPIResponse
      });

      const vault = require('../../../src/utils/vault');
      vault.get = jest.fn().mockResolvedValue({
        apiKey: 'test-api-key-12345'
      });

      const signals = await connector.collectSignals('vendor-123', 'test-org-123', mockVendorData);

      expect(signals).toBeDefined();
      expect(signals.length).toBeGreaterThan(0);
      expect(signals[0]).toMatchObject({
        vendorName: 'Test Vendor',
        signalCategory: expect.any(String),
        signalName: expect.any(String),
        severity: expect.any(String),
        confidence: 100,
        observedAt: expect.any(String),
        evidenceUrl: expect.stringContaining('testvendor.com'),
        description: expect.any(String),
        recommendedAction: expect.any(String),
        mappedFrameworks: expect.any(Array),
        mappedPolicies: expect.any(Array),
        rawData: expect.any(Object)
      });
    });

    it('should map overall score signal correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAPIResponse
      });

      const vault = require('../../../src/utils/vault');
      vault.get = jest.fn().mockResolvedValue({
        apiKey: 'test-api-key-12345'
      });

      const signals = await connector.collectSignals('vendor-123', 'test-org-123', mockVendorData);

      const overallScore = signals.find(s => s.signalName === 'Overall Security Score');
      expect(overallScore).toBeDefined();
      expect(overallScore.severity).toBe('Low'); // 72 -> Low
      expect(overallScore.rawData.score).toBe(72);
      expect(overallScore.rawData.grade).toBe('B');
    });

    it('should map network security factor correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAPIResponse
      });

      const vault = require('../../../src/utils/vault');
      vault.get = jest.fn().mockResolvedValue({
        apiKey: 'test-api-key-12345'
      });

      const signals = await connector.collectSignals('vendor-123', 'test-org-123', mockVendorData);

      const networkSecurity = signals.find(s => s.signalName === 'Network Security');
      expect(networkSecurity).toBeDefined();
      expect(networkSecurity.signalCategory).toBe('External Attack Surface');
      expect(networkSecurity.rawData.score).toBe(85);
    });

    it('should map patching cadence factor correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAPIResponse
      });

      const vault = require('../../../src/utils/vault');
      vault.get = jest.fn().mockResolvedValue({
        apiKey: 'test-api-key-12345'
      });

      const signals = await connector.collectSignals('vendor-123', 'test-org-123', mockVendorData);

      const patchingCadence = signals.find(s => s.signalName === 'Patching Cadence');
      expect(patchingCadence).toBeDefined();
      expect(patchingCadence.signalCategory).toBe('Vulnerability Management');
      expect(patchingCadence.rawData.score).toBe(65);
    });

    it('should map leaked credentials factor correctly', async () => {
      const responseWithLeaks = {
        ...mockAPIResponse,
        factors: {
          ...mockAPIResponse.factors,
          leaked_credentials: {
            score: 45,
            grade: 'F',
            count: 127,
            variability: 'stable'
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => responseWithLeaks
      });

      const vault = require('../../../src/utils/vault');
      vault.get = jest.fn().mockResolvedValue({
        apiKey: 'test-api-key-12345'
      });

      const signals = await connector.collectSignals('vendor-123', 'test-org-123', mockVendorData);

      const leakedCreds = signals.find(s => s.signalName === 'Leaked Credentials Found');
      expect(leakedCreds).toBeDefined();
      expect(leakedCreds.severity).toBe('Critical');
      expect(leakedCreds.rawData.count).toBe(127);
      expect(leakedCreds.recommendedAction).toContain('Immediately rotate');
    });

    it('should handle missing credentials gracefully', async () => {
      const vault = require('../../../src/utils/vault');
      vault.get = jest.fn().mockResolvedValue(null);

      const signals = await connector.collectSignals('vendor-123', 'test-org-123', mockVendorData);

      expect(signals).toHaveLength(1);
      expect(signals[0].signalName).toBe('SecurityScorecard Unavailable');
      expect(signals[0].severity).toBe('Info');
    });

    it('should handle API errors and return fallback signals', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const vault = require('../../../src/utils/vault');
      vault.get = jest.fn().mockResolvedValue({
        apiKey: 'test-api-key-12345'
      });

      const signals = await connector.collectSignals('vendor-123', 'test-org-123', mockVendorData);

      expect(signals).toHaveLength(1);
      expect(signals[0].signalName).toBe('SecurityScorecard Unavailable');
    });

    it('should handle rate limiting with backoff', async () => {
      // First call: rate limited
      mockFetch.mockRejectedValueOnce(new Error('Rate limited'));

      const vault = require('../../../src/utils/vault');
      vault.get = jest.fn().mockResolvedValue({
        apiKey: 'test-api-key-12345'
      });

      const signals = await connector.collectSignals('vendor-123', 'test-org-123', mockVendorData);

      expect(signals[0].signalName).toBe('SecurityScorecard Unavailable');
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout after 10s'));

      const vault = require('../../../src/utils/vault');
      vault.get = jest.fn().mockResolvedValue({
        apiKey: 'test-api-key-12345'
      });

      const signals = await connector.collectSignals('vendor-123', 'test-org-123', mockVendorData);

      expect(signals[0].signalName).toBe('SecurityScorecard Unavailable');
    });

    it('should extract domain from vendor name when no domain provided', async () => {
      const vault = require('../../../src/utils/vault');
      vault.get = jest.fn().mockResolvedValue(null);

      const signals = await connector.collectSignals('vendor-123', 'test-org-123', {
        name: 'Example Corp'
      });

      // Should use fallback since API credentials not configured
      expect(signals).toHaveLength(1);
      expect(signals[0].vendorName).toBe('Example Corp');
    });
  });

  describe('calculateSeverity', () => {
    it('should map 90+ score to Info', () => {
      expect(connector.calculateSeverity(95)).toBe('Info');
      expect(connector.calculateSeverity(90)).toBe('Info');
    });

    it('should map 70-89 score to Low', () => {
      expect(connector.calculateSeverity(85)).toBe('Low');
      expect(connector.calculateSeverity(70)).toBe('Low');
    });

    it('should map 50-69 score to Medium', () => {
      expect(connector.calculateSeverity(60)).toBe('Medium');
      expect(connector.calculateSeverity(50)).toBe('Medium');
    });

    it('should map 30-49 score to High', () => {
      expect(connector.calculateSeverity(40)).toBe('High');
      expect(connector.calculateSeverity(30)).toBe('High');
    });

    it('should map <30 score to Critical', () => {
      expect(connector.calculateSeverity(25)).toBe('Critical');
      expect(connector.calculateSeverity(0)).toBe('Critical');
    });
  });

  describe('getScoreRecommendation', () => {
    it('should provide appropriate recommendations for each score range', () => {
      expect(connector.getScoreRecommendation(95)).toContain('Maintain');
      expect(connector.getScoreRecommendation(75)).toContain('Monitor');
      expect(connector.getScoreRecommendation(55)).toContain('Review');
      expect(connector.getScoreRecommendation(35)).toContain('Immediate');
      expect(connector.getScoreRecommendation(20)).toContain('Critical');
    });
  });

  describe('getFactorRecommendation', () => {
    it('should provide network security recommendations', () => {
      expect(connector.getFactorRecommendation('network_security', 40))
        .toContain('Review network security');
      expect(connector.getFactorRecommendation('network_security', 80))
        .toContain('Continue monitoring');
    });

    it('should provide patching cadence recommendations', () => {
      expect(connector.getFactorRecommendation('patching_cadence', 45))
        .toContain('automated patching');
      expect(connector.getFactorRecommendation('patching_cadence', 75))
        .toContain('Maintain');
    });

    it('should provide endpoint protection recommendations', () => {
      expect(connector.getFactorRecommendation('endpoint_protection', 35))
        .toContain('Deploy comprehensive');
      expect(connector.getFactorRecommendation('endpoint_protection', 85))
        .toContain('Continue monitoring');
    });
  });

  describe('extractDomain', () => {
    it('should extract domain from full URL', () => {
      expect(connector.extractDomain('https://example.com/path'))
        .toBe('example.com');
      expect(connector.extractDomain('http://example.org'))
        .toBe('example.org');
    });

    it('should return domain if already a domain', () => {
      expect(connector.extractDomain('example.com'))
        .toBe('example.com');
    });

    it('should construct domain from company name', () => {
      expect(connector.extractDomain('Test Company'))
        .toBe('testcompany.com');
      expect(connector.extractDomain('Acme Corp'))
        .toBe('acmecorp.com');
    });

    it('should return null for empty input', () => {
      expect(connector.extractDomain('')).toBeNull();
      expect(connector.extractDomain(null)).toBeNull();
      expect(connector.extractDomain(undefined)).toBeNull();
    });
  });

  describe('handleErrorResponse', () => {
    it('should handle 401 unauthorized', async () => {
      const response = {
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'Invalid API key' })
      };

      const error = await connector.handleErrorResponse(response);
      expect(error.message).toBe('Invalid API key');
    });

    it('should handle 404 not found', async () => {
      const response = {
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Company not found' })
      };

      const error = await connector.handleErrorResponse(response);
      expect(error.message).toBe('Company not found in SecurityScorecard');
    });

    it('should handle 429 rate limit', async () => {
      const response = {
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({ message: 'Rate limit exceeded' })
      };

      const error = await connector.handleErrorResponse(response);
      expect(error.message).toBe('Rate limit exceeded (1000 requests/day)');
    });

    it('should handle 500 server error', async () => {
      const response = {
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Server error' })
      };

      const error = await connector.handleErrorResponse(response);
      expect(error.message).toBe('SecurityScorecard server error');
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ score: 95, grade: 'A' })
      });

      const vault = require('../../../src/utils/vault');
      vault.get = jest.fn().mockResolvedValue({
        apiKey: 'test-api-key-12345'
      });

      const result = await connector.testConnection('test-org-123');

      expect(result.status).toBe('success');
      expect(result.message).toContain('successful');
      expect(result.connectorType).toBe('securityscorecard');
      expect(result.details).toBeDefined();
    });

    it('should return error when credentials not configured', async () => {
      const vault = require('../../../src/utils/vault');
      vault.get = jest.fn().mockResolvedValue(null);

      const result = await connector.testConnection('test-org-123');

      expect(result.status).toBe('error');
      expect(result.message).toContain('not configured');
      expect(result.details.issue).toBe('missing_credentials');
    });

    it('should return error on API failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const vault = require('../../../src/utils/vault');
      vault.get = jest.fn().mockResolvedValue({
        apiKey: 'test-api-key-12345'
      });

      const result = await connector.testConnection('test-org-123');

      expect(result.status).toBe('error');
      expect(result.message).toContain('Connection test failed');
    });

    it('should return error on invalid response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ invalid: 'response' })
      });

      const vault = require('../../../src/utils/vault');
      vault.get = jest.fn().mockResolvedValue({
        apiKey: 'test-api-key-12345'
      });

      const result = await connector.testConnection('test-org-123');

      expect(result.status).toBe('error');
      expect(result.message).toContain('Invalid response');
    });
  });

  describe('fetchWithBackoff', () => {
    it('should retry on rate limiting', async () => {
      let attempts = 0;
      mockFetch.mockImplementation(() => {
        attempts++;
        if (attempts === 1) {
          return Promise.reject(new Error('Rate limited'));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ score: 75, grade: 'B' })
        });
      });

      const result = await connector.fetchWithBackoff(
        'https://api.securityscorecard.com/companies/test.com',
        { method: 'GET', headers: {} }
      );

      expect(attempts).toBe(2);
      expect(result.score).toBe(75);
    });

    it('should retry on network errors', async () => {
      let attempts = 0;
      mockFetch.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ score: 80, grade: 'B' })
        });
      });

      const result = await connector.fetchWithBackoff(
        'https://api.securityscorecard.com/companies/test.com',
        { method: 'GET', headers: {} },
        3
      );

      expect(attempts).toBe(3);
      expect(result.score).toBe(80);
    });

    it('should throw error after max retries', async () => {
      mockFetch.mockImplementation(() =>
        Promise.reject(new Error('Persistent error'))
      );

      await expect(
        connector.fetchWithBackoff(
          'https://api.securityscorecard.com/companies/test.com',
          { method: 'GET', headers: {} },
          2
        )
      ).rejects.toThrow('Persistent error');
    });
  });
});
