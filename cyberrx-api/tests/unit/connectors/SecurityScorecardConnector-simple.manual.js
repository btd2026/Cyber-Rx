/**
 * Simple unit tests for SecurityScorecardConnector
 * These tests run without database or Jest dependencies
 *
 * Run with: node tests/unit/connectors/SecurityScorecardConnector-simple.test.js
 */

const SecurityScorecardConnector = require('../../../src/connectors/SecurityScorecardConnector');

// Simple test runner
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

function assertTrue(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

function assertNotNull(value, message) {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

console.log('Running SecurityScorecard Connector Unit Tests...\n');

// Test 1: Constructor initialization
test('Constructor initializes correctly', () => {
  const connector = new SecurityScorecardConnector({
    organizationId: 'test-org',
    vendorId: 'test-vendor'
  });

  assertEquals(connector.connectorType, 'securityscorecard', 'connectorType should be securityscorecard');
  assertEquals(connector.sourceType, 'api', 'sourceType should be api');
  assertEquals(connector.timeout, 10000, 'timeout should be 10000ms');
  assertEquals(connector.maxRetries, 3, 'maxRetries should be 3');
});

// Test 2: Score to severity mapping
test('calculateSeverity: High scores (90+) map to Info', () => {
  const connector = new SecurityScorecardConnector({});
  assertEquals(connector.calculateSeverity(95), 'Info', '95 should map to Info');
  assertEquals(connector.calculateSeverity(90), 'Info', '90 should map to Info');
});

test('calculateSeverity: Medium-high scores (70-89) map to Low', () => {
  const connector = new SecurityScorecardConnector({});
  assertEquals(connector.calculateSeverity(85), 'Low', '85 should map to Low');
  assertEquals(connector.calculateSeverity(70), 'Low', '70 should map to Low');
});

test('calculateSeverity: Medium scores (50-69) map to Medium', () => {
  const connector = new SecurityScorecardConnector({});
  assertEquals(connector.calculateSeverity(60), 'Medium', '60 should map to Medium');
  assertEquals(connector.calculateSeverity(50), 'Medium', '50 should map to Medium');
});

test('calculateSeverity: Low scores (30-49) map to High', () => {
  const connector = new SecurityScorecardConnector({});
  assertEquals(connector.calculateSeverity(40), 'High', '40 should map to High');
  assertEquals(connector.calculateSeverity(30), 'High', '30 should map to High');
});

test('calculateSeverity: Critical scores (<30) map to Critical', () => {
  const connector = new SecurityScorecardConnector({});
  assertEquals(connector.calculateSeverity(25), 'Critical', '25 should map to Critical');
  assertEquals(connector.calculateSeverity(0), 'Critical', '0 should map to Critical');
});

// Test 3: Score recommendations
test('getScoreRecommendation: 95 score recommends maintaining', () => {
  const connector = new SecurityScorecardConnector({});
  const rec = connector.getScoreRecommendation(95);
  assertTrue(rec.includes('Maintain'), '95 recommendation should include "Maintain"');
});

test('getScoreRecommendation: 75 score recommends monitoring', () => {
  const connector = new SecurityScorecardConnector({});
  const rec = connector.getScoreRecommendation(75);
  assertTrue(rec.includes('Monitor'), '75 recommendation should include "Monitor"');
});

test('getScoreRecommendation: 55 score recommends review', () => {
  const connector = new SecurityScorecardConnector({});
  const rec = connector.getScoreRecommendation(55);
  assertTrue(rec.includes('Review'), '55 recommendation should include "Review"');
});

test('getScoreRecommendation: 35 score recommends immediate action', () => {
  const connector = new SecurityScorecardConnector({});
  const rec = connector.getScoreRecommendation(35);
  assertTrue(rec.includes('Immediate'), '35 recommendation should include "Immediate"');
});

test('getScoreRecommendation: 20 score recommends critical review', () => {
  const connector = new SecurityScorecardConnector({});
  const rec = connector.getScoreRecommendation(20);
  assertTrue(rec.includes('Critical'), '20 recommendation should include "Critical"');
});

// Test 4: Factor recommendations
test('getFactorRecommendation: Low network security recommends review', () => {
  const connector = new SecurityScorecardConnector({});
  const rec = connector.getFactorRecommendation('network_security', 40);
  assertTrue(rec.includes('Review network security'), 'Low network security should recommend review');
});

test('getFactorRecommendation: High network security recommends monitoring', () => {
  const connector = new SecurityScorecardConnector({});
  const rec = connector.getFactorRecommendation('network_security', 80);
  assertTrue(rec.includes('Continue monitoring'), 'High network security should recommend monitoring');
});

test('getFactorRecommendation: Low patching cadence recommends automation', () => {
  const connector = new SecurityScorecardConnector({});
  const rec = connector.getFactorRecommendation('patching_cadence', 45);
  assertTrue(rec.includes('automated patching'), 'Low patching should recommend automation');
});

test('getFactorRecommendation: High patching cadence recommends maintaining', () => {
  const connector = new SecurityScorecardConnector({});
  const rec = connector.getFactorRecommendation('patching_cadence', 75);
  assertTrue(rec.includes('Maintain'), 'High patching should recommend maintaining');
});

// Test 5: Domain extraction
test('extractDomain: Extracts from full HTTPS URL', () => {
  const connector = new SecurityScorecardConnector({});
  assertEquals(connector.extractDomain('https://example.com/path'), 'example.com', 'Should extract from full URL');
});

test('extractDomain: Extracts from full HTTP URL', () => {
  const connector = new SecurityScorecardConnector({});
  assertEquals(connector.extractDomain('http://example.org'), 'example.org', 'Should extract from HTTP URL');
});

test('extractDomain: Returns domain as-is', () => {
  const connector = new SecurityScorecardConnector({});
  assertEquals(connector.extractDomain('example.com'), 'example.com', 'Should return domain as-is');
});

test('extractDomain: Constructs from company name', () => {
  const connector = new SecurityScorecardConnector({});
  assertEquals(connector.extractDomain('Test Company'), 'testcompany.com', 'Should construct from company name');
});

test('extractDomain: Handles multi-word company names', () => {
  const connector = new SecurityScorecardConnector({});
  assertEquals(connector.extractDomain('Acme Corp'), 'acmecorp.com', 'Should construct from multi-word company');
});

test('extractDomain: Returns null for empty string', () => {
  const connector = new SecurityScorecardConnector({});
  assertEquals(connector.extractDomain(''), null, 'Should return null for empty string');
});

test('extractDomain: Returns null for null input', () => {
  const connector = new SecurityScorecardConnector({});
  assertEquals(connector.extractDomain(null), null, 'Should return null for null');
});

test('extractDomain: Returns null for undefined input', () => {
  const connector = new SecurityScorecardConnector({});
  assertEquals(connector.extractDomain(undefined), null, 'Should return null for undefined');
});

// Test 6: Error response handling
test('handleErrorResponse: 401 maps to invalid API key', async () => {
  const connector = new SecurityScorecardConnector({});
  const error = await connector.handleErrorResponse({
    status: 401,
    statusText: 'Unauthorized',
    json: async () => ({ message: 'Invalid API key' })
  });
  assertEquals(error.message, 'Invalid API key', '401 should map to invalid API key');
});

test('handleErrorResponse: 404 maps to company not found', async () => {
  const connector = new SecurityScorecardConnector({});
  const error = await connector.handleErrorResponse({
    status: 404,
    statusText: 'Not Found',
    json: async () => ({ message: 'Company not found' })
  });
  assertEquals(error.message, 'Company not found in SecurityScorecard', '404 should map to company not found');
});

test('handleErrorResponse: 429 maps to rate limit exceeded', async () => {
  const connector = new SecurityScorecardConnector({});
  const error = await connector.handleErrorResponse({
    status: 429,
    statusText: 'Too Many Requests',
    json: async () => ({ message: 'Rate limit exceeded' })
  });
  assertEquals(error.message, 'Rate limit exceeded (1000 requests/day)', '429 should map to rate limit exceeded');
});

test('handleErrorResponse: 500 maps to server error', async () => {
  const connector = new SecurityScorecardConnector({});
  const error = await connector.handleErrorResponse({
    status: 500,
    statusText: 'Internal Server Error',
    json: async () => ({ message: 'Server error' })
  });
  assertEquals(error.message, 'SecurityScorecard server error', '500 should map to server error');
});

test('handleErrorResponse: 503 maps to service unavailable', async () => {
  const connector = new SecurityScorecardConnector({});
  const error = await connector.handleErrorResponse({
    status: 503,
    statusText: 'Service Unavailable',
    json: async () => ({ message: 'Service unavailable' })
  });
  assertEquals(error.message, 'SecurityScorecard service unavailable', '503 should map to service unavailable');
});

// Test 7: Signal mapping structure
test('mapSecurityScorecardToSignals: Creates correct signal structure', () => {
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

  assertTrue(signals.length > 0, 'Should return signals');
  assertEquals(signals[0].vendorName, 'Example Corp', 'Signal should have correct vendor name');
  assertEquals(signals[0].signalCategory, 'External Attack Surface', 'Overall score should be External Attack Surface');
  assertEquals(signals[0].signalName, 'Overall Security Score', 'First signal should be overall score');
  assertEquals(signals[0].severity, 'Low', 'Score 72 should map to Low');
  assertEquals(signals[0].confidence, 100, 'Confidence should be 100');
  assertTrue(signals[0].evidenceUrl.includes('example.com'), 'Evidence URL should contain domain');
});

test('mapSecurityScorecardToSignals: Includes network security signal', () => {
  const connector = new SecurityScorecardConnector({});

  const mockData = {
    score: 72,
    factors: {
      network_security: { score: 85, grade: 'A' }
    }
  };

  const signals = connector.mapSecurityScorecardToSignals(mockData, 'example.com', 'Example Corp', 'vendor-1', 'org-1');
  const networkSignal = signals.find(s => s.signalName === 'Network Security');

  assertNotNull(networkSignal, 'Should have network security signal');
  assertEquals(networkSignal.signalCategory, 'External Attack Surface', 'Network security should be External Attack Surface');
  assertEquals(networkSignal.rawData.score, 85, 'Network security score should be 85');
});

test('mapSecurityScorecardToSignals: Includes patching cadence signal', () => {
  const connector = new SecurityScorecardConnector({});

  const mockData = {
    score: 72,
    factors: {
      patching_cadence: { score: 65, grade: 'C' }
    }
  };

  const signals = connector.mapSecurityScorecardToSignals(mockData, 'example.com', 'Example Corp', 'vendor-1', 'org-1');
  const patchingSignal = signals.find(s => s.signalName === 'Patching Cadence');

  assertNotNull(patchingSignal, 'Should have patching cadence signal');
  assertEquals(patchingSignal.signalCategory, 'Vulnerability Management', 'Patching should be Vulnerability Management');
  assertEquals(patchingSignal.rawData.score, 65, 'Patching score should be 65');
});

// Test 8: Leaked credentials severity
test('mapSecurityScorecardToSignals: Zero leaked credentials is Info severity', () => {
  const connector = new SecurityScorecardConnector({});

  const mockData = {
    score: 72,
    factors: {
      leaked_credentials: { score: 95, count: 0, grade: 'A' }
    }
  };

  const signals = connector.mapSecurityScorecardToSignals(mockData, 'example.com', 'Example Corp', 'vendor-1', 'org-1');
  const credsSignal = signals.find(s => s.signalName === 'Leaked Credentials Found');

  assertNotNull(credsSignal, 'Should have leaked credentials signal');
  assertEquals(credsSignal.signalCategory, 'Dark Web/Credential Exposure', 'Leaked credentials should be Dark Web category');
  assertEquals(credsSignal.severity, 'Info', 'Zero leaked credentials should be Info severity');
  assertEquals(credsSignal.rawData.count, 0, 'Count should be 0');
});

test('mapSecurityScorecardToSignals: Leaked credentials > 0 is Critical severity', () => {
  const connector = new SecurityScorecardConnector({});

  const mockData = {
    score: 72,
    factors: {
      leaked_credentials: { score: 45, count: 127, grade: 'F' }
    }
  };

  const signals = connector.mapSecurityScorecardToSignals(mockData, 'example.com', 'Example Corp', 'vendor-1', 'org-1');
  const credsSignal = signals.find(s => s.signalName === 'Leaked Credentials Found');

  assertNotNull(credsSignal, 'Should have leaked credentials signal');
  assertEquals(credsSignal.severity, 'Critical', '127 leaked credentials should be Critical');
  assertTrue(credsSignal.recommendedAction.includes('Immediately rotate'), 'Critical recommendation should include immediate rotation');
  assertEquals(credsSignal.rawData.count, 127, 'Count should be 127');
});

// Test 9: Fallback signals
test('getFallbackSignals: Returns appropriate fallback structure', () => {
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

// Test 10: SSL certificate issues
test('mapSecurityScorecardToSignals: Maps SSL certificate issues', () => {
  const connector = new SecurityScorecardConnector({});

  const mockData = {
    score: 72,
    issues: {
      ssl_certificates: [
        { severity: 'critical', domain: 'expired.example.com' },
        { severity: 'low', domain: 'expiring.example.com' }
      ]
    }
  };

  const signals = connector.mapSecurityScorecardToSignals(mockData, 'example.com', 'Example Corp', 'vendor-1', 'org-1');
  const sslSignal = signals.find(s => s.signalName === 'SSL Certificate Issues');

  assertNotNull(sslSignal, 'Should have SSL certificate issues signal');
  assertEquals(sslSignal.signalCategory, 'External Attack Surface', 'SSL issues should be External Attack Surface');
  assertEquals(sslSignal.severity, 'High', 'Critical SSL issue should make signal High severity');
  assertEquals(sslSignal.rawData.count, 2, 'Should count 2 SSL issues');
});

// Summary
console.log('\n' + '='.repeat(60));
console.log(`Tests: ${testCount} total, ${passCount} passed, ${failCount} failed`);
console.log('='.repeat(60));

if (failCount > 0) {
  console.error('\n✗ Some tests failed!');
  process.exit(1);
} else {
  console.log('\n✓ All tests passed!');
  process.exit(0);
}
