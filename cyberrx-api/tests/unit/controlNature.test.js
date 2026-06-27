'use strict';

const { deriveNature, csfNature, NATURES } = require('../../src/services/controlNature');

describe('controlNature.deriveNature', () => {
  test('"-1" policy & procedures controls are always procedural', () => {
    expect(deriveNature('AC-1', 'AC', { hasTestMethod: true })).toBe(NATURES.PROCEDURAL);
    expect(deriveNature('SC-1', 'SC', { hasTestMethod: true })).toBe(NATURES.PROCEDURAL);
  });
  test('technical families with a test method are automated-capable', () => {
    expect(deriveNature('AC-2', 'AC', { hasTestMethod: true })).toBe(NATURES.AUTOMATED);
    expect(deriveNature('SI-4', 'SI', { hasTestMethod: true })).toBe(NATURES.AUTOMATED);
  });
  test('technical family without a test method is hybrid', () => {
    expect(deriveNature('CM-12', 'CM', { hasTestMethod: false })).toBe(NATURES.HYBRID);
  });
  test('procedural families are procedural (hybrid only if a test method exists)', () => {
    expect(deriveNature('AT-2', 'AT', { hasTestMethod: false })).toBe(NATURES.PROCEDURAL);
    expect(deriveNature('AT-2', 'AT', { hasTestMethod: true })).toBe(NATURES.HYBRID);
    expect(deriveNature('PM-9', 'PM', { hasTestMethod: false })).toBe(NATURES.PROCEDURAL);
  });
  test('ambiguous families default by test-method presence', () => {
    expect(deriveNature('CP-9', 'CP', { hasTestMethod: false })).toBe(NATURES.PROCEDURAL);
    expect(deriveNature('IR-4', 'IR', { hasTestMethod: true })).toBe(NATURES.HYBRID);
  });
});

describe('controlNature.csfNature', () => {
  test('maps the CSF library test flag', () => {
    expect(csfNature('auto')).toBe(NATURES.AUTOMATED);
    expect(csfNature('partial')).toBe(NATURES.HYBRID);
    expect(csfNature('manual')).toBe(NATURES.PROCEDURAL);
    expect(csfNature(undefined)).toBe(NATURES.PROCEDURAL);
  });
});
