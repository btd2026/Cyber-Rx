/**
 * Standalone test file for RiskReconConnector
 * Run with: node tests/unit/connectors/RiskReconConnector.standalone.test.js
 *
 * This test file can run without database setup or Jest.
 */

const RiskReconConnector = require('../../../src/connectors/RiskReconConnector');

// Mock dependencies
const vault = {
  get: async () => ({ apiKey: 'test-api-key' }),
  set: async () => {},
  delete: async () => {}
};

// Mock the vault module
require.cache[require.resolve('../../../src/utils/vault')].exports = vault;

// Mock fetch globally
global.fetch = async () => ({
  ok: true,
  status: 200,
  json: async () => ({
    grade: 'B',
    last_observed: '2026-05-30T12:00:00Z',
    exposure_score: 55,
    findings: [
      { severity: 'critical', name: 'Exposed Port' },
      { severity: 'high', name: 'SSL Issue' }
    ]
  })
});

let connector;

// Initialize connector
connector = new RiskReconConnector({
  organizationId: 'org-123',
  vendorId: 'vendor-456'
});

// Test helper functions
function expect(actual) {
  return {
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected} but got ${actual}`);
      }
    },
    toContain: (expected) => {
      if (!actual || !actual.includes) {
        throw new Error(`Expected value to be a string containing "${expected}"`);
      }
      if (!actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`);
      }
    },
    toBeDefined: () => {
      if (actual === undefined || actual === null) {
        throw new Error(`Expected value to be defined but got ${actual}`);
      }
    },
    toBeUndefined: () => {
      if (actual !== undefined) {
        throw new Error(`Expected value to be undefined but got ${actual}`);
      }
    },
    toHaveLength: (expected) => {
      if (!actual || !actual.length) {
        throw new Error(`Expected value to have length but got ${actual}`);
      }
      if (actual.length !== expected) {
        throw new Error(`Expected length ${expected} but got ${actual.length}`);
      }
    },
    toBeGreaterThan: (expected) => {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    }
  };
}

// Run tests
console.log('Running RiskReconConnector standalone tests...\n');

let passed = 0;
let failed = 0;

const runTest = (testName, testFn) => {
  try {
    testFn();
    console.log(`✓ ${testName}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${testName}`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
};

// Test suites
console.log('=== Constructor Tests ===');
runTest('should initialize with correct configuration', () => {
  expect(connector.connectorType).toBe('riskrecon');
  expect(connector.sourceType).toBe('api');
  expect(connector.organizationId).toBe('org-123');
  expect(connector.vendorId).toBe('vendor-456');
});

console.log('\n=== Grade Normalization Tests ===');
runTest('A+ maps to Info', () => expect(connector.calculateSeverity('A+')).toBe('Info'));
runTest('A maps to Info', () => expect(connector.calculateSeverity('A')).toBe('Info'));
runTest('B+ maps to Low', () => expect(connector.calculateSeverity('B+')).toBe('Low'));
runTest('B maps to Low', () => expect(connector.calculateSeverity('B')).toBe('Low'));
runTest('C+ maps to Medium', () => expect(connector.calculateSeverity('C+')).toBe('Medium'));
runTest('C maps to Medium', () => expect(connector.calculateSeverity('C')).toBe('Medium'));
runTest('D maps to High', () => expect(connector.calculateSeverity('D')).toBe('High'));
runTest('F maps to Critical', () => expect(connector.calculateSeverity('F')).toBe('Critical'));
runTest('Unknown grade maps to Medium', () => expect(connector.calculateSeverity('X')).toBe('Medium'));
runTest('Case-insensitive grade mapping', () => expect(connector.calculateSeverity('a')).toBe('Info'));

console.log('\n=== Exposure Score Tests ===');
runTest('Score 90 maps to Critical', () => expect(connector.calculateSeverityFromExposure(90)).toBe('Critical'));
runTest('Score 80 maps to Critical', () => expect(connector.calculateSeverityFromExposure(80)).toBe('Critical'));
runTest('Score 70 maps to High', () => expect(connector.calculateSeverityFromExposure(70)).toBe('High'));
runTest('Score 60 maps to High', () => expect(connector.calculateSeverityFromExposure(60)).toBe('High'));
runTest('Score 50 maps to Medium', () => expect(connector.calculateSeverityFromExposure(50)).toBe('Medium'));
runTest('Score 30 maps to Low', () => expect(connector.calculateSeverityFromExposure(30)).toBe('Low'));
runTest('Score 20 maps to Low', () => expect(connector.calculateSeverityFromExposure(20)).toBe('Low'));
runTest('Score 10 maps to Info', () => expect(connector.calculateSeverityFromExposure(10)).toBe('Info'));
runTest('Invalid input maps to Medium', () => expect(connector.calculateSeverityFromExposure('invalid')).toBe('Medium'));

console.log('\n=== Insecurity Rating Tests ===');
runTest('Rating 90 maps to Critical', () => expect(connector.calculateSeverityFromInsecurity(90)).toBe('Critical'));
runTest('Rating 75 maps to Critical', () => expect(connector.calculateSeverityFromInsecurity(75)).toBe('Critical'));
runTest('Rating 60 maps to High', () => expect(connector.calculateSeverityFromInsecurity(60)).toBe('High'));
runTest('Rating 50 maps to High', () => expect(connector.calculateSeverityFromInsecurity(50)).toBe('High'));
runTest('Rating 35 maps to Medium', () => expect(connector.calculateSeverityFromInsecurity(35)).toBe('Medium'));
runTest('Rating 25 maps to Medium', () => expect(connector.calculateSeverityFromInsecurity(25)).toBe('Medium'));
runTest('Rating 15 maps to Low', () => expect(connector.calculateSeverityFromInsecurity(15)).toBe('Low'));
runTest('Rating 5 maps to Info', () => expect(connector.calculateSeverityFromInsecurity(5)).toBe('Info'));

console.log('\n=== Issue Velocity Tests ===');
runTest('Velocity 15 maps to Critical', () => expect(connector.calculateSeverityFromVelocity(15)).toBe('Critical'));
runTest('Velocity 10 maps to Critical', () => expect(connector.calculateSeverityFromVelocity(10)).toBe('Critical'));
runTest('Velocity 7 maps to High', () => expect(connector.calculateSeverityFromVelocity(7)).toBe('High'));
runTest('Velocity 5 maps to High', () => expect(connector.calculateSeverityFromVelocity(5)).toBe('High'));
runTest('Velocity 3 maps to Medium', () => expect(connector.calculateSeverityFromVelocity(3)).toBe('Medium'));
runTest('Velocity 2 maps to Medium', () => expect(connector.calculateSeverityFromVelocity(2)).toBe('Medium'));
runTest('Velocity 1 maps to Low', () => expect(connector.calculateSeverityFromVelocity(1)).toBe('Low'));
runTest('Velocity 0 maps to Info', () => expect(connector.calculateSeverityFromVelocity(0)).toBe('Info'));

console.log('\n=== Grade Recommendation Tests ===');
runTest('A grade recommendation includes "Maintain"', () => {
  expect(connector.getGradeRecommendation('A')).toContain('Maintain');
});
runTest('B grade recommendation includes "improving"', () => {
  expect(connector.getGradeRecommendation('B')).toContain('improving');
});
runTest('C grade recommendation includes "comprehensive"', () => {
  expect(connector.getGradeRecommendation('C')).toContain('comprehensive');
});
runTest('D grade recommendation includes "Immediately"', () => {
  expect(connector.getGradeRecommendation('D')).toContain('Immediately');
});
runTest('F grade recommendation includes "CRITICAL"', () => {
  expect(connector.getGradeRecommendation('F')).toContain('CRITICAL');
});

console.log('\n=== Signal Mapping Tests ===');
runTest('should map RiskRecon response to signals', () => {
  const mockData = {
    grade: 'B',
    exposure_score: 55,
    insecurity_rating: 40,
    issue_velocity: 3,
    findings: [
      { severity: 'critical', name: 'Exposed Port' },
      { severity: 'high', name: 'SSL Issue' }
    ]
  };

  const signals = connector.mapRiskReconToSignals(mockData, 'example.com', 'vendor-1');

  expect(signals).toBeDefined();
  expect(signals.length).toBeGreaterThan(0);
});

runTest('should map grade signal correctly', () => {
  const mockData = { grade: 'B', last_observed: '2026-05-30T12:00:00Z' };
  const signals = connector.mapRiskReconToSignals(mockData, 'example.com', 'vendor-1');

  const gradeSignal = signals.find(s => s.signalName === 'RiskRecon Security Grade');
  expect(gradeSignal).toBeDefined();
  expect(gradeSignal.severity).toBe('Low'); // B grade = Low
  expect(gradeSignal.confidence).toBe(100);
});

runTest('should create findings signal for critical/high issues', () => {
  const mockData = {
    grade: 'B',
    findings: [
      { severity: 'critical', name: 'Exposed Port' },
      { severity: 'high', name: 'SSL Issue' }
    ]
  };

  const signals = connector.mapRiskReconToSignals(mockData, 'example.com', 'vendor-1');
  const findingsSignal = signals.find(s => s.signalName === 'Critical Attack Surface Findings');

  expect(findingsSignal).toBeDefined();
  expect(findingsSignal.severity).toBe('Critical');
});

runTest('should handle empty findings array', () => {
  const mockData = { grade: 'A', findings: [] };
  const signals = connector.mapRiskReconToSignals(mockData, 'example.com', 'vendor-1');

  const findingsSignal = signals.find(s => s.signalName === 'Critical Attack Surface Findings');
  expect(findingsSignal).toBeUndefined();

  const gradeSignal = signals.find(s => s.signalName === 'RiskRecon Security Grade');
  expect(gradeSignal).toBeDefined();
});

console.log('\n=== Fallback Signal Tests ===');
runTest('should return fallback signal when API unavailable', () => {
  const fallback = connector.getFallbackSignals('example.com', 'vendor-1');

  expect(fallback).toBeDefined();
  expect(fallback.length).toBe(1);
  expect(fallback[0].signalName).toBe('RiskRecon Data Unavailable');
  expect(fallback[0].severity).toBe('Info');
  expect(fallback[0].confidence).toBe(0);
  expect(fallback[0].rawData.fallback).toBe(true);
});

console.log('\n=== Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);
console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

process.exit(failed > 0 ? 1 : 0);
