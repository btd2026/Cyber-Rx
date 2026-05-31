#!/usr/bin/env node

/**
 * BitSight Connector Verification Script
 *
 * This script demonstrates and verifies the BitSight connector implementation
 * without requiring database setup. It tests all major functionality.
 */

// Mock the vault module before importing connector
jest.mock('./src/utils/vault', () => ({
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn()
}));

const vault = require('./src/utils/vault');
const BitSightConnector = require('./src/connectors/BitSightConnector');

// Configure vault mock
vault.get.mockImplementation((orgId, tool) => {
  if (tool === 'bitsight') {
    return Promise.resolve({
      apiKey: 'test-api-key-12345'
    });
  }
  return Promise.resolve(null);
});

// Mock fetch globally
global.fetch = async (url, options) => {
  console.log(`\n  [Mock API Call] ${options.method} ${url}`);
  console.log(`  [Headers] Authorization: ${options.headers.Authorization.substring(0, 20)}...`);

  // Simulate different responses based on domain
  if (url.includes('testcompany.com')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
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
          severity_breakdown: { critical: 0, high: 5, medium: 7, low: 3 }
        },
        patching_speed: 25,
        patching_percentile: 65
      })
    };
  }

  if (url.includes('poor.com')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        company_name: 'Poor Security Corp',
        grade: 'F',
        score: 350,
        compromises: [
          { date: '2026-04-15', type: 'Botnet' }
        ],
        vulnerabilities: {
          count: 150,
          critical: 20,
          high: 60,
          severity_breakdown: { critical: 20, high: 60, medium: 50, low: 20 }
        }
      })
    };
  }

  if (url.includes('excellent.com')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        company_name: 'Excellent Security Corp',
        grade: 'A+',
        score: 880,
        compromises: [],
        vulnerabilities: { count: 2, critical: 0, high: 0 }
      })
    };
  }

  if (url.includes('notfound.com')) {
    return {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ message: 'Company not found' })
    };
  }

  // Default fallback
  return {
    ok: true,
    status: 200,
    json: async () => ({
      company_name: 'Default Corp',
      grade: 'C',
      score: 620,
      compromises: [],
      vulnerabilities: { count: 0 }
    })
  };
};

// Test utilities
const assert = (condition, message) => {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
};

const section = (title) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${title}`);
  console.log(`${'='.repeat(60)}`);
};

// Run tests
async function runTests() {
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Test 1: Constructor
    section('Test 1: Constructor Initialization');
    const connector = new BitSightConnector({
      organizationId: 'org-123',
      vendorId: 'vendor-456',
      timeout: 10000,
      rateLimitDelay: 1000
    });

    assert(connector.connectorType === 'bitsight', 'Connector type is bitsight');
    assert(connector.sourceType === 'api', 'Source type is api');
    assert(connector.baseUrl === 'https://api.bitsighttech.com/ratings/v1', 'Base URL is correct');
    assert(connector.timeout === 10000, 'Timeout is 10000ms');
    assert(connector.rateLimitDelay === 1000, 'Rate limit delay is 1000ms');
    testsPassed += 5;

    // Test 2: Severity Calculation (Grade)
    section('Test 2: Grade to Severity Mapping');
    assert(connector.calculateSeverity({ grade: 'A+', score: 850 }) === 'Info', 'A+ grade maps to Info');
    assert(connector.calculateSeverity({ grade: 'A', score: 820 }) === 'Info', 'A grade maps to Info');
    assert(connector.calculateSeverity({ grade: 'B+', score: 750 }) === 'Low', 'B+ grade maps to Low');
    assert(connector.calculateSeverity({ grade: 'B', score: 720 }) === 'Low', 'B grade maps to Low');
    assert(connector.calculateSeverity({ grade: 'C+', score: 650 }) === 'Medium', 'C+ grade maps to Medium');
    assert(connector.calculateSeverity({ grade: 'C', score: 620 }) === 'Medium', 'C grade maps to Medium');
    assert(connector.calculateSeverity({ grade: 'D', score: 550 }) === 'High', 'D grade maps to High');
    assert(connector.calculateSeverity({ grade: 'F', score: 350 }) === 'Critical', 'F grade maps to Critical');
    testsPassed += 8;

    // Test 3: Severity Calculation (Score)
    section('Test 3: Score to Severity Mapping');
    assert(connector.calculateSeverity({ score: 850 }) === 'Info', 'Score 850 maps to Info');
    assert(connector.calculateSeverity({ score: 720 }) === 'Low', 'Score 720 maps to Low');
    assert(connector.calculateSeverity({ score: 650 }) === 'Medium', 'Score 650 maps to Medium');
    assert(connector.calculateSeverity({ score: 550 }) === 'High', 'Score 550 maps to High');
    assert(connector.calculateSeverity({ score: 350 }) === 'Critical', 'Score 350 maps to Critical');
    testsPassed += 5;

    // Test 4: Vulnerability Severity
    section('Test 4: Vulnerability Severity Calculation');
    assert(
      connector.calculateSeverityFromVulns({ count: 200, critical: 15, high: 60 }) === 'Critical',
      '200 vulns with 15 critical = Critical'
    );
    assert(
      connector.calculateSeverityFromVulns({ count: 50, critical: 2, high: 25 }) === 'High',
      '50 vulns with 2 critical = High'
    );
    assert(
      connector.calculateSeverityFromVulns({ count: 120, critical: 0, high: 10 }) === 'Medium',
      '120 vulns with 0 critical = Medium'
    );
    assert(
      connector.calculateSeverityFromVulns({ count: 0 }) === 'Info',
      '0 vulns = Info'
    );
    testsPassed += 4;

    // Test 5: Patching Speed Severity
    section('Test 5: Patching Speed Severity Calculation');
    assert(connector.calculateSeverityFromPatching(120) === 'Critical', '120 days = Critical');
    assert(connector.calculateSeverityFromPatching(75) === 'High', '75 days = High');
    assert(connector.calculateSeverityFromPatching(45) === 'Medium', '45 days = Medium');
    assert(connector.calculateSeverityFromPatching(20) === 'Low', '20 days = Low');
    assert(connector.calculateSeverityFromPatching(7) === 'Info', '7 days = Info');
    testsPassed += 5;

    // Test 6: Compromise Severity
    section('Test 6: Compromise Severity Calculation');
    const now = Date.now();
    const recentCompromises = [{ date: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString() }];
    assert(
      connector.getCompromiseSeverity(recentCompromises) === 'Critical',
      'Recent compromise = Critical'
    );

    const oldCompromises = [{ date: new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString() }];
    assert(
      connector.getCompromiseSeverity(oldCompromises) === 'Low',
      'Old compromise = Low'
    );

    assert(
      connector.getCompromiseSeverity([]) === 'Info',
      'No compromises = Info'
    );
    testsPassed += 3;

    // Test 7: Recommended Actions
    section('Test 7: Recommended Action Generation');
    assert(
      connector.getRecommendedAction({ grade: 'F' }).includes('URGENT'),
      'F grade triggers URGENT action'
    );
    assert(
      connector.getRecommendedAction({ grade: 'C' }).includes('Review'),
      'C grade triggers Review action'
    );
    assert(
      connector.getRecommendedAction({ grade: 'A' }).includes('Continue'),
      'A grade triggers Continue action'
    );
    testsPassed += 3;

    // Test 8: Error Handling
    section('Test 8: Error Response Handling');
    const mockErrorResponse = (status, statusText) => ({
      status,
      statusText,
      json: async () => ({ message: `${statusText} - API error` })
    });

    const error404 = await connector.handleErrorResponse(mockErrorResponse(404, 'Not Found'));
    assert(error404.message.includes('not found'), '404 error message is correct');

    const error401 = await connector.handleErrorResponse(mockErrorResponse(401, 'Unauthorized'));
    assert(error401.message.includes('Invalid BitSight API key'), '401 error message is correct');

    const error429 = await connector.handleErrorResponse(mockErrorResponse(429, 'Too Many Requests'));
    assert(error429.message.includes('Rate limit'), '429 error message is correct');
    testsPassed += 3;

    // Test 9: Collect Signals (Success)
    section('Test 9: Collect Signals - Success Case');
    const signals1 = await connector.collectSignals('testcompany.com', 'vendor-456', 'org-123');
    assert(Array.isArray(signals1), 'Returns array of signals');
    assert(signals1.length === 3, 'Returns 3 signals for testcompany.com');
    assert(signals1[0].signalName === 'BitSight Security Grade', 'First signal is grade');
    assert(signals1[0].severity === 'Low', 'B grade maps to Low severity');
    assert(signals1[0].confidence === 100, 'Confidence is 100');
    assert(signals1[0].vendorName === 'Test Company', 'Vendor name is correct');
    testsPassed += 6;

    // Test 10: Collect Signals (Poor Security)
    section('Test 10: Collect Signals - Poor Security Vendor');
    const signals2 = await connector.collectSignals('poor.com', 'vendor-789', 'org-123');
    assert(signals2.length > 0, 'Returns signals for poor.com');
    const gradeSignal2 = signals2.find(s => s.signalName === 'BitSight Security Grade');
    assert(gradeSignal2.severity === 'Critical', 'F grade maps to Critical severity');
    const compromiseSignal = signals2.find(s => s.signalName === 'Compromise History');
    assert(compromiseSignal !== undefined, 'Compromise history signal exists');
    assert(compromiseSignal.severity === 'Critical', 'Recent compromise is Critical');
    testsPassed += 5;

    // Test 11: Collect Signals (Excellent Security)
    section('Test 11: Collect Signals - Excellent Security Vendor');
    const signals3 = await connector.collectSignals('excellent.com', 'vendor-101', 'org-123');
    const gradeSignal3 = signals3.find(s => s.signalName === 'BitSight Security Grade');
    assert(gradeSignal3.severity === 'Info', 'A+ grade maps to Info severity');
    assert(
      gradeSignal3.recommendedAction.includes('acceptable'),
      'A+ grade recommends continue monitoring'
    );
    testsPassed += 3;

    // Test 12: Collect Signals (Not Found)
    section('Test 12: Collect Signals - Vendor Not Found');
    const signals4 = await connector.collectSignals('notfound.com', 'vendor-202', 'org-123');
    assert(signals4.length === 1, 'Returns 1 fallback signal for 404');
    assert(signals4[0].rawData.fallback === true, 'Signal is marked as fallback');
    assert(signals4[0].confidence === 50, 'Fallback signal has reduced confidence');
    testsPassed += 3;

    // Test 13: Signal Mapping
    section('Test 13: BitSight Response to Signal Mapping');
    const mockData = {
      company_name: 'Complete Corp',
      grade: 'B',
      score: 720,
      compromises: [{ date: '2025-01-15', type: 'Botnet' }],
      vulnerabilities: { count: 25, critical: 1, high: 10 },
      patching_speed: 35,
      network_security: { score: 750, grade: 'B+' }
    };
    const mappedSignals = connector.mapBitSightToSignals(mockData, 'complete.com', 'vendor-999');
    assert(mappedSignals.length === 5, 'Maps all 5 signal types');
    assert(
      mappedSignals.every(s => s.vendorName === 'Complete Corp'),
      'All signals have correct vendor name'
    );
    assert(
      mappedSignals.every(s => s.confidence === 100),
      'All signals have 100 confidence'
    );
    testsPassed += 4;

    // Test 14: Fallback Signals
    section('Test 14: Fallback Signal Generation');
    const fallbackSignals = connector.getFallbackSignals('test.com', 'vendor-123');
    assert(fallbackSignals.length === 1, 'Returns 1 fallback signal');
    assert(fallbackSignals[0].signalName === 'BitSight Security Rating', 'Fallback has correct name');
    assert(fallbackSignals[0].severity === 'Medium', 'Fallback has Medium severity');
    assert(fallbackSignals[0].rawData.fallback === true, 'Fallback is marked');
    assert(
      fallbackSignals[0].recommendedAction.includes('Manually verify'),
      'Fallback recommends manual verification'
    );
    testsPassed += 5;

    // Test 15: Connection Test
    section('Test 15: Connection Test');
    const connResult = await connector.testConnection();
    assert(connResult.status === 'success', 'Connection test succeeds');
    assert(connResult.connectorType === 'bitsight', 'Connector type is correct');
    testsPassed += 2;

    // Summary
    section('Test Summary');
    console.log(`\n  Total Tests: ${testsPassed + testsFailed}`);
    console.log(`  ✓ Passed: ${testsPassed}`);
    console.log(`  ❌ Failed: ${testsFailed}`);
    console.log(`  Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

    if (testsFailed === 0) {
      console.log('\n  🎉 All tests passed! BitSight connector is working correctly.\n');
      process.exit(0);
    } else {
      console.log('\n  ⚠️  Some tests failed. Please review the implementation.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error(`\n  ❌ Test execution failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the tests
console.log('\nBitSight Connector Verification');
console.log('==============================\n');
runTests();
