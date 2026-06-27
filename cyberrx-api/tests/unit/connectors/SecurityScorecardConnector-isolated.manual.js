/**
 * Isolated unit tests for SecurityScorecardConnector
 * These tests run without database setup
 *
 * Run with: node tests/unit/connectors/SecurityScorecardConnector-isolated.test.js
 */

const SecurityScorecardConnector = require('../../../src/connectors/SecurityScorecardConnector');

// Mock global fetch
global.fetch = jest.fn();

// Mock vault
jest.mock('../../../src/utils/vault', () => ({
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn()
}));

const vault = require('../../../src/utils/vault');

console.log('Running SecurityScorecard Connector Isolated Tests...\n');

let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  testCount++;
  try {
    fn();
    passCount++;
    console.log('✓', name);
  } catch (error) {
    failCount++;
    console.error('✗', name);
    console.error('  Error:', error.message);
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

function assertDeepEquals(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual: ${JSON.stringify(actual)}`);
  }
}

// Test 1: Constructor
test('Constructor initializes correctly', () => {
  const connector = new SecurityScorecardConnector({
    organizationId: 'test-org',
    vendorId: 'test-vendor'
  });

  assertEquals(connector.connectorType, 'securityscorecard', 'connectorType should be securityscorecard');
  assertEquals(connector.sourceType, 'api', 'sourceType should be api');
  assertEquals(connector.timeout, 10000, 'timeout should be 10000');
  assertEquals(connector.maxRetries, 3, 'maxRetries should be 3');
});

// Test 2: Score to severity mapping
test('calculateSeverity maps scores correctly', () => {
  const connector = new SecurityScorecardConnector({});

  assertEquals(connector.calculateSeverity(95), 'Info', '95 should map to Info');
  assertEquals(connector.calculateSeverity(90), 'Info', '90 should map to Info');
  assertEquals(connector.calculateSeverity(85), 'Low', '85 should map to Low');
  assertEquals(connector.calculateSeverity(70), 'Low', '70 should map to Low');
  assertEquals(connector.calculateSeverity(60), 'Medium', '60 should map to Medium');
  assertEquals(connector.calculateSeverity(50), 'Medium', '50 should map to Medium');
  assertEquals(connector.calculateSeverity(40), 'High', '40 should map to High');
  assertEquals(connector.calculateSeverity(30), 'High', '30 should map to High');
  assertEquals(connector.calculateSeverity(25), 'Critical', '25 should map to Critical');
  assertEquals(connector.calculateSeverity(0), 'Critical', '0 should map to Critical');
});

// Test 3: Score recommendations
test('getScoreRecommendation returns appropriate recommendations', () => {
  const connector = new SecurityScorecardConnector({});

  const rec95 = connector.getScoreRecommendation(95);
  const rec75 = connector.getScoreRecommendation(75);
  const rec55 = connector.getScoreRecommendation(55);
  const rec35 = connector.getScoreRecommendation(35);
  const rec20 = connector.getScoreRecommendation(20);

  assertEquals(rec95.includes('Maintain'), true, '95 recommendation should include "Maintain"');
  assertEquals(rec75.includes('Monitor'), true, '75 recommendation should include "Monitor"');
  assertEquals(rec55.includes('Review'), true, '55 recommendation should include "Review"');
  assertEquals(rec35.includes('Immediate'), true, '35 recommendation should include "Immediate"');
  assertEquals(rec20.includes('Critical'), true, '20 recommendation should include "Critical"');
});

// Test 4: Factor recommendations
test('getFactorRecommendation returns appropriate recommendations', () => {
  const connector = new SecurityScorecardConnector({});

  const netSecLow = connector.getFactorRecommendation('network_security', 40);
  const netSecHigh = connector.getFactorRecommendation('network_security', 80);
  const patchLow = connector.getFactorRecommendation('patching_cadence', 45);
  const patchHigh = connector.getFactorRecommendation('patching_cadence', 75);

  assertEquals(netSecLow.includes('Review network security'), true, 'Low network security should recommend review');
  assertEquals(netSecHigh.includes('Continue monitoring'), true, 'High network security should recommend monitoring');
  assertEquals(patchLow.includes('automated patching'), true, 'Low patching should recommend automation');
  assertEquals(patchHigh.includes('Maintain'), true, 'High patching should recommend maintaining');
});

// Test 5: Domain extraction
test('extractDomain extracts domains correctly', () => {
  const connector = new SecurityScorecardConnector({});

  assertEquals(connector.extractDomain('https://example.com/path'), 'example.com', 'Should extract from full URL');
  assertEquals(connector.extractDomain('http://example.org'), 'example.org', 'Should extract from HTTP URL');
  assertEquals(connector.extractDomain('example.com'), 'example.com', 'Should return domain as-is');
  assertEquals(connector.extractDomain('Test Company'), 'testcompany.com', 'Should construct from company name');
  assertEquals(connector.extractDomain('Acme Corp'), 'acmecorp.com', 'Should construct from multi-word company');
  assertEquals(connector.extractDomain(''), null, 'Should return null for empty string');
  assertEquals(connector.extractDomain(null), null, 'Should return null for null');
  assertEquals(connector.extractDomain(undefined), null, 'Should return null for undefined');
});

// Test 6: Error response handling
test('handleErrorResponse maps error codes correctly', async () => {
  const connector = new SecurityScorecardConnector({});

  const error401 = await connector.handleErrorResponse({ status: 401, statusText: 'Unauthorized', json: async () => ({ message: 'Invalid API key' }) });
  const error404 = await connector.handleErrorResponse({ status: 404, statusText: 'Not Found', json: async () => ({ message: 'Company not found' }) });
  const error429 = await connector.handleErrorResponse({ status: 429, statusText: 'Too Many Requests', json: async () => ({ message: 'Rate limit exceeded' }) });
  const error500 = await connector.handleErrorResponse({ status: 500, statusText: 'Internal Server Error', json: async () => ({ message: 'Server error' }) });
  const error503 = await connector.handleErrorResponse({ status: 503, statusText: 'Service Unavailable', json: async () => ({ message: 'Service unavailable' }) });

  assertEquals(error401.message, 'Invalid API key', '401 should map to invalid API key');
  assertEquals(error404.message, 'Company not found in SecurityScorecard', '404 should map to company not found');
  assertEquals(error429.message, 'Rate limit exceeded (1000 requests/day)', '429 should map to rate limit exceeded');
  assertEquals(error500.message, 'SecurityScorecard server error', '500 should map to server error');
  assertEquals(error503.message, 'SecurityScorecard service unavailable', '503 should map to service unavailable');
});

// Test 7: Signal mapping structure
test('mapSecurityScorecardToSignals creates correct signal structure', () => {
  const connector = new SecurityScorecardConnector({});

  const mockData = {
    score: 72,
    grade: 'B',
    industry: 'Technology',
    factors: {
      network_security: { score: 85, grade: 'A' },
      patching_cadence: { score: 65, grade: 'C' },
      leaked_credentials: { score: 95, count: 0, grade: 'A' }
    }
  };

  const signals = connector.mapSecurityScorecardToSignals(mockData, 'example.com', 'Example Corp', 'vendor-1', 'org-1');

  assertEquals(signals.length > 0, true, 'Should return signals');
  assertEquals(signals[0].vendorName, 'Example Corp', 'Signal should have correct vendor name');
  assertEquals(signals[0].signalCategory, 'External Attack Surface', 'Overall score should be External Attack Surface');
  assertEquals(signals[0].signalName, 'Overall Security Score', 'First signal should be overall score');
  assertEquals(signals[0].severity, 'Low', 'Score 72 should map to Low');
  assertEquals(signals[0].confidence, 100, 'Confidence should be 100');
  assertEquals(signals[0].evidenceUrl.includes('example.com'), true, 'Evidence URL should contain domain');

  // Check network security signal
  const networkSignal = signals.find(s => s.signalName === 'Network Security');
  assertEquals(networkSignal !== undefined, true, 'Should have network security signal');
  assertEquals(networkSignal.signalCategory, 'External Attack Surface', 'Network security should be External Attack Surface');
  assertEquals(networkSignal.rawData.score, 85, 'Network security score should be 85');

  // Check leaked credentials signal
  const credsSignal = signals.find(s => s.signalName === 'Leaked Credentials Found');
  assertEquals(credsSignal !== undefined, true, 'Should have leaked credentials signal');
  assertEquals(credsSignal.signalCategory, 'Dark Web/Credential Exposure', 'Leaked credentials should be Dark Web category');
  assertEquals(credsSignal.severity, 'Info', 'Zero leaked credentials should be Info severity');
});

// Test 8: Leaked credentials severity
test('Leaked credentials with count > 0 should be Critical severity', () => {
  const connector = new SecurityScorecardConnector({});

  const mockData = {
    score: 50,
    grade: 'C',
    factors: {
      leaked_credentials: { score: 45, count: 127, grade: 'F' }
    }
  };

  const signals = connector.mapSecurityScorecardToSignals(mockData, 'example.com', 'Example Corp', 'vendor-1', 'org-1');
  const credsSignal = signals.find(s => s.signalName === 'Leaked Credentials Found');

  assertEquals(credsSignal.severity, 'Critical', '127 leaked credentials should be Critical');
  assertEquals(credsSignal.recommendedAction.includes('Immediately rotate'), true, 'Critical recommendation should include immediate rotation');
  assertEquals(credsSignal.rawData.count, 127, 'Count should be 127');
});

// Test 9: Fallback signals
test('getFallbackSignals returns appropriate fallback structure', () => {
  const connector = new SecurityScorecardConnector({});

  const fallback = connector.getFallbackSignals('Test Vendor', 'vendor-1', 'org-1');

  assertEquals(fallback.length, 1, 'Should return 1 fallback signal');
  assertEquals(fallback[0].signalName, 'SecurityScorecard Unavailable', 'Signal name should indicate unavailability');
  assertEquals(fallback[0].severity, 'Info', 'Fallback should be Info severity');
  assertEquals(fallback[0].vendorName, 'Test Vendor', 'Should preserve vendor name');
  assertEquals(fallback[0].rawData.fallback, true, 'Should mark as fallback');
  assertEquals(fallback[0].rawData.vendorId, 'vendor-1', 'Should include vendor ID');
  assertEquals(fallback[0].rawData.organizationId, 'org-1', 'Should include organization ID');
});

// Summary
console.log('\n' + '='.repeat(60));
console.log(`Tests: ${testCount} total, ${passCount} passed, ${failCount} failed`);
console.log('='.repeat(60));

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('\n✓ All tests passed!');
  process.exit(0);
}
