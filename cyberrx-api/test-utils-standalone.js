// Standalone test runner for utils (no database required)
// Clear require cache to ensure fresh module loading
delete require.cache[require.resolve('./src/utils/signalAggregator')];
delete require.cache[require.resolve('./src/utils/conflictResolver')];

const SignalAggregator = require('./src/utils/signalAggregator');
const ConflictResolver = require('./src/utils/conflictResolver');

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✓ ${description}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${description}`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected} but got ${actual}`);
  }
}

console.log('Testing SignalAggregator...');
console.log('=====================================');

// Sample test data
const sampleSignals = [
  {
    id: 'sig-1',
    signalName: 'SSL Vulnerability',
    signalCategory: 'External Attack Surface',
    sourceName: 'SecurityScorecard',
    severity: 'High',
    confidence: 80,
    observedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
  },
  {
    id: 'sig-2',
    signalName: 'SSL Vulnerability',
    signalCategory: 'External Attack Surface',
    sourceName: 'BitSight',
    severity: 'Medium',
    confidence: 70,
    observedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
  },
  {
    id: 'sig-3',
    signalName: 'Email Security Issue',
    signalCategory: 'External Attack Surface',
    sourceName: 'RiskRecon',
    severity: 'Low',
    confidence: 60,
    observedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  }
];

// SignalAggregator Tests
test('groupBySignalName groups signals correctly', () => {
  const grouped = SignalAggregator.groupBySignalName(sampleSignals);
  // Note: normalizeSignalName removes common suffixes like "vulnerability"
  // So "SSL Vulnerability" becomes "ssl"
  assert(grouped['ssl'], 'Should have ssl group (after removing "vulnerability" suffix)');
  assertEqual(grouped['ssl'].length, 2, 'Should have 2 SSL signals grouped together');
});

test('normalizeSignalName normalizes consistently', () => {
  const name1 = SignalAggregator.normalizeSignalName('SSL Vulnerability Detected');
  const name2 = SignalAggregator.normalizeSignalName('ssl vulnerability detected');
  assertEqual(name1, name2, 'Should normalize to same value');
});

test('getSignalAge calculates correct age', () => {
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  const age = SignalAggregator.getSignalAge(tenDaysAgo);
  assertEqual(age, 10, 'Should calculate 10 days');
});

test('isSignalStale identifies stale signals', () => {
  const staleDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
  const isStale = SignalAggregator.isSignalStale(staleDate);
  assert(isStale, 'Should identify as stale');
});

test('isSignalStale identifies fresh signals', () => {
  const freshDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  const isStale = SignalAggregator.isSignalStale(freshDate);
  assert(!isStale, 'Should not identify as stale');
});

test('countBySeverity counts correctly', () => {
  const counts = SignalAggregator.countBySeverity(sampleSignals);
  assertEqual(counts.High, 1, 'Should have 1 High');
  assertEqual(counts.Medium, 1, 'Should have 1 Medium');
  assertEqual(counts.Low, 1, 'Should have 1 Low');
});

test('averageConfidence calculates average', () => {
  const avg = SignalAggregator.averageConfidence(sampleSignals);
  assertEqual(avg, 70, 'Should calculate average as 70');
});

test('getHighestSeverity returns highest', () => {
  const highest = SignalAggregator.getHighestSeverity(sampleSignals);
  assertEqual(highest.severity, 'High', 'Should return High severity');
});

test('getMostRecent returns most recent', () => {
  const recent = SignalAggregator.getMostRecent(sampleSignals);
  assertEqual(recent.id, 'sig-3', 'Should return sig-3 (most recent)');
});

test('hasMultiProviderConfirmation detects multiple providers', () => {
  const hasConfirmation = SignalAggregator.hasMultiProviderConfirmation(sampleSignals);
  assert(hasConfirmation, 'Should detect multiple providers');
});

test('calculateSignalSimilarity returns 1 for identical names', () => {
  const similarity = SignalAggregator.calculateSignalSimilarity('SSL Vulnerability', 'SSL Vulnerability');
  assertEqual(similarity, 1, 'Should return 1 for identical names');
});

test('calculateSignalSimilarity returns 0 for different names', () => {
  const similarity = SignalAggregator.calculateSignalSimilarity('SSL', 'Email');
  assertEqual(similarity, 0, 'Should return 0 for different names');
});

test('getFreshnessScore returns 1.0 for fresh signals', () => {
  const freshDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const score = SignalAggregator.getFreshnessScore(freshDate);
  assertEqual(score, 1.0, 'Should return 1.0 for fresh signals');
});

test('getFreshnessScore returns 0.2 for very stale signals', () => {
  const staleDate = new Date(Date.now() - 70 * 24 * 60 * 60 * 1000);
  const score = SignalAggregator.getFreshnessScore(staleDate);
  assertEqual(score, 0.2, 'Should return 0.2 for very stale signals');
});

console.log('\nTesting ConflictResolver...');
console.log('=====================================');

const conflictingSignals = [
  {
    id: 'sig-1',
    signalName: 'SSL Vulnerability',
    severity: 'High',
    confidence: 80,
    sourceName: 'SecurityScorecard',
    observedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
  },
  {
    id: 'sig-2',
    signalName: 'SSL Vulnerability',
    severity: 'Low',
    confidence: 60,
    sourceName: 'BitSight',
    observedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
  }
];

// ConflictResolver Tests
test('resolveByHighestSeverity selects highest', () => {
  const result = ConflictResolver.resolveByHighestSeverity(conflictingSignals);
  assertEqual(result.resolvedSignal.severity, 'High', 'Should select High severity');
  assertEqual(result.resolutionStrategy, 'highest_severity', 'Should use highest_severity strategy');
});

test('resolveByHighestSeverity detects conflict', () => {
  const result = ConflictResolver.resolveByHighestSeverity(conflictingSignals);
  assert(result.metadata.conflictDetected, 'Should detect conflict');
});

test('resolveByConfidenceWeighted calculates weighted score', () => {
  const result = ConflictResolver.resolveByConfidenceWeighted(conflictingSignals);
  assert(result.confidence >= 0 && result.confidence <= 100, 'Should return score between 0-100');
});

test('resolveByConsensus detects consensus', () => {
  const consensusSignals = [
    { ...conflictingSignals[0], severity: 'High' },
    { ...conflictingSignals[1], severity: 'High' }
  ];
  const result = ConflictResolver.resolveByConsensus(consensusSignals);
  assert(result.metadata.consensusAchieved, 'Should detect consensus');
});

test('resolveByLatestTimestamp selects most recent', () => {
  const result = ConflictResolver.resolveByLatestTimestamp(conflictingSignals);
  assertEqual(result.resolvedSignal.id, 'sig-2', 'Should select sig-2 (most recent)');
});

test('resolveConflict uses default strategy', () => {
  const result = ConflictResolver.resolveConflict(conflictingSignals);
  assertEqual(result.resolutionStrategy, 'highest_severity', 'Should use highest_severity by default');
});

test('hasSeverityConflict detects conflict', () => {
  const hasConflict = ConflictResolver.hasSeverityConflict(conflictingSignals);
  assert(hasConflict, 'Should detect severity conflict');
});

test('hasSignificantDisagreement detects significant disagreement', () => {
  const disagreeingSignals = [
    { ...conflictingSignals[0], severity: 'Critical' },
    { ...conflictingSignals[1], severity: 'Low' }
  ];
  const hasDisagreement = ConflictResolver.hasSignificantDisagreement(disagreeingSignals);
  assert(hasDisagreement, 'Should detect significant disagreement');
});

test('scoreToSeverity converts scores correctly', () => {
  assertEqual(ConflictResolver.scoreToSeverity(95), 'Critical', '95 should be Critical');
  assertEqual(ConflictResolver.scoreToSeverity(75), 'High', '75 should be High');
  assertEqual(ConflictResolver.scoreToSeverity(50), 'Medium', '50 should be Medium');
  assertEqual(ConflictResolver.scoreToSeverity(25), 'Low', '25 should be Low');
  assertEqual(ConflictResolver.scoreToSeverity(10), 'Info', '10 should be Info');
});

test('applyFreshnessFactor reduces stale confidence', () => {
  const staleDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
  const adjusted = ConflictResolver.applyFreshnessFactor(80, staleDate);
  assertEqual(adjusted, 56, 'Should reduce confidence by 30%');
});

test('applyFreshnessFactor preserves fresh confidence', () => {
  const freshDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  const adjusted = ConflictResolver.applyFreshnessFactor(80, freshDate);
  assertEqual(adjusted, 80, 'Should not reduce fresh confidence');
});

test('boostSeverityForConfirmation boosts for 2+ providers', () => {
  const boosted = ConflictResolver.boostSeverityForConfirmation('High', 3);
  assertEqual(boosted, 'Critical', 'Should boost High to Critical');
});

test('boostSeverityForConfirmation does not boost for single provider', () => {
  const notBoosted = ConflictResolver.boostSeverityForConfirmation('High', 1);
  assertEqual(notBoosted, 'High', 'Should not boost for single provider');
});

test('resolveAllGroups resolves multiple groups', () => {
  const signalGroups = {
    'ssl_vulnerability': conflictingSignals
  };
  const resolved = ConflictResolver.resolveAllGroups(signalGroups, 'highest');
  assertEqual(resolved.length, 1, 'Should resolve 1 group');
  assert(resolved[0].metadata.multiProviderConfirmation, 'Should detect multi-provider confirmation');
});

console.log('\n=====================================');
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log('=====================================');

if (failed > 0) {
  process.exit(1);
}

process.exit(0);
