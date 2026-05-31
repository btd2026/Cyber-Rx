const RiskReconConnector = require('../../../src/connectors/RiskReconConnector');
const vault = require('../../../src/utils/vault');

// Mock the vault module
jest.mock('../../../src/utils/vault', () => ({
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn()
}));

// Mock fetch globally
global.fetch = jest.fn();

// Prevent test database setup
jest.mock('../../../src/models/VendorRiskSignal', () => ({
  create: jest.fn()
}));

describe('RiskReconConnector', () => {
  let connector;
  let mockConfig;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    mockConfig = {
      organizationId: 'org-123',
      vendorId: 'vendor-456',
      connectorType: 'riskrecon'
    };

    connector = new RiskReconConnector(mockConfig);
  });

  describe('Constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(connector.connectorType).toBe('riskrecon');
      expect(connector.sourceType).toBe('api');
      expect(connector.organizationId).toBe('org-123');
      expect(connector.vendorId).toBe('vendor-456');
    });
  });

  describe('collectSignals', () => {
    const vendorDomain = 'example.com';
    const vendorId = 'vendor-456';
    const organizationId = 'org-123';

    it('should successfully collect and map RiskRecon signals', async () => {
      // Mock credentials
      vault.get.mockResolvedValue({
        apiKey: 'test-api-key-123'
      });

      // Mock RiskRecon API response
      const mockRiskReconResponse = {
        grade: 'B',
        last_observed: '2026-05-30T12:00:00Z',
        exposure_score: 55,
        insecurity_rating: 40,
        issue_velocity: 3,
        findings: [
          { severity: 'critical', name: 'Exposed Port', description: 'Port 22 open' },
          { severity: 'high', name: 'SSL Misconfiguration', description: 'Weak cipher' },
          { severity: 'medium', name: 'DNS Issue', description: 'Missing SPF' }
        ]
      };

      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockRiskReconResponse
      });

      const signals = await connector.collectSignals(vendorDomain, vendorId, organizationId);

      // Verify vault was called
      expect(vault.get).toHaveBeenCalledWith(organizationId, 'riskrecon');

      // Verify fetch was called correctly
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.riskrecon.com/api/v1/companies/example.com',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'token=test-api-key-123',
            'Content-Type': 'application/json'
          })
        })
      );

      // Verify signals are returned
      expect(signals).toBeInstanceOf(Array);
      expect(signals.length).toBeGreaterThan(0);
      expect(signals.length).toBe(5); // grade, findings, exposure, insecurity, velocity

      // Verify grade signal
      const gradeSignal = signals.find(s => s.signalName === 'RiskRecon Security Grade');
      expect(gradeSignal).toBeDefined();
      expect(gradeSignal.severity).toBe('Low'); // B grade maps to Low

      // Verify findings signal
      const findingsSignal = signals.find(s => s.signalName === 'Critical Attack Surface Findings');
      expect(findingsSignal).toBeDefined();
      expect(findingsSignal.severity).toBe('Critical'); // Has critical findings

      // Verify exposure signal
      const exposureSignal = signals.find(s => s.signalName === 'Exposure Severity Score');
      expect(exposureSignal).toBeDefined();
      expect(exposureSignal.severity).toBe('High'); // Score 55 maps to High
    });

    it('should handle A+ grade correctly (Info severity)', async () => {
      vault.get.mockResolvedValue({ apiKey: 'test-key' });
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ grade: 'A+', last_observed: '2026-05-30T12:00:00Z' })
      });

      const signals = await connector.collectSignals(vendorDomain, vendorId, organizationId);
      const gradeSignal = signals.find(s => s.signalName === 'RiskRecon Security Grade');

      expect(gradeSignal.severity).toBe('Info');
      expect(gradeSignal.confidence).toBe(100);
    });

    it('should handle F grade correctly (Critical severity)', async () => {
      vault.get.mockResolvedValue({ apiKey: 'test-key' });
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ grade: 'F', last_observed: '2026-05-30T12:00:00Z' })
      });

      const signals = await connector.collectSignals(vendorDomain, vendorId, organizationId);
      const gradeSignal = signals.find(s => s.signalName === 'RiskRecon Security Grade');

      expect(gradeSignal.severity).toBe('Critical');
    });

    it('should handle missing credentials with fallback signals', async () => {
      vault.get.mockResolvedValue(null);

      const signals = await connector.collectSignals(vendorDomain, vendorId, organizationId);

      expect(signals).toHaveLength(1);
      expect(signals[0].signalName).toBe('RiskRecon Data Unavailable');
      expect(signals[0].severity).toBe('Info');
      expect(signals[0].confidence).toBe(0);
    });

    it('should handle 404 error (company not found) gracefully', async () => {
      vault.get.mockResolvedValue({ apiKey: 'test-key' });
      global.fetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Company not found' })
      });

      const signals = await connector.collectSignals(vendorDomain, vendorId, organizationId);

      // Should return fallback signals instead of throwing
      expect(signals).toHaveLength(1);
      expect(signals[0].signalName).toBe('RiskRecon Data Unavailable');
    });

    it('should handle 401 error (invalid credentials) gracefully', async () => {
      vault.get.mockResolvedValue({ apiKey: 'invalid-key' });
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'Invalid token' })
      });

      const signals = await connector.collectSignals(vendorDomain, vendorId, organizationId);

      expect(signals).toHaveLength(1);
      expect(signals[0].signalName).toBe('RiskRecon Data Unavailable');
    });

    it('should handle 429 error (rate limit) gracefully', async () => {
      vault.get.mockResolvedValue({ apiKey: 'test-key' });
      global.fetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({ message: 'Rate limit exceeded' })
      });

      const signals = await connector.collectSignals(vendorDomain, vendorId, organizationId);

      expect(signals).toHaveLength(1);
      expect(signals[0].signalName).toBe('RiskRecon Data Unavailable');
    });

    it('should handle network timeout gracefully', async () => {
      vault.get.mockResolvedValue({ apiKey: 'test-key' });

      // Mock AbortError for timeout
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'AbortError';
      global.fetch.mockRejectedValue(timeoutError);

      const signals = await connector.collectSignals(vendorDomain, vendorId, organizationId);

      expect(signals).toHaveLength(1);
      expect(signals[0].signalName).toBe('RiskRecon Data Unavailable');
    });

    it('should handle invalid API response (missing grade)', async () => {
      vault.get.mockResolvedValue({ apiKey: 'test-key' });
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: 'some data' }) // Missing grade field
      });

      const signals = await connector.collectSignals(vendorDomain, vendorId, organizationId);

      expect(signals).toHaveLength(1);
      expect(signals[0].signalName).toBe('RiskRecon Data Unavailable');
    });

    it('should handle empty findings array', async () => {
      vault.get.mockResolvedValue({ apiKey: 'test-key' });
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          grade: 'A',
          last_observed: '2026-05-30T12:00:00Z',
          findings: []
        })
      });

      const signals = await connector.collectSignals(vendorDomain, vendorId, organizationId);

      // Should not have findings signal
      const findingsSignal = signals.find(s => s.signalName === 'Critical Attack Surface Findings');
      expect(findingsSignal).toBeUndefined();

      // Should still have grade signal
      const gradeSignal = signals.find(s => s.signalName === 'RiskRecon Security Grade');
      expect(gradeSignal).toBeDefined();
    });
  });

  describe('calculateSeverity', () => {
    it('should map grades correctly', () => {
      expect(connector.calculateSeverity('A+')).toBe('Info');
      expect(connector.calculateSeverity('A')).toBe('Info');
      expect(connector.calculateSeverity('B+')).toBe('Low');
      expect(connector.calculateSeverity('B')).toBe('Low');
      expect(connector.calculateSeverity('C+')).toBe('Medium');
      expect(connector.calculateSeverity('C')).toBe('Medium');
      expect(connector.calculateSeverity('D')).toBe('High');
      expect(connector.calculateSeverity('F')).toBe('Critical');
    });

    it('should handle case-insensitive grades', () => {
      expect(connector.calculateSeverity('a+')).toBe('Info');
      expect(connector.calculateSeverity('b')).toBe('Low');
      expect(connector.calculateSeverity('f')).toBe('Critical');
    });

    it('should return Medium for unknown grades', () => {
      expect(connector.calculateSeverity('X')).toBe('Medium');
      expect(connector.calculateSeverity('')).toBe('Medium');
      expect(connector.calculateSeverity(null)).toBe('Medium');
      expect(connector.calculateSeverity(undefined)).toBe('Medium');
    });
  });

  describe('calculateSeverityFromExposure', () => {
    it('should map exposure scores correctly', () => {
      expect(connector.calculateSeverityFromExposure(90)).toBe('Critical');
      expect(connector.calculateSeverityFromExposure(80)).toBe('Critical');
      expect(connector.calculateSeverityFromExposure(70)).toBe('High');
      expect(connector.calculateSeverityFromExposure(60)).toBe('High');
      expect(connector.calculateSeverityFromExposure(50)).toBe('Medium');
      expect(connector.calculateSeverityFromExposure(30)).toBe('Medium');
      expect(connector.calculateSeverityFromExposure(20)).toBe('Low');
      expect(connector.calculateSeverityFromExposure(10)).toBe('Info');
      expect(connector.calculateSeverityFromExposure(0)).toBe('Info');
    });

    it('should handle invalid inputs', () => {
      expect(connector.calculateSeverityFromExposure('invalid')).toBe('Medium');
      expect(connector.calculateSeverityFromExposure(null)).toBe('Medium');
      expect(connector.calculateSeverityFromExposure(undefined)).toBe('Medium');
    });
  });

  describe('calculateSeverityFromInsecurity', () => {
    it('should map insecurity ratings correctly', () => {
      expect(connector.calculateSeverityFromInsecurity(90)).toBe('Critical');
      expect(connector.calculateSeverityFromInsecurity(75)).toBe('Critical');
      expect(connector.calculateSeverityFromInsecurity(60)).toBe('High');
      expect(connector.calculateSeverityFromInsecurity(50)).toBe('High');
      expect(connector.calculateSeverityFromInsecurity(35)).toBe('Medium');
      expect(connector.calculateSeverityFromInsecurity(25)).toBe('Medium');
      expect(connector.calculateSeverityFromInsecurity(15)).toBe('Low');
      expect(connector.calculateSeverityFromInsecurity(5)).toBe('Info');
    });

    it('should handle invalid inputs', () => {
      expect(connector.calculateSeverityFromInsecurity('invalid')).toBe('Medium');
      expect(connector.calculateSeverityFromInsecurity(null)).toBe('Medium');
    });
  });

  describe('calculateSeverityFromVelocity', () => {
    it('should map issue velocities correctly', () => {
      expect(connector.calculateSeverityFromVelocity(15)).toBe('Critical');
      expect(connector.calculateSeverityFromVelocity(10)).toBe('Critical');
      expect(connector.calculateSeverityFromVelocity(7)).toBe('High');
      expect(connector.calculateSeverityFromVelocity(5)).toBe('High');
      expect(connector.calculateSeverityFromVelocity(3)).toBe('Medium');
      expect(connector.calculateSeverityFromVelocity(2)).toBe('Medium');
      expect(connector.calculateSeverityFromVelocity(1)).toBe('Low');
      expect(connector.calculateSeverityFromVelocity(0)).toBe('Info');
    });

    it('should handle invalid inputs', () => {
      expect(connector.calculateSeverityFromVelocity('invalid')).toBe('Medium');
      expect(connector.calculateSeverityFromVelocity(null)).toBe('Medium');
    });
  });

  describe('getGradeRecommendation', () => {
    it('should provide appropriate recommendations for each grade', () => {
      expect(connector.getGradeRecommendation('A')).toContain('Maintain');
      expect(connector.getGradeRecommendation('B')).toContain('Continue improving');
      expect(connector.getGradeRecommendation('C')).toContain('comprehensive security');
      expect(connector.getGradeRecommendation('D')).toContain('Immediately address');
      expect(connector.getGradeRecommendation('F')).toContain('CRITICAL');
    });

    it('should handle null/undefined grades', () => {
      expect(connector.getGradeRecommendation(null)).toContain('Review security posture');
      expect(connector.getGradeRecommendation(undefined)).toContain('Review security posture');
    });
  });

  describe('testConnection', () => {
    it('should return success for valid credentials', async () => {
      vault.get.mockResolvedValue({ apiKey: 'valid-key' });
      global.fetch.mockResolvedValue({
        ok: false, // 404 expected for test domain
        status: 404,
        statusText: 'Not Found'
      });

      const result = await connector.testConnection();

      expect(result.status).toBe('success');
      expect(result.configured).toBe(true);
      expect(result.authenticated).toBe(true);
      expect(result.message).toContain('successful');
    });

    it('should return error for invalid credentials (401)', async () => {
      vault.get.mockResolvedValue({ apiKey: 'invalid-key' });
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      const result = await connector.testConnection();

      expect(result.status).toBe('error');
      expect(result.configured).toBe(true);
      expect(result.authenticated).toBe(false);
      expect(result.message).toContain('Invalid credentials');
    });

    it('should return error for missing credentials', async () => {
      vault.get.mockResolvedValue(null);

      const result = await connector.testConnection();

      expect(result.status).toBe('error');
      expect(result.configured).toBe(false);
      expect(result.message).toContain('not configured');
    });

    it('should handle network timeout', async () => {
      vault.get.mockResolvedValue({ apiKey: 'test-key' });

      const timeoutError = new Error('Connection timeout');
      timeoutError.name = 'AbortError';
      global.fetch.mockRejectedValue(timeoutError);

      const result = await connector.testConnection();

      expect(result.status).toBe('error');
      expect(result.message).toContain('timeout');
    });

    it('should handle network errors', async () => {
      vault.get.mockResolvedValue({ apiKey: 'test-key' });

      const networkError = new Error('Failed to fetch');
      networkError.name = 'TypeError';
      global.fetch.mockRejectedValue(networkError);

      const result = await connector.testConnection();

      expect(result.status).toBe('error');
      expect(result.message).toContain('Network error');
    });

    it('should handle server errors (5xx)', async () => {
      vault.get.mockResolvedValue({ apiKey: 'test-key' });
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const result = await connector.testConnection();

      expect(result.status).toBe('error');
      expect(result.message).toContain('service error');
      expect(result.configured).toBe(true);
      expect(result.authenticated).toBe(true);
    });
  });

  describe('signal normalization', () => {
    it('should properly normalize signals with all required fields', async () => {
      vault.get.mockResolvedValue({ apiKey: 'test-key' });
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          grade: 'C',
          last_observed: '2026-05-30T12:00:00Z'
        })
      });

      const signals = await connector.collectSignals('test.com', 'vendor-1', 'org-1');
      const gradeSignal = signals[0];

      // Verify all required fields are present
      expect(gradeSignal).toHaveProperty('signalName');
      expect(gradeSignal).toHaveProperty('severity');
      expect(gradeSignal).toHaveProperty('confidence');
      expect(gradeSignal).toHaveProperty('observedAt');
      expect(gradeSignal).toHaveProperty('description');
      expect(gradeSignal).toHaveProperty('recommendedAction');
      expect(gradeSignal).toHaveProperty('rawData');

      // Verify field types
      expect(typeof gradeSignal.signalName).toBe('string');
      expect(typeof gradeSignal.severity).toBe('string');
      expect(typeof gradeSignal.confidence).toBe('number');
      expect(gradeSignal.observedAt).toBeInstanceOf(Date);
    });

    it('should include evidence URLs when available', async () => {
      vault.get.mockResolvedValue({ apiKey: 'test-key' });
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ grade: 'B' })
      });

      const signals = await connector.collectSignals('test.com', 'vendor-1', 'org-1');
      const gradeSignal = signals.find(s => s.signalName === 'RiskRecon Security Grade');

      expect(gradeSignal.evidenceUrl).toContain('https://app.riskrecon.com/company/test.com');
    });
  });

  describe('error response handling', () => {
    it('should parse error response with JSON body', async () => {
      const response = {
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'Invalid API token', code: 'AUTH_001' })
      };

      const error = await connector.handleErrorResponse(response);

      expect(error.message).toBe('Invalid API token');
      expect(error.status).toBe(401);
      expect(error.details).toBeDefined();
    });

    it('should handle error response without JSON body', async () => {
      const response = {
        status: 500,
        statusText: 'Server Error',
        json: async () => { throw new Error('No JSON'); }
      };

      const error = await connector.handleErrorResponse(response);

      expect(error.message).toBe('HTTP 500: Server Error');
      expect(error.status).toBe(500);
    });
  });
});
