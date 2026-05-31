#!/usr/bin/env node

/**
 * BitSight Connector Simple Verification
 *
 * Direct testing without mocking framework
 */

// First, override the vault module
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === '../utils/vault' || id === './utils/vault') {
    return {
      get: async (orgId, tool) => {
        if (tool === 'bitsight') {
          return { apiKey: 'test-api-key-12345' };
        }
        return null;
      },
      set: async () => {},
      delete: async () => {}
    };
  }
  return originalRequire.apply(this, arguments);
};

const BitSightConnector = require('./src/connectors/BitSightConnector');

// Mock fetch globally
global.fetch = async (url, options) => {
  if (url.includes('testcompany.com')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        company_name: 'Test Company',
        grade: 'B',
        score: 720,
        compromises: [],
        vulnerabilities: { count: 15, critical: 0, high: 5 }
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
        compromises: [{ date: '2026-04-15', type: 'Botnet' }],
        vulnerabilities: { count: 150, critical: 20, high: 60 }
      })
    };
  }
  if (url.includes('notfound.com')) {
    return { ok: false, status: 404, statusText: 'Not Found', json: async () => ({ message: 'Not found' }) };
  }
  return { ok: false, status: 500, statusText: 'Error', json: async () => ({ message: 'Server error' }) };
};

// Test runner
const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('\nBitSight Connector Simple Verification');
  console.log('=======================================\n');

  // Test 1: Constructor
  test('Constructor initialization', () => {
    const connector = new BitSightConnector({ organizationId: 'org-123' });
    assert(connector.connectorType === 'bitsight', 'Type should be bitsight');
    assert(connector.baseUrl === 'https://api.bitsighttech.com/ratings/v1', 'Base URL correct');
  });

  // Test 2: Severity mapping
  test('Grade A+ maps to Info', () => {
    const connector = new BitSightConnector({ organizationId: 'org-123' });
    assert(connector.calculateSeverity({ grade: 'A+' }) === 'Info', 'A+ should be Info');
  });

  test('Grade F maps to Critical', () => {
    const connector = new BitSightConnector({ organizationId: 'org-123' });
    assert(connector.calculateSeverity({ grade: 'F' }) === 'Critical', 'F should be Critical');
  });

  test('Score 720 maps to Low', () => {
    const connector = new BitSightConnector({ organizationId: 'org-123' });
    assert(connector.calculateSeverity({ score: 720 }) === 'Low', '720 should be Low');
  });

  // Test 3: Collect signals
  test('Collect signals from API', async () => {
    const connector = new BitSightConnector({ organizationId: 'org-123' });
    const signals = await connector.collectSignals('testcompany.com', 'vendor-456', 'org-123');
    assert(Array.isArray(signals), 'Should return array');
    assert(signals.length > 0, 'Should have signals');
    assert(signals[0].signalName === 'BitSight Security Grade', 'First signal should be grade');
  });

  // Test 4: Error handling
  test('Handle 404 error gracefully', async () => {
    const connector = new BitSightConnector({ organizationId: 'org-123' });
    const signals = await connector.collectSignals('notfound.com', 'vendor-456', 'org-123');
    assert(signals.length === 1, 'Should return fallback signal');
    assert(signals[0].rawData.fallback === true, 'Should be marked as fallback');
  });

  // Test 5: Poor security vendor
  test('Poor security gets Critical severity', async () => {
    const connector = new BitSightConnector({ organizationId: 'org-123' });
    const signals = await connector.collectSignals('poor.com', 'vendor-789', 'org-123');
    const gradeSignal = signals.find(s => s.signalName === 'BitSight Security Grade');
    assert(gradeSignal.severity === 'Critical', 'F grade should be Critical');
  });

  // Run all tests
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`✓ ${t.name}`);
      passed++;
    } catch (error) {
      console.log(`✗ ${t.name}`);
      console.log(`  Error: ${error.message}`);
      failed++;
    }
  }

  // Summary
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('🎉 All tests passed!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed\n');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
